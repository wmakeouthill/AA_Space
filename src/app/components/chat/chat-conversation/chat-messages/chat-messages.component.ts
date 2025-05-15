import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Input, OnInit, ViewChild, OnChanges, SimpleChanges, AfterViewChecked, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Message, ChatParticipant } from '../../../../models/chat/chat.interface';
import { ChatService } from '../../../../services/chat.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat-messages',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="messages-container" #scrollMe>
      <div *ngIf="messages.length === 0" class="no-messages">
        <p>Não há mensagens nessa conversa ainda</p>
      </div>
      <div *ngFor="let message of messages; trackBy: trackByMessageId"
           class="message"
           [ngClass]="{'message-sent': message.senderId === currentUserId, 'message-received': message.senderId !== currentUserId}">

        <!-- Avatar para mensagens ENVIADAS (mensagens do usuário atual, agora à direita) -->
        <div class="message-avatar sender-avatar" *ngIf="message.senderId === currentUserId">
          <img [src]="currentUserAvatarUrl || defaultImage" alt="Seu avatar" class="avatar-image">
        </div>

        <div class="message-content-wrapper">
          <div class="message-bubble">
            <div class="message-sender" *ngIf="message.senderId !== currentUserId && message.senderId !== undefined && isGroup">
              {{ getSenderName(message) }}
            </div>
            <div class="message-content">{{ message.content }}</div>
            <div class="message-time">
              {{ message.timestamp | date:'shortTime' }}
              <span class="message-status" *ngIf="message.senderId === currentUserId">
                <span *ngIf="message.status === 'sent'">✔</span>
                <span *ngIf="message.status === 'delivered'">✔✔</span>
                <span *ngIf="message.status === 'read'" class="status-read">✔✔</span>
              </span>
            </div>
          </div>
        </div>

        <!-- Avatar para mensagens RECEBIDAS (mensagens de outros usuários, agora à esquerda) -->
        <div class="message-avatar" *ngIf="message.senderId !== undefined && message.senderId !== currentUserId">
          <img [src]="getSenderAvatar(message) || defaultImage" alt="Avatar" class="avatar-image">
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
      scrollbar-width: thin; /* Firefox: Deixa a barra de rolagem fina */
      scrollbar-color: #1a5f7a transparent; /* Firefox: Cor do polegar e da trilha */
    }

    /* Customização da barra de rolagem para Webkit (Chrome, Edge, Safari) */
    .messages-container::-webkit-scrollbar {
      width: 5px; /* Largura da barra de rolagem */
    }

    .messages-container::-webkit-scrollbar-track {
      background: transparent; /* Fundo da trilha transparente */
    }

    .messages-container::-webkit-scrollbar-thumb {
      background-color: #1a5f7a; /* Cor do polegar da barra de rolagem */
      border-radius: 10px; /* Bordas arredondadas para o polegar */
    }

    .messages-container::-webkit-scrollbar-thumb:hover {
      background-color: #134b61; /* Cor do polegar ao passar o mouse */
    }

    .messages-container::-webkit-scrollbar-button {
      display: none; /* Remove as setas da barra de rolagem no Webkit */
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
      display: flex; /* Para alinhar tempo e status */
      align-items: center; /* Para alinhar tempo e status */
      justify-content: flex-end; /* Para alinhar tempo e status */
    }

    .message-status {
      margin-left: 3px; /* Espaço entre o tempo e o status */
      font-size: 0.6rem; /* Ajuste o tamanho conforme necessário */
      color: grey !important; /* Default tick color to grey */
    }

    .message-status .status-read {
      color: #134b61 !important; /* Cor azul para status "lido" (NOVA COR) */
    }

    .no-messages {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
      color: #999;
      font-style: italic;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatMessagesComponent implements OnInit, OnChanges, AfterViewChecked, OnDestroy {
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  // Renamed and New Inputs
  @Input() chatId!: string; // Was conversationId
  @Input() currentUserId!: number;
  @Input() currentUserAvatarUrl: string | null = null;
  @Input() isGroup: boolean = false; // Was isGroupChat
  @Input() participants: ChatParticipant[] = [];
  @Input() defaultImage: string = '/assets/images/user.png';

  private _messages: Message[] = [];
  private messageStatusSubscription!: Subscription;
  private isViewInitialized = false;

  @Input()
  set messages(value: Message[]) {
    console.log(`[CHAT MESSAGES] Setter: messages received. Length: ${value ? value.length : 'null/undefined'}`);
    if (value) {
      value.forEach((m, idx) => {
        if (!m) {
          console.error(`[CHAT MESSAGES] Setter: Incoming message at index ${idx} is null/undefined.`);
          return;
        }
        if (m.id === undefined || m.id === null) {
          console.error(`[CHAT MESSAGES] Setter: Incoming message at index ${idx} has UNDEFINED/NULL ID. Message: ${JSON.stringify(m)}`);
        }
      });
      this._messages = [...value];
      console.log(`[CHAT MESSAGES] Setter: _messages populated. Current length: ${this._messages.length}`);
      if (this.isViewInitialized) {
        this.scrollToBottom();
        this.cdr.detectChanges();
      }
    } else {
      console.warn('[CHAT MESSAGES] Setter: messages received as null or undefined. Clearing _messages.');
      this._messages = [];
      if (this.isViewInitialized) {
        this.cdr.detectChanges();
      }
    }
  }
  get messages(): Message[] {
    return this._messages;
  }

  constructor(
    private chatService: ChatService,
    private cdr: ChangeDetectorRef,
    private el: ElementRef
  ) {
    console.log('[CHAT MESSAGES] Constructor');
  }

  ngOnInit(): void {
    console.log('[CHAT MESSAGES] ngOnInit. Chat ID:', this.chatId, 'Current User ID:', this.currentUserId);

    if (this.currentUserId === undefined || this.currentUserId === null) {
        console.error('[CHAT MESSAGES] ngOnInit: currentUserId is not provided or is null.');
    }
    if (!this.chatId) {
        console.error('[CHAT MESSAGES] ngOnInit: chatId is not provided.');
    }

    this.subscribeToMessageStatusUpdates();
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('[CHAT MESSAGES] ngOnChanges triggered.', changes);
    if (changes['messages']) {
      console.log('[CHAT MESSAGES] ngOnChanges: messages @Input changed. New length:', this._messages.length);
    }
    if (changes['chatId']) {
      console.log('[CHAT MESSAGES] ngOnChanges: chatId changed to', this.chatId);
      if (this.chatId) {
        this.subscribeToMessageStatusUpdates();
      } else {
         console.warn('[CHAT MESSAGES] ngOnChanges: chatId changed to null/undefined. Not subscribing to status updates.');
         if (this.messageStatusSubscription) {
            this.messageStatusSubscription.unsubscribe();
         }
      }
    }
    if (changes['currentUserId']) {
        console.log('[CHAT MESSAGES] ngOnChanges: currentUserId changed to', this.currentUserId);
        this.cdr.detectChanges();
    }
    if (changes['isGroup']) {
        console.log('[CHAT MESSAGES] ngOnChanges: isGroup changed to', this.isGroup);
        this.cdr.detectChanges();
    }
  }

  ngAfterViewChecked(): void {
    if (!this.isViewInitialized) {
      this.isViewInitialized = true;
      console.log('[CHAT MESSAGES] ngAfterViewChecked: View initialized, scrolling to bottom.');
      this.scrollToBottom();
    }
  }

  private subscribeToMessageStatusUpdates(): void {
    if (this.messageStatusSubscription) {
      this.messageStatusSubscription.unsubscribe();
      console.log('[CHAT MESSAGES] WS Update: Unsubscribed from previous message status listener.');
    }
    if (!this.chatId) {
      console.warn('[CHAT MESSAGES] WS Update: Cannot subscribe to message status updates without a valid chatId.');
      return;
    }
    console.log('[CHAT MESSAGES] WS Update: Subscribing to message status updates for chatId:', this.chatId);
    this.messageStatusSubscription = this.chatService.getMessageStatusUpdateListener()
      .subscribe((update: { chatId: number; status: 'sent' | 'delivered' | 'read'; messageIds: string[] }) => {
        console.log(`[CHAT MESSAGES] WS Update: Received event. Update chatId: ${update?.chatId}, Status: ${update?.status}, Message IDs: ${update?.messageIds?.join(',')}. Current component chatId: ${this.chatId}`);

        if (!update || update.chatId === undefined || !update.messageIds || !update.status) {
          console.error('[CHAT MESSAGES] WS Update: Invalid payload received from ChatService subject.', JSON.stringify(update));
          return;
        }

        if (update.chatId.toString() === this.chatId) {
          console.log(`[CHAT MESSAGES] WS Update: Processing status update for current conversation ${this.chatId}. ${update.messageIds.length} message ID(s) in payload with status '${update.status}'.`);

          const updatedMessageIdsAsNumbers = update.messageIds.map(idStr => parseInt(idStr, 10)).filter(idNum => !isNaN(idNum));

          // Log if some IDs couldn't be parsed, but still proceed with valid ones.
          if (updatedMessageIdsAsNumbers.length !== update.messageIds.length) {
            console.warn('[CHAT MESSAGES] WS Update: Some message IDs in the payload were invalid or could not be parsed to numbers. Processed IDs:', updatedMessageIdsAsNumbers, 'Original IDs:', update.messageIds);
          }

          // If all IDs were invalid after parsing, there's nothing to do.
          if (updatedMessageIdsAsNumbers.length === 0 && update.messageIds.length > 0) {
            console.warn('[CHAT MESSAGES] WS Update: No valid message IDs to process after parsing.');
            return;
          }

          let actualMessagesChanged = false;
          const newMessagesList = this._messages.map(msg => {
            // Ensure msg and msg.id are valid before trying to access them
            if (msg && typeof msg.id === 'number' && updatedMessageIdsAsNumbers.includes(msg.id)) {
              if (msg.status !== update.status) {
                actualMessagesChanged = true;
                // Create a new message object with the updated status
                return { ...msg, status: update.status };
              }
            }
            return msg; // Return the original message object if no change or no match
          });

          if (actualMessagesChanged) {
            console.log(`[CHAT MESSAGES] WS Update: Message statuses updated for IDs [${updatedMessageIdsAsNumbers.join(', ')}] to '${update.status}'. Triggering view update.`);
            // Assigning to this.messages will use the @Input setter,
            // which creates a new backing array for _messages and calls cdr.detectChanges().
            this.messages = newMessagesList;
          } else {
            console.log('[CHAT MESSAGES] WS Update: Received status update, but no message statuses actually changed or no matching messages found for IDs:', updatedMessageIdsAsNumbers);
          }
        }
      }, (error: any) => {
        console.error('[CHAT MESSAGES] WS Update: Error in messageStatusUpdate subscription:', error);
      });
  }

  scrollToBottom(): void {
    try {
      if (this.myScrollContainer && this.myScrollContainer.nativeElement) {
        setTimeout(() => {
          this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
          console.log('[CHAT MESSAGES] Scrolled to bottom.');
        }, 0);
      }
    } catch (err) {
      console.error('[CHAT MESSAGES] Error scrolling to bottom:', err);
    }
  }

  trackByMessageId(index: number, message: Message): number | string {
    if (!message) {
      console.warn(`[CHAT MESSAGES] trackByMessageId: Message at index ${index} is UNDEFINED/NULL.`);
      return `error-null-${index}-${Date.now()}`;
    }
    if (message.id === undefined || message.id === null) {
      const contentPreview = message.content ? message.content.substring(0, 30) + "..." : "N/A";
      console.warn(`[CHAT MESSAGES] trackByMessageId: Message at index ${index} has UNDEFINED/NULL ID. Content: \"${contentPreview}\". Assigning temporary ID: error-id-${index}-${Date.now()}`);
      return `error-id-${index}-${Date.now()}`;
    }
    return message.id;
  }

  getSenderName(message: Message): string {
    if (!message) return '';
    if (this.isGroup && message.senderId !== this.currentUserId) {
      if (message.senderName) return message.senderName;
      const participant = this.participants.find(p => p.id === message.senderId);
      return participant?.username || 'Participant';
    }
    return '';
  }

  getSenderAvatar(message: Message): string | undefined | null {
    if (!message) return null;
    if (message.senderId !== this.currentUserId) {
        if (this.isGroup || message.senderId !== this.currentUserId) {
            if (message.senderProfileImage) return message.senderProfileImage;
            const participant = this.participants.find(p => p.id === message.senderId);
            return participant?.profileImage;
        }
    }
    return null;
  }

  ngOnDestroy(): void {
    if (this.messageStatusSubscription) {
      this.messageStatusSubscription.unsubscribe();
      console.log('[CHAT MESSAGES] Unsubscribed from message status updates on destroy.');
    }
  }
}
