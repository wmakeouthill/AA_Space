import { Injectable } from '@angular/core';
import { Observable, throwError, Subject, BehaviorSubject, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { ApiResponse, Chat, CreateChatRequest, Message, User, NewMessageEvent } from '../models/chat/chat.interface';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl: string;
  private webSocketServiceUrlRoot: string;
  private chatSubjects = new Map<number, WebSocketSubject<Message | any>>();
  private newMessageSubject = new Subject<NewMessageEvent>();
  private messageStatusUpdateSubject = new Subject<{ chatId: number; status: 'sent' | 'delivered' | 'read'; messageIds: string[] }>();
  private chatMarkedAsReadSubject = new Subject<number>(); // New Subject

  private totalUnreadCount = new BehaviorSubject<number>(0);
  public totalUnreadCount$ = this.totalUnreadCount.asObservable();

  private chatsCache: Chat[] = [];

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private apiService: ApiService
  ) {
    const userIdStr = this.authService.getUserId();
    console.log(`[CHAT SERVICE] Initializing. User ID from authService at construction: ${userIdStr}`);

    let baseApiUrl = (this.apiService as any).API_URL;
    if (baseApiUrl.endsWith('/api')) {
      baseApiUrl = baseApiUrl.substring(0, baseApiUrl.length - 4);
    }
    this.apiUrl = `${baseApiUrl}/api/chat`;
    this.webSocketServiceUrlRoot = baseApiUrl.replace(/^http/, 'ws');
    console.log('[CHAT SERVICE] HTTP API URL:', this.apiUrl);
    console.log('[CHAT SERVICE] WebSocket base URL:', this.webSocketServiceUrlRoot);
  }

  public getCurrentUserId(): number {
    const userIdStr = this.authService.getUserId();
    console.log(`[CHAT SERVICE] getCurrentUserId - User ID string from authService: ${userIdStr}`); // LOG ADDED
    if (userIdStr && !isNaN(parseInt(userIdStr))) {
      const numericUserId = parseInt(userIdStr);
      console.log(`[CHAT SERVICE] getCurrentUserId - Parsed numeric User ID: ${numericUserId}`); // LOG ADDED
      return numericUserId;
    } else {
      console.warn('[CHAT SERVICE] getCurrentUserId: User ID is invalid or not found from AuthService. Returning 0.'); // LOG MODIFIED
      return 0;
    }
  }

  getChats(): Observable<Chat[]> {
    const userId = this.getCurrentUserId();
    console.log(`[CHAT SERVICE] getChats - User ID for fetching chats: ${userId}`); // LOG ADDED
    if (userId === 0) {
      console.warn('[CHAT SERVICE] GetChats: Aborted due to invalid user ID (0). Returning empty array.');
      this.chatsCache = [];
      this.totalUnreadCount.next(0);
      return of([]);
    }

    return this.http.get<ApiResponse<Chat>>(`${this.apiUrl}`).pipe(
      map(response => {
        const chats = response.conversations || [];
        const processedChats = chats.map(chat => ({
          ...chat,
          avatarPath: chat.avatarPath,
          createdAt: new Date(chat.createdAt),
          updatedAt: new Date(chat.updatedAt),
          lastMessage: chat.lastMessage ? {
            ...chat.lastMessage,
            timestamp: new Date(chat.lastMessage.timestamp)
          } : undefined,
          unreadCount: chat.unreadCount || 0
        }));

        this.chatsCache = processedChats;
        const initialTotalUnread = this.chatsCache.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
        console.log(`[CHAT SERVICE] getChats - Calculated initialTotalUnread: ${initialTotalUnread}`); // LOG ADDED
        this.totalUnreadCount.next(initialTotalUnread);
        console.log(`[CHAT SERVICE] Chats fetched. Initial total unread: ${initialTotalUnread}`);

        this.chatsCache.forEach(chat => {
          this.listenForNewMessages(chat.id);
        });

        return processedChats;
      }),
      catchError(error => {
        console.error('[CHAT SERVICE] Error fetching chats:', error);
        this.chatsCache = [];
        this.totalUnreadCount.next(0);
        return throwError(() => new Error('Failed to fetch chats. Please try again later.'));
      })
    );
  }

  listenForNewMessages(chatId: number): Observable<Message | any> {
    const userId = this.getCurrentUserId();
    if (userId === 0) {
      console.warn(`[CHAT SERVICE] ListenForNewMessages: Cannot listen for chat ${chatId}, user ID is 0.`);
      return of();
    }

    if (this.chatSubjects.has(chatId)) {
      console.log(`[CHAT SERVICE] ListenForNewMessages: Reusing existing WebSocket subject for chat ${chatId}`);
      return this.chatSubjects.get(chatId)!.asObservable();
    }

    const wsUrl = `${this.webSocketServiceUrlRoot}/ws/chat/${chatId}/?userId=${userId}`;
    console.log(`[CHAT SERVICE] Connecting to WebSocket for chat ${chatId}: ${wsUrl}`);

    try {
      const subject = webSocket<Message | any>(wsUrl);
      this.chatSubjects.set(chatId, subject);

      subject.pipe(
        tap((receivedData: Message | any) => {
          console.log(`[CHAT SERVICE] WebSocket data received for chat ${chatId}:`, receivedData);

          if (receivedData.type === 'messageStatusUpdate') {
            const { readerUserId, status, messageIds } = receivedData;
            console.log(`[CHAT SERVICE] Received message status update for chat ${chatId}. Reader: ${readerUserId}, Status: ${status}, Message IDs: ${messageIds}`);
            this.handleMessageStatusUpdate(chatId, status, messageIds, userId);
          } else {
            const message = receivedData as Message;
            const chatIndex = this.chatsCache.findIndex(c => c.id === chatId);
            if (chatIndex > -1) {
              this.chatsCache[chatIndex].lastMessage = {
                ...message,
                timestamp: new Date(message.timestamp)
              };
              let isNewUnread = false;
              if (message.senderId !== userId) {
                this.chatsCache[chatIndex].unreadCount = (this.chatsCache[chatIndex].unreadCount || 0) + 1;
                isNewUnread = true;
                console.log(`[CHAT SERVICE] Unread count for chat ${chatId} incremented to ${this.chatsCache[chatIndex].unreadCount}`);
              }

              const newTotal = this.chatsCache.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
              this.totalUnreadCount.next(newTotal);
              console.log(`[CHAT SERVICE] Total unread count updated to: ${newTotal}`);

              this.newMessageSubject.next({ chatId, message, isNewUnread });
            } else {
              console.warn(`[CHAT SERVICE] Received message for chat ${chatId}, but chat not found in cache.`);
            }
          }
        }),
        catchError(error => {
          console.error(`[CHAT SERVICE] WebSocket error for chat ${chatId}:`, error);
          this.chatSubjects.delete(chatId);
          return of();
        })
      ).subscribe({
        error: (err) => console.error(`[CHAT SERVICE] Unhandled subscription error for WebSocket chat ${chatId}:`, err),
        complete: () => {
          console.log(`[CHAT SERVICE] WebSocket subject COMPLETED for chat ${chatId}. Removing from active subjects.`);
          this.chatSubjects.delete(chatId);
        }
      });
      return subject.asObservable();
    } catch (error) {
      console.error(`[CHAT SERVICE] Failed to create WebSocket for chat ${chatId}:`, error);
      return of();
    }
  }

  private handleMessageStatusUpdate(chatId: number, status: 'sent' | 'delivered' | 'read', messageIds: string[], currentUserId: number) {
    const chat = this.chatsCache.find(c => c.id === chatId);
    if (chat) {
      console.log(`[CHAT SERVICE] Handling status update for chat ${chatId}: ${messageIds.length} messages to status ${status}.`);
      this.messageStatusUpdateSubject.next({ chatId, status, messageIds });
    }
  }

  getMessageStatusUpdateListener(): Observable<{ chatId: number; status: 'sent' | 'delivered' | 'read'; messageIds: string[] }> {
    return this.messageStatusUpdateSubject.asObservable();
  }

  getNewMessageListener(): Observable<NewMessageEvent> {
    return this.newMessageSubject.asObservable();
  }

  // New public method to listen for chat marked as read events
  getChatMarkedAsReadListener(): Observable<number> {
    return this.chatMarkedAsReadSubject.asObservable();
  }

  markChatAsRead(chatId: number): void {
    const chatIndex = this.chatsCache.findIndex(c => c.id === chatId);
    if (chatIndex > -1) {
      if (this.chatsCache[chatIndex].unreadCount && this.chatsCache[chatIndex].unreadCount > 0) {
        const oldUnreadCount = this.chatsCache[chatIndex].unreadCount; // Store old value
        this.chatsCache[chatIndex].unreadCount = 0;
        const newTotal = this.chatsCache.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
        this.totalUnreadCount.next(newTotal);
        console.log(`[CHAT SERVICE] Chat ${chatId} marked as read. New total unread: ${newTotal}`);

        if (oldUnreadCount > 0) { // Emit only if unread count actually changed from >0 to 0
            this.chatMarkedAsReadSubject.next(chatId);
        }

        const userId = this.getCurrentUserId();
        if (userId === 0) {
          console.warn(`[CHAT SERVICE] MarkChatAsRead: Cannot notify backend for chat ${chatId}, user ID is 0.`);
          return;
        }
        this.http.post(`${this.apiUrl}/${chatId}/messages/mark-as-read`, {}).pipe(
          catchError(err => {
            console.error(`[CHAT SERVICE] Failed to mark messages as read on backend for chat ${chatId}:`, err);
            return throwError(() => new Error('Failed to notify backend about read messages.'));
          })
        ).subscribe({
          next: () => console.log(`[CHAT SERVICE] Backend notified: messages read for chat ${chatId}`)
        });
      }
    } else {
      console.warn(`[CHAT SERVICE] Attempted to mark unknown chat ${chatId} as read.`);
    }
  }

  getMessages(chatId: number): Observable<Message[]> {
    const userId = this.getCurrentUserId();
    if (userId === 0) {
      console.warn(`[CHAT SERVICE] GetMessages: Aborted for chat ${chatId} due to invalid user ID (0).`);
      return of([]);
    }
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/${chatId}/messages`).pipe(
      map(response => {
        const messages = response.messages || [];
        return messages.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          senderId: msg.senderId,
          senderName: msg.senderName || 'User',
          senderProfileImage: this.formatImageUrl(msg.profileImage),
          timestamp: new Date(msg.timestamp),
          read: msg.read || false,
          status: msg.status || 'sent' // Adicionar status aqui, default para 'sent' se não vier
        }));
      }),
      catchError(error => {
        console.error(`[CHAT SERVICE] Error fetching messages for chat ${chatId}:`, error);
        return throwError(() => new Error('Failed to fetch messages.'));
      })
    );
  }

  sendMessage(chatId: number, content: string): Observable<Message> {
    const userId = this.getCurrentUserId();
    if (userId === 0) {
      console.warn(`[CHAT SERVICE] SendMessage: Aborted for chat ${chatId} due to invalid user ID (0).`);
      return throwError(() => new Error('Cannot send message: User not properly authenticated.'));
    }
    return this.http.post<any>(`${this.apiUrl}/${chatId}/messages`, { content }).pipe(
      map(response => {
        // A resposta do backend para sendMessage agora é um objeto { message: string, chatMessage: Message }
        // Vamos usar chatMessage que contém o objeto da mensagem completa.
        const msgData = response.chatMessage;
        if (!msgData) throw new Error('Invalid server response, missing chatMessage');
        return {
          id: msgData.id,
          content: msgData.content,
          senderId: msgData.senderId,
          senderName: msgData.senderName,
          senderProfileImage: this.formatImageUrl(msgData.senderProfileImage), // Corrigido para senderProfileImage
          timestamp: new Date(msgData.timestamp),
          read: msgData.read,
          status: msgData.status // Adicionar status aqui
        };
      }),
      catchError(error => {
        console.error(`[CHAT SERVICE] Error sending message to chat ${chatId}:`, error);
        return throwError(() => new Error('Failed to send message.'));
      })
    );
  }

  createChat(isGroup: boolean, name: string | undefined, participants: number[]): Observable<Chat> {
    const userId = this.getCurrentUserId();
    if (userId === 0) {
      console.warn(`[CHAT SERVICE] CreateChat: Aborted due to invalid user ID (0).`);
      return throwError(() => new Error('Cannot create chat: User not properly authenticated.'));
    }
    if (!participants.includes(userId)) {
      participants.push(userId);
    }

    const request: CreateChatRequest = { isGroup, name, participants };
    console.log('[CHAT SERVICE] Creating chat with payload:', JSON.stringify(request, null, 2)); // Log do payload

    return this.http.post<any>(`${this.apiUrl}`, request).pipe(
      map(response => {
        const chatData = response.conversation;
        if (!chatData) throw new Error('Invalid server response');
        const newChat: Chat = {
          ...chatData,
          avatarPath: chatData.avatarPath,
          createdAt: new Date(chatData.createdAt),
          updatedAt: new Date(chatData.updatedAt),
          unreadCount: 0
        };
        this.chatsCache.push(newChat);
        this.listenForNewMessages(newChat.id);

        return newChat;
      }),
      catchError(error => {
        console.error('[CHAT SERVICE] Error creating chat:', error);
        return throwError(() => new Error('Failed to create chat.'));
      })
    );
  }

  getAvailableUsers(): Observable<User[]> {
    const userId = this.getCurrentUserId();
    if (userId === 0) {
      console.warn(`[CHAT SERVICE] GetAvailableUsers: Aborted due to invalid user ID (0).`);
      return of([]);
    }
    return this.http.get<any>(`${this.apiUrl}/users`).pipe(
      map(response => response.users || []),
      catchError(error => {
        console.error('[CHAT SERVICE] Error fetching available users:', error);
        return throwError(() => new Error('Failed to fetch users.'));
      })
    );
  }

  public getPublicCurrentUserId(): number {
    return this.getCurrentUserId();
  }

  public formatImageUrl(imagePath?: string): string {
    if (!imagePath) {
      return 'assets/images/user.png';
    }
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    const baseApiUrl = (this.apiService as any).API_URL.endsWith('/api') ?
      (this.apiService as any).API_URL.slice(0, -4) :
      (this.apiService as any).API_URL;

    return `${baseApiUrl}${imagePath.startsWith('/') ? imagePath : '/' + imagePath}`;
  }

  public getOtherParticipant(chat: Chat): User | undefined {
    const currentUserId = this.getCurrentUserId();
    if (!chat || chat.isGroup || !chat.participants || currentUserId === 0) {
      return undefined;
    }
    return chat.participants.find(p => p.id !== currentUserId);
  }

  uploadGroupAvatar(chatId: number, file: File): Observable<{ avatarPath: string }> {
    const formData = new FormData();
    formData.append('avatar', file);

    return this.http.post<{ avatarPath: string }>(`${this.apiUrl}/${chatId}/avatar`, formData).pipe(
      catchError(error => {
        console.error(`[CHAT SERVICE] Error uploading group avatar for chat ${chatId}:`, error);
        return throwError(() => new Error('Failed to upload group avatar.'));
      })
    );
  }

  removeGroupAvatar(chatId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${chatId}/avatar`).pipe(
      catchError(error => {
        console.error(`[CHAT SERVICE] Error removing group avatar for chat ${chatId}:`, error);
        return throwError(() => new Error('Failed to remove group avatar.'));
      })
    );
  }

  public closeChatConnection(chatId: number): void {
    console.log(`[CHAT SERVICE] closeChatConnection called for chat ${chatId}. Call stack:`, (new Error()).stack);
    if (this.chatSubjects.has(chatId)) {
      const subject = this.chatSubjects.get(chatId);
      subject?.complete();
      this.chatSubjects.delete(chatId);
      console.log(`[CHAT SERVICE] WebSocket connection explicitly closed and removed for chat ${chatId}`);
    } else {
      console.warn(`[CHAT SERVICE] No active WebSocket connection found for chat ${chatId} to close.`);
    }
  }

  cleanupUserSession(): void {
    console.log('[CHAT SERVICE] Cleaning up user session.');
    this.chatSubjects.forEach(subject => subject.complete());
    this.chatSubjects.clear();
    this.chatsCache = [];
    this.totalUnreadCount.next(0);
    this.newMessageSubject.complete();
    this.newMessageSubject = new Subject<NewMessageEvent>();
    this.messageStatusUpdateSubject.complete(); // Ensure this is also handled
    this.messageStatusUpdateSubject = new Subject<{ chatId: number; status: 'sent' | 'delivered' | 'read'; messageIds: string[] }>(); // Re-initialize
    this.chatMarkedAsReadSubject.complete(); // Complete the new subject
    this.chatMarkedAsReadSubject = new Subject<number>(); // Re-initialize the new subject
  }
}
