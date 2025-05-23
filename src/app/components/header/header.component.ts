import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { GuestService } from '../../services/guest.service';
import { ChatService } from '../../services/chat.service'; // <--- ADICIONAR ChatService
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnDestroy {
  isLoggedIn = false;
  isAdmin = false;
  username: string | null = null;
  guestNickname: string | null = null;
  isMenuOpen = false; // Property to toggle menu
  totalUnreadMessages = 0; // <--- ADICIONAR ESTA LINHA
  private authSubscription: Subscription | null = null;
  private guestNicknameSubscription: Subscription | null = null;
  private unreadCountSubscription: Subscription | null = null; // <--- ADICIONAR ESTA LINHA

  constructor(
    private authService: AuthService,
    private guestService: GuestService,
    private chatService: ChatService, // <--- INJETAR ChatService
    private router: Router
  ) {}

  ngOnInit() {
    // Inscreve-se para mudanças no estado de autenticação
    this.authSubscription = this.authService.isAuthenticated().subscribe(
      isAuthenticated => {
        this.isLoggedIn = isAuthenticated;
        this.username = this.authService.getUsername();

        // Força a definição manual de admin caso o usuário seja 'admin'
        if (this.username === 'admin') {
          localStorage.setItem('is_admin', 'true');
          console.log('Definindo manualmente o usuário admin como administrador');
        }

        this.isAdmin = this.authService.isAdmin();
        console.log('Status de administrador:', this.isAdmin);

        // Se estiver autenticado, o nickname de convidado não deve ser exibido
        if (isAuthenticated) {
          this.guestNickname = null;
        }
      }
    );

    // Inscreve-se para mudanças no nickname do convidado
    this.guestNicknameSubscription = this.guestService.guestNickname$().subscribe(
      nickname => {
        // Só atualiza o nickname se não estiver autenticado
        if (!this.isLoggedIn) {
          this.guestNickname = nickname;
        }
      }
    );

    // Inscreve-se para mudanças na contagem total de mensagens não lidas
    this.unreadCountSubscription = this.chatService.totalUnreadCount$.subscribe(count => { // <--- ADICIONAR ESTE BLOCO
      this.totalUnreadMessages = count;
    });
  }

  ngOnDestroy() {
    // Cancela inscrições para evitar memory leaks
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    if (this.guestNicknameSubscription) {
      this.guestNicknameSubscription.unsubscribe();
    }
    if (this.unreadCountSubscription) { // <--- ADICIONAR ESTE BLOCO
      this.unreadCountSubscription.unsubscribe();
    }
  }

  toggleMenu() { // Method to toggle menu
    this.isMenuOpen = !this.isMenuOpen;
  }

  login() {
    this.router.navigate(['/auth'], { state: { mode: 'login' } });
  }

  logout() {
    this.authService.logout();
    this.guestService.clearGuestNickname(); // Limpa o apelido ao fazer logout
    this.router.navigate(['/']);
  }
}
