import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ChatListComponent } from './chat-list/chat-list.component';
import { ChatConversationComponent } from './chat-conversation/chat-conversation.component';
import { ChatInputComponent } from './chat-conversation/chat-input/chat-input.component';
import { ChatNewComponent } from './chat-new/chat-new.component';
import { ChatProfileComponent } from './chat-profile/chat-profile.component';
import { ChatService } from '../../services/chat.service';
import { Chat } from '../../models/chat/chat.interface';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ChatListComponent,
    ChatConversationComponent,
    ChatInputComponent,
    ChatNewComponent,
    ChatProfileComponent
  ]
})
export class ChatComponent implements OnInit {
  selectedChat: Chat | null = null;
  isLoading = false;
  error: string | null = null;

  constructor(private chatService: ChatService) {}

  ngOnInit(): void {
    // Initially, no chat is selected
    console.log('[CHAT COMPONENT] ngOnInit - No chat initially selected.');
  }

  onChatSelected(chat: Chat): void {
    console.log('[CHAT COMPONENT] onChatSelected - Chat selected:', chat);
    this.selectedChat = chat;
  }

  onChatCreated(chat: Chat): void {
    // Action for the new chat
    console.log('[CHAT COMPONENT] onChatCreated - New chat created:', chat);
    this.selectedChat = chat;

    // To inform the list component that it should update
    // For a larger application, it would be better to use a state management service like NgRx
    const event = new CustomEvent('chat:created', { detail: chat });
    window.dispatchEvent(event);
  }

  sending = false; // to control the sending state

  onMessageSent(message: string): void {
    if (!this.selectedChat) {
      console.warn('[CHAT COMPONENT] onMessageSent - No selected chat, cannot send message.');
      return;
    }

    console.log(`[CHAT COMPONENT] onMessageSent - Attempting to send message: "${message}" to chat ID: ${this.selectedChat.id}`);
    this.sending = true;

    // It's generally preferred to call the service directly from the component that owns the action,
    // rather than trying to access child component methods via document.querySelector.
    // The ChatConversationComponent should independently listen for WebSocket updates for new messages.
    this.chatService.sendMessage(this.selectedChat.id, message).subscribe({
      next: (response) => {
        console.log('[CHAT COMPONENT] Message sent successfully via HTTP by ChatComponent:', response);
        this.sending = false;
        // No need to dispatch 'chat:messageSent' here if ChatConversationComponent
        // is already listening to WebSocket updates via ChatService.
        // The UI update for the sender should also come via WebSocket to ensure consistency.
      },
      error: (error) => {
        console.error('[CHAT COMPONENT] Error sending message via ChatComponent:', error);
        this.sending = false;
      }
    });
  }
}
