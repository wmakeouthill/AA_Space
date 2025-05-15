// filepath: /workspaces/AA_Space/src/app/components/chat/chat-conversation/chat-conversation.component.ts
import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chat, Message, ChatParticipant } from '../../../models/chat/chat.interface';
import { ChatService } from '../../../services/chat.service';
import { ProfileService, UserProfile } from '../../../services/profile.service'; // Import ProfileService and UserProfile
import { ChatHeaderComponent } from './chat-header/chat-header.component';
import { ChatMessagesComponent } from './chat-messages/chat-messages.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat-conversation',
  templateUrl: './chat-conversation.component.html',
  styleUrls: ['./chat-conversation.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, ChatHeaderComponent, ChatMessagesComponent]
})
export class ChatConversationComponent implements OnChanges, OnInit, OnDestroy {
  @Input() selectedChat: Chat | null = null;

  messages: Message[] = [];
  currentUserId!: number; // Will be set by ProfileService
  currentUserProfileImageUrl: string | null = null; // For current user's avatar
  loading = false;
  error: string | null = null;
  sending = false;
  defaultImage: string = '/assets/images/user.png';

  private messageSubscription: Subscription | null = null;
  private userProfileSubscription!: Subscription; // Changed from authSubscription

  private profileImageUpdatedHandler = () => {
    console.log('[CHAT CONVERSATION] Evento de atualização de imagem detectado, recarregando mensagens');
    if (this.selectedChat) {
      this.loadMessagesAndListen();
    }
  };

  constructor(
    private chatService: ChatService,
    private profileService: ProfileService // Inject ProfileService
  ) {
    console.log('[CONVO] Constructor: Initializing component.');
  }

  ngOnInit(): void {
    console.log('[CONVO] ngOnInit: Initializing component.');
    window.addEventListener('profile:imageUpdated', this.profileImageUpdatedHandler);

    this.userProfileSubscription = this.profileService.getCurrentUserProfile().subscribe((userProfile: UserProfile) => {
      const previousUserId = this.currentUserId; // Store previous userId
      if (userProfile && userProfile.id !== undefined) {
        this.currentUserId = userProfile.id;
        this.currentUserProfileImageUrl = userProfile.profileImage || this.defaultImage;
        console.warn(`[CONVO] ngOnInit: Current user profile updated from ProfileService. ID: ${this.currentUserId}, Avatar: ${this.currentUserProfileImageUrl}`); // Changed to warn

        // Log the state of selectedChat right before the condition
        console.warn(`[CONVO] ngOnInit: Checking condition to load messages. selectedChat:`, this.selectedChat);

        // If currentUserId is now valid and was previously invalid, and a chat is selected, load messages.
        if (this.selectedChat && (previousUserId === undefined || previousUserId === null || previousUserId === -1) && (this.currentUserId !== undefined && this.currentUserId !== null && this.currentUserId !== -1)) {
          console.warn(`[CONVO] ngOnInit: currentUserId is now valid (${this.currentUserId}) and a chat (ID: ${this.selectedChat.id}) is selected. Triggering message load.`); // Changed to warn
          this.loadMessagesAndListen();
        }
      } else {
        console.warn('[CONVO] ngOnInit: No user profile or user ID from ProfileService. UserProfile:', userProfile);
        this.currentUserId = -1;
        this.currentUserProfileImageUrl = this.defaultImage;
      }
    });
  }

  ngOnDestroy(): void {
    console.log('[CONVO] ngOnDestroy: Cleaning up component.');
    window.removeEventListener('profile:imageUpdated', this.profileImageUpdatedHandler);
    this.unsubscribeFromMessages();

    if (this.userProfileSubscription) {
      this.userProfileSubscription.unsubscribe();
      console.log('[CONVO] ngOnDestroy: Unsubscribed from ProfileService.');
    }
  }

