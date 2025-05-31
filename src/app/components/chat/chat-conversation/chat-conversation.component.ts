// filepath: /workspaces/AA_Space/src/app/components/chat/chat-conversation/chat-conversation.component.ts
import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ChangeDetectorRef } from '@angular/core'; // Import ChangeDetectorRef
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chat, Message, ChatParticipant } from '../../../models/chat/chat.interface';
import { ChatService } from '../../../services/chat.service';
import { ProfileService, UserProfile } from '../../../services/profile.service'; // Import ProfileService and UserProfile
import { ChatHeaderComponent } from './chat-header/chat-header.component';
import { ChatMessagesComponent } from './chat-messages/chat-messages.component';
import { ChatInputComponent } from './chat-input/chat-input.component'; // Importar ChatInputComponent
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat-conversation',
  templateUrl: './chat-conversation.component.html',
  styleUrls: ['./chat-conversation.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ChatHeaderComponent,
    ChatMessagesComponent,
    ChatInputComponent // Adicionar ChatInputComponent aos imports
  ]
})
export class ChatConversationComponent implements OnChanges, OnInit, OnDestroy {
  @Input() selectedChat: Chat | null = null;

  messages: Message[] = [];
  currentUserId!: number; // Will be set by ProfileService
  currentUserProfileImageUrl: string | null = null; // For current user's avatar
  loading = false;
  error: string | null = null;
  sending = false;
  defaultImage: string = '/assets/images/user.png';

  private messageSubscription: Subscription | null = null;
  private userProfileSubscription!: Subscription; // Changed from authSubscription

  private profileImageUpdatedHandler = () => {
    console.log('[CHAT CONVERSATION] Evento de atualização de imagem detectado, recarregando mensagens');
    if (this.selectedChat) {
      this.loadMessagesAndListen();
    }
  };

  constructor(
    private chatService: ChatService,
    private profileService: ProfileService,
    private cdRef: ChangeDetectorRef // Ensure injected
  ) {
    console.log('[CONVO] Constructor: Initializing component.');
  }

  ngOnInit(): void {
    console.log('[CONVO] ngOnInit: Initializing component.');
    window.addEventListener('profile:imageUpdated', this.profileImageUpdatedHandler);

    this.userProfileSubscription = this.profileService.getCurrentUserProfile().subscribe((userProfile: UserProfile) => {
      const previousUserId = this.currentUserId; // Store previous userId
      if (userProfile && userProfile.id !== undefined) {
        this.currentUserId = userProfile.id;
        this.currentUserProfileImageUrl = userProfile.profileImage || this.defaultImage;
        console.warn(`[CONVO] ngOnInit: Current user profile updated from ProfileService. ID: ${this.currentUserId}, Avatar: ${this.currentUserProfileImageUrl}`); // Changed to warn

        // Log the state of selectedChat right before the condition
        console.warn(`[CONVO] ngOnInit: Checking condition to load messages. selectedChat:`, this.selectedChat);

        // If currentUserId is now valid and was previously invalid, and a chat is selected, load messages.
        if (this.selectedChat && (previousUserId === undefined || previousUserId === null || previousUserId === -1) && (this.currentUserId !== undefined && this.currentUserId !== null && this.currentUserId !== -1)) {
          console.warn(`[CONVO] ngOnInit: currentUserId is now valid (${this.currentUserId}) and a chat (ID: ${this.selectedChat.id}) is selected. Triggering message load.`); // Changed to warn
          this.loadMessagesAndListen();
        }
      } else {
        console.warn('[CONVO] ngOnInit: No user profile or user ID from ProfileService. UserProfile:', userProfile);
        this.currentUserId = -1;
        this.currentUserProfileImageUrl = this.defaultImage;
      }
    });
  }

  ngOnDestroy(): void {
    console.log('[CONVO] ngOnDestroy: Cleaning up component.');
    window.removeEventListener('profile:imageUpdated', this.profileImageUpdatedHandler);
    this.unsubscribeFromMessages(); // Ensures the single correct method is called

    if (this.userProfileSubscription) {
      this.userProfileSubscription.unsubscribe();
      console.log('[CONVO] ngOnDestroy: Unsubscribed from ProfileService.');
    }
  }

