import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {
  promoteForm: FormGroup;
  isSubmitting = false;
  error: string | null = null;
  successMessage: string | null = null;
  isAdmin = false;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router
  ) {
    this.promoteForm = this.fb.group({
      username: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    // Verifica se o usuário está autenticado e é administrador
    const isAuthenticated = this.authService.getToken() !== null;
    
    if (!isAuthenticated) {
      this.router.navigate(['/auth']);
      return;
    }

    this.isAdmin = this.authService.isAdmin();
    if (!this.isAdmin) {
      this.error = 'Esta página só está disponível para administradores.';
    }
  }

  onPromoteUser(): void {
    if (!this.isAdmin) {
      this.error = 'Você não tem permissão para realizar esta ação.';
      return;
    }

    if (this.promoteForm.valid) {
      this.isSubmitting = true;
      this.error = null;
      this.successMessage = null;

      const username = this.promoteForm.value.username;
      
      this.apiService.promoteToAdmin({ username }).subscribe({
        next: (response) => {
          console.log('Usuário promovido com sucesso:', response);
          this.successMessage = response.message || 'Usuário promovido a administrador com sucesso.';
          this.promoteForm.reset();
          this.isSubmitting = false;
        },
        error: (error) => {
          console.error('Erro ao promover usuário:', error);
          this.error = error.error?.message || 'Não foi possível promover o usuário. Por favor, verifique o nome e tente novamente.';
          this.isSubmitting = false;
        }
      });
    }
  }
}