  private unsubscribeFromMessages(): void {
    if (this.messageSubscription) {
      console.log(`[CONVO] unsubscribeFromMessages - Unsubscribing from WebSocket for chat ID ${this.selectedChat?.id}. Current subscription:`, this.messageSubscription);
      this.messageSubscription.unsubscribe();
      this.messageSubscription = null;
      if (this.selectedChat) {
        console.log(`[CONVO] unsubscribeFromMessages - Calling chatService.closeChatConnection for chat ID ${this.selectedChat.id}`);
        this.chatService.closeChatConnection(this.selectedChat.id);
      }
      console.log('[CONVO] unsubscribeFromMessages - COMPLETED.');
    } else {
      console.log('[CONVO] unsubscribeFromMessages - No active messageSubscription to unsubscribe from.');
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedChat']) {
      const newChat = changes['selectedChat'].currentValue as Chat | null;
      const oldChat = changes['selectedChat'].previousValue as Chat | null;

      console.log('[CONVO] ngOnChanges - selectedChat changed. New:', newChat, 'Old:', oldChat);

      // This log remains useful to know the state of currentUserId when selectedChat changes
      if (this.currentUserId === undefined || this.currentUserId === null || this.currentUserId === -1) {
        console.warn('[CONVO] ngOnChanges: currentUserId not yet available or invalid. Value:', this.currentUserId, 'Waiting for ProfileService. Selected chat:', newChat);
      }

      if (newChat?.id !== oldChat?.id) {
        console.log('[CONVO] ngOnChanges - Chat ID changed or became defined/undefined. Unsubscribing from previous messages.');
        this.unsubscribeFromMessages();
      }

      if (newChat) {
        console.log(`[CONVO] ngOnChanges - New chat selected (ID: ${newChat.id}). Participants:`, newChat.participants);
        // Only load messages if currentUserId is valid
        if (this.currentUserId !== undefined && this.currentUserId !== null && this.currentUserId !== -1) {
          console.warn(`[CONVO] ngOnChanges - Current user ID is valid: ${this.currentUserId}. Loading messages.`); // Changed to warn
          this.loadMessagesAndListen();
        } else {
          console.warn(`[CONVO] ngOnChanges - Current user ID is NOT YET VALID (${this.currentUserId}). Waiting for ProfileService to update it before loading messages for chat ${newChat.id}.`);
          // Messages will be loaded by the logic in ngOnInit when currentUserId becomes available.
        }
      } else {
        console.log('[CONVO] ngOnChanges - No chat selected. Clearing messages and unsubscribing.');
        this.messages = [];
        this.unsubscribeFromMessages();
      }
    }
  }

  private static imageTimestamps: Record<string, number> = {};
  formatImageUrl(imagePath: string): string {
    if (!imagePath) return this.defaultImage;

    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
      return imagePath;
    }

    let apiOrigin = 'https://v3mrhcvc-3001.brs.devtunnels.ms/';
    if (typeof window !== 'undefined') {
      if (window.location.hostname.includes('github')) {
        const origin = window.location.origin;
        apiOrigin = origin.replace(/-4200\./, '-3001.');
      } else if (window.location.hostname === 'localhost') {
        apiOrigin = 'http://localhost:3001';
      }
    }

    let normalizedPath = imagePath;
    if (imagePath.includes('profiles/') && !imagePath.includes('/uploads/')) {
      normalizedPath = '/uploads' + (imagePath.startsWith('/') ? '' : '/') + imagePath;
    } else if (imagePath.includes('/assets/') && !imagePath.startsWith('/uploads/assets/')) {
      normalizedPath = '/uploads/assets/' + imagePath.split('/assets/').pop();
    } else if (!imagePath.startsWith('/')) {
      normalizedPath = '/' + imagePath;
    }

    const finalPath = (apiOrigin.endsWith('/') && normalizedPath.startsWith('/'))
      ? apiOrigin + normalizedPath.substring(1)
      : apiOrigin + normalizedPath;

    console.log(`[CHAT CONVERSATION] Formatting URL. Input: "${imagePath}", Origin: "${apiOrigin}", Normalized: "${normalizedPath}", Output: "${finalPath}"`);

