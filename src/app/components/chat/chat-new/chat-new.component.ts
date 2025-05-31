import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chat, User } from '../../../models/chat/chat.interface';
import { ChatService } from '../../../services/chat.service';
import { ApiService } from '../../../services/api.service';

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
  currentUserId: number | null; // Changed to number | null
  loading = false;
  error: string | null = null;
  defaultImage: string = '/assets/images/user.png';
  private baseApiUrl: string;
  private imageUrlCache = new Map<string, string>(); // Cache para URLs de imagem

  // Lista de usuários disponíveis
  users: User[] = [];
  filteredUsers: User[] = [];
  searchQuery: string = '';

  constructor(private chatService: ChatService, private apiService: ApiService) {
    this.currentUserId = this.chatService.getCurrentUserId();
    this.baseApiUrl = this.apiService.getApiBaseUrl(); // Método a ser criado no ApiService
  }

  ngOnInit(): void {
    // Carregar lista de usuários disponíveis ao inicializar
    this.loadAvailableUsers();

    // Adiciona listener para atualização de imagem de perfil
    window.addEventListener('profile:imageUpdated', this.handleProfileImageUpdate);
  }

  ngOnDestroy(): void {
    // Remove event listener quando o componente é destruído
    window.removeEventListener('profile:imageUpdated', this.handleProfileImageUpdate);
    this.imageUrlCache.clear(); // Limpar cache ao destruir
  }

  // Handler para o evento de atualização de imagem
  private handleProfileImageUpdate = (): void => {
    // console.log('[CHAT NEW] Evento de atualização de imagem detectado, recarregando usuários e limpando cache de imagens.');
    this.imageUrlCache.clear(); // Limpar cache de URLs de imagem
    this.loadAvailableUsers(); // Recarrega a lista de usuários para atualizar imagens
  }

  loadAvailableUsers(): void {
    this.loading = true;
    this.error = null;
    this.imageUrlCache.clear(); // Limpar cache antes de carregar novos usuários

    this.chatService.getAvailableUsers().subscribe({ // Changed to getAvailableUsers
      next: (users: User[]) => { // Added type for users
        // Ordenar usuários por username em ordem alfabética
        this.users = users.sort((a: User, b: User) => a.username.localeCompare(b.username)); // Added type for a and b
        this.applyFilter();
        this.loading = false;
      },
      error: (err: any) => { // Added type for err
        // console.error('Erro ao carregar usuários:', err);
        this.error = 'Não foi possível carregar a lista de usuários. Tente novamente mais tarde.';
        this.loading = false;
      }
    });
  }

  applyFilter(): void {
    if (!this.searchQuery.trim()) {
      this.filteredUsers = [...this.users];
      return;
    }

    const query = this.searchQuery.toLowerCase().trim();
    this.filteredUsers = this.users.filter(user =>
      user.username.toLowerCase().includes(query) ||
      (user.email && user.email.toLowerCase().includes(query))
    );
  }

  onSearchChange(): void {
    this.applyFilter();
  }

  openNewChatModal(): void {
    this.showModal = true;
    this.resetForm();

    // Recarregar a lista de usuários caso tenha erro
    if (this.users.length === 0 || this.error) {
      this.loadAvailableUsers();
    } else {
      // Aplicar filtro com base na pesquisa atual
      this.applyFilter();
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
    this.searchQuery = '';
    this.error = null;
    // Redefine a lista filtrada para mostrar todos os usuários
    if (this.users.length > 0) {
      this.filteredUsers = [...this.users];
    }
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

  getUsersSelectedCount(): number {
    return this.selectedUsers.length;
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
      this.isGroup ? this.groupName.trim() : undefined, // Pass undefined for name if not a group
      this.isGroup,
      [...this.selectedUsers]
    ).subscribe({
      next: (newChat) => {
        this.chatCreated.emit(newChat);
        this.loading = false;
        this.closeModal();
      },
      error: (err) => {
        // console.error('Erro ao criar chat:', err);
        this.error = err.message || 'Falha ao criar conversa. Tente novamente.';
        this.loading = false;
      }
    });
  }

  // Método para formatar URL da imagem para funcionar no GitHub Codespaces
  formatImageUrl(imagePath: string): string {
    if (!imagePath) return this.defaultImage;

    // Se o caminho já começar com http(s), não modificar
    if (imagePath.startsWith('http')) return imagePath;

    // Se o caminho for uma imagem base64, não modificar
    if (imagePath.startsWith('data:')) return imagePath;

    // Chave para o cache pode ser o imagePath original
    const cacheKey = imagePath;

    if (this.imageUrlCache.has(cacheKey)) {
      return this.imageUrlCache.get(cacheKey)!;
    }

    // Se não começar com barra, adicionar
    if (!imagePath.startsWith('/')) {
      imagePath = '/' + imagePath;
    }

    const apiOrigin = this.baseApiUrl;
    let fullImagePath = `${apiOrigin}${imagePath}`;

    // Adicionar timestamp apenas para imagens de perfil ou grupo, e apenas uma vez
    if (imagePath.includes('/uploads/profiles/') || imagePath.includes('/uploads/group-avatars/')) {
      fullImagePath += `?t=${new Date().getTime()}`;
    }

    this.imageUrlCache.set(cacheKey, fullImagePath);
    return fullImagePath;
  }

  // Método para obter a imagem de perfil do usuário
  getUserProfileImage(user: User): string {
    if (user.profileImage) {
      return this.formatImageUrl(user.profileImage);
    }
    return this.formatImageUrl(this.defaultImage);
  }
}
