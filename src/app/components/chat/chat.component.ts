import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ChatListComponent } from './chat-list/chat-list.component';
import { ChatConversationComponent } from './chat-conversation/chat-conversation.component';
import { ChatNewComponent } from './chat-new/chat-new.component';
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
    ChatNewComponent
  ]
})
export class ChatComponent implements OnInit {
  selectedChat: Chat | null = null;
  isLoading = false;
  error: string | null = null;

  constructor(private chatService: ChatService) {}

  ngOnInit(): void {
    // Inicialmente não há chat selecionado
  }

  onChatSelected(chat: Chat): void {
    this.selectedChat = chat;
  }

  onChatCreated(chat: Chat): void {
    // Atualiza a seleção para o novo chat
    this.selectedChat = chat;

    // Emite um evento para informar o componente de lista que deve atualizar
    // Em uma aplicação maior, seria melhor usar um serviço de estado como NGRX
    const event = new CustomEvent('chat:created', { detail: chat });
    window.dispatchEvent(event);
  }
}