    return finalPath;
  }

  onMessageSent(message: string): void {
    if (!message.trim() || !this.selectedChat) {
      return;
    }

    this.sending = true;
    this.error = null;

    this.chatService.sendMessage(this.selectedChat.id, message)
      .subscribe({
        next: (sentMessage) => {
          console.log('[CHAT CONVERSATION] Mensagem enviada via HTTP, aguardando WebSocket para atualização.');
          this.sending = false;
        },
        error: (err) => {
          console.error('Erro ao enviar mensagem:', err);
          this.error = 'Falha ao enviar mensagem. Tente novamente.';
          this.sending = false;
        }
      });
  }

  private loadMessagesAndListen(): void {
    if (!this.selectedChat) {
      console.log('[CONVO] loadMessagesAndListen - No selected chat, returning.');
      return;
    }
    console.warn(`[CONVO] loadMessagesAndListen - START for chat ID ${this.selectedChat.id}`); // Changed to warn

    this.loading = true;
    this.error = null;

    console.log(`[CHAT CONVERSATION] Carregando mensagens para o chat ID ${this.selectedChat.id}`);
    if (this.selectedChat.participants && this.selectedChat.participants.length > 0) {
      this.selectedChat.participants.forEach((p: ChatParticipant) => {
        console.log(`[CHAT CONVERSATION] Participante: ID=${p.id} (${typeof p.id}), Nome=${p.username}`);
      });
    }
    console.log(`[CHAT CONVERSATION] ID do usuário atual: ${this.currentUserId} (${typeof this.currentUserId})`);

    this.chatService.getMessages(this.selectedChat.id)
      .subscribe({
        next: (messages) => {
          console.warn(`[CONVO] loadMessagesAndListen - ${messages.length} messages loaded via HTTP for chat ID ${this.selectedChat?.id}`); // Changed to warn
          this.messages = messages;
          this.loading = false;

          console.log('[CONVO] loadMessagesAndListen - Calling listenForNewMessages() after HTTP messages loaded.');
          this.listenForNewMessages();
        },
        error: (err) => {
          console.error('[CONVO] loadMessagesAndListen - Error loading HTTP messages:', err);
          this.error = 'Falha ao carregar mensagens. Tente novamente.';
          this.loading = false;
        }
      });
  }

  private listenForNewMessages(): void {
    console.warn('[CONVO] listenForNewMessages - START.'); // Changed to warn
    if (!this.selectedChat) {
      console.log('[CONVO] listenForNewMessages - No selected chat, returning.');
      return;
    }
    if (this.messageSubscription) {
      console.log(`[CONVO] listenForNewMessages - Already have an active messageSubscription for chat ${this.selectedChat.id}. Returning.`);
      return;
    }

    console.log(`[CONVO] listenForNewMessages - Attempting to subscribe to WebSocket for chat ID ${this.selectedChat.id}. Current messageSubscription state:`, this.messageSubscription);
    this.messageSubscription = this.chatService.listenForNewMessages(this.selectedChat.id)
      .subscribe({
        next: (newMessage) => {
          console.warn('[CONVO] listenForNewMessages - New message received via WebSocket:', newMessage); // Changed to warn
          const existingMessageIndex = this.messages.findIndex(m => m.id === newMessage.id);
          if (existingMessageIndex === -1) {
            this.messages = [...this.messages, newMessage];
          } else {
            console.log('[CONVO] listenForNewMessages - Duplicate message ID received via WebSocket, ignoring or updating.');
          }
        },
        error: (err) => {
          console.error('[CONVO] listenForNewMessages - Error subscribing to WebSocket:', err);
          this.error = 'Erro na conexão em tempo real. As mensagens podem não atualizar automaticamente.';
          this.unsubscribeFromMessages();
        },
        complete: () => {
          console.log(`[CONVO] listenForNewMessages - WebSocket observable COMPLETED for chat ID ${this.selectedChat?.id}`);
        }
      });
    console.log(`[CONVO] listenForNewMessages - Subscribed to WebSocket. messageSubscription:`, this.messageSubscription);
  }
}
