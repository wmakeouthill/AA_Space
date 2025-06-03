import { HttpClient } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators'; // Ensure map is imported
import { Manager, Socket } from 'socket.io-client'; // Standard import
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { Chat, Message, ChatParticipant, CreateChatRequest, NewMessageEvent, User, MessageStatusUpdate } from '../models/chat/chat.interface';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ChatService implements OnDestroy {
  private socket: Socket; // Use the direct import
  private apiUrl = environment.apiUrl;
  private conversationsSubject = new BehaviorSubject<Chat[]>([]);
  public conversations$ = this.conversationsSubject.asObservable();
  private messagesSubject = new BehaviorSubject<Message[]>([]);
  public messages$ = this.messagesSubject.asObservable();
  private currentChatSubject = new BehaviorSubject<Chat | null>(null);
  public currentChat$ = this.currentChatSubject.asObservable();
  private onlineUsersSubject = new BehaviorSubject<User[]>([]);
  public onlineUsers$ = this.onlineUsersSubject.asObservable();
  private unreadMessagesCount = new BehaviorSubject<number>(0);
  public unreadMessagesCount$ = this.unreadMessagesCount.asObservable();

  // Subject for message status updates
  private messageStatusUpdateSubject = new BehaviorSubject<MessageStatusUpdate | null>(null);

  private currentUserId: number | null = null;

  constructor(
    private http: HttpClient,
    private apiService: ApiService,
    private authService: AuthService
  ) {
    const userIdString = this.authService.getUserId();
    this.currentUserId = userIdString ? parseInt(userIdString, 10) : null;
    // console.log('[ChatService] Current User ID:', this.currentUserId);

    const socketUrl = this.apiService.getApiBaseUrl();
    // console.log('[ChatService] Socket URL:', socketUrl);

    const manager = new Manager(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000
    });
    this.socket = manager.socket('/', { auth: { token: this.authService.getToken() } }); // Moved auth to socket options

    this.setupSocketListeners();
    this.fetchConversations().subscribe({
      error: (err) => { /* console.error('[ChatService] Initial fetchConversations failed:', err) */ }
    });
  }

  public formatImageUrl(imagePath: string | null | undefined): string {
    if (!imagePath) {
      return 'assets/images/default-avatar.png'; // Or a more specific default
    }
    if (imagePath.startsWith('http') || imagePath.startsWith('assets/')) {
      return imagePath;
    }
    return `${this.apiService.getApiBaseUrl()}/${imagePath.startsWith('/') ? imagePath.substring(1) : imagePath}`;
  }

  ngOnDestroy() {
    if (this.socket) {
      this.socket.disconnect();
      // console.log('[ChatService] Socket disconnected on ngOnDestroy');
    }
  }

  private setupSocketListeners(): void {
    // console.log('[ChatService] Setting up socket listeners...');

    this.socket.on('connect', () => {
      // console.log('[ChatService] Connected to socket server with ID:', this.socket.id);
      if (this.currentUserId) {
        this.socket.emit('userConnected', { userId: this.currentUserId });
        // console.log('[ChatService] Emitted userConnected for user ID:', this.currentUserId);
      }
    });

    this.socket.on('disconnect', (reason: string) => {
      // console.warn('[ChatService] Disconnected from socket server:', reason);
      if (reason === 'io server disconnect') {
        // Potentially attempt to reconnect or notify the user
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      // console.error('[ChatService] Socket connection error:', error);
      // Example: Check if it's an auth error and try to refresh token or logout
      // if (error.message.includes('authentication error')) {
      //   this.authService.logout();
      // }
    });

    this.socket.on('newMessage', (event: NewMessageEvent) => {
      // console.log('[ChatService] Received newMessage event:', event);
      const { message, chatId } = event;
      const currentMessages = this.messagesSubject.getValue();
      const currentChat = this.currentChatSubject.getValue();

      if (currentChat && currentChat.id === chatId) {
        // console.log('[ChatService] Message for current chat, updating messages and current chat.');
        this.messagesSubject.next([...currentMessages, message]);
        this.currentChatSubject.next({ ...currentChat, lastMessage: message, updatedAt: new Date() });
        if (message.senderId !== this.currentUserId) {
          this.markMessagesAsRead(chatId, [message.id]);
        }
      } else {
        // console.log('[ChatService] Message for a different chat.');
        const currentConversations = this.conversationsSubject.getValue();
        const updatedConversations = currentConversations.map(convo => {
          if (convo.id === chatId) {
            const newUnreadCount = (convo.unreadCount || 0) + (event.isNewUnread ? 1 : 0);
            // console.log(`[ChatService] Updating unread count for chat ${chatId} to ${newUnreadCount}`);
            return { ...convo, lastMessage: message, updatedAt: new Date(), unreadCount: newUnreadCount };
          }
          return convo;
        });
        this.conversationsSubject.next(updatedConversations);
        if (event.isNewUnread) {
          this.updateTotalUnreadCount();
        }
      }
    });

    this.socket.on('messageRead', (data: { chatId: number; messageId: number; readerId: number }) => {
      // console.log('[ChatService] Received messageRead event:', data);
      const currentMessages = this.messagesSubject.getValue();
      const updatedMessages = currentMessages.map(msg => {
        if (msg.id === data.messageId) {
          return { ...msg, read: true, status: 'read' as 'read' };
        }
        return msg;
      });
      this.messagesSubject.next(updatedMessages);

      // Emit status update
      this.messageStatusUpdateSubject.next({
        chatId: data.chatId,
        messageIds: [String(data.messageId)],
        status: 'read'
      });

      const currentChat = this.currentChatSubject.getValue();
      if (currentChat && currentChat.id === data.chatId) {
        const unreadInCurrentChat = updatedMessages.filter(m => m.senderId !== this.currentUserId && !m.read).length;
        // console.log(`[ChatService] Unread messages in current chat ${data.chatId} after read event: ${unreadInCurrentChat}`);

        const currentConversations = this.conversationsSubject.getValue();
        const updatedConversations = currentConversations.map(convo => {
          if (convo.id === data.chatId) {
            // console.log(`[ChatService] Updating unread count for chat ${data.chatId} to ${unreadInCurrentChat} after read event.`);
            return { ...convo, unreadCount: unreadInCurrentChat };
          }
          return convo;
        });
        this.conversationsSubject.next(updatedConversations);
      }
      this.updateTotalUnreadCount();
    });

    this.socket.on('messagesMarkedAsRead', (data: { chatId: number; messageIds: number[]; readerId: number }) => {
      // console.log('[ChatService] Received messagesMarkedAsRead event:', data);
      const currentMessages = this.messagesSubject.getValue();
      const updatedMessages = currentMessages.map(msg => {
        if (data.messageIds.includes(msg.id)) {
          return { ...msg, read: true, status: 'read' as 'read' };
        }
        return msg;
      });
      this.messagesSubject.next(updatedMessages);

      // Emit status update
      this.messageStatusUpdateSubject.next({
        chatId: data.chatId,
        messageIds: data.messageIds.map(id => String(id)),
        status: 'read'
      });

      const currentChat = this.currentChatSubject.getValue();
      if (currentChat && currentChat.id === data.chatId) {
        const unreadInCurrentChat = updatedMessages.filter(m => m.senderId !== this.currentUserId && !m.read).length;
        // console.log(`[ChatService] Unread messages in current chat ${data.chatId} after batch read event: ${unreadInCurrentChat}`);

        const currentConversations = this.conversationsSubject.getValue();
        const updatedConversations = currentConversations.map(convo => {
          if (convo.id === data.chatId) {
            // console.log(`[ChatService] Updating unread count for chat ${data.chatId} to ${unreadInCurrentChat} after batch read event.`);
            return { ...convo, unreadCount: unreadInCurrentChat };
          }
          return convo;
        });
        this.conversationsSubject.next(updatedConversations);
      }
      this.updateTotalUnreadCount();
    });    this.socket.on('conversationUpdated', (updatedConversation: Chat) => {
      // console.log('[ChatService] Received conversationUpdated event:', updatedConversation);
      const currentConversations = this.conversationsSubject.getValue();
      const index = currentConversations.findIndex(c => c.id === updatedConversation.id);
      if (index !== -1) {
        currentConversations[index] = updatedConversation;
        this.conversationsSubject.next([...currentConversations]);
      } else {
        this.conversationsSubject.next([updatedConversation, ...currentConversations]);
      }

      const currentChat = this.currentChatSubject.getValue();
      if (currentChat && currentChat.id === updatedConversation.id) {
        this.currentChatSubject.next(updatedConversation);
      }
      this.updateTotalUnreadCount();
    });

    this.socket.on('messageStatusUpdate', (data: { type: string; chatId: string; readerUserId: string; status: 'read' | 'delivered' | 'sent'; messageIds: string[] }) => {
      // console.log('[ChatService] Received messageStatusUpdate event:', data);
      // Emit the status update to the subject for components to handle
      this.messageStatusUpdateSubject.next({
        chatId: parseInt(data.chatId, 10),
        messageIds: data.messageIds,
        status: data.status
      });
    });

    this.socket.on('onlineUsers', (users: User[]) => {
      // console.log('[ChatService] Received onlineUsers event:', users);
      this.onlineUsersSubject.next(users);
    });

    this.socket.on('userStatusChanged', (data: { userId: number; isOnline: boolean }) => {
      // console.log('[ChatService] Received userStatusChanged event:', data);
    });

    this.socket.on('error', (error: any) => {
      // console.error('[ChatService] Socket error event:', error);
    });
  }

  fetchConversations(): Observable<Chat[]> {
    // console.log('[ChatService] Fetching conversations from API...');
    return this.http.get<{ conversations: Chat[] }>(`${this.apiUrl}/chat/conversations`).pipe(
      map(response => response.conversations), // Extract the conversations array
      tap(conversations => {
        // console.log('[ChatService] Fetched conversations:', conversations);
        this.conversationsSubject.next(conversations);
        this.updateTotalUnreadCount();
      }),
      catchError(error => {
        // console.error('[ChatService] Error fetching conversations:', error);
        return throwError(() => new Error('Failed to fetch conversations'));
      })
    );
  }

  fetchMessages(chatId: number): Observable<Message[]> {
    // console.log(`[ChatService] Fetching messages for chat ID: ${chatId}...`);
    return this.http.get<{ messages: Message[] }>(`${this.apiUrl}/chat/${chatId}/messages`).pipe(
      tap(rawResponse => {
        // console.log(`[ChatService] Raw HTTP response for messages (chat ${chatId}):`, JSON.stringify(rawResponse, null, 2));
      }),
      map(response => response.messages), // Extract the messages array
      tap(processedMessages => {
        // console.log(`[ChatService] Processed messages for chat ${chatId}:`, JSON.stringify(processedMessages, null, 2));
        this.messagesSubject.next(processedMessages);
        const unreadMessageIds = processedMessages
          .filter(msg => !msg.read && msg.senderId !== this.currentUserId)
          .map(msg => msg.id);

        if (unreadMessageIds.length > 0) {
          // console.log(`[ChatService] Marking ${unreadMessageIds.length} messages as read for chat ${chatId}.`);
          this.markMessagesAsRead(chatId, unreadMessageIds);
        } else {
          // console.log(`[ChatService] No unread messages to mark for chat ${chatId}.`);
        }
      }),
      catchError(error => {
        console.error(`[ChatService] Full error object fetching messages for chat ${chatId}:`, error);
        return throwError(() => new Error('Failed to fetch messages'));
      })
    );
  }

  selectConversation(chatId: number): void {
    // console.log(`[ChatService] Selecting conversation with ID: ${chatId}`);
    const selectedChat = this.conversationsSubject.getValue().find(c => c.id === chatId);
    if (selectedChat) {
      this.currentChatSubject.next(selectedChat);
      this.fetchMessages(chatId).subscribe();

      if (selectedChat.unreadCount && selectedChat.unreadCount > 0) {
        // console.log(`[ChatService] Resetting unread count for chat ${chatId} upon selection.`);
        const updatedConversations = this.conversationsSubject.getValue().map(convo =>
          convo.id === chatId ? { ...convo, unreadCount: 0 } : convo
        );
        this.conversationsSubject.next(updatedConversations);
        this.updateTotalUnreadCount();
      }

    } else {
      // console.warn(`[ChatService] Conversation with ID ${chatId} not found.`);
    }
  }

  markMessagesAsRead(chatId: number, messageIds: number[]): void {
    if (!this.currentUserId || messageIds.length === 0) {
      // console.log('[ChatService] No messages to mark as read or user not identified.');
      return;
    }
    // console.log(`[ChatService] Emitting markAsRead for chat ${chatId}, messages:`, messageIds);
    this.socket.emit('markAsRead', { chatId, messageIds: messageIds.map(id => String(id)), readerId: this.currentUserId });

    const currentMessages = this.messagesSubject.getValue();
    const updatedMessages = currentMessages.map(msg =>
      messageIds.includes(msg.id) ? { ...msg, read: true, status: 'read' as 'read' } : msg
    );
    this.messagesSubject.next(updatedMessages);

    const unreadInCurrentChat = updatedMessages.filter(m => m.senderId !== this.currentUserId && !m.read).length;
    // console.log(`[ChatService] Unread messages in current chat ${chatId} after optimistic update: ${unreadInCurrentChat}`);

    const currentConversations = this.conversationsSubject.getValue();
    const updatedConversations = currentConversations.map(convo => {
      if (convo.id === chatId) {
        // console.log(`[ChatService] Updating unread count for chat ${chatId} to ${unreadInCurrentChat} after optimistic markAsRead.`);
        return { ...convo, unreadCount: unreadInCurrentChat };
      }
      return convo;
    });
    this.conversationsSubject.next(updatedConversations);
    this.updateTotalUnreadCount();
  }


  clearCurrentConversation(): void {
    // console.log('[ChatService] Clearing current conversation.');
    this.currentChatSubject.next(null);
    this.messagesSubject.next([]);
  }

  getParticipantById(participants: ChatParticipant[], userId: number): ChatParticipant | undefined {
    // console.log(`[ChatService] Getting participant by ID: ${userId} from`, participants);
    return participants.find(p => p.id === userId);
  }

  public getCurrentUserId(): number | null {
    return this.currentUserId;
  }

  // Renamed from getAllUsers
  getAvailableUsers(): Observable<User[]> {
    // console.log('[ChatService] Fetching all users for chat...');
    return this.http.get<{ users: User[] }>(`${this.apiUrl}/chat/users`).pipe(
      map(response => response.users), // Extract the users array
      tap(users => {
        // console.log('[ChatService] Fetched all users for chat:', users);
      }),
      catchError(error => {
        // console.error('[ChatService] Error fetching all users for chat:', error);
        return throwError(() => new Error('Failed to fetch users for chat'));
      })
    );
  }

  createChat(name: string | undefined, isGroup: boolean, participantIds: number[]): Observable<Chat> {
    // console.log(`[ChatService] Creating new chat. Name: ${name}, IsGroup: ${isGroup}, Participants:`, participantIds);
    if (!this.currentUserId) {
      // console.error('[ChatService] Cannot create chat, current user ID is null.');
      return throwError(() => new Error('User not authenticated'));
    }

    const payload: CreateChatRequest = {
      name: isGroup ? name : undefined,
      isGroup,
      participants: participantIds
    };

    // console.log('[ChatService] Create chat payload:', payload);

    return this.http.post<Chat>(`${this.apiUrl}/chat`, payload).pipe(
      tap(newChat => {
        // console.log('[ChatService] Successfully created new chat:', newChat);
        const currentConversations = this.conversationsSubject.getValue();
        this.conversationsSubject.next([newChat, ...currentConversations]);
        this.selectConversation(newChat.id);
      }),
      catchError(error => {
        // console.error('[ChatService] Error creating new chat:', error);
        return throwError(() => new Error('Failed to create chat'));
      })
    );
  }


  sendMessage(chatId: number, content: string, recipientId?: number): Observable<Message> {
    // console.log(`[ChatService] Sending message to chat ID: ${chatId}. Content: ${content}`);
    if (!this.currentUserId) {
      // console.error('[ChatService] Cannot send message, current user ID is null.');
      return throwError(() => new Error('User not authenticated'));
    }

    const messagePayload = {
      chatId,
      senderId: this.currentUserId,
      content,
      recipientId
    };

    // console.log('[ChatService] Send message payload:', messagePayload);

    this.socket.emit('sendMessage', messagePayload, (ack: any) => {
      if (ack && ack.success && ack.message) {
        // console.log('[ChatService] Message sent and acknowledged by server:', ack.message);
      } else if (ack && ack.error) {
        // console.error('[ChatService] Server acknowledgment error for sendMessage:', ack.error);
      } else {
        // console.warn('[ChatService] Message sent, but no detailed acknowledgment from server.');
      }
    });

    return this.http.post<Message>(`${this.apiUrl}/chat/${chatId}/messages`, messagePayload).pipe(
      tap(sentMessage => {
        // console.log('[ChatService] Message successfully persisted via HTTP POST:', sentMessage);
      }),
      catchError(error => {
        // console.error('[ChatService] Error sending message via HTTP POST:', error);
        return throwError(() => new Error('Failed to send message'));
      })
    );
  }

  private updateTotalUnreadCount(): void {
    const conversations = this.conversationsSubject.getValue();
    const totalUnread = conversations.reduce((acc, convo) => acc + (convo.unreadCount || 0), 0);
    // console.log(`[ChatService] Updating total unread messages count to: ${totalUnread}`);
    this.unreadMessagesCount.next(totalUnread);
  }

  // Method for components to subscribe to message status updates
  getMessageStatusUpdateListener(): Observable<MessageStatusUpdate | null> {
    return this.messageStatusUpdateSubject.asObservable();
  }

  getConversationAvatar(chat: Chat): string {
    // console.log('[ChatService] Getting conversation avatar for chat:', chat);
    if (chat.isGroup) {
      return chat.avatarPath || 'assets/images/default-group-avatar.png';
    } else {
      const otherParticipant = this.getOtherParticipant(chat, this.currentUserId); // Use helper
      if (otherParticipant) {
        // console.log('[ChatService] Other participant for avatar:', otherParticipant);
        return otherParticipant.profileImage || 'assets/images/default-avatar.png';
      }
      return 'assets/images/default-avatar.png';
    }
  }

  // Helper method to get the other participant in a one-on-one chat
  getOtherParticipant(chat: Chat, currentUserId: number | null): ChatParticipant | undefined {
    if (!chat || chat.isGroup || !currentUserId) {
      return undefined;
    }
    return chat.participants.find(p => p.id !== currentUserId);
  }

  // Method to close chat connection explicitly
  closeChatConnection(): void {
    if (this.socket) {
      this.socket.disconnect();
      // console.log('[ChatService] Socket disconnected explicitly by closeChatConnection.');
    }
  }

  cleanupUserSession(): void {
    // console.log('[ChatService] Cleaning up user session.');
    this.clearCurrentConversation();
    this.closeChatConnection();
    // Potentially reset other subjects if needed, e.g., conversations, online users
    this.conversationsSubject.next([]);
    this.onlineUsersSubject.next([]);
    this.unreadMessagesCount.next(0);
  }

  // Method to upload group avatar
  uploadGroupAvatar(chatId: number, avatarFile: File): Observable<{ avatarPath: string }> {
    const formData = new FormData();
    formData.append('avatar', avatarFile);
    // console.log(`[ChatService] Uploading group avatar for chat ID: ${chatId}`);
    return this.http.post<{ avatarPath: string }>(`${this.apiUrl}/chat/${chatId}/avatar`, formData).pipe(
      tap(response => {
        // console.log('[ChatService] Group avatar uploaded successfully:', response);
        const currentConversations = this.conversationsSubject.getValue();
        const updatedConversations = currentConversations.map(convo =>
          convo.id === chatId ? { ...convo, avatarPath: response.avatarPath } : convo
        );
        this.conversationsSubject.next(updatedConversations);

        const currentChat = this.currentChatSubject.getValue();
        if (currentChat && currentChat.id === chatId) {
          this.currentChatSubject.next({ ...currentChat, avatarPath: response.avatarPath });
        }
      }),
      catchError(error => {
        // console.error('[ChatService] Error uploading group avatar:', error);
        return throwError(() => new Error('Failed to upload group avatar'));
      })
    );
  }

  // Method to remove group avatar
  removeGroupAvatar(chatId: number): Observable<any> {
    // console.log(`[ChatService] Removing group avatar for chat ID: ${chatId}`);
    return this.http.delete(`${this.apiUrl}/chat/${chatId}/avatar`).pipe(
      tap(() => {
        // console.log('[ChatService] Group avatar removed successfully.');
        const defaultAvatar = 'assets/images/default-group-avatar.png';
        const currentConversations = this.conversationsSubject.getValue();
        const updatedConversations = currentConversations.map(convo =>
          convo.id === chatId ? { ...convo, avatarPath: defaultAvatar } : convo
        );
        this.conversationsSubject.next(updatedConversations);

        const currentChat = this.currentChatSubject.getValue();
        if (currentChat && currentChat.id === chatId) {
          this.currentChatSubject.next({ ...currentChat, avatarPath: defaultAvatar });
        }
      }),
      catchError(error => {
        // console.error('[ChatService] Error removing group avatar:', error);
        return throwError(() => new Error('Failed to remove group avatar'));
      })
    );
  }
}
