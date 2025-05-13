import { Component, Input, ElementRef, ViewChild, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Message } from '../../../../models/chat/chat.interface';

@Component({
  selector: 'app-chat-messages',
  standalone: true,
  imports: [CommonModule],
  // styleUrls: ['./chat-messages.component.css'],
  template: `
    <div class="messages-container" #scrollContainer>
      <div *ngIf="messages.length === 0" class="no-messages">
        <p>Não há mensagens nessa conversa ainda</p>
      </div>
      <div *ngFor="let message of messages"
           class="message"
           [ngClass]="{'message-sent': message.senderId === currentUserId, 'message-received': message.senderId !== currentUserId}">

        <!-- Avatar para mensagens ENVIADAS (mensagens do usuário atual, agora à direita) -->
        <div class="message-avatar sender-avatar" *ngIf="message.senderId === currentUserId">
          <img [src]="getCurrentUserProfileImage()" alt="Seu avatar" class="avatar-image">
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

        <!-- Avatar para mensagens RECEBIDAS (mensagens de outros usuários, agora à esquerda) -->
        <div class="message-avatar" *ngIf="message.senderId !== currentUserId">
          <img [src]="getProfileImage(message.senderId)" alt="Avatar" class="avatar-image">
        </div>
      </div>
    </div>
  `,
  styles: [`
    .messages-container {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden; /* Impede a scrollbar horizontal */
      padding: 10px;
      background-color: #f0f2f5;
      display: flex;
      flex-direction: column;
      min-height: 0; /* Permite encolher se necessário */
      height: 100%; /* Ocupa toda a altura dada pelo pai */
      box-sizing: border-box; /* Garante que padding não aumente o tamanho total */
    }

    .message {
      margin-bottom: 14px;
      max-width: 70%;
      min-width: 100px; /* Pode causar problemas em larguras muito pequenas */
      display: flex;
      align-items: flex-end;
      width: auto;
      box-sizing: border-box; /* Garante que padding/border não aumentem o tamanho */
    }

    /* Add this rule to ensure last message doesn't add extra margin,
       relying on .messages-container padding-bottom for spacing */
    .message:last-child {
      margin-bottom: 0;
    }

    /* Styles for SENT messages (current user - now RIGHT aligned) */
    .message-sent {
      align-self: flex-end; /* Align to the right */
      flex-direction: row-reverse; /* Bubble first, then avatar */
      margin-right: 10px;
      margin-left: auto;
    }

    /* Styles for RECEIVED messages (other users - now LEFT aligned) */
    .message-received {
      align-self: flex-start; /* Align to the left */
      flex-direction: row; /* Avatar first, then bubble */
      margin-left: 10px;
      margin-right: auto;
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
      box-sizing: border-box; /* Garante que padding/border não aumentem o tamanho */
    }

    /* Bubble style for SENT messages (current user) */
    .message-sent .message-bubble {
      background-color: #dcf8c6; /* Verde claro para mensagens enviadas (original) */
      border-bottom-right-radius: 4px; /* Adjusted for right alignment */
      border-bottom-left-radius: 18px; /* Keep other corners rounded */
      color: #000;
      box-shadow: 0 1px 0.5px rgba(0,0,0,0.13); /* Sombra adicionada para consistência */
    }

    /* Bubble style for RECEIVED messages (other users) */
    .message-received .message-bubble {
      background-color: white; /* Branco para mensagens recebidas (original) */
      border-bottom-left-radius: 4px; /* Adjusted for left alignment */
      border-bottom-right-radius: 18px; /* Keep other corners rounded */
      color: #000;
      box-shadow: 0 1px 0.5px rgba(0,0,0,0.13); /* Sombra adicionada para corresponder ao estilo original de 'received' */
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
  `]
})
export class ChatMessagesComponent implements AfterViewInit, OnChanges {
  @Input() messages: Message[] = [];
  @Input() currentUserId: number = 0;
  @Input() isGroup: boolean = false;
  @Input() participants: any[] = [];
  @Input() defaultImage: string = '/assets/images/user.png'; // Relative path for default image

  // Timestamp fixo para o ciclo de renderização atual
  private readonly renderTimestamp: number = new Date().getTime();
  private apiOrigin: string;

  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  constructor() {
    this.apiOrigin = this.determineApiOrigin();
    // Ensure defaultImage is a full path if it's not already
    if (this.defaultImage.startsWith('/assets/')) {
      this.defaultImage = `${this.apiOrigin}${this.defaultImage}`;
    }
  }

