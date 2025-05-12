// filepath: /workspaces/AA_Space/src/app/components/chat/chat-conversation/chat-conversation.component.ts
import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chat, Message, ChatParticipant } from '../../../models/chat/chat.interface'; // Importar ChatParticipant
import { ChatService } from '../../../services/chat.service';
import { ChatHeaderComponent } from './chat-header/chat-header.component';
import { ChatMessagesComponent } from './chat-messages/chat-messages.component';
import { Subscription } from 'rxjs'; // Importar Subscription

@Component({
  selector: 'app-chat-conversation',
  templateUrl: './chat-conversation.component.html',
  styleUrls: ['./chat-conversation.component.css'], // Corrigido aqui
  standalone: true,
  imports: [CommonModule, FormsModule, ChatHeaderComponent, ChatMessagesComponent]
})
export class ChatConversationComponent implements OnChanges, OnInit, OnDestroy {
  @Input() selectedChat: Chat | null = null;

  messages: Message[] = [];
  currentUserId: number;
  loading = false;
  error: string | null = null;
  sending = false;
  defaultImage: string = '/assets/images/user.png';

  private messageSubscription: Subscription | null = null; // Para gerenciar a inscrição do WebSocket

  // Handler para o evento de atualização de imagem de perfil
  private profileImageUpdatedHandler = () => {
    console.log('[CHAT CONVERSATION] Evento de atualização de imagem detectado, recarregando mensagens');
    if (this.selectedChat) {
      this.loadMessagesAndListen();
    }
  };

  constructor(private chatService: ChatService) {
    this.currentUserId = this.chatService.getCurrentUserId();
  }

  ngOnInit(): void {
    // Adiciona o listener para atualização de imagem de perfil
    window.addEventListener('profile:imageUpdated', this.profileImageUpdatedHandler);
  }

  ngOnDestroy(): void {
    // Remove o listener de eventos quando o componente é destruído
    window.removeEventListener('profile:imageUpdated', this.profileImageUpdatedHandler);
    this.unsubscribeFromMessages(); // Cancelar inscrição do WebSocket
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
      const newChat = changes['selectedChat'].currentValue as Chat | null; // Added type assertion
      const oldChat = changes['selectedChat'].previousValue as Chat | null; // Added type assertion

      console.log('[CONVO] ngOnChanges - selectedChat changed. New:', newChat, 'Old:', oldChat);

      if (newChat?.id !== oldChat?.id) {
        console.log('[CONVO] ngOnChanges - Chat ID changed or became defined/undefined. Unsubscribing from previous messages.');
        this.unsubscribeFromMessages();
      }

      if (newChat) {
        console.log(`[CONVO] ngOnChanges - New chat selected (ID: ${newChat.id}). Participants:`, newChat.participants);
        console.log(`[CONVO] ngOnChanges - Current user ID: ${this.currentUserId}`);
        if (!newChat.isGroup) {
          const otherParticipant = newChat.participants.find((p: ChatParticipant) => Number(p.id) !== Number(this.currentUserId));
          if (otherParticipant) {
            console.log(`[CHAT CONVERSATION] Outro participante identificado: ${otherParticipant.username} (ID: ${otherParticipant.id})`);
          } else {
            console.warn('[CHAT CONVERSATION] Não foi possível identificar o outro participante');
          }
        }
        this.loadMessagesAndListen();
      } else {
        console.log('[CONVO] ngOnChanges - No chat selected. Clearing messages and unsubscribing.');
        this.messages = [];
        this.unsubscribeFromMessages();
      }
    }
  }

  // Cache estático de timestamps para URLs de imagem
  private static imageTimestamps: Record<string, number> = {};
  // Método para formatar URL da imagem
  formatImageUrl(imagePath: string): string {
    if (!imagePath) return this.defaultImage;

    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('data:')) return imagePath;

    let apiOrigin = 'http://localhost:3001';

    if (document.location.hostname.includes('github')) {
      const origin = document.location.origin;
      apiOrigin = origin.replace(/-4200\./, '-3001.');
    }

    if (imagePath.includes('profiles/')) {
      if (!imagePath.includes('/uploads/')) {
        imagePath = '/uploads/' + (imagePath.startsWith('/') ? imagePath.substring(1) : imagePath);
      }
    } else if (imagePath.includes('/assets/')) {
      imagePath = '/uploads/assets/' + imagePath.split('/assets/')[1];
    } else if (!imagePath.startsWith('/')) {
      imagePath = '/' + imagePath;
    }

    console.log(`[CHAT CONVERSATION] Formatando URL de imagem: ${imagePath} -> ${apiOrigin}${imagePath}`);

    if (!ChatConversationComponent.imageTimestamps[imagePath]) {
      ChatConversationComponent.imageTimestamps[imagePath] = Date.now();
    }

    return `${apiOrigin}${imagePath}?t=${ChatConversationComponent.imageTimestamps[imagePath]}`;
  }

  // Método para enviar mensagem através do componente filho
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

  // Carrega as mensagens do chat selecionado e começa a escutar por novas
  private loadMessagesAndListen(): void {
    if (!this.selectedChat) {
      console.log('[CONVO] loadMessagesAndListen - No selected chat, returning.');
      return;
    }
    console.log(`[CONVO] loadMessagesAndListen - START for chat ID ${this.selectedChat.id}`);

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
          console.log(`[CONVO] loadMessagesAndListen - ${messages.length} messages loaded via HTTP for chat ID ${this.selectedChat?.id}`);
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
    console.log('[CONVO] listenForNewMessages - START.');
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
          console.log('[CONVO] listenForNewMessages - New message received via WebSocket:', newMessage);
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
