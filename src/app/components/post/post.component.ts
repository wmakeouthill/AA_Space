import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Post, Comment } from '../../models/post.interface';
import { ApiService } from '../../services/api.service';

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private apiService: ApiService
  ) {
    this.commentForm = this.fb.group({
      content: ['', [Validators.required, Validators.minLength(3)]],
      isAnonymous: [true]
    });
  }

  ngOnInit() {
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
          userLiked: (post.likes ?? 0) > 0, // Define userLiked baseado no número de likes
          comment_count: post.comment_count ?? 0
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
        // Garante que os valores estejam definidos corretamente ao carregar os comentários
        this.comments = comments.map(comment => ({
          ...comment,
          likes: comment.likes ?? 0,
          userLiked: comment.likes > 0, // Define userLiked baseado no número de likes
          id: comment.id,
          content: comment.content,
          author: comment.author,
          created_at: comment.created_at,
          post_id: postId,
          anonymous: comment.anonymous
        }));

        // Log para debug dos likes
        console.log('Comentários carregados:', this.comments.map(c => ({
          id: c.id,
          userLiked: c.userLiked,
          likes: c.likes
        })));
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
      const comment = {
        content: this.commentForm.value.content,
        anonymous: this.commentForm.value.isAnonymous
      };

      this.apiService.createComment(this.post.id, comment).subscribe({
        next: (newComment) => {
          // Inicializa o novo comentário com os valores corretos
          const formattedComment = {
            ...newComment,
            likes: 0,
            userLiked: false
          };
          this.comments.unshift(formattedComment);
          this.commentForm.reset({ isAnonymous: true });
          this.isSubmitting = false;
        },
        error: (error) => {
          console.error('Erro ao enviar comentário:', error);
          this.error = 'Não foi possível enviar o comentário. Por favor, tente novamente mais tarde.';
          this.isSubmitting = false;
        }
      });
    }
  }

  likePost() {
    if (!this.post) return;

    const previousState = {
      likes: this.post.likes,
      userLiked: this.post.userLiked
    };

    // Atualiza o estado usando a lógica de 0/1
    if (this.post.likes === 0) {
      this.post.likes = 1;
      this.post.userLiked = true;
    } else {
      this.post.likes = 0;
      this.post.userLiked = false;
    }

    this.apiService.likePost(this.post.id).subscribe({
      next: (response) => {
        if (this.post) {
          this.post = {
            ...this.post,
            likes: response.likes,
            userLiked: response.likes > 0 // Define userLiked baseado no número de likes
          };
        }
      },
      error: (error) => {
        console.error('Erro ao curtir post:', error);
        this.error = 'Não foi possível curtir o post. Por favor, tente novamente mais tarde.';
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

    const commentIndex = this.comments.findIndex(c => c.id === comment.id);
    if (commentIndex === -1) return;

    // Cria uma cópia do array de comentários para forçar a detecção de mudanças
    const updatedComments = [...this.comments];
    const updatedComment = { ...comment };

    // Atualiza o estado do like usando a lógica de 0/1
    if (updatedComment.likes === 0) {
      updatedComment.likes = 1;
      updatedComment.userLiked = true;
    } else {
      updatedComment.likes = 0;
      updatedComment.userLiked = false;
    }

    // Atualiza o array com o novo comentário
    updatedComments[commentIndex] = updatedComment;
    this.comments = updatedComments;

    this.apiService.likeComment(this.post.id, comment.id).subscribe({
      next: (response) => {
        // Atualiza com a resposta do servidor
        const newComments = [...this.comments];
        newComments[commentIndex] = {
          ...newComments[commentIndex],
          likes: response.likes,
          userLiked: response.likes > 0 // Define userLiked baseado no número de likes
        };
        this.comments = newComments;
      },
      error: (error) => {
        console.error('Erro ao curtir comentário:', error);
        this.error = 'Não foi possível curtir o comentário. Por favor, tente novamente mais tarde.';

        // Reverte a mudança em caso de erro
        const newComments = [...this.comments];
        newComments[commentIndex] = { ...comment };
        this.comments = newComments;
      }
    });
  }
}
