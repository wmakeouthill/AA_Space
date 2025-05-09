import { Component, Input, ElementRef, ViewChild, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Message } from '../../../../models/chat/chat.interface';

@Component({
  selector: 'app-chat-messages',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="messages-container" #scrollContainer>
      <div *ngIf="messages.length === 0" class="no-messages">
        <p>Não há mensagens nessa conversa ainda</p>
      </div>
      <div *ngFor="let message of messages"
           class="message"
           [ngClass]="{'message-sent': message.senderId === currentUserId, 'message-received': message.senderId !== currentUserId}">
        
        <div class="message-avatar" *ngIf="message.senderId !== currentUserId">
          <img [src]="getProfileImage(message.senderId)" alt="Avatar" class="avatar-image">
        </div>
        
        <div class="message-content-wrapper">
          <div class="message-bubble">
            <div class="message-sender" *ngIf="message.senderId !== currentUserId && isGroup">
              {{ getUserName(message.senderId) }}
            </div>
            <div class="message-content">{{ message.content }}</div>
            <div class="message-time">{{ message.timestamp | date:'shortTime' }}</div>
          </div>
        </div>
        
        <div class="message-avatar sender-avatar" *ngIf="message.senderId === currentUserId">
          <img [src]="getCurrentUserProfileImage()" alt="Seu avatar" class="avatar-image">
        </div>
      </div>
      <!-- Espaço adicional no final das mensagens para melhor experiência -->
      <div class="message-end-spacer"></div>
    </div>
  `,
  styles: [`
    .messages-container {
      flex: 1;
      overflow-y: auto; 
      padding: 15px;
      background-color: #f0f2f5;
      display: flex;
      flex-direction: column;
      min-height: 0;
      height: 100%;
      max-height: 100%;
    }
    
    .message {
      margin-bottom: 16px;
      max-width: 70%;
      min-width: 100px;
      display: flex;
      align-items: flex-end;
      width: auto;
    }
    
    .message-sent {
      align-self: flex-end;
      flex-direction: row-reverse;
    }
    
    .message-received {
      align-self: flex-start;
      flex-direction: row;
    }
    
    .message-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      overflow: hidden;
      background-color: #e0e0e0;
      flex-shrink: 0;
      margin: 0 8px;
    }
    
    .avatar-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .message-content-wrapper {
      display: flex;
      flex-direction: column;
    }
    
    .message-bubble {
      padding: 10px 12px;
      border-radius: 18px;
      position: relative;
    }
    
    .message-sent .message-bubble {
      background-color: #d1e7fd;
      border-bottom-right-radius: 4px;
    }
    
    .message-received .message-bubble {
      background-color: white;
      border-bottom-left-radius: 4px;
    }
    
    .message-sender {
      font-size: 0.8rem;
      font-weight: bold;
      color: #666;
      margin-bottom: 2px;
    }
    
    .message-content {
      word-wrap: break-word;
      white-space: pre-wrap;
    }
    
    .message-time {
      font-size: 0.7rem;
      color: #999;
      text-align: right;
      margin-top: 3px;
    }
    
    .no-messages {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
      color: #999;
      font-style: italic;
    }
    
    /* Espaço extra no final da lista de mensagens */
    .message-end-spacer {
      height: 20px;
      width: 100%;
      flex-shrink: 0;
    }
  `]
})
export class ChatMessagesComponent implements AfterViewInit, OnChanges {
  @Input() messages: Message[] = [];
  @Input() currentUserId: number = 0;
  @Input() isGroup: boolean = false;
  @Input() participants: any[] = [];
  @Input() defaultImage: string = '/assets/images/user.png';
  
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['messages']) {
      // Quando as mensagens mudam, rolar para o final após renderização
      requestAnimationFrame(() => this.scrollToBottom());
    }
  }
  
  ngAfterViewInit() {
    this.scrollToBottom();
  }
  
  scrollToBottom() {
    try {
      if (this.scrollContainer?.nativeElement) {
        const element = this.scrollContainer.nativeElement;
        requestAnimationFrame(() => {
          element.scrollTop = element.scrollHeight;
        });
      }
    } catch (err) {
      console.error('Erro ao rolar para o final:', err);
    }
  }
  
  getUserName(userId: number): string {
    // Encontrar o participante pelo ID
    const participant = this.participants.find(p => p.id === userId);
    return participant?.username || 'Usuário';
  }
  
  getProfileImage(userId: number): string {
    const participant = this.participants.find(p => p.id === userId);
    const imagePath = participant?.profileImage || this.defaultImage;
    return this.formatImageUrl(imagePath);
  }
  
  getCurrentUserProfileImage(): string {
    const currentUser = this.participants.find(p => p.id === this.currentUserId);
    const imagePath = currentUser?.profileImage || this.defaultImage;
    return this.formatImageUrl(imagePath);
  }
  
  // Método para formatar URL da imagem - copiado do chat-conversation.component.ts
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
    
    return `${apiOrigin}${imagePath}`;
  }
}
