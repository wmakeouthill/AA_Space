import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'AA Space';

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // Verifica e inicializa a autenticação ao carregar o componente principal
    const token = this.authService.getToken();
    if (token) {
      console.log('AppComponent: Token encontrado, validando na inicialização');
      this.authService.validateToken().subscribe({
        next: (result) => console.log('AppComponent: Validação de token concluída'),
        error: (err) => console.error('AppComponent: Erro na validação de token', err)
      });
    } else {
      console.log('AppComponent: Nenhum token ao inicializar');
    }
  }
}
