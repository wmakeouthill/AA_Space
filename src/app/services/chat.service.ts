import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { ApiResponse, Chat, CreateChatRequest, Message, User } from '../models/chat/chat.interface';
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
    this.currentUserId = parseInt(this.authService.getUserId() || '0');
    // Obtém a URL base da API do ApiService, mas sem o '/api' no final
    const baseApiUrl = (this.apiService as any).API_URL.replace('/api', '');
    this.apiUrl = `${baseApiUrl}/api/chat`;
    console.log('ChatService usando URL da API:', this.apiUrl);
  }

  // Retorna um Observable com a lista de chats
  getChats(): Observable<Chat[]> {
    return this.http.get<ApiResponse<Chat>>(`${this.apiUrl}`).pipe(
      map(response => {
        const chats = response.conversations || [];

        // Converte as strings de data para objetos Date
        return chats.map(chat => ({
          ...chat,
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

  // Retorna um Observable com as mensagens de um chat específico
  getMessages(chatId: number): Observable<Message[]> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/${chatId}/messages`).pipe(
      map(response => {
        const messages = response.messages || [];

        // Converte as strings de data para objetos Date
        return messages.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          senderId: msg.senderId,
          senderName: msg.senderName,
          senderProfileImage: msg.senderProfileImage, // Incluir a imagem de perfil do remetente
          timestamp: new Date(msg.timestamp),
          read: msg.read
        }));
      }),
      catchError(error => {
        console.error('Erro ao buscar mensagens:', error);
        return throwError(() => new Error('Falha ao buscar mensagens. Tente novamente mais tarde.'));
      })
    );
  }

  // Envia uma nova mensagem
  sendMessage(chatId: number, content: string): Observable<Message> {
    return this.http.post<any>(`${this.apiUrl}/${chatId}/messages`, { content }).pipe(
      map(response => {
        const msgData = response.message;
        if (!msgData) {
          throw new Error('Resposta inválida do servidor');
        }

        return {
          id: msgData.id,
          content: msgData.content,
          senderId: msgData.senderId,
          senderName: msgData.senderName,
          senderProfileImage: msgData.senderProfileImage, // Incluir a imagem de perfil do remetente
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

  // Cria um novo chat
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

  // Obter usuários disponíveis para chat
  getAvailableUsers(): Observable<User[]> {
    return this.http.get<any>(`${this.apiUrl}/users`).pipe(
      map(response => response.users || []),
      catchError(error => {
        console.error('Erro ao buscar usuários:', error);
        return throwError(() => new Error('Falha ao buscar usuários. Tente novamente mais tarde.'));
      })
    );
  }

  // Retorna o ID do usuário atual
  getCurrentUserId(): number {
    return this.currentUserId;
  }
}