  private unsubscribeFromMessages(): void { // This is the correct, remaining method
    if (this.messageSubscription) {
      console.log(`[CONVO] unsubscribeFromMessages - Unsubscribing from messageSubscription. Chat ID was: ${this.selectedChat?.id}`);
      this.messageSubscription.unsubscribe();
      this.messageSubscription = null;
      // No need to call chatService.closeChatConnection() here unless it's specifically for this component's view
    } else {
      // console.log('[CONVO] unsubscribeFromMessages - No active messageSubscription to unsubscribe from.');
    }
  }

  private loadMessagesAndListen(): void {
    if (!this.selectedChat) {
      console.log('[CONVO] loadMessagesAndListen - No selected chat, returning.');
      return;
    }
    console.warn(`[CONVO] loadMessagesAndListen - START for chat ID ${this.selectedChat.id}`); // Changed to warn

    this.loading = true;
    this.error = null;

    const chatId = this.selectedChat.id;
    this.chatService.fetchMessages(chatId).subscribe({
        next: (fetchedMessages) => {
            console.log(`[CONVO] loadMessagesAndListen - STEP 1: fetchMessages SUCCESS for chat ${chatId}. Raw fetchedMessages Count: ${fetchedMessages ? fetchedMessages.length : 'undefined/null'}.`);

            this.messages = (fetchedMessages || []).map(msg => ({
                ...msg,
                senderProfileImage: this.formatImageUrl(msg.senderProfileImage || '') || this.defaultImage
            }));

            const messagesForLog = this.messages ? JSON.parse(JSON.stringify(this.messages)) : [];
            console.log(`[CONVO] loadMessagesAndListen - STEP 2: this.messages assigned and mapped. Current this.messages Count: ${this.messages.length}. Data (logged as copy):`, messagesForLog);

            this.loading = false;

            console.log(`[CONVO] loadMessagesAndListen - STEP 3: Messages processed. Current this.messages Count: ${this.messages.length}. Triggering cdRef.detectChanges().`);
            this.cdRef.detectChanges();
            console.log(`[CONVO] loadMessagesAndListen - STEP 4: cdRef.detectChanges() DONE. Current this.messages Count: ${this.messages.length}. Now calling listenForNewMessages.`); // MODIFIED LOG
            this.listenForNewMessages(chatId); // Pass chatId
        },
        error: (err) => {
          console.error('[CONVO] loadMessagesAndListen - Error loading HTTP messages:', err);
          this.error = 'Falha ao carregar mensagens. Tente novamente.';
          this.loading = false;
          this.cdRef.detectChanges();
        }
      });
  }

  private listenForNewMessages(expectedChatId: number): void {
    if (!this.selectedChat || this.selectedChat.id !== expectedChatId) {
      console.warn(`[CONVO] listenForNewMessages - Called for chat ${expectedChatId} but selected chat is ${this.selectedChat?.id}. Aborting subscription.`);
      return;
    }

    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
      this.messageSubscription = null;
      console.log(`[CONVO] listenForNewMessages - Unsubscribed from previous messageSubscription for chat ${expectedChatId}.`);
    }

    console.log(`[CONVO] listenForNewMessages - Subscribing to chatService.messages$ for chat ID ${expectedChatId}. Current this.messages count before sub: ${this.messages.length}`);