  private determineApiOrigin(): string {
    const currentFrontendOrigin = window.location.origin;
    if (currentFrontendOrigin.includes('v3mrhcvc-4200.brs.devtunnels.ms')) {
      return 'https://v3mrhcvc-3001.brs.devtunnels.ms';
    } else if (currentFrontendOrigin.includes('.github.dev') || currentFrontendOrigin.includes('.github.io') || currentFrontendOrigin.includes('.app.github.dev')) {
      // Regex para substituir a porta do frontend pela porta do backend (3001)
      // Exemplo: https://meu-codespace-12345.app.github.dev -> https://meu-codespace-3001.app.github.dev
      return currentFrontendOrigin.replace(/-\d+(\.app\.github\.dev|\.github\.dev|\.github\.io)/, '-3001$1');
    }
    // Para localhost e outros casos
    return 'http://localhost:3001';
  }

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
    // Encontrar o participante pelo ID, convertendo IDs para número para garantir comparação correta
    const userIdNumber = Number(userId);
    const participant = this.participants.find(p => Number(p.id) === userIdNumber);

    if (participant) {
      console.log(`[CHAT MESSAGES] Nome encontrado para ID ${userId}: ${participant.username}`);
      return participant.username || 'Usuário';
    } else {
      console.warn(`[CHAT MESSAGES] Não foi possível encontrar nome para ID ${userId}`);
      return 'Usuário';
    }
  }

  getProfileImage(userId: number): string {
    // Encontrar o participante pelo ID, convertendo IDs para número para garantir comparação correta
    const userIdNumber = Number(userId);
    const participant = this.participants.find(p => Number(p.id) === userIdNumber);

    let imagePath = this.defaultImage;
    if (participant && participant.profileImage) {
      console.log(`[CHAT MESSAGES] Imagem encontrada para ID ${userId}: ${participant.profileImage}`);
      imagePath = participant.profileImage;
    } else {
      console.warn(`[CHAT MESSAGES] Não foi possível encontrar imagem para ID ${userId}, usando padrão`);
    }

    return this.formatImageUrl(imagePath);
  }

  getCurrentUserProfileImage(): string {
    // Encontrar o usuário atual pelo ID, convertendo IDs para número para garantir comparação correta
    const currentUserIdNumber = Number(this.currentUserId);
    const currentUser = this.participants.find(p => Number(p.id) === currentUserIdNumber);

    let imagePath = this.defaultImage;
    if (currentUser && currentUser.profileImage) {
      console.log(`[CHAT MESSAGES] Imagem encontrada para usuário atual ID ${this.currentUserId}: ${currentUser.profileImage}`);
      imagePath = currentUser.profileImage;
    } else {
      console.warn(`[CHAT MESSAGES] Não foi possível encontrar imagem para usuário atual ID ${this.currentUserId}, usando padrão`);
    }

    return this.formatImageUrl(imagePath);
  }

  // Método para formatar URL da imagem
  formatImageUrl(imagePath?: string): string { // Added optional '?' to imagePath
    if (!imagePath) {
      console.log(`[CHAT MESSAGES] Image path is undefined or empty, using default: ${this.defaultImage}`);
      return this.defaultImage;
    }

    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
      console.log(`[CHAT MESSAGES] Image path is already absolute: ${imagePath}`);
      return imagePath;
    }

    let fullPath = this.apiOrigin;

    // Normalizar o imagePath para garantir que não haja barras duplas ou ausentes
    if (imagePath.startsWith('/uploads/')) {
      fullPath += imagePath;
    } else if (imagePath.startsWith('uploads/')) {
      fullPath += '/' + imagePath;
    } else if (imagePath.startsWith('/')) {
      // Se começa com / mas não /uploads/, assume que é algo como /profiles/ ou /assets/
      // e precisa do prefixo /uploads
      if (imagePath.startsWith('/assets/')) {
         // As imagens de assets são servidas diretamente pela aplicação Angular ou copiadas para /uploads/assets no backend
         // Se for /assets/images/user.png, deve virar /uploads/assets/images/user.png no backend
         fullPath += '/uploads' + imagePath;
      } else {
        fullPath += '/uploads' + imagePath;
      }
    } else {
      // Caminho relativo como "profiles/image.jpg" ou "image.jpg" (assumindo que vai para profiles)
      fullPath += '/uploads/profiles/' + imagePath;
    }

    // Remover barras duplas, exceto em http:// ou https://
    fullPath = fullPath.replace(/([^:])\/\//g, '$1/');
    // Tratar caso específico de /uploads/uploads/
    fullPath = fullPath.replace(/\/uploads\/uploads\//g, '/uploads/');

    const finalUrl = `${fullPath}?t=${this.renderTimestamp}`;
    console.log(`[CHAT MESSAGES] Formatando URL de imagem: Original: "${imagePath}", API Origin: "${this.apiOrigin}", Final: "${finalUrl}"`);
    return finalUrl;
  }
}
