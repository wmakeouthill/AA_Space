import { Injectable } from '@angular/core';
import { Observable, throwError, Subject } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { ApiResponse, Chat, CreateChatRequest, Message, User, ChatParticipant, NewMessageEvent } from '../models/chat/chat.interface'; // Added NewMessageEvent
import { AuthService } from './auth.service';
import { ApiService } from './api.service';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl: string;
  private currentUserId: number;
  private webSocketServiceUrlRoot: string; // For WebSocket connections
  private chatSubjects = new Map<number, WebSocketSubject<Message>>(); // Manages active WebSocket subjects per chat
  private newMessageSubject = new Subject<NewMessageEvent>(); // Subject for broadcasting new messages to ChatListComponent

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private apiService: ApiService
  ) {
    const userId = this.authService.getUserId();
    console.log(`[CHAT SERVICE] Inicializando com ID de usuário: ${userId}`);

    if (userId && !isNaN(parseInt(userId))) {
      this.currentUserId = parseInt(userId);
    } else {
      console.warn('[CHAT SERVICE] ID de usuário inválido ou não encontrado:', userId);
      this.currentUserId = 0;
    }

    console.log(`[CHAT SERVICE] ID do usuário atual inicializado: ${this.currentUserId}`);

    let baseApiUrl = (this.apiService as any).API_URL;

    if (baseApiUrl.endsWith('/api')) {
      baseApiUrl = baseApiUrl.substring(0, baseApiUrl.length - 4);
    }

    this.apiUrl = `${baseApiUrl}/api/chat`;
    console.log('[CHAT SERVICE] usando URL da API HTTP:', this.apiUrl);

    // Derive WebSocket base URL from baseApiUrl
    // Adjusted to match backend expectation (no /ws segment in the root path for WebSocket)
    this.webSocketServiceUrlRoot = baseApiUrl.replace(/^http/, 'ws');
    console.log('[CHAT SERVICE] usando URL base para WebSocket:', this.webSocketServiceUrlRoot);
  }

  getChats(): Observable<Chat[]> {
    return this.http.get<ApiResponse<Chat>>(`${this.apiUrl}`).pipe(
      map(response => {
        const chats = response.conversations || [];

        return chats.map(chat => ({
          ...chat,
          avatarPath: chat.avatarPath,
          createdAt: new Date(chat.createdAt),
          updatedAt: new Date(chat.updatedAt),
          lastMessage: chat.lastMessage ? {
            ...chat.lastMessage,
            timestamp: new Date(chat.lastMessage.timestamp)
          } : undefined
        }));
      }),
      catchError(error => {
        console.error('Erro ao buscar chats:', error);
        return throwError(() => new Error('Falha ao buscar chats. Tente novamente mais tarde.'));
      })
    );
  }

  getMessages(chatId: number): Observable<Message[]> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/${chatId}/messages`).pipe(
      map(response => {
        const messages = response.messages || [];
        console.log('[CHAT SERVICE] Mensagens recebidas:', messages);

        return messages.map((msg: any) => {
          if (!msg.senderName) {
            console.warn('[CHAT SERVICE] Mensagem sem nome do remetente:', msg);
          }

          const profileImage = msg.profileImage ? this.formatImageUrl(msg.profileImage) :
                                              this.formatImageUrl('/uploads/assets/images/user.png');

          return {
            id: msg.id,
            content: msg.content,
            senderId: msg.senderId,
            senderName: msg.senderName || 'Usuário',
            senderProfileImage: profileImage,
            timestamp: new Date(msg.timestamp),
            read: msg.read || false
          };
        });
      }),
      catchError(error => {
        console.error('Erro ao buscar mensagens:', error);
        return throwError(() => new Error('Falha ao buscar mensagens. Tente novamente mais tarde.'));
      })
    );
  }

  sendMessage(chatId: number, content: string): Observable<Message> {
    return this.http.post<any>(`${this.apiUrl}/${chatId}/messages`, { content }).pipe(
      map(response => {
        const msgData = response.message;
        if (!msgData) {
          throw new Error('Resposta inválida do servidor');
        }

        console.log('[CHAT SERVICE] Resposta ao enviar mensagem:', msgData);

        return {
          id: msgData.id,
          content: msgData.content,
          senderId: msgData.senderId,
          senderName: msgData.senderName,
          senderProfileImage: msgData.profileImage,
          timestamp: new Date(msgData.timestamp),
          read: msgData.read
        };
      }),
      catchError(error => {
        console.error('Erro ao enviar mensagem:', error);
        return throwError(() => new Error('Falha ao enviar mensagem. Tente novamente mais tarde.'));
      })
    );
  }

  createChat(isGroup: boolean, name: string | undefined, participants: number[]): Observable<Chat> {
    const request: CreateChatRequest = {
      isGroup,
      name,
      participants
    };

    return this.http.post<any>(`${this.apiUrl}`, request).pipe(
      map(response => {
        const chatData = response.conversation;
        if (!chatData) {
          throw new Error('Resposta inválida do servidor');
        }

        return {
          ...chatData,
          avatarPath: chatData.avatarPath,
          createdAt: new Date(chatData.createdAt),
          updatedAt: new Date(chatData.updatedAt)
        };
      }),
      catchError(error => {
        console.error('Erro ao criar chat:', error);
        return throwError(() => new Error('Falha ao criar chat. Tente novamente mais tarde.'));
      })
    );
  }

  getAvailableUsers(): Observable<User[]> {
    return this.http.get<any>(`${this.apiUrl}/users`).pipe(
      map(response => response.users || []),
      catchError(error => {
        console.error('Erro ao buscar usuários:', error);
        return throwError(() => new Error('Falha ao buscar usuários. Tente novamente mais tarde.'));
      })
    );
  }

  getCurrentUserId(): number {
    const userId = this.authService.getUserId();

    if (!userId) {
      console.error('[CHAT SERVICE] ID do usuário não encontrado! Utilizando 0 como fallback.');
      return 0;
    }

    if (isNaN(parseInt(userId))) {
      console.error(`[CHAT SERVICE] ID inválido: ${userId}. Utilizando 0 como fallback.`);
      return 0;
    }

    const userIdNumber = parseInt(userId);
    return userIdNumber;
  }

  getOtherParticipant(chat: Chat): ChatParticipant | null {
    if (!chat || chat.isGroup || !chat.participants || chat.participants.length === 0) {
      console.warn(`[CHAT SERVICE] getOtherParticipant - Chat inválido ou grupo ou sem participantes: ${chat?.id}`);
      return null;
    }

    const userId = this.getCurrentUserId();
    const currentUserIdNumber = Number(userId);

    for (const participant of chat.participants) {
      const participantId = Number(participant.id);
      if (participantId !== currentUserIdNumber) {
        if (participant.profileImage) {
          participant.profileImage = this.formatImageUrl(participant.profileImage);
        }
        return participant;
      }
    }

    if (chat.participants.length >= 2) {
      const firstParticipantId = Number(chat.participants[0].id);
      if (firstParticipantId === currentUserIdNumber) {
        if (chat.participants[1].profileImage) {
          chat.participants[1].profileImage = this.formatImageUrl(chat.participants[1].profileImage);
        }
        return chat.participants[1];
      } else {
        if (chat.participants[0].profileImage) {
          chat.participants[0].profileImage = this.formatImageUrl(chat.participants[0].profileImage);
        }
        return chat.participants[0];
      }
    } else if (chat.participants.length === 1) {
      if (chat.participants[0].profileImage) {
        chat.participants[0].profileImage = this.formatImageUrl(chat.participants[0].profileImage);
      }
      return chat.participants[0];
    }

    console.error(`[CHAT SERVICE] Chat ${chat.id} não tem participantes válidos ou não foi possível determinar o outro participante.`);
    return null;
  }

  uploadGroupAvatar(chatId: number, imageFile: File): Observable<{ avatarPath: string, fullImageUrl: string }> {
    return new Observable(observer => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const base64Image = e.target.result;
        this.http.post<any>(`${this.apiUrl}/${chatId}/avatar`, { groupAvatar: base64Image }).pipe(
          map(response => {
            if (!response || !response.avatarPath) {
              throw new Error('Resposta inválida do servidor ao fazer upload do avatar do grupo.');
            }
            return {
              avatarPath: response.avatarPath,
              fullImageUrl: response.fullImageUrl
            };
          }),
          tap(result => { // Dispatch global event on success
            const event = new CustomEvent('chat:avatarUpdated', {
              detail: { chatId: chatId, avatarPath: result.avatarPath, fullImageUrl: result.fullImageUrl }
            });
            window.dispatchEvent(event);
            console.log('[CHAT SERVICE] Dispatched chat:avatarUpdated event for upload.');
          }),
          catchError(error => {
            console.error('Erro ao fazer upload do avatar do grupo:', error);
            return throwError(() => new Error('Falha ao fazer upload do avatar do grupo.'));
          })
        ).subscribe({
          next: result => observer.next(result),
          error: err => observer.error(err),
          complete: () => observer.complete()
        });
      };
      reader.onerror = error => {
        observer.error(new Error('Falha ao ler o arquivo de imagem.'));
      };
      reader.readAsDataURL(imageFile);
    });
  }

  removeGroupAvatar(chatId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${chatId}/avatar`).pipe(
      tap(() => { // Dispatch global event on success
        const event = new CustomEvent('chat:avatarUpdated', {
          detail: { chatId: chatId, avatarPath: null }
        });
        window.dispatchEvent(event);
        console.log('[CHAT SERVICE] Dispatched chat:avatarUpdated event for removal.');
      }),
      catchError(error => {
        console.error('Erro ao remover o avatar do grupo:', error);
        return throwError(() => new Error('Falha ao remover o avatar do grupo.'));
      })
    );
  }

  listenForNewMessages(chatId: number): Observable<Message> {
    if (this.chatSubjects.has(chatId)) {
      console.log(`[CHAT SERVICE] Reusing existing WebSocket subject for chat ${chatId}`);
      return this.chatSubjects.get(chatId)!.asObservable();
    }

    const wsUrl = `${this.webSocketServiceUrlRoot}/${chatId}`;
    console.log(`[CHAT SERVICE] Attempting to connect to WebSocket: ${wsUrl}`);

    const subject = webSocket<any>({
      url: wsUrl,
      openObserver: {
        next: () => {
          console.log(`[CHAT SERVICE] WebSocket OPENED successfully for chat ${chatId} at ${wsUrl}`);
        }
      },
      closeObserver: {
        next: (closeEvent) => {
          // Type assertion for closeEvent
          const event = closeEvent as CloseEvent;
          console.log(`[CHAT SERVICE] WebSocket CLOSED for chat ${chatId}. Code: ${event.code}, Reason: ${event.reason}, Was Clean: ${event.wasClean}`);
          this.chatSubjects.delete(chatId);
        }
      },
      closingObserver: {
        next: () => {
          console.log(`[CHAT SERVICE] WebSocket CLOSING for chat ${chatId}`);
        }
      },
      deserializer: (e: MessageEvent) => {
        try {
          const rawMessage = JSON.parse(e.data);
          console.log(`[CHAT SERVICE] Raw WebSocket message received for chat ${chatId}:`, rawMessage);
          // Transform raw message to Message interface
          const transformedMessage: Message = {
            id: rawMessage.id,
            content: rawMessage.content,
            senderId: rawMessage.senderId,
            senderName: rawMessage.senderName, // Assuming backend sends this
            senderProfileImage: rawMessage.senderProfileImage ? this.formatImageUrl(rawMessage.senderProfileImage) : this.formatImageUrl('/assets/images/user.png'),
            timestamp: new Date(rawMessage.timestamp),
            read: rawMessage.read || false
          };
          // Notify ChatListComponent AND ChatConversationComponent about the new message
          console.log(`[CHAT SERVICE] Broadcasting transformed message via newMessageSubject for chat ${chatId}:`, transformedMessage);
          this.newMessageSubject.next({ message: transformedMessage, chatId: chatId });
          return transformedMessage; // This return is for the listenForNewMessages observable stream in ChatConversationComponent
        } catch (error) {
          console.error(`[CHAT SERVICE] Error parsing WebSocket message for chat ${chatId}:`, error, "Raw data:", e.data);
          // Return a dummy message or handle error appropriately
          // For now, returning an empty object to avoid breaking the stream, but this should be improved
          return { id: -1, content: 'Error parsing message', senderId: -1, timestamp: new Date(), read: false };
        }
      }
    });

    this.chatSubjects.set(chatId, subject);
    // Add error handling for the WebSocket subject itself
    return subject.asObservable().pipe(
      catchError(error => {
        console.error(`[CHAT SERVICE] WebSocket error for chat ${chatId}:`, error);
        this.chatSubjects.delete(chatId); // Remove subject on error
        return throwError(() => new Error(`WebSocket error for chat ${chatId}`));
      })
    );
  }

  // Method for ChatListComponent to subscribe to new messages
  getNewMessageListener(): Observable<NewMessageEvent> {
    return this.newMessageSubject.asObservable();
  }

  closeChatConnection(chatId: number): void {
    if (this.chatSubjects.has(chatId)) {
      const subject = this.chatSubjects.get(chatId)!;
      console.log(`[CHAT SERVICE] Closing WebSocket connection explicitly for chat ${chatId}`);
      subject.complete();
    }
  }

  private getDefaultProfileImageForSender(senderId: number): string {
    return '/assets/images/user.png';
  }

  private determineApiOrigin(): string {
    const currentOrigin = window.location.origin;
    if (currentOrigin.includes('v3mrhcvc-4200.brs.devtunnels.ms')) {
      return 'https://v3mrhcvc-3001.brs.devtunnels.ms';
    } else if (currentOrigin.includes('.github.dev') || currentOrigin.includes('.github.io') || currentOrigin.includes('.app.github.dev')) {
      return currentOrigin.replace(/-\d+(\.app\.github\.dev|\.github\.dev|\.github\.io)/, '-3001$1');
    }
    return 'http://localhost:3001';
  }

  formatImageUrl(imagePath: string): string {
    const apiOrigin = this.determineApiOrigin();

    if (!imagePath) {
      return `${apiOrigin}/uploads/assets/images/user.png`;
    }

    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
      let updatedPath = imagePath;
      if (updatedPath.includes('localhost:4200')) {
        updatedPath = updatedPath.replace('localhost:4200', 'localhost:3001');
      }
      if (updatedPath.includes('v3mrhcvc-4200.brs.devtunnels.ms')) {
        updatedPath = updatedPath.replace('v3mrhcvc-4200.brs.devtunnels.ms', 'v3mrhcvc-3001.brs.devtunnels.ms');
      }
      // Remove barras duplas, exceto em http:// ou https://
      return updatedPath.replace(/([^:])\/\//g, '$1/');
    }

    // Para caminhos relativos, constrói a URL completa usando o apiOrigin
    const pathStartsWithSlash = imagePath.startsWith('/');
    let fullPath = apiOrigin;

    if (pathStartsWithSlash) {
      // Se já começa com /uploads/, não adiciona /uploads/ novamente
      if (imagePath.startsWith('/uploads/')) {
        fullPath += imagePath;
      } else {
        // Se começa com / mas não /uploads/, adiciona /uploads/
        fullPath += '/uploads' + imagePath;
      }
    } else {
      // Se não começa com /, adiciona /uploads/ e o caminho
      fullPath += '/uploads/' + imagePath;
    }

    // Remove quaisquer barras duplas que possam ter sido formadas, especialmente após o host
    // Ex: https://host//path -> https://host/path
    // Ex: https://host/uploads//profiles -> https://host/uploads/profiles
    return fullPath.replace(/([^:])\/\//g, '$1/').replace(/\/uploads\/uploads\//g, '/uploads/');
  }
}
