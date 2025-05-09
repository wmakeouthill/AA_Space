import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chat } from '../../../../models/chat/chat.interface';

@Component({
  selector: 'app-chat-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chat-header">
      <div class="chat-info" *ngIf="chat">
        <div class="chat-avatar" *ngIf="!chat.isGroup">
          <img [src]="getOtherParticipantImage()" alt="Avatar" class="avatar-image">
        </div>
        <div class="chat-user-info">
          <h3>{{ chat.name || getParticipantName(chat) }}</h3>
          <div class="participants" *ngIf="chat.isGroup">
            {{ chat.participants.length }} participantes
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
      z-index: 10;
    }
    
    .chat-info {
      display: flex;
      align-items: center;
      width: 100%;
    }
    
    .chat-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      overflow: hidden;
      margin-right: 12px;
      flex-shrink: 0;
      background-color: #e0e0e0;
    }
    
    .avatar-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
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
  `]
})
export class ChatHeaderComponent {
  @Input() chat: Chat | null = null;
  @Input() currentUserId: number = 0;
  
  getParticipantName(chat: Chat): string {
    if (!chat.isGroup) {
      // Encontrar o nome do outro participante (não o usuário atual)
      const otherParticipant = chat.participants.find(p => p.id !== this.currentUserId);
      return otherParticipant?.username || 'Usuário';
    }
    return chat.name || 'Grupo';
  }
  
  getOtherParticipantImage(): string {
    if (!this.chat || this.chat.isGroup) {
      return '/assets/images/user.png';
    }
    
    const otherParticipant = this.chat.participants.find(p => p.id !== this.currentUserId);
    const imagePath = otherParticipant?.profileImage || '/assets/images/user.png';
    return this.formatImageUrl(imagePath);
  }
  
  // Método para formatar URL da imagem
  formatImageUrl(imagePath: string): string {
    if (!imagePath) return '/assets/images/user.png';
    
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
    
    return `${apiOrigin}${imagePath}`;
  }
}
