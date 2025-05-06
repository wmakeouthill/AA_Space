import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap, catchError, of } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USERNAME_KEY = 'username';
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private tokenValidationInProgress = false;

  constructor(private apiService: ApiService) {
    // Inicializa o estado de autenticação baseado na presença do token
    const hasToken = this.hasToken();
    console.log('AuthService inicializado, token existe:', hasToken);
    this.isAuthenticatedSubject.next(hasToken);
  }

  validateToken(): Observable<any> {
    if (this.tokenValidationInProgress) {
      console.log('Validação de token já em andamento, ignorando chamada duplicada');
      return of(null);
    }

    if (!this.getToken()) {
      console.log('Sem token para validar');
      this.isAuthenticatedSubject.next(false);
      return of(null);
    }
    
    console.log('Iniciando validação de token');
    this.tokenValidationInProgress = true;
    
    return this.apiService.validateToken().pipe(
      tap(response => {
        this.tokenValidationInProgress = false;
        console.log('Resposta da validação de token:', response);
        
        if (response && response.valid) {
          console.log('Token validado com sucesso');
          this.isAuthenticatedSubject.next(true);
          
          // Atualiza o nome de usuário caso tenha mudado
          if (response.username) {
            console.log('Atualizando nome de usuário:', response.username);
            localStorage.setItem(this.USERNAME_KEY, response.username);
          }
        } else {
          console.log('Resposta de validação inválida');
          this.logout();
        }
      }),
      catchError(error => {
        this.tokenValidationInProgress = false;
        console.error('Erro ao validar token:', error);
        
        // Verifica se o erro é de autenticação (401)
        if (error.status === 401) {
          console.log('Token inválido ou expirado, fazendo logout');
          this.logout();
        } else {
          // Para outros erros (ex: servidor indisponível), mantemos o usuário logado
          // para evitar logout desnecessário durante problemas de conectividade temporários
          console.log('Erro de serviço, mantendo estado de autenticação atual');
        }
        
        return of(null);
      })
    );
  }

  login(username: string, password: string): Observable<any> {
    return this.apiService.login({ username, password }).pipe(
      tap(response => {
        console.log('Login response:', response);
        if (response && response.token) {
          // Salva os dados no localStorage para persistir entre recargas
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
