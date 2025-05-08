import { Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chat, Message } from '../../../models/chat/chat.interface';
import { ChatService } from '../../../services/chat.service';
import { MessagesScrollDirective } from './messages-scroll.directive';

@Component({
  selector: 'app-chat-conversation',
  templateUrl: './chat-conversation.component.html',
  styleUrls: ['./chat-conversation.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MessagesScrollDirective]
})
export class ChatConversationComponent implements OnChanges, AfterViewChecked {
  @Input() selectedChat: Chat | null = null;
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  messages: Message[] = [];
  newMessage: string = '';
  currentUserId: number;
  loading = false;
  error: string | null = null;
  sending = false;
  defaultImage: string = '/assets/images/user.png'; // Updated to use absolute path

  constructor(private chatService: ChatService) {
    this.currentUserId = this.chatService.getCurrentUserId();
    console.log(`[CHAT CONV] ID do usuário atual: ${this.currentUserId}`);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedChat'] && changes['selectedChat'].currentValue) {
      this.loadMessages();
    }
  }

  getParticipantName(chat: Chat): string {
    if (!chat.isGroup) {
      // Encontrar o nome do outro participante (não o usuário atual)
      const otherParticipant = chat.participants.find(p => p.id !== this.currentUserId);
      return otherParticipant?.username || 'Usuário';
    }
    return chat.name || 'Grupo';
  }

  getUserName(userId: number): string {
    if (!this.selectedChat) return 'Usuário';

    // Verificar se é o usuário atual
    if (userId === this.currentUserId) {
      return 'Você';
    }

    // Encontrar o participante pelo ID
    const participant = this.selectedChat.participants.find(p => p.id === userId);
    return participant?.username || 'Usuário';
  }

  // Método para formatar URL da imagem para funcionar no GitHub Codespaces
  formatImageUrl(imagePath: string): string {
    if (!imagePath) return this.defaultImage;
    
    // Se o caminho já começar com http(s), não modificar
    if (imagePath.startsWith('http')) return imagePath;
    
    // Se o caminho for uma imagem base64, não modificar
    if (imagePath.startsWith('data:')) return imagePath;
    
    // Se não começar com barra, adicionar
    if (!imagePath.startsWith('/')) {
      imagePath = '/' + imagePath;
    }
    
    // Modificar o caminho para imagens de assets para usar a pasta do servidor
    if (imagePath.includes('/assets/')) {
      imagePath = imagePath.replace('/assets/', '/uploads/assets/');
    }
    
    // Usar sempre a porta 3001 para todas as imagens (backend)
    const origin = document.location.origin;
    const apiOrigin = origin.replace(/-4200\./, '-3001.');
    
    return `${apiOrigin}${imagePath}`;
  }

  // Método para obter a imagem de perfil de um usuário pelo ID
  getProfileImage(userId: number): string {
    if (!this.selectedChat) return this.formatImageUrl(this.defaultImage);

    // Verificar se é um participante do chat
    const participant = this.selectedChat.participants.find(p => p.id === userId);
    
    console.log(`[DEBUG] Participante ${userId} encontrado:`, participant);
    
    // Se o participante tiver uma imagem de perfil definida, use-a
    if (participant?.profileImage) {
      console.log(`[CHAT CONV] Usando imagem de perfil para ${participant.username}: ${participant.profileImage}`);
      return this.formatImageUrl(participant.profileImage);
    }
    
    console.log(`[CHAT CONV] Usando imagem padrão para usuário ${userId}`);
    return this.formatImageUrl(this.defaultImage);
  }

  // Método para obter a imagem de perfil do usuário atual
  getCurrentUserProfileImage(): string {
    // Se não encontrar no localStorage, verifica nos participantes do chat
    if (this.selectedChat) {
      const currentUser = this.selectedChat.participants.find(p => p.id === this.currentUserId);
      if (currentUser?.profileImage) {
        console.log(`[CHAT CONV] Usando imagem do usuário atual: ${currentUser.profileImage}`);
        return this.formatImageUrl(currentUser.profileImage);
      }
    }
    
    // Caso não encontre em nenhum lugar, retorna a imagem padrão
    console.log(`[CHAT CONV] Usando imagem padrão para usuário atual`);
    return this.formatImageUrl(this.defaultImage);
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.selectedChat) {
      return;
    }

    this.sending = true;
    this.error = null;

    // Usar o serviço para enviar a mensagem
    this.chatService.sendMessage(this.selectedChat.id, this.newMessage)
      .subscribe({
        next: (message) => {
          this.messages.push(message);
          this.newMessage = '';
          this.sending = false;

          console.log('Mensagem enviada, rolando para o final');
          
          // Rolando para o final após adicionar a mensagem
          // A execução em múltiplos tempos aumenta a chance de sucesso
          this.scrollToBottom(); // Imediato
          
          setTimeout(() => {
            console.log('Tentativa 1 após enviar mensagem');
            this.scrollToBottom();
          }, 50);
          
          setTimeout(() => {
            console.log('Tentativa 2 após enviar mensagem');
            this.scrollToBottom();
          }, 200);
        },
        error: (err) => {
          console.error('Erro ao enviar mensagem:', err);
          this.error = 'Falha ao enviar mensagem. Tente novamente.';
          this.sending = false;
        }
      });
  }

  private loadMessages(): void {
    if (!this.selectedChat) return;

    this.loading = true;
    this.error = null;

    // Usar o serviço para buscar as mensagens do chat selecionado
    this.chatService.getMessages(this.selectedChat.id)
      .subscribe({
        next: (messages) => {
          this.messages = messages;
          this.loading = false;

          // Rolando para o final após renderização das mensagens
          // Usando um delay maior para garantir que o DOM tenha tempo de renderizar
          setTimeout(() => {
            console.log('Rolando para o final após carregar mensagens');
            this.scrollToBottom();
            
            // Uma segunda tentativa com um delay maior se necessário
            setTimeout(() => {
              console.log('Segunda tentativa de rolagem');
              this.scrollToBottom();
            }, 300);
          }, 100);
        },
        error: (err) => {
          console.error('Erro ao carregar mensagens:', err);
          this.error = 'Falha ao carregar mensagens. Tente novamente.';
          this.loading = false;
        }
      });
  }

  // Método para acionar a rolagem para o final - versão simplificada para debug
  private scrollToBottom(): void {
    try {
      // Esperamos um pouco para garantir que a UI foi atualizada
      setTimeout(() => {
        if (this.messagesContainer && this.messagesContainer.nativeElement) {
          const element = this.messagesContainer.nativeElement;
          // Informação crucial para debug
          console.log('ANTES da rolagem:', {
            scrollHeight: element.scrollHeight,
            clientHeight: element.clientHeight,
            scrollTop: element.scrollTop,
            offsetHeight: element.offsetHeight
          });
          
          // Forçando a rolagem para o final
          element.scrollTop = element.scrollHeight;
          
          console.log('DEPOIS da rolagem:', {
            scrollTop: element.scrollTop
          });
        }
      }, 50);
    } catch (err) {
      console.error('Erro ao rolar mensagens para o final:', err);
    }
  }
  
  // Hook do ciclo de vida que executa após o conteúdo da view ser verificado
  ngAfterViewChecked() {
    // Não implementamos lógica aqui para evitar múltiplas chamadas durante ciclos de detecção
  }
}
