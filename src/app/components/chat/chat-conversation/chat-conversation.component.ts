// filepath: /workspaces/AA_Space/src/app/components/chat/chat-conversation/chat-conversation.component.ts
import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chat, Message } from '../../../models/chat/chat.interface';
import { ChatService } from '../../../services/chat.service';
import { ChatHeaderComponent } from './chat-header/chat-header.component';
import { ChatMessagesComponent } from './chat-messages/chat-messages.component';

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
  currentUserId: number;
  loading = false;
  error: string | null = null;
  sending = false;
  defaultImage: string = '/assets/images/user.png';

  // Handler para o evento de atualização de imagem de perfil
  private profileImageUpdatedHandler = () => {
    console.log('[CHAT CONVERSATION] Evento de atualização de imagem detectado, recarregando mensagens');
    if (this.selectedChat) {
      this.loadMessages();
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
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedChat'] && changes['selectedChat'].currentValue) {
      this.loadMessages();
    }
  }

  // Cache estático de timestamps para URLs de imagem
  private static imageTimestamps: Record<string, number> = {};
  
  // Método para formatar URL da imagem
  formatImageUrl(imagePath: string): string {
    if (!imagePath) return this.defaultImage;
    
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('data:')) return imagePath;
    
    if (!imagePath.startsWith('/')) {
      imagePath = '/' + imagePath;
    }
    
    if (imagePath.includes('/assets/')) {
      imagePath = imagePath.replace('/assets/', '/uploads/assets/');
    }
    
    const origin = document.location.origin;
    const apiOrigin = origin.replace(/-4200\./, '-3001.');
    
    // Usar timestamp consistente por caminho para evitar ExpressionChangedAfterItHasBeenCheckedError
    if (imagePath.includes('/uploads/profiles/')) {
      // Se não temos um timestamp para este caminho, criar um
      if (!ChatConversationComponent.imageTimestamps[imagePath]) {
        ChatConversationComponent.imageTimestamps[imagePath] = Date.now();
      }
      
      return `${apiOrigin}${imagePath}?t=${ChatConversationComponent.imageTimestamps[imagePath]}`;
    }
    
    return `${apiOrigin}${imagePath}`;
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
          this.messages.push(sentMessage);
          this.sending = false;
        },
        error: (err) => {
          console.error('Erro ao enviar mensagem:', err);
          this.error = 'Falha ao enviar mensagem. Tente novamente.';
          this.sending = false;
        }
      });
  }

  // Carrega as mensagens do chat selecionado
  private loadMessages(): void {
    if (!this.selectedChat) return;

    this.loading = true;
    this.error = null;

    this.chatService.getMessages(this.selectedChat.id)
      .subscribe({
        next: (messages) => {
          this.messages = messages;
          this.loading = false;
        },
        error: (err) => {
          console.error('Erro ao carregar mensagens:', err);
          this.error = 'Falha ao carregar mensagens. Tente novamente.';
          this.loading = false;
        }
      });
  }
}
