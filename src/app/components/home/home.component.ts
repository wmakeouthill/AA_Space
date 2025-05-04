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
          userLiked: (post.likes ?? 0) > 0, // Define userLiked baseado no número de likes
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

    // Cria uma nova referência do array para forçar a detecção de mudanças
    const updatedPosts = [...this.posts];
    const updatedPost = { ...post };

    // Atualiza o estado do like usando a lógica de 0/1
    if (updatedPost.likes === 0) {
      updatedPost.likes = 1;
      updatedPost.userLiked = true;
    } else {
      updatedPost.likes = 0;
      updatedPost.userLiked = false;
    }

    // Atualiza o array com o novo post
    updatedPosts[postIndex] = updatedPost;
    this.posts = updatedPosts;

    this.apiService.likePost(postId).subscribe({
      next: (response) => {
        // Atualiza com a resposta do servidor
        const newPosts = [...this.posts];
        newPosts[postIndex] = {
          ...newPosts[postIndex],
          likes: response.likes,
          userLiked: response.likes > 0 // Define userLiked baseado no número de likes
        };
        this.posts = newPosts;
      },
      error: (error) => {
        console.error('Erro ao curtir post:', error);
        this.error = 'Não foi possível curtir o post. Por favor, tente novamente mais tarde.';

        // Reverte a mudança em caso de erro
        const newPosts = [...this.posts];
        newPosts[postIndex] = { ...post };
        this.posts = newPosts;
      }
    });
  }

  reloadPosts() {
    this.loadPosts();
  }
}
