import { Component, OnInit } from '@angular/core'; // Removed ViewChild
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ChatListComponent } from './chat-list/chat-list.component';
import { ChatConversationComponent } from './chat-conversation/chat-conversation.component';
// ChatInputComponent is no longer directly used here, it's part of ChatConversationComponent
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
    ChatNewComponent,
    ChatProfileComponent
  ]
})
export class ChatComponent implements OnInit {
  selectedChat: Chat | null = null;
  isLoading = false;
  error: string | null = null;
  sending = false; // to control the sending state

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

  onMessageSent(message: string): void {
    if (!this.selectedChat) {
      console.warn('[CHAT COMPONENT] onMessageSent - No selected chat, cannot send message.');
      return;
    }

    console.log(`[CHAT COMPONENT] onMessageSent - Attempting to send message: "${message}" to chat ID: ${this.selectedChat.id}`);
    this.sending = true;

    this.chatService.sendMessage(this.selectedChat.id, message).subscribe({
      next: (response) => {
        console.log('[CHAT COMPONENT] Message sent successfully via HTTP by ChatComponent:', response);
        this.sending = false;
      },
      error: (error) => {
        console.error('[CHAT COMPONENT] Error sending message via ChatComponent:', error);
        this.sending = false;
      }
    });
  }
}