    this.messageSubscription = this.chatService.messages$
      .subscribe({
        next: (messagesFromObservable: Message[]) => {
          console.warn(`[CONVO] messages$.next - Received messagesFromObservable. Length: ${messagesFromObservable?.length}. ForChatID: ${this.selectedChat?.id}, ExpectedChatID: ${expectedChatId}`);

          if (this.selectedChat && this.selectedChat.id === expectedChatId) {
            const filteredMessagesFromObs = (messagesFromObservable || []).filter(m => m.chatId === expectedChatId);
            console.warn(`[CONVO] messages$.next - Filtered for chat ${expectedChatId}. filteredMessagesFromObs Length: ${filteredMessagesFromObs.length}. Current this.messages length before update: ${this.messages.length}`);

            if (filteredMessagesFromObs.length > 0) {
              // Observable has new messages, update our list
              const newMappedMessages = filteredMessagesFromObs.map(newMessage => ({
                  ...newMessage,
                  senderProfileImage: this.formatImageUrl(newMessage.senderProfileImage || '') || this.defaultImage
              }));

              if (JSON.stringify(this.messages) !== JSON.stringify(newMappedMessages)) {
                  this.messages = newMappedMessages;
                  console.warn(`[CONVO] messages$.next - this.messages updated from observable with ${newMappedMessages.length} message(s) for chat ${expectedChatId}. Triggering cdRef.detectChanges().`);
                  this.cdRef.detectChanges();
              } else {
                  console.warn(`[CONVO] messages$.next - Observable data for chat ${expectedChatId} matches current this.messages. No update needed.`);
              }
            } else { // filteredMessagesFromObs.length === 0
              // Observable emitted an empty array for this chat.
              // If we already have messages (e.g., from HTTP), we don't want to wipe them.
              // If this.messages is already empty, no change is needed.
              if (this.messages.length > 0) {
                console.warn(`[CONVO] messages$.next - Observable filtered to 0 messages for chat ${expectedChatId}, but HTTP messages exist (${this.messages.length}). IGNORING this emission to prevent wipe.`);
              } else {
                console.warn(`[CONVO] messages$.next - Observable filtered to 0 messages for chat ${expectedChatId}, and this.messages is already []. No change needed.`);
              }
            }
            console.log(`[CONVO] messages$.next - Finished processing for chat ${expectedChatId}. Current this.messages Count: ${this.messages.length}.`);
          } else {
            console.warn(`[CONVO] messages$.next - Event for different/no selected chat. Selected: ${this.selectedChat?.id}, Expected: ${expectedChatId}. Not processing this emission here.`);
          }
        },
        error: (err: any) => {
            console.error(`[CONVO] Error on messages$ subscription for chat ${expectedChatId}:`, err);
            this.error = 'Erro na conexão em tempo real.';
            if (this.cdRef) {
                this.cdRef.detectChanges();
            }
        }
      });
    console.log(`[CONVO] listenForNewMessages - Subscription to messages$ established for chat ${expectedChatId}.`);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedChat']) {
        const newChat = changes['selectedChat'].currentValue as Chat | null;
        const oldChat = changes['selectedChat'].previousValue as Chat | null;

        console.log(`[CONVO] ngOnChanges - selectedChat changed. New ID: ${newChat?.id}, Old ID: ${oldChat?.id}.`);

        // Determine if the chat has meaningfully changed
        const hasChatIdActuallyChanged = newChat?.id !== oldChat?.id;
        // This also covers transitions to/from null if we consider undefined ID different from a numeric ID.
        // More explicit checks for clarity:
        // const isNewChatSelected = newChat && !oldChat; // From null to a chat
        // const isChatDeselected = !newChat && oldChat; // From a chat to null

