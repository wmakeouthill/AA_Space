import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { ApiResponse, Chat, CreateChatRequest, Message, User, ChatParticipant } from '../models/chat/chat.interface';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl: string;
  private currentUserId: number;

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
    console.log('[CHAT SERVICE] usando URL da API:', this.apiUrl);
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
    console.log(`[CHAT SERVICE] Obtendo ID do usuário atual: ${userId}`);

    if (!userId) {
      console.error('[CHAT SERVICE] ID do usuário não encontrado! Utilizando 0 como fallback.');
      return 0;
    }

    if (isNaN(parseInt(userId))) {
      console.error(`[CHAT SERVICE] ID inválido: ${userId}. Utilizando 0 como fallback.`);
      return 0;
    }

    const userIdNumber = parseInt(userId);
    console.log(`[CHAT SERVICE] ID do usuário convertido para número: ${userIdNumber}`);
    return userIdNumber;
  }

  getOtherParticipant(chat: Chat): ChatParticipant | null {
    if (!chat || chat.isGroup || !chat.participants || chat.participants.length === 0) {
      console.warn(`[CHAT SERVICE] getOtherParticipant - Chat inválido ou grupo ou sem participantes: ${chat?.id}`);
      return null;
    }

    const userId = this.getCurrentUserId();
    console.log(`[CHAT SERVICE] getOtherParticipant - ID usuário atual: ${userId} (${typeof userId})`);
    console.log(`[CHAT SERVICE] getOtherParticipant - Participantes no chat:`,
      chat.participants.map(p => `${p.username} (ID: ${p.id}, tipo: ${typeof p.id})`));

    const currentUserIdNumber = Number(userId);
    const participantIds = chat.participants.map(p => Number(p.id));
    console.log(`[CHAT SERVICE] IDs dos participantes como números: [${participantIds.join(', ')}]`);

    const isCurrentUserInChat = participantIds.includes(currentUserIdNumber);
    console.log(`[CHAT SERVICE] Usuário atual (${currentUserIdNumber}) está no chat? ${isCurrentUserInChat}`);

    for (const participant of chat.participants) {
      const participantId = Number(participant.id);
      console.log(`[CHAT SERVICE] Comparando ID ${participantId} (${typeof participantId}) com ${currentUserIdNumber} (${typeof currentUserIdNumber}): ${participantId !== currentUserIdNumber}`);
      if (participantId !== currentUserIdNumber) {
        console.log(`[CHAT SERVICE] Outro participante encontrado: ${participant.username} (ID: ${participantId})`);

        if (participant.profileImage) {
          const originalImage = participant.profileImage;
          participant.profileImage = this.formatImageUrl(participant.profileImage);
          console.log(`[CHAT SERVICE] URL da imagem corrigida: ${originalImage} -> ${participant.profileImage}`);
        }

        return participant;
      }
    }

    if (chat.participants.length >= 2) {
      const firstParticipantId = Number(chat.participants[0].id);
      if (firstParticipantId === currentUserIdNumber) {
        console.log(`[CHAT SERVICE] Usando segundo participante como fallback: ${chat.participants[1].username}`);

        if (chat.participants[1].profileImage) {
          chat.participants[1].profileImage = this.formatImageUrl(chat.participants[1].profileImage);
        }

        return chat.participants[1];
      } else {
        console.log(`[CHAT SERVICE] Usando primeiro participante como fallback: ${chat.participants[0].username}`);

        if (chat.participants[0].profileImage) {
          chat.participants[0].profileImage = this.formatImageUrl(chat.participants[0].profileImage);
        }

        return chat.participants[0];
      }
    } else if (chat.participants.length === 1) {
      console.log(`[CHAT SERVICE] Usando único participante como fallback: ${chat.participants[0].username}`);

      if (chat.participants[0].profileImage) {
        chat.participants[0].profileImage = this.formatImageUrl(chat.participants[0].profileImage);
      }

      return chat.participants[0];
    }

    console.error(`[CHAT SERVICE] Chat ${chat.id} não tem participantes válidos`);
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

  formatImageUrl(imagePath: string): string {
    if (!imagePath) {
      return 'http://localhost:3001/uploads/assets/images/user.png';
    }

    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
      if (imagePath.includes('localhost:4200')) {
        return imagePath.replace('localhost:4200', 'localhost:3001');
      }
      return imagePath;
    }

    const apiOrigin = 'http://localhost:3001';
    let finalPath = imagePath;

    if (imagePath.includes('profiles/') || imagePath.includes('group-avatars/') || imagePath.includes('assets/')) {
      if (imagePath.startsWith('/uploads/')) {
        finalPath = imagePath;
      } else {
        let segment = '';
        if (imagePath.includes('profiles/')) segment = imagePath.substring(imagePath.indexOf('profiles/'));
        else if (imagePath.includes('group-avatars/')) segment = imagePath.substring(imagePath.indexOf('group-avatars/'));
        else if (imagePath.includes('assets/')) segment = imagePath.substring(imagePath.indexOf('assets/'));

        finalPath = `/uploads/${segment}`.replace(/\/+/g, '/');
      }
    } else if (!finalPath.startsWith('/')) {
      finalPath = '/uploads/' + finalPath;
    }

    finalPath = finalPath.replace(/\/+/g, '/');
    const cleanFinalPath = finalPath.startsWith('/') ? finalPath : '/' + finalPath;
    return `${apiOrigin}${cleanFinalPath}`;
  }
}
