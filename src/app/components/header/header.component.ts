import { Component, OnInit } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { GuestService } from '../../services/guest.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {
  isLoggedIn = false;
  username: string | null = null;
  guestNickname: string | null = null;

  constructor(
    private authService: AuthService,
    private guestService: GuestService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.isAuthenticated().subscribe(
      isAuthenticated => {
        this.isLoggedIn = isAuthenticated;
        this.username = this.authService.getUsername();

        // Se não estiver autenticado, verifica se tem um apelido de convidado
        if (!isAuthenticated) {
          this.guestNickname = this.guestService.getGuestNickname();
        }
      }
    );
  }

  login() {
    this.router.navigate(['/auth']);
  }

  logout() {
    this.authService.logout();
    this.guestService.clearGuestNickname(); // Limpa o apelido ao fazer logout
    this.router.navigate(['/']);
  }
}
