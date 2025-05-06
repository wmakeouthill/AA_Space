import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Post, Comment } from '../../models/post.interface';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { GuestService } from '../../services/guest.service';

@Component({
  selector: 'app-post',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './post.component.html',
  styleUrl: './post.component.css'
})
export class PostComponent implements OnInit {
  post: Post | null = null;
  comments: Comment[] = [];
  commentForm: FormGroup;
  isSubmitting = false;
  error: string | null = null;
  isLoggedIn = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService,
    private guestService: GuestService
  ) {
    this.commentForm = this.fb.group({
      content: ['', [Validators.required, Validators.minLength(3)]],
      anonymous: [false]
    });
  }

  ngOnInit() {
    this.isLoggedIn = this.authService.getToken() !== null;
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (!id) {
        this.router.navigate(['/']);
        return;
      }

      this.loadPost(Number(id));
      this.loadComments(Number(id));
    });
  }

  private loadPost(id: number) {
    this.apiService.getPost(id).subscribe({
      next: (post) => {
        this.post = {
          ...post,
          likes: post.likes ?? 0,
          userLiked: !!post.userLiked // Força a conversão para booleano
        };
      },
      error: (error) => {
        console.error('Erro ao carregar post:', error);
        this.error = 'Não foi possível carregar o post. Por favor, tente novamente mais tarde.';
      }
    });
  }

  private loadComments(postId: number) {
    this.apiService.getComments(postId).subscribe({
      next: (comments) => {
        this.comments = comments.map(comment => ({
          ...comment,
          likes: comment.likes ?? 0,
          userLiked: !!comment.userLiked // Força a conversão para booleano
        }));
      },
      error: (error) => {
        console.error('Erro ao carregar comentários:', error);
        this.error = 'Não foi possível carregar os comentários. Por favor, tente novamente mais tarde.';
      }
    });
  }

  onSubmitComment() {
    if (this.commentForm.valid && this.post) {
      this.isSubmitting = true;

      // Verifica se o usuário está logado ou tem um apelido
      if (!this.isLoggedIn && !this.guestService.hasGuestNickname()) {
        this.router.navigate(['/welcome']);
        return;
      }

      const guestNick = !this.isLoggedIn ? this.guestService.getGuestNickname() : undefined;
      const comment = {
        content: this.commentForm.value.content,
        anonymous: this.commentForm.value.anonymous,
        guestNickname: guestNick || undefined
      };

      this.apiService.createComment(this.post.id, comment).subscribe({
        next: (newComment) => {
          const formattedComment = {
            ...newComment,
            likes: 0,
            userLiked: false
          };
          this.comments.unshift(formattedComment);
          this.commentForm.reset({
            content: '',
            anonymous: false
          });
          this.isSubmitting = false;
          this.error = null;
        },
        error: (error) => {
          console.error('Erro ao enviar comentário:', error);
          this.error = error.error?.message || 'Não foi possível enviar o comentário. Por favor, tente novamente mais tarde.';
          this.isSubmitting = false;
        }
      });
    }
  }

  likePost() {
    if (!this.post) return;

    if (!this.authService.getToken()) {
      this.error = 'Você precisa estar logado para curtir uma postagem';
      return;
    }

    const previousState = {
      likes: this.post.likes,
      userLiked: this.post.userLiked
    };

    // Optimistic update
    this.post = {
      ...this.post,
      userLiked: !this.post.userLiked,
      likes: this.post.userLiked ? Math.max(0, this.post.likes - 1) : this.post.likes + 1
    };

    this.apiService.likePost(this.post.id).subscribe({
      next: (response) => {
        if (this.post) {
          this.post = {
            ...this.post,
            likes: response.likes,
            userLiked: response.userLiked // Corrigido: Atualizar userLiked com o valor do servidor
          };
        }
      },
      error: (error) => {
        console.error('Erro ao curtir post:', error);
        this.error = 'Você precisa estar logado para curtir uma postagem';
        if (this.post) {
          this.post = {
            ...this.post,
            likes: previousState.likes,
            userLiked: previousState.userLiked
          };
        }
      }
    });
  }

  likeComment(comment: Comment) {
    if (!this.post) return;

    if (!this.authService.getToken()) {
      this.error = 'Você precisa estar logado para curtir um comentário';
      return;
    }

    const commentIndex = this.comments.findIndex(c => c.id === comment.id);
    if (commentIndex === -1) return;

    const previousState = {
      likes: comment.likes,
      userLiked: comment.userLiked
    };

    // Optimistic update
    const updatedComments = [...this.comments];
    updatedComments[commentIndex] = {
      ...comment,
      userLiked: !comment.userLiked,
      likes: comment.userLiked ? Math.max(0, comment.likes - 1) : comment.likes + 1
    };
    this.comments = updatedComments;

    this.apiService.likeComment(this.post.id, comment.id).subscribe({
      next: (response) => {
        const newComments = [...this.comments];
        newComments[commentIndex] = {
          ...newComments[commentIndex],
          likes: response.likes,
          userLiked: response.userLiked
        };
        this.comments = newComments;
      },
      error: (error) => {
        console.error('Erro ao curtir comentário:', error);
        this.error = 'Você precisa estar logado para curtir um comentário';

        // Reverte a mudança em caso de erro
        const newComments = [...this.comments];
        newComments[commentIndex] = {
          ...comment,
          likes: previousState.likes,
          userLiked: previousState.userLiked
        };
        this.comments = newComments;
      }
    });
  }
}
