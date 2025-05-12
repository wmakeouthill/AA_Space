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
      console.log('[CHAT CONVERSATION] Chat selecionado mudou:', this.selectedChat);

      if (this.selectedChat) {
        // Log dos participantes para debug
        console.log(`[CHAT CONVERSATION] Participantes do chat (ID: ${this.selectedChat.id}):`, this.selectedChat.participants);
        console.log(`[CHAT CONVERSATION] ID do usuário atual: ${this.currentUserId}`);

        // Identificar o outro participante para debug
        if (!this.selectedChat.isGroup) {
          const otherParticipant = this.selectedChat.participants.find(p => Number(p.id) !== Number(this.currentUserId));
          if (otherParticipant) {
            console.log(`[CHAT CONVERSATION] Outro participante identificado: ${otherParticipant.username} (ID: ${otherParticipant.id})`);
          } else {
            console.warn('[CHAT CONVERSATION] Não foi possível identificar o outro participante');
          }
        }
      }

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

    // Determinar a origem da API (URL do backend)
    let apiOrigin = 'http://localhost:3001'; // URL padrão para desenvolvimento local

    // Para ambientes onde o frontend está em um domínio diferente do backend
    if (document.location.hostname.includes('github')) {
      const origin = document.location.origin;
      apiOrigin = origin.replace(/-4200\./, '-3001.');
    }

    // Corrigir o caminho para acessar diretamente os arquivos em /uploads/profiles
    if (imagePath.includes('profiles/')) {
      // Verificar se o caminho já contém /uploads
      if (!imagePath.includes('/uploads/')) {
        imagePath = '/uploads/' + (imagePath.startsWith('/') ? imagePath.substring(1) : imagePath);
      }
    } else if (imagePath.includes('/assets/')) {
      // Para imagens em assets, criar um caminho mais direto
      imagePath = '/uploads/assets/' + imagePath.split('/assets/')[1];
    } else if (!imagePath.startsWith('/')) {
      imagePath = '/' + imagePath;
    }

    console.log(`[CHAT CONVERSATION] Formatando URL de imagem: ${imagePath} -> ${apiOrigin}${imagePath}`);

    // Usar timestamp consistente por caminho para evitar ExpressionChangedAfterItHasBeenCheckedError
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

    console.log(`[CHAT CONVERSATION] Carregando mensagens para o chat ID ${this.selectedChat.id}`);
    console.log(`[CHAT CONVERSATION] Participantes do chat:`, this.selectedChat.participants);

    // Verificar a consistência dos IDs dos participantes
    if (this.selectedChat.participants && this.selectedChat.participants.length > 0) {
      this.selectedChat.participants.forEach(p => {
        console.log(`[CHAT CONVERSATION] Participante: ID=${p.id} (${typeof p.id}), Nome=${p.username}`);
      });
    }

    // Verificar se o ID do usuário atual é consistente
    console.log(`[CHAT CONVERSATION] ID do usuário atual: ${this.currentUserId} (${typeof this.currentUserId})`);

    this.chatService.getMessages(this.selectedChat.id)
      .subscribe({
        next: (messages) => {
          console.log(`[CHAT CONVERSATION] ${messages.length} mensagens carregadas para o chat ID ${this.selectedChat?.id}`);
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
