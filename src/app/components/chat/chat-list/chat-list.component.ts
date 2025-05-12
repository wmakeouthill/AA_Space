import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chat } from '../../../models/chat/chat.interface';
import { ChatService } from '../../../services/chat.service';

declare global {
  interface WindowEventMap {
    'chat:created': CustomEvent<Chat>;
    'profile:imageUpdated': CustomEvent<void>; // Existing event
    'chat:avatarUpdated': CustomEvent<{ chatId: number; avatarPath: string | null; fullImageUrl?: string }>; // New event
  }
}

@Component({
  selector: 'app-chat-list',
  templateUrl: './chat-list.component.html',
  styleUrls: ['./chat-list.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class ChatListComponent implements OnInit, OnDestroy {
  @Output() chatSelected = new EventEmitter<Chat>();

  chats: Chat[] = [];
  selectedChatId: number | null = null;
  currentUserId: number;
  loading = false;
  error: string | null = null;
  defaultImage: string = '/assets/images/user.png'; // Updated to use absolute path
  defaultGroupImage: string = '/assets/images/group.png'; // Updated to use absolute path

  // Listener para evento de chat criado
  private chatCreatedHandler: (event: CustomEvent<Chat>) => void;
  private chatAvatarUpdatedHandler: (event: CustomEvent<{ chatId: number; avatarPath: string | null }>) => void;

  constructor(private chatService: ChatService) {
    this.currentUserId = this.chatService.getCurrentUserId();
    console.log(`[CHAT LIST] Constructor - ID do usuário atual: ${this.currentUserId}`);

    // Certifica-se de que temos um ID válido
    if (!this.currentUserId || this.currentUserId === 0) {
      console.warn('[CHAT LIST] ID de usuário inválido no constructor, tentando obter novamente');
      setTimeout(() => {
        this.currentUserId = this.chatService.getCurrentUserId();
        console.log(`[CHAT LIST] ID do usuário atualizado: ${this.currentUserId}`);
      }, 500);
    }

    // Configura o listener para atualizar a lista quando um chat for criado
    this.chatCreatedHandler = (event: CustomEvent<Chat>) => {
      const newChat = event.detail;
      // Check if chat already exists to prevent duplicates, then add or update
      const existingChatIndex = this.chats.findIndex(c => c.id === newChat.id);
      if (existingChatIndex > -1) {
        this.chats[existingChatIndex] = newChat;
      } else {
        this.chats.unshift(newChat); // Add to the beginning
      }
      // Sort chats to ensure correct order (e.g., by last message time or update time)
      this.sortChats(); 
      // If the new chat is selected, emit it
      if (this.selectedChatId === newChat.id || !this.selectedChatId) {
        this.selectChat(newChat);
      }
    };

    this.chatAvatarUpdatedHandler = (event: CustomEvent<{ chatId: number; avatarPath: string | null }>) => {
      console.log('[CHAT LIST] Evento chat:avatarUpdated recebido:', event.detail);
      const { chatId, avatarPath } = event.detail;
      const chatToUpdate = this.chats.find(c => c.id === chatId);
      if (chatToUpdate) {
        chatToUpdate.avatarPath = avatarPath;
        console.log(`[CHAT LIST] Avatar do chat ${chatId} atualizado para: ${avatarPath}`);
        // If the updated chat is the currently selected one, re-emit it to update header
        if (this.selectedChatId === chatId) {
          this.chatSelected.emit({...chatToUpdate}); // Emit a new object instance to trigger change detection
        }
      }
    };
  }

  ngOnInit(): void {
    // Verificar ID do usuário novamente (caso tenha sido carregado assincronamente)
    if (!this.currentUserId || this.currentUserId === 0) {
      this.currentUserId = this.chatService.getCurrentUserId();
      console.log(`[CHAT LIST] ngOnInit - ID do usuário atual atualizado: ${this.currentUserId}`);
    }

    this.loadChats();

    // Adiciona o listener de evento global para chat criado
    window.addEventListener('chat:created', this.chatCreatedHandler);
    window.addEventListener('chat:avatarUpdated', this.chatAvatarUpdatedHandler as EventListener);

    // Adiciona o listener para atualização de imagem de perfil usando o handler definido
    window.addEventListener('profile:imageUpdated', this.profileImageUpdatedHandler);
  }

  // Handler para evento de atualização de imagem de perfil
  private profileImageUpdatedHandler = (event: Event) => { // Ensure type is generic Event or CustomEvent<void>
    console.log('[CHAT LIST] Evento de atualização de imagem de perfil detectado, recarregando chats');
    this.loadChats(); // Recarrega todos os chats para atualizar imagens
  };

  ngOnDestroy(): void {
    // Limpa os listeners de evento quando o componente for destruído
    window.removeEventListener('chat:created', this.chatCreatedHandler);
    window.removeEventListener('chat:avatarUpdated', this.chatAvatarUpdatedHandler as EventListener);
    window.removeEventListener('profile:imageUpdated', this.profileImageUpdatedHandler);
  }

  loadChats(): void {
    this.loading = true;
    this.error = null;

    // Buscar os chats do serviço
    this.chatService.getChats().subscribe({
      next: (chats) => {
        this.chats = chats;
        this.sortChats(); // Sort after loading
        this.loading = false;
        // If there's a selected chat, ensure its data is up-to-date
        if (this.selectedChatId) {
          const currentSelected = this.chats.find(c => c.id === this.selectedChatId);
          if (currentSelected) {
            this.chatSelected.emit({...currentSelected});
          }
        }
      },
      error: (err) => {
        console.error('Erro ao carregar chats:', err);
        this.error = 'Não foi possível carregar as conversas. Tente novamente mais tarde.';
        this.loading = false;
      }
    });
  }

  private sortChats(): void {
    this.chats.sort((a, b) => {
      const dateA = a.lastMessage ? new Date(a.lastMessage.timestamp) : new Date(a.updatedAt);
      const dateB = b.lastMessage ? new Date(b.lastMessage.timestamp) : new Date(b.updatedAt);
      return dateB.getTime() - dateA.getTime();
    });
  }

  selectChat(chat: Chat): void {
    this.selectedChatId = chat.id;
    this.chatSelected.emit(chat);
  }  

  getParticipantName(chat: Chat): string {
    // Se for um grupo, usa o nome do grupo
    if (chat.isGroup) {
      return chat.name || 'Grupo sem nome';
    }

    // Usar o serviço centralizado diretamente para obter o outro participante
    // Sem passar por nosso método local que pode fazer formatações extras
    const otherParticipant = this.chatService.getOtherParticipant(chat);

    if (otherParticipant) {
      console.log(`[CHAT LIST] Nome do participante: ${otherParticipant.username} (ID: ${otherParticipant.id})`);
      return otherParticipant.username || 'Usuário';
    }

    // Fallback para caso o serviço não encontre o participante
    if (chat.participants && chat.participants.length > 0) {
      const userId = Number(this.currentUserId);
      const participant = chat.participants.find(p => Number(p.id) !== userId);
      if (participant) {
        console.log(`[CHAT LIST] Nome do participante (fallback): ${participant.username}`);
        return participant.username || 'Usuário';
      }
    }

    return 'Usuário';
  }

  // Formata a última mensagem para exibição na lista
  getLastMessagePreview(chat: Chat): string {
    if (!chat.lastMessage) {
      return 'Nenhuma mensagem ainda';
    }

    // Se o remetente for o usuário atual, mostra "Você: mensagem"
    const isCurrentUser = chat.lastMessage.senderId === this.currentUserId;
    const sender = isCurrentUser ? 'Você' : (chat.lastMessage.senderName || 'Usuário');

    // Limita o tamanho da mensagem para não ficar muito grande
    let content = chat.lastMessage.content;
    if (content.length > 30) {
      content = content.substring(0, 27) + '...';
    }

    return `${isCurrentUser ? 'Você' : sender}: ${content}`;
  }

  // Formata a data da última mensagem
  getLastMessageTime(chat: Chat): string {
    if (!chat.lastMessage) {
      return '';
    }

    const messageDate = new Date(chat.lastMessage.timestamp);
    const now = new Date();
    const isToday = messageDate.toDateString() === now.toDateString();

    if (isToday) {
      // Se for hoje, mostra apenas a hora
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      // Se for outro dia, mostra a data abreviada
      return messageDate.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    }
  }

  // Cache estático de timestamps para URLs de imagem
  private static imageTimestamps: Record<string, number> = {};
  // Método para formatar URL da imagem
  formatImageUrl(imagePath: string): string {
    // Usamos o método centralizado do ChatService para garantir consistência
    // em toda a aplicação e evitar problemas de URLs
    return this.chatService.formatImageUrl(imagePath);
  }
  // Removido o método getOtherParticipant redundante, agora estamos usando
  // diretamente chatService.getOtherParticipant em getParticipantName e getParticipantProfileImage  
  // Método para obter a imagem de perfil do participante
  getParticipantProfileImage(chat: Chat): string {
    if (chat.isGroup) {
      // Use group avatar if available, otherwise default group image
      return chat.avatarPath 
        ? this.chatService.formatImageUrl(chat.avatarPath) 
        : this.chatService.formatImageUrl(this.defaultGroupImage);
    }

    // For direct chats, get the other participant's image
    const otherParticipant = this.chatService.getOtherParticipant(chat);
    if (otherParticipant?.profileImage) {
      // The chatService.getOtherParticipant now ensures the profileImage is a fully qualified URL or a path that formatImageUrl can handle.
      return this.chatService.formatImageUrl(otherParticipant.profileImage);
    }
    
    // Fallback for direct chats if no image found for the other participant
    return this.chatService.formatImageUrl(this.defaultImage);
  }
}
