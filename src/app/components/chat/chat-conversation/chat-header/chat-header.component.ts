import { Component, Input, OnChanges, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chat, ChatParticipant } from '../../../../models/chat/chat.interface';
import { ChatService } from '../../../../services/chat.service';

@Component({
  selector: 'app-chat-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chat-header">
      <div class="chat-info" *ngIf="chat">
        <div class="chat-avatar-container">
          <img [src]="getDisplayAvatar()"
               [alt]="chat.isGroup ? (chat.name || 'Grupo') : getParticipantName(chat)"
               class="avatar-image"
               (click)="chat.isGroup && isCurrentUserAdminInGroup() && toggleGroupAvatarMenu($event)"
               [class.clickable]="chat.isGroup && isCurrentUserAdminInGroup()">
          <input type="file" #groupAvatarInput style="display: none" (change)="onGroupAvatarChange($event)" accept="image/*">

          <div *ngIf="showGroupAvatarMenu && chat.isGroup && isCurrentUserAdminInGroup()" class="avatar-menu" (click)="$event.stopPropagation()">
            <button (click)="selectGroupAvatarFile()">Mudar Foto</button>
            <button (click)="removeCurrentGroupAvatar()" *ngIf="chat.avatarPath">Remover Foto</button>
          </div>
        </div>
        <div class="chat-user-info">
          <h3>{{ chat.isGroup ? (chat.name || 'Grupo') : getParticipantName(chat) }}</h3>
          <div class="participants" *ngIf="chat.isGroup">
            {{ chat.participants.length }} participantes
            <span *ngIf="isCurrentUserAdminInGroup()" class="admin-badge">(Admin)</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chat-header {
      flex: 0 0 60px; /* Altura fixa */
      padding: 10px 15px;
      border-bottom: 1px solid #e0e0e0;
      background-color: #f9f9f9;
      display: flex;
      align-items: center;
      z-index: 10; /* Para o menu aparecer sobre o conteúdo abaixo */
    }

    .chat-info {
      display: flex;
      align-items: center;
      width: 100%;
    }

    .chat-avatar-container {
      position: relative;
      width: 40px;
      height: 40px;
      margin-right: 12px;
      flex-shrink: 0;
    }

    .avatar-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%; /* Tornar a imagem redonda */
    }

    .avatar-image.clickable {
      cursor: pointer;
    }

    .avatar-image.clickable:hover {
      opacity: 0.7;
    }

    .avatar-menu {
      position: absolute;
      top: 45px; /* Abaixo do avatar */
      left: 0;
      background-color: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.15);
      z-index: 100; /* Para garantir que apareça sobre outros elementos */
      padding: 5px 0;
    }

    .avatar-menu button {
      display: block;
      width: 100%;
      padding: 8px 15px;
      text-align: left;
      border: none;
      background: none;
      cursor: pointer;
      font-size: 14px;
    }

    .avatar-menu button:hover {
      background-color: #f0f0f0;
    }

    .chat-user-info {
      flex: 1;
      min-width: 0;
    }

    .chat-info h3 {
      margin: 0;
      font-size: 1.1rem;
      color: #333;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .participants {
      font-size: 0.8rem;
      color: #666;
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .admin-badge {
      font-size: 0.7rem;
      color: #28a745; /* Bootstrap success color */
      margin-left: 5px;
      font-weight: bold;
    }
  `]
})
export class ChatHeaderComponent implements OnChanges {
  @Input() chat: Chat | null = null;
  @Input() currentUserId: number = 0;
  @ViewChild('groupAvatarInput') groupAvatarInput: ElementRef | undefined;

  private readonly renderTimestamp: number = new Date().getTime();
  private otherParticipant: ChatParticipant | null = null;

  showGroupAvatarMenu = false;

  constructor(private chatService: ChatService, private cdr: ChangeDetectorRef) {}

  ngOnChanges(): void {
    if (this.chat) {
      // console.log(`[CHAT HEADER] ngOnChanges - Chat ID: ${this.chat.id}, É grupo? ${this.chat.isGroup}`);
      // console.log(`[CHAT HEADER] ngOnChanges - ID do usuário atual: ${this.currentUserId} (tipo: ${typeof this.currentUserId})`);

      if (!this.chat.isGroup && this.chat.participants?.length > 0) {
        // console.log('[CHAT HEADER] ngOnChanges - Participantes:', this.chat.participants.map(p => ({ id: p.id, type: typeof p.id, name: p.username, image: p.profileImage })));
        const user = this.chatService.getOtherParticipant(this.chat);
        this.otherParticipant = user ? user as ChatParticipant : null;
        // console.log('[CHAT HEADER] ngOnChanges - Outro participante armazenado:', this.otherParticipant);
      }
    }
  }

  isCurrentUserAdminInGroup(): boolean {
    if (!this.chat || !this.chat.isGroup || !this.currentUserId) {
      return false;
    }
    const currentUserParticipant = this.chat.participants.find(p => p.id === this.currentUserId);
    return !!currentUserParticipant?.isAdmin;
  }

  getDisplayAvatar(): string {
    if (this.chat) {
      if (this.chat.isGroup) {
        return this.chat.avatarPath
          ? this.chatService.formatImageUrl(this.chat.avatarPath)
          : this.chatService.formatImageUrl('/assets/images/group.png');
      } else {
        return this.getCorrectParticipantImage();
      }
    }
    return this.chatService.formatImageUrl('/assets/images/user.png');
  }

  toggleGroupAvatarMenu(event: MouseEvent): void {
    event.stopPropagation();
    if (this.chat?.isGroup && this.isCurrentUserAdminInGroup()) {
      this.showGroupAvatarMenu = !this.showGroupAvatarMenu;
      this.cdr.detectChanges();
    }
  }

  selectGroupAvatarFile(): void {
    if (this.groupAvatarInput) {
      this.groupAvatarInput.nativeElement.click();
      this.showGroupAvatarMenu = false; // Fecha o menu após clicar
    }
  }

  onGroupAvatarChange(event: Event): void {
    const element = event.target as HTMLInputElement;
    if (element.files && element.files[0] && this.chat && this.chat.isGroup) {
      const file = element.files[0];
      if (!file.type.startsWith('image/')) {
        console.error('Tipo de arquivo inválido. Por favor, selecione uma imagem.');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
         console.error('Arquivo muito grande. O limite é 2MB.');
         return;
      }
      this.uploadNewGroupAvatar(file);
    }
  }

  uploadNewGroupAvatar(file: File): void {
    if (!this.chat || !this.chat.id) {
      console.error('Chat ID não encontrado para upload de avatar.');
      return;
    }
    this.chatService.uploadGroupAvatar(this.chat.id, file).subscribe({
      next: (response) => {
        if (this.chat) {
          this.chat.avatarPath = response.avatarPath;
        }
        this.showGroupAvatarMenu = false; // Fecha o menu
      },
      error: (err) => {
        console.error('Erro ao fazer upload do avatar do grupo:', err);
        this.showGroupAvatarMenu = false; // Fecha o menu
      }
    });
  }

  removeCurrentGroupAvatar(): void {
    if (!this.chat || !this.chat.id || !this.chat.isGroup) {
      console.error('Não é possível remover o avatar: chat inválido ou não é um grupo.');
      return;
    }
    if (!this.isCurrentUserAdminInGroup()) {
      console.error('Usuário não tem permissão para remover o avatar do grupo.');
      return;
    }

    this.chatService.removeGroupAvatar(this.chat.id).subscribe({
      next: (response) => {
        if (this.chat) {
          this.chat.avatarPath = null;
        }
        this.showGroupAvatarMenu = false; // Fecha o menu
      },
      error: (err) => {
        console.error('Erro ao remover o avatar do grupo:', err);
        this.showGroupAvatarMenu = false; // Fecha o menu
      }
    });
  }

  getParticipantName(chat: Chat): string {
    if (!chat.isGroup) {
      if (chat.participants && chat.participants.length > 0) {
        const otherParticipant = this.chatService.getOtherParticipant(chat);
        if (otherParticipant) {
          return otherParticipant.username || 'Usuário';
        }
        const currentUserId = Number(this.currentUserId);
        for (const participant of chat.participants) {
          const participantId = Number(participant.id);
          if (participantId !== currentUserId) {
            return participant.username || 'Usuário';
          }
        }
        return chat.participants[0].username || 'Usuário desconhecido';
      }
      return 'Usuário';
    }
    return chat.name || 'Grupo';
  }

  getCorrectParticipantImage(): string {
    if (!this.chat || this.chat.isGroup) {
      return this.chatService.formatImageUrl('/assets/images/user.png');
    }
    const otherParticipant = this.chatService.getOtherParticipant(this.chat);
    if (otherParticipant?.profileImage) {
      return this.chatService.formatImageUrl(otherParticipant.profileImage);
    }
    return this.chatService.formatImageUrl('/assets/images/user.png');
  }

  getGroupImage(): string {
    if (this.chat?.avatarPath) {
      return this.chatService.formatImageUrl(this.chat.avatarPath);
    }
    if (this.chat?.name === 'Administração' || this.chat?.name?.includes('Admin')) {
      return this.chatService.formatImageUrl('/assets/images/admin-group.png');
    }
    return this.chatService.formatImageUrl('/assets/images/group.png');
  }
}
