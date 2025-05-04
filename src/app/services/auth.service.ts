import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap, catchError } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USERNAME_KEY = 'username';
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

  constructor(private apiService: ApiService) {
    // Verifica token ao inicializar
    if (this.hasToken()) {
      this.validateToken();
    }
  }

  private validateToken() {
    // Faz uma requisição para validar o token
    this.apiService.validateToken().pipe(
      catchError((error) => {
        console.log('Token inválido ou expirado');
        this.logout();
        throw error;
      })
    ).subscribe(() => {
      console.log('Token válido');
      this.isAuthenticatedSubject.next(true);
    });
  }

  login(username: string, password: string): Observable<any> {
    return this.apiService.login({ username, password }).pipe(
      tap(response => {
        console.log('Login response:', response);
        if (response && response.token) {
          localStorage.setItem(this.TOKEN_KEY, response.token);
          localStorage.setItem(this.USERNAME_KEY, response.username);
          this.isAuthenticatedSubject.next(true);
        }
      })
    );
  }

  register(username: string, password: string): Observable<any> {
    return this.apiService.register({ username, password }).pipe(
      tap(response => {
        console.log('Register response:', response);
        if (response && response.token) {
          localStorage.setItem(this.TOKEN_KEY, response.token);
          localStorage.setItem(this.USERNAME_KEY, response.username);
          this.isAuthenticatedSubject.next(true);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USERNAME_KEY);
    this.isAuthenticatedSubject.next(false);
  }

  getToken(): string | null {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (token) {
      console.log('Token recuperado do localStorage');
      return token;
    }
    console.log('Nenhum token encontrado');
    return null;
  }

  getUsername(): string | null {
    return localStorage.getItem(this.USERNAME_KEY);
  }

  isAuthenticated(): Observable<boolean> {
    return this.isAuthenticatedSubject.asObservable();
  }

  private hasToken(): boolean {
    return !!this.getToken();
  }
}
