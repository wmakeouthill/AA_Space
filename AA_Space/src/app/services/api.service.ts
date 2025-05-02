import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Post } from '../models/post.interface';

interface CreatePostDto {
  title: string;
  content: string;
  isAnonymous: boolean;
}

interface CreateCommentDto {
  content: string;
  isAnonymous: boolean;
  postId: number;
}

interface AuthDto {
  username: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:3001/api'; // Atualizado para a nova porta

  constructor(private http: HttpClient) {}

  // Posts
  getPosts(): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.apiUrl}/posts`);
  }

  getPost(id: number): Observable<Post> {
    return this.http.get<Post>(`${this.apiUrl}/posts/${id}`);
  }

  createPost(post: CreatePostDto): Observable<Post> {
    return this.http.post<Post>(`${this.apiUrl}/posts`, post);
  }

  // Comentários
  getComments(postId: number): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.apiUrl}/posts/${postId}/comments`);
  }

  createComment(postId: number, comment: CreateCommentDto): Observable<Comment> {
    return this.http.post<Comment>(`${this.apiUrl}/posts/${postId}/comments`, comment);
  }

  // Autenticação
  login(credentials: AuthDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, credentials);
  }

  register(credentials: AuthDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register`, credentials);
  }

  // Likes
  likePost(postId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/posts/${postId}/like`, {});
  }
}
