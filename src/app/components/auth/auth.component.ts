import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
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
export class AuthComponent implements OnInit {
  isLogin = true;
  authForm: FormGroup;
  isSubmitting = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    // Inicializa o formulário na construção com todos os campos possíveis
    this.authForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      email: ['', [Validators.email]],
      phone: [''],
      rememberMe: [false] // Adicionar FormControl para rememberMe
    });
  }

  ngOnInit() {
    // Atualiza o formulário de acordo com o modo atual
    this.updateFormControls();
  }

  updateFormControls() {
    // Se estiver no modo de login, remove os campos opcionais
    // Se estiver no modo de registro, mantém os campos opcionais
    if (this.isLogin) {
      // Mantém apenas os campos obrigatórios para login
      this.authForm.get('email')?.disable();
      this.authForm.get('phone')?.disable();
      this.authForm.get('rememberMe')?.enable(); // Habilitar rememberMe no login
    } else {
      // Habilita todos os campos para registro
      this.authForm.get('email')?.enable();
      this.authForm.get('phone')?.enable();
      this.authForm.get('rememberMe')?.disable(); // Desabilitar rememberMe no registro
    }
  }

  toggleAuthMode() {
    // Inverte o modo
    this.isLogin = !this.isLogin;

    // Limpa o formulário e o erro
    this.authForm.reset();
    this.error = null;

    // Atualiza os controles do formulário
    this.updateFormControls();
  }

  onSubmit() {
    if (this.authForm.valid) {
      this.isSubmitting = true;
      this.error = null;

      // Extrair apenas os valores dos campos habilitados
      const formValue = this.authForm.getRawValue();
      const { username, password } = formValue;

      // Só incluir email e phone se estiver no modo de registro
      const email = this.isLogin ? undefined : formValue.email;
      const phone = this.isLogin ? undefined : formValue.phone;
      const rememberMe = this.isLogin ? formValue.rememberMe : false; // Obter valor de rememberMe

      const authAction = this.isLogin
        ? this.authService.login({ username, password }, rememberMe) // Passar rememberMe como segundo argumento
        : this.authService.register({ username, password, email, phone }).pipe(
            tap(() => {
              // Após registro bem-sucedido, faz login automaticamente
              // Para o login automático após o registro, o padrão de "rememberMe" pode ser false
              return this.authService.login({ username, password }, false); // Passar rememberMe como segundo argumento
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
