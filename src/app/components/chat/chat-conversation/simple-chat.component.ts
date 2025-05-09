import { Component, Input, ViewChild, ElementRef, OnInit, OnChanges, AfterViewInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Message, Chat } from '../../../models/chat/chat.interface';
import { MessagesScrollDirective } from './messages-scroll.directive';


@Component({
  selector: 'app-simple-chat',
  templateUrl: './simple-template.html',
  styleUrls: ['./simple-layout.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MessagesScrollDirective]
})
export class SimpleChatComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() chat: Chat | null = null;
  @Input() messages: Message[] = [];
  @Input() currentUserId: number = 0;
  
  @ViewChild('messageContainer') messageContainer!: ElementRef;
  
  newMessage: string = '';
  isSubmitting = false;
  
  ngOnInit(): void {
    // Inicialização
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    // A diretiva appMessagesScroll cuida do scroll automático
  }
  
  ngAfterViewInit(): void {
    // A diretiva appMessagesScroll cuida do scroll inicial
    console.log('SimpleChatComponent inicializado');
    
    // Vamos tentar forçar programaticamente também
    setTimeout(() => {
      if (this.messageContainer?.nativeElement) {
        const container = this.messageContainer.nativeElement;
        console.log('Tentando forçar scroll programaticamente', {
          container,
          style: window.getComputedStyle(container)
        });
        
        // Forçar o scroll programaticamente
        container.scrollTop = 9999;
        
        // Adicionar uma classe para garantir que estilo CSS seja aplicado
        container.classList.add('forced-scroll');
      }
    }, 1000);
  }
  
  get chatName(): string {
    if (!this.chat) return '';
    return this.chat.name || this.getParticipantName();
  }
  
  get isGroupChat(): boolean {
    return this.chat?.isGroup || false;
  }
  
  get participantsCount(): number {
    return this.chat?.participants?.length || 0;
  }
  
  getParticipantName(): string {
    if (!this.chat) return '';
    
    if (!this.chat.isGroup) {
      // Encontrar o nome do outro participante (não o usuário atual)
      const otherParticipant = this.chat.participants.find(p => p.id !== this.currentUserId);
      return otherParticipant?.username || 'Usuário';
    }
    
    return this.chat.name || 'Grupo';
  }
  
  getUserName(userId: number): string {
    if (!this.chat) return 'Usuário';
    
    // Encontrar o participante pelo ID
    const participant = this.chat.participants.find(p => p.id === userId);
    return participant?.username || 'Usuário';
  }
  
  isSentByMe(message: Message): boolean {
    return message.senderId === this.currentUserId;
  }
  
  canSendMessage(): boolean {
    return !!this.newMessage.trim() && !this.isSubmitting;
  }
  
  sendMessage(): void {
    if (!this.canSendMessage() || !this.chat) {
      return;
    }
    
    this.isSubmitting = true;
    
    // Aqui você implementaria a lógica para enviar mensagem
    // E depois limparia o campo e adicionaria à lista
    console.log('Enviando mensagem:', this.newMessage);
    
    // Simulação de envio (substitua pelo serviço real)
    setTimeout(() => {
      const tempMessage: Message = {
        id: Math.random(),
        // Removido chatId pois não faz parte da interface Message
        senderId: this.currentUserId,
        content: this.newMessage.trim(),
        timestamp: new Date(),
        read: false
      };
      
      // Adiciona a mensagem (isso deve ser feito pelo serviço real)
      this.messages = [...this.messages, tempMessage];
      
      // Limpar campo e resetar estado
      this.newMessage = '';
      this.isSubmitting = false;
      
      // A diretiva appMessagesScroll detectará a nova mensagem e fará o scroll
    }, 300);
  }
}
