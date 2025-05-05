import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Post } from '../../models/post.interface';

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

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadPosts();
  }

  loadPosts() {
    this.isLoading = true;
    this.error = null;
    this.apiService.getPosts().subscribe({
      next: (posts) => {
        this.posts = posts.map(post => ({
          ...post,
          likes: post.likes ?? 0,
          userLiked: post.userLiked ?? false, // Use the server's userLiked value
          comment_count: post.comment_count ?? 0
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

    const post = this.posts.find(p => p.id === postId);
    if (!post) return;

    const postIndex = this.posts.findIndex(p => p.id === postId);
    if (postIndex === -1) return;

    // Mantém o estado anterior para caso de erro
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
        this.error = 'Não foi possível curtir o post. Por favor, tente novamente mais tarde.';

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
}
