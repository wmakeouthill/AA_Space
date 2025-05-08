import { Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chat, Message } from '../../../models/chat/chat.interface';
import { ChatService } from '../../../services/chat.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-chat-conversation',
  templateUrl: './chat-conversation.component.html',
  styleUrls: ['./chat-conversation.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class ChatConversationComponent implements OnChanges {
  @Input() selectedChat: Chat | null = null;
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  messages: Message[] = [];
  newMessage: string = '';
  currentUserId: number;
  loading = false;
  error: string | null = null;
  sending = false;
  defaultImage: string = '/assets/images/user.png'; // Updated to use absolute path

  constructor(private chatService: ChatService) {
    this.currentUserId = this.chatService.getCurrentUserId();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedChat'] && changes['selectedChat'].currentValue) {
      this.loadMessages();
    }
  }

  getParticipantName(chat: Chat): string {
    if (!chat.isGroup) {
      // Encontrar o nome do outro participante (não o usuário atual)
      const otherParticipant = chat.participants.find(p => p.id !== this.currentUserId);
      return otherParticipant?.username || 'Usuário';
    }
    return chat.name || 'Grupo';
  }

  getUserName(userId: number): string {
    if (!this.selectedChat) return 'Usuário';

    // Verificar se é o usuário atual
    if (userId === this.currentUserId) {
      return 'Você';
    }

    // Encontrar o participante pelo ID
    const participant = this.selectedChat.participants.find(p => p.id === userId);
    return participant?.username || 'Usuário';
  }

  // Método para formatar URL da imagem para funcionar no GitHub Codespaces
  formatImageUrl(imagePath: string): string {
    if (!imagePath) return this.defaultImage;
    
    // Se o caminho já começar com http(s), não modificar
    if (imagePath.startsWith('http')) return imagePath;
    
    // Se o caminho for uma imagem base64, não modificar
    if (imagePath.startsWith('data:')) return imagePath;
    
    // Se não começar com barra, adicionar
    if (!imagePath.startsWith('/')) {
      imagePath = '/' + imagePath;
    }
    
    // Para imagens de assets, usar a porta do frontend
    if (imagePath.includes('/assets/')) {
      return `${document.location.origin}${imagePath}`;
    }
    
    // Para uploads de imagens de perfil, usar a porta do backend
    const origin = document.location.origin;
    const apiOrigin = origin.replace(/-4200\./, '-3001.');
    
    return `${apiOrigin}${imagePath}`;
  }

  // Método para obter a imagem de perfil de um usuário pelo ID
  getProfileImage(userId: number): string {
    if (!this.selectedChat) return this.formatImageUrl(this.defaultImage);

    // Verificar se é um participante do chat
    const participant = this.selectedChat.participants.find(p => p.id === userId);
    
    // Se o participante tiver uma imagem de perfil definida, use-a
    if (participant?.profileImage) {
      return this.formatImageUrl(participant.profileImage);
    }
    
    // Caso contrário, use a imagem padrão
    return this.formatImageUrl(this.defaultImage);
  }

  // Método para obter a imagem de perfil do usuário atual
  getCurrentUserProfileImage(): string {
    // Primeiro, tenta pegar do localStorage (solução temporária)
    const savedImage = localStorage.getItem('user_profile_image');
    if (savedImage) {
      return savedImage; // já é base64 ou URL completa
    }
    
    // Se não encontrar no localStorage, verifica nos participantes do chat
    if (this.selectedChat) {
      const currentUser = this.selectedChat.participants.find(p => p.id === this.currentUserId);
      if (currentUser?.profileImage) {
        return this.formatImageUrl(currentUser.profileImage);
      }
    }
    
    // Caso não encontre em nenhum lugar, retorna a imagem padrão
    return this.formatImageUrl(this.defaultImage);
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.selectedChat) {
      return;
    }

    this.sending = true;
    this.error = null;

    // Usar o serviço para enviar a mensagem
    this.chatService.sendMessage(this.selectedChat.id, this.newMessage)
      .subscribe({
        next: (message) => {
          this.messages.push(message);
          this.newMessage = '';
          this.sending = false;

          setTimeout(() => {
            this.scrollToBottom();
          });
        },
        error: (err) => {
          console.error('Erro ao enviar mensagem:', err);
          this.error = 'Falha ao enviar mensagem. Tente novamente.';
          this.sending = false;
        }
      });
  }

  private loadMessages(): void {
    if (!this.selectedChat) return;

    this.loading = true;
    this.error = null;

    // Usar o serviço para buscar as mensagens do chat selecionado
    this.chatService.getMessages(this.selectedChat.id)
      .subscribe({
        next: (messages) => {
          this.messages = messages;
          this.loading = false;

          setTimeout(() => {
            this.scrollToBottom();
          });
        },
        error: (err) => {
          console.error('Erro ao carregar mensagens:', err);
          this.error = 'Falha ao carregar mensagens. Tente novamente.';
          this.loading = false;
        }
      });
  }

  private scrollToBottom(): void {
    try {
      this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
    } catch (err) {
      console.error('Erro ao rolar mensagens para o final:', err);
    }
  }
}
