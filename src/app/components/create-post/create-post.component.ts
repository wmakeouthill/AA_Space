import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-create-post',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-post.component.html',
  styleUrl: './create-post.component.css'
})
export class CreatePostComponent implements OnInit {
  postForm: FormGroup;
  isSubmitting = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private apiService: ApiService,
    private authService: AuthService
  ) {
    this.postForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      content: ['', [Validators.required, Validators.minLength(20)]],
      isAnonymous: [true]
    });
  }

  ngOnInit() {
    // Verificar autenticação e token
    this.authService.isAuthenticated().pipe(
      tap(isAuthenticated => {
        if (!isAuthenticated) {
          console.log('Usuário não autenticado, redirecionando para login');
          this.router.navigate(['/auth']);
        } else {
          console.log('Usuário autenticado:', this.authService.getUsername());
        }
      })
    ).subscribe();
  }

  onSubmit() {
    if (this.postForm.valid) {
      this.isSubmitting = true;
      this.error = null;

      // Primeiro verificar se ainda estamos autenticados
      this.authService.isAuthenticated().pipe(
        switchMap(isAuthenticated => {
          if (!isAuthenticated) {
            console.log('Token expirado ou removido, redirecionando para login');
            this.router.navigate(['/auth']);
            return of(null);
          }

          const postData = {
            title: this.postForm.value.title,
            content: this.postForm.value.content,
            anonymous: this.postForm.value.isAnonymous
          };

          return this.apiService.createPost(postData);
        }),
        catchError(err => {
          console.error('Erro ao criar post:', err);
          if (err.status === 401) {
            this.error = 'Sua sessão expirou. Por favor, faça login novamente.';
            this.router.navigate(['/auth']);
          } else {
            this.error = err.error?.message || 'Ocorreu um erro ao criar o post. Por favor, tente novamente.';
          }
          this.isSubmitting = false;
          return of(null);
        })
      ).subscribe(response => {
        if (response) {
          console.log('Post criado com sucesso:', response);
          this.router.navigate(['/']);
        }
      });
    }
  }
}
