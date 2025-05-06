import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { GuestService } from '../../services/guest.service';
import { Post } from '../../models/post.interface';

interface UserInfo {
  id: number;
  username: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  posts: Post[] = [];
  isLoading = true;
  error: string | null = null;
  userId: number | null = null;

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private guestService: GuestService,
    private router: Router
  ) {}

  ngOnInit() {
    // Verifica se o usuário está autenticado ou tem um apelido
    const isAuthenticated = this.authService.getToken() !== null;
    const hasGuestNickname = this.guestService.hasGuestNickname();

    if (!isAuthenticated && !hasGuestNickname) {
      this.router.navigate(['/welcome']);
      return;
    }

    // Obtém o ID do usuário atual se estiver autenticado
    if (isAuthenticated) {
      this.authService.getUserInfo().subscribe({
        next: (user: UserInfo) => {
          this.userId = user.id;
        },
        error: () => {
          this.userId = null;
        }
      });
    }

    this.loadPosts();
  }

  loadPosts() {
    this.isLoading = true;
    this.error = null;
    this.apiService.getPosts().subscribe({
      next: (posts) => {
        // Garante que userLiked seja um booleano
        this.posts = posts.map(post => ({
          ...post,
          userLiked: !!post.userLiked // Força a conversão para booleano
        }));
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar posts:', error);
        this.error = 'Não foi possível carregar os posts. Por favor, tente novamente mais tarde.';
        this.isLoading = false;
      }
    });
  }

  likePost(postId: number, event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (!this.authService.getToken()) {
      this.error = 'Você precisa estar logado para curtir uma postagem';
      return;
    }

    const postIndex = this.posts.findIndex(p => p.id === postId);
    if (postIndex === -1) return;

    const post = this.posts[postIndex];
    const previousState = {
      likes: post.likes,
      userLiked: post.userLiked
    };

    // Atualiza o estado otimisticamente
    const updatedPosts = [...this.posts];
    updatedPosts[postIndex] = {
      ...post,
      userLiked: !post.userLiked,
      likes: post.userLiked ? Math.max(0, post.likes - 1) : post.likes + 1
    };
    this.posts = updatedPosts;

    this.apiService.likePost(postId).subscribe({
      next: (response) => {
        // Atualiza com a resposta do servidor
        const newPosts = [...this.posts];
        newPosts[postIndex] = {
          ...newPosts[postIndex],
          likes: response.likes,
          userLiked: response.userLiked
        };
        this.posts = newPosts;
      },
      error: (error) => {
        console.error('Erro ao curtir post:', error);
        this.error = 'Você precisa estar logado para curtir uma postagem';

        // Reverte a mudança em caso de erro
        const newPosts = [...this.posts];
        newPosts[postIndex] = {
          ...post,
          likes: previousState.likes,
          userLiked: previousState.userLiked
        };
        this.posts = newPosts;
      }
    });
  }

  reloadPosts() {
    this.loadPosts();
  }

  // Verifica se o usuário atual é o autor do post
  isPostAuthor(post: Post): boolean {
    if (!this.userId || !post.user) return false;
    return post.user.id === this.userId;
  }

  deletePost(postId: number, event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (!confirm('Tem certeza que deseja excluir esta postagem? Esta ação não pode ser desfeita.')) {
      return;
    }

    this.apiService.deletePost(postId).subscribe({
      next: () => {
        // Remove o post da lista após exclusão bem-sucedida
        this.posts = this.posts.filter(p => p.id !== postId);
        this.error = null;
      },
      error: (error) => {
        console.error('Erro ao excluir postagem:', error);
        this.error = error.error?.message || 'Não foi possível excluir a postagem. Por favor, tente novamente mais tarde.';
      }
    });
  }
}
