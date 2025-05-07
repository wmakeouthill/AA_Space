import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chat } from '../../../models/chat/chat.interface';
import { ChatService } from '../../../services/chat.service';

declare global {
  interface WindowEventMap {
    'chat:created': CustomEvent<Chat>;
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

  // Listener para evento de chat criado
  private chatCreatedHandler: (event: CustomEvent<Chat>) => void;

  constructor(private chatService: ChatService) {
    this.currentUserId = this.chatService.getCurrentUserId();

    // Configura o listener para atualizar a lista quando um chat for criado
    this.chatCreatedHandler = (event: CustomEvent<Chat>) => {
      // Adicionando o novo chat no topo da lista
      const newChat = event.detail;

      // Buscamos todos os chats novamente para ter certeza da ordem correta
      this.loadChats();

      // Também podemos atualizar nossa lista local para resposta mais rápida ao usuário
      // Se o chat já existir na lista, removemos ele
      this.chats = this.chats.filter(chat => chat.id !== newChat.id);
      // Adicionamos o novo chat no início da lista
      this.chats.unshift(newChat);
      // Selecionamos o novo chat
      this.selectedChatId = newChat.id;

      // Emitimos o evento de seleção
      this.chatSelected.emit(newChat);
    };
  }

  ngOnInit(): void {
    this.loadChats();

    // Adiciona o listener de evento global para chat criado
    window.addEventListener('chat:created', this.chatCreatedHandler);
  }

  ngOnDestroy(): void {
    // Limpa o listener de evento quando o componente for destruído
    window.removeEventListener('chat:created', this.chatCreatedHandler);
  }

  loadChats(): void {
    this.loading = true;
    this.error = null;

    // Buscar os chats do serviço
    this.chatService.getChats().subscribe({
      next: (chats) => {
        this.chats = chats;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar chats:', err);
        this.error = 'Não foi possível carregar as conversas. Tente novamente mais tarde.';
        this.loading = false;
      }
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

    // Se for chat direto, mostra o nome do outro participante
    const otherParticipant = chat.participants.find(p => p.id !== this.currentUserId);
    return otherParticipant?.username || 'Usuário';
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
}
