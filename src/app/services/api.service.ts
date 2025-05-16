import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Post, Comment, LikeResponse } from '../models/post.interface';

// Interface para IP Bloqueado
export interface BlockedIp {
  id?: number;
  ipAddress: string;
  reason?: string;
  created_at?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // URL dinâmica que funciona tanto em localhost quanto em GitHub Codespaces
  private readonly API_URL = this.getApiUrl();

  constructor(private http: HttpClient) {
    console.log('API_URL configurada como:', this.API_URL);
  }

  // Método para detectar o ambiente e fornecer a URL correta
  private getApiUrl(): string {
    const currentOrigin = window.location.origin;
    console.log('Origem atual detectada:', currentOrigin);

    if (currentOrigin.includes('v3mrhcvc-4200.brs.devtunnels.ms')) {
      console.log('Ambiente DevTunnel (Frontend) detectado, usando API URL do DevTunnel (Backend).');
      return 'https://v3mrhcvc-3001.brs.devtunnels.ms/api';
    } else if (currentOrigin.includes('.github.dev') || currentOrigin.includes('.github.io') || currentOrigin.includes('.app.github.dev')) {
      // No ambiente Codespaces, precisamos usar a porta 3001 explicitamente
      // Substituímos a porta atual (provavelmente 4200 ou outra) por 3001
      const codespacesApiUrl = currentOrigin.replace(/-\d+(\.app\.github\.dev|\.github\.dev|\.github\.io)/, '-3001$1') + '/api';
      // Garante que não haja duplicidade de /api
      const finalCodespacesApiUrl = codespacesApiUrl.replace(/\/api\/api$/, '/api');
      console.log('Ambiente Codespaces detectado, usando API URL:', finalCodespacesApiUrl);
      return finalCodespacesApiUrl;
    }

    // Caso contrário, usamos o localhost padrão
    console.log('Ambiente local detectado, usando localhost:3001/api');
    return 'http://localhost:3001/api';
  }

  // Método para obter a URL base da API (sem o /api no final)
  public getApiBaseUrl(): string {
    const apiUrl = this.getApiUrl();
    // Remove /api do final, se existir
    if (apiUrl.endsWith('/api')) {
      return apiUrl.substring(0, apiUrl.length - '/api'.length);
    }
    return apiUrl; // Caso já não tenha /api, retorna como está
  }

  // Auth endpoints
  login(credentials: { username: string; password: string }): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/login`, credentials);
  }

  register(credentials: { username: string; password: string; email?: string; phone?: string }): Observable<any> {
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

  deleteComment(postId: number, commentId: number): Observable<any> {
    // Usando a rota POST alternativa para exclusão de comentários (para compatibilidade com navegadores)
    return this.http.post<any>(`${this.API_URL}/posts/${postId}/comments/${commentId}/delete`, {});

    // Método DELETE original (comentado para usar o POST)
    // return this.http.delete<any>(`${this.API_URL}/posts/${postId}/comments/${commentId}`);
  }

  // Método para promover um usuário a administrador
  promoteToAdmin(userIdOrUsername: { userId?: number; username?: string }): Observable<any> {
    // Tentamos primeiro a nova rota alternativa
    return this.http.post<any>(`${this.API_URL}/auth/make-admin`, userIdOrUsername)
      .pipe(
        catchError(error => {
          // Se a nova rota falhar, tentamos a rota original
          console.log('Tentativa com rota alternativa falhou, tentando rota original...');
          return this.http.post<any>(`${this.API_URL}/auth/promote`, userIdOrUsername);
        })
      );
  }

  // Método para remover privilégios de administrador de um usuário
  removeAdmin(username: string): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/auth/remove-admin`, { username });
  }

  // Método para transferir o título de administrador principal para outro usuário
  transferMainAdmin(username: string): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/auth/transfer-admin`, { username });
  }

  // Método para listar todos os administradores
  listAdmins(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/auth/admins`);
  }

  // Método para listar todos os usuários
  listAllUsers(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/auth/users`);
  }

  // Admin IP Blocking endpoints
  getBlockedIps(): Observable<BlockedIp[]> {
    return this.http.get<BlockedIp[]>(`${this.API_URL}/admin/blocked-ips`);
  }

  blockIp(ipData: { ipAddress: string; reason?: string }): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/admin/block-ip`, ipData);
  }

  unblockIp(ipAddress: string): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/admin/unblock-ip/${ipAddress}`);
  }
}
