import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { GuestService } from '../../services/guest.service';
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
  isLoggedIn = false;
  guestNicknameForm: FormGroup;
  showGuestNicknameForm = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private apiService: ApiService,
    private authService: AuthService,
    private guestService: GuestService
  ) {
    this.postForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      content: ['', [Validators.required, Validators.minLength(20)]],
      anonymous: [false]
    });

    this.guestNicknameForm = this.fb.group({
      nickname: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]]
    });
  }

  ngOnInit() {
    this.authService.isAuthenticated().subscribe(isAuthenticated => {
      this.isLoggedIn = isAuthenticated;

      // Se não estiver logado e não tiver apelido, mostra o formulário de apelido
      if (!isAuthenticated && !this.guestService.hasGuestNickname()) {
        this.showGuestNicknameForm = true;
      }
    });
  }

  get guestNickname(): string | null {
    return this.guestService.getGuestNickname();
  }

  onSubmitNickname() {
    if (this.guestNicknameForm.valid) {
      const nickname = this.guestNicknameForm.value.nickname;
      this.guestService.setGuestNickname(nickname);
      this.showGuestNicknameForm = false;
    }
  }

  onSubmit() {
    if (this.postForm.valid) {
      this.isSubmitting = true;
      this.error = null;

      // Se não estiver logado e não tiver apelido, mostra erro
      if (!this.isLoggedIn && !this.guestService.hasGuestNickname()) {
        this.error = 'Por favor, defina um apelido antes de postar';
        this.showGuestNicknameForm = true;
        this.isSubmitting = false;
        return;
      }

      const guestNick = !this.isLoggedIn ? this.guestService.getGuestNickname() : undefined;
      const postData = {
        title: this.postForm.value.title,
        content: this.postForm.value.content,
        anonymous: this.postForm.value.anonymous,
        guestNickname: guestNick || undefined
      };

      this.apiService.createPost(postData).subscribe({
        next: (response) => {
          console.log('Post criado com sucesso:', response);
          this.router.navigate(['/']);
        },
        error: (err) => {
          console.error('Erro ao criar post:', err);
          if (err.status === 401) {
            this.error = 'Sua sessão expirou. Por favor, faça login novamente.';
            this.router.navigate(['/auth']);
          } else {
            this.error = err.error?.message || 'Ocorreu um erro ao criar o post. Por favor, tente novamente.';
          }
          this.isSubmitting = false;
        }
      });
    }
  }
}