        if (hasChatIdActuallyChanged) {
            console.warn(`[CONVO] ngOnChanges - Meaningful chat change detected. New: ${newChat?.id}, Old: ${oldChat?.id}.`);

            this.unsubscribeFromMessages(); // Always unsubscribe if chat identity changes or becomes null

            if (newChat) {
                console.log(`[CONVO] ngOnChanges - New chat selected (ID: ${newChat.id}). Resetting messages and preparing to load.`);
                this.messages = []; // Reset messages for the new chat

                if (this.currentUserId !== undefined && this.currentUserId !== null && this.currentUserId !== -1) {
                    console.warn(`[CONVO] ngOnChanges - User ID ${this.currentUserId} is valid. Calling loadMessagesAndListen for chat ${newChat.id}.`);
                    this.loadMessagesAndListen();
                } else {
                    console.warn(`[CONVO] ngOnChanges - User ID (${this.currentUserId}) is not yet valid. Messages cleared, waiting for ProfileService for chat ${newChat.id}.`);
                }
            } else { // newChat is null (chat deselected)
                console.log('[CONVO] ngOnChanges - No chat selected. Messages cleared.');
                this.messages = []; // Ensure messages are cleared
            }
            // Only call detectChanges if messages array was actually modified (e.g. set to [])
            // or if other template-bound properties changed that need immediate reflection.
            this.cdRef.detectChanges();
        } else if (newChat && oldChat && newChat.id === oldChat.id) {
            // This case means ngOnChanges was called, but the chat ID is the same.
            // This could be a re-trigger or the input object reference changed but represents the same chat.
            // We should NOT reset messages or reload if the essential data (ID) is the same.
            console.warn(`[CONVO] ngOnChanges - Called for the same chat ID (${newChat.id}). Current messages count: ${this.messages.length}. No action taken to prevent wipe/reload.`);
        }
        // Removed previous unconditional .detectChanges() and specific ones from old logic.
        // The detectChanges inside the `if (hasChatIdActuallyChanged)` block should cover necessary updates.
    }
  }

  private static imageTimestamps: Record<string, number> = {};
  formatImageUrl(imagePath: string): string {
    if (!imagePath) return this.defaultImage;

    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
      return imagePath;
    }

    let apiOrigin = 'https://v3mrhcvc-3001.brs.devtunnels.ms/';
    if (typeof window !== 'undefined') {
      if (window.location.hostname.includes('github')) {
        const origin = window.location.origin;
        apiOrigin = origin.replace(/-4200\./, '-3001.');
      } else if (window.location.hostname === 'localhost') {
        apiOrigin = 'http://localhost:3001';
      }
    }

    let normalizedPath = imagePath;
    if (imagePath.includes('profiles/') && !imagePath.includes('/uploads/')) {
      normalizedPath = '/uploads' + (imagePath.startsWith('/') ? '' : '/') + imagePath;
    } else if (imagePath.includes('/assets/') && !imagePath.startsWith('/uploads/assets/')) {
      normalizedPath = '/uploads/assets/' + imagePath.split('/assets/').pop();
    } else if (!imagePath.startsWith('/')) {
      normalizedPath = '/' + imagePath;
    }

    const finalPath = (apiOrigin.endsWith('/') && normalizedPath.startsWith('/'))
      ? apiOrigin + normalizedPath.substring(1)
      : apiOrigin + normalizedPath;

    console.log(`[CHAT CONVERSATION] Formatting URL. Input: "${imagePath}", Origin: "${apiOrigin}", Normalized: "${normalizedPath}", Output: "${finalPath}"`);

    return finalPath;
  }

  onMessageSent(message: string): void {
    if (!message.trim() || !this.selectedChat) {
      return;
    }

    this.sending = true;
    this.error = null;

    // Marcar como lido ao enviar uma mensagem também, se o chat estiver selecionado
    if (this.selectedChat) {
      // Assuming you want to mark all current messages as read when sending a new one.
      // If only specific unread messages, those IDs need to be collected.
      const messageIdsToMark = this.messages.filter(m => !m.read && m.senderId !== this.currentUserId).map(m => m.id);
      if (messageIdsToMark.length > 0) {
        this.chatService.markMessagesAsRead(this.selectedChat.id, messageIdsToMark); // Changed to markMessagesAsRead
      }
    }

    this.chatService.sendMessage(this.selectedChat.id, message)
      .subscribe({
        next: (sentMessage) => {
          console.log('[CHAT CONVERSATION] Mensagem enviada via HTTP, aguardando WebSocket para atualização.');
          this.sending = false;
        },
        error: (err) => {
          console.error('Erro ao enviar mensagem:', err);
          this.error = 'Falha ao enviar mensagem. Tente novamente.';
          this.sending = false;
        }
      });
  }

  // Novo método para lidar com o foco no input
  handleInputFocused(): void {
    if (this.selectedChat) {
      // console.log(`[CONVO] Input focused for chat ID ${this.selectedChat.id}. Marking chat as read.`);
      const messageIdsToMark = this.messages.filter(m => !m.read && m.senderId !== this.currentUserId).map(m => m.id);
      if (messageIdsToMark.length > 0) {
        this.chatService.markMessagesAsRead(this.selectedChat.id, messageIdsToMark); // Changed to markMessagesAsRead
      }
      // Adicionalmente, podemos querer notificar o ChatListComponent para atualizar a UI de não lidas,
      // mas o ChatService.markChatAsRead já deve atualizar o totalUnreadCount,
      // e o ChatListComponent já escuta isso e também atualiza a lista localmente.
    }
  }
}
