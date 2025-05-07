import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chat, User } from '../../../models/chat/chat.interface';
import { ChatService } from '../../../services/chat.service';

@Component({
  selector: 'app-chat-new',
  templateUrl: './chat-new.component.html',
  styleUrls: ['./chat-new.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class ChatNewComponent implements OnInit {
  @Output() chatCreated = new EventEmitter<Chat>();

  showModal = false;
  isGroup = false;
  groupName = '';
  selectedUsers: number[] = [];
  currentUserId: number;
  loading = false;
  error: string | null = null;

  // Lista de usuários disponíveis
  users: User[] = [];

  constructor(private chatService: ChatService) {
    this.currentUserId = this.chatService.getCurrentUserId();
  }

  ngOnInit(): void {
    // Carregar lista de usuários disponíveis ao inicializar
    this.loadAvailableUsers();
  }

  loadAvailableUsers(): void {
    this.loading = true;
    this.error = null;

    this.chatService.getAvailableUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar usuários:', err);
        this.error = 'Não foi possível carregar a lista de usuários. Tente novamente mais tarde.';
        this.loading = false;
      }
    });
  }

  openNewChatModal(): void {
    this.showModal = true;
    this.resetForm();

    // Recarregar a lista de usuários caso tenha erro
    if (this.users.length === 0 || this.error) {
      this.loadAvailableUsers();
    }
  }

  closeModal(): void {
    this.showModal = false;
    this.resetForm();
  }

  resetForm(): void {
    this.isGroup = false;
    this.groupName = '';
    this.selectedUsers = [];
    this.error = null;
  }

  toggleUserSelection(userId: number): void {
    const index = this.selectedUsers.indexOf(userId);

    if (index === -1) {
      // Se não estiver selecionado, adiciona
      if (!this.isGroup && this.selectedUsers.length > 0) {
        // Para chat direto, permite apenas um usuário selecionado
        this.selectedUsers = [userId];
      } else {
        this.selectedUsers.push(userId);
      }
    } else {
      // Se já estiver selecionado, remove
      this.selectedUsers.splice(index, 1);
    }
  }

  isUserSelected(userId: number): boolean {
    return this.selectedUsers.includes(userId);
  }

  canCreate(): boolean {
    if (this.loading) {
      return false;
    }

    if (this.isGroup) {
      // Para grupos, precisa de um nome e pelo menos 2 participantes (incluindo o usuário atual)
      return this.groupName.trim().length > 0 && this.selectedUsers.length > 0;
    } else {
      // Para chat direto, precisa de exatamente 1 participante selecionado
      return this.selectedUsers.length === 1;
    }
  }

  createChat(): void {
    if (!this.canCreate()) {
      return;
    }

    this.loading = true;
    this.error = null;

    // Usar o serviço para criar o chat
    this.chatService.createChat(
      this.isGroup,
      this.isGroup ? this.groupName.trim() : undefined,
      [...this.selectedUsers]
    ).subscribe({
      next: (newChat) => {
        this.chatCreated.emit(newChat);
        this.loading = false;
        this.closeModal();
      },
      error: (err) => {
        console.error('Erro ao criar chat:', err);
        this.error = err.message || 'Falha ao criar conversa. Tente novamente.';
        this.loading = false;
      }
    });
  }
}
