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
  userRole: string | null = null; // <--- ADD THIS LINE
  private authSubscription: Subscription | null = null;
  private isAdminSubscription: Subscription | null = null; // Added for isAdmin
  private guestNicknameSubscription: Subscription | null = null;
  private unreadCountSubscription: Subscription | null = null; // <--- ADICIONAR ESTA LINHA
  private userRoleSubscription: Subscription | null = null; // <--- ADD THIS LINE

  constructor(
    private authService: AuthService,
    private guestService: GuestService,
    private chatService: ChatService, // <--- INJETAR ChatService
    private router: Router
  ) {}

  ngOnInit() {
    // Inscreve-se para mudanças no estado de autenticação
    this.authSubscription = this.authService.isAuthenticated.subscribe(
      isAuthenticated => {
        this.isLoggedIn = isAuthenticated;
        this.username = this.authService.getUsername();

        // Se estiver autenticado, o nickname de convidado não deve ser exibido
        if (isAuthenticated) {
          this.guestNickname = null;
        }
      }
    );

    // Subscribe to isAdmin status
    this.isAdminSubscription = this.authService.isAdmin$.subscribe(
      isAdmin => {
        this.isAdmin = isAdmin;
        // [HeaderComponent] isAdmin status updated from isAdmin$: this.isAdmin
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
    this.unreadCountSubscription = this.chatService.unreadMessagesCount$.subscribe(count => { // <--- ADICIONAR ESTE BLOCO
      this.totalUnreadMessages = count;
    });

    // <--- ADD THIS BLOCK --- START --->
    this.userRoleSubscription = this.authService.userRole$.subscribe(role => {
      this.userRole = role;
      // [HeaderComponent] User role updated: this.userRole
    });
    // <--- ADD THIS BLOCK --- END --->
  }

  ngOnDestroy() {
    // Cancela inscrições para evitar memory leaks
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    if (this.isAdminSubscription) { // Unsubscribe isAdminSubscription
      this.isAdminSubscription.unsubscribe();
    }
    if (this.guestNicknameSubscription) {
      this.guestNicknameSubscription.unsubscribe();
    }
    if (this.unreadCountSubscription) { // <--- ADICIONAR ESTE BLOCO
      this.unreadCountSubscription.unsubscribe();
    }
    // <--- ADD THIS BLOCK --- START --->
    if (this.userRoleSubscription) {
      this.userRoleSubscription.unsubscribe();
    }
    // <--- ADD THIS BLOCK --- END --->
  }

  // <--- ADD THIS GETTER --- START --->
  get isLeaderOrAdmin(): boolean {
    const result = this.userRole === 'leader' || this.userRole === 'admin' || this.isAdmin;
    // [HeaderComponent] isLeaderOrAdmin check. Role: this.userRole, isAdmin: this.isAdmin, Result: result
    return result;
  }
  // <--- ADD THIS GETTER --- END --->

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
