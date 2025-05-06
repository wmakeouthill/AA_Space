import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Post, Comment, LikeResponse } from '../models/post.interface';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly API_URL = 'http://localhost:3001/api';

  constructor(private http: HttpClient) {}
  
  // Auth endpoints
  login(credentials: { username: string; password: string }): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/login`, credentials);
  }

  register(credentials: { username: string; password: string }): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/register`, credentials);
  }

  validateToken(): Observable<any> {
    return this.http.get(`${this.API_URL}/auth/validate`);
  }

  // Post endpoints
  createPost(post: { title: string; content: string; anonymous: boolean; guestNickname?: string }): Observable<Post> {
    return this.http.post<Post>(`${this.API_URL}/posts`, post);
  }

  getPosts(): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.API_URL}/posts`);
  }

  getPost(id: number): Observable<Post> {
    return this.http.get<Post>(`${this.API_URL}/posts/${id}`);
  }

  deletePost(id: number): Observable<any> {
    // Usando a rota POST alternativa para exclusão
    return this.http.post<any>(`${this.API_URL}/posts/${id}/delete`, {});
    
    // Método DELETE original (comentado para usar o POST)
    // return this.http.delete<any>(`${this.API_URL}/posts/${id}`);
  }

  getComments(postId: number): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.API_URL}/posts/${postId}/comments`);
  }

  createComment(postId: number, comment: { content: string; anonymous: boolean; guestNickname?: string }): Observable<Comment> {
    return this.http.post<Comment>(`${this.API_URL}/posts/${postId}/comments`, comment);
  }

  // Likes
  likePost(postId: number): Observable<LikeResponse> {
    return this.http.post<LikeResponse>(`${this.API_URL}/posts/${postId}/like`, {});
  }

  likeComment(postId: number, commentId: number): Observable<LikeResponse> {
    return this.http.post<LikeResponse>(`${this.API_URL}/posts/${postId}/comments/${commentId}/like`, {});
  }
}
