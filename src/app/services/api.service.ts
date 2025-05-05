import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry, map } from 'rxjs/operators';
import { Post, Comment, LikeResponse } from '../models/post.interface';

interface CreatePostDto {
  title: string;
  content: string;
  anonymous: boolean;
  guestNickname?: string;
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
  private apiUrl: string;
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }),
    withCredentials: true
  };

  constructor(private http: HttpClient) {
    // Determina a URL base da API baseado no ambiente
    const isGitHubCodespace = window.location.hostname.includes('github.dev');
    if (isGitHubCodespace) {
      // Substitui o número da porta 4200 por 3001 na URL do Codespace
      this.apiUrl = window.location.origin.replace('4200', '3001') + '/api';
    } else {
      this.apiUrl = 'http://localhost:3001/api';
    }
    console.log('API URL:', this.apiUrl);
  }

  private handleError(error: HttpErrorResponse) {
    console.error('An error occurred:', error);
    if (error.status === 0) {
      console.error('Frontend error:', error.error);
    } else {
      console.error(`Backend returned code ${error.status}, body was:`, error.error);
    }
    return throwError(() => error);
  }

  // Auth
  login(credentials: AuthDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, credentials, this.httpOptions)
      .pipe(
        catchError(this.handleError)
      );
  }

  register(credentials: AuthDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register`, credentials, this.httpOptions)
      .pipe(
        catchError(this.handleError)
      );
  }

  validateToken(): Observable<any> {
    return this.http.get(`${this.apiUrl}/auth/validate`, this.httpOptions)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Posts
  getPosts(): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.apiUrl}/posts`, this.httpOptions)
      .pipe(
        map(posts => posts.map(post => ({
          ...post,
          likes: post.likes ?? 0,
          userLiked: post.userLiked ?? false,
          comment_count: post.comment_count ?? 0
        }))),
        retry(1),
        catchError(this.handleError)
      );
  }

  getPost(id: number): Observable<Post> {
    return this.http.get<Post>(`${this.apiUrl}/posts/${id}`, this.httpOptions)
      .pipe(
        map(post => ({
          ...post,
          likes: post.likes ?? 0,
          userLiked: post.userLiked ?? false,
          comment_count: post.comment_count ?? 0
        })),
        retry(1),
        catchError(this.handleError)
      );
  }

  createPost(post: CreatePostDto): Observable<Post> {
    return this.http.post<Post>(`${this.apiUrl}/posts`, post, this.httpOptions)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Comentários
  getComments(postId: number): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.apiUrl}/posts/${postId}/comments`, this.httpOptions)
      .pipe(
        map(comments => comments.map(comment => ({
          ...comment,
          likes: comment.likes ?? 0,
          userLiked: comment.userLiked ?? false
        }))),
        retry(1),
        catchError(this.handleError)
      );
  }

  createComment(postId: number, comment: { content: string; anonymous: boolean }): Observable<Comment> {
    return this.http.post<Comment>(`${this.apiUrl}/posts/${postId}/comments`, comment, this.httpOptions)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Likes
  likePost(postId: number): Observable<LikeResponse> {
    return this.http.post<LikeResponse>(`${this.apiUrl}/posts/${postId}/like`, {}, this.httpOptions)
      .pipe(
        map(response => ({
          ...response,
          likes: response.likes ?? 0,
          userLiked: response.userLiked ?? false
        })),
        catchError(this.handleError)
      );
  }

  likeComment(postId: number, commentId: number): Observable<LikeResponse> {
    return this.http.post<LikeResponse>(`${this.apiUrl}/posts/${postId}/comments/${commentId}/like`, {}, this.httpOptions)
      .pipe(
        map(response => ({
          ...response,
          likes: response.likes ?? 0,
          userLiked: response.userLiked ?? false
        })),
        catchError(this.handleError)
      );
  }
}
