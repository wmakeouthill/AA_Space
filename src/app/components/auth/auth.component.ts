import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { tap } from 'rxjs/operators';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css'
})
export class AuthComponent {
  isLogin = false; // Começamos com o registro
  authForm: FormGroup;
  isSubmitting = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.authForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  toggleAuthMode() {
    this.isLogin = !this.isLogin;
    this.authForm.reset();
    this.error = null;
  }

  onSubmit() {
    if (this.authForm.valid) {
      this.isSubmitting = true;
      this.error = null;

      const { username, password } = this.authForm.value;

      const authAction = this.isLogin
        ? this.authService.login(username, password)
        : this.authService.register(username, password).pipe(
            tap(() => {
              // Após registro bem-sucedido, faz login automaticamente
              return this.authService.login(username, password);
            })
          );

      authAction.subscribe({
        next: (response) => {
          console.log('Auth response:', response);
          this.router.navigate(['/']);
        },
        error: (err) => {
          console.error('Auth error:', err);
          if (err.status === 401) {
            this.error = 'Usuário ou senha inválidos';
          } else if (err.error?.message) {
            this.error = err.error.message;
          } else {
            this.error = 'Ocorreu um erro. Por favor, tente novamente.';
          }
          this.isSubmitting = false;
        }
      });
    }
  }
}
