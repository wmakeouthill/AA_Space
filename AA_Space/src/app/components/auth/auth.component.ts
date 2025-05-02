import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css'
})
export class AuthComponent {
  isLogin = true; // true = login, false = registro
  authForm: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {
    this.authForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  toggleAuthMode() {
    this.isLogin = !this.isLogin;
    this.authForm.reset();
  }

  onSubmit() {
    if (this.authForm.valid) {
      this.isSubmitting = true;
      // TODO: Implementar autenticação com backend
      console.log(this.authForm.value);
      // Temporariamente redirecionando para home
      this.router.navigate(['/']);
    }
  }
}
