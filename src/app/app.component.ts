import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'AA Space';

  constructor(private authService: AuthService) {}

  ngOnInit() {
    // Validar o token ao iniciar o app
    this.authService.validateToken().subscribe(() => {
      // Força o status de administrador para o usuário 'admin'
      this.authService.forceAdminForUserAdmin();
    });
  }
}
