import { Component, OnInit, ViewChild } from '@angular/core';
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
  sending = false; // to control the sending state

  @ViewChild(ChatInputComponent) private chatInputComponent!: ChatInputComponent;

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
        // Call focus on the child input component directly after send operation is complete and input is re-enabled
        // The child's focusInputElement method has its own internal setTimeout(0)
        this.chatInputComponent?.focusInputElement();
      },
      error: (error) => {
        console.error('[CHAT COMPONENT] Error sending message via ChatComponent:', error);
        this.sending = false;
        // Also attempt to focus on error, to allow user to correct and resend
        this.chatInputComponent?.focusInputElement();
      }
    });
  }
}
