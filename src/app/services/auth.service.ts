import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap, catchError, of, map } from 'rxjs';
import { ApiService } from './api.service';

interface UserInfo {
  id: number;
  username: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USERNAME_KEY = 'username';
  private readonly USER_ID_KEY = 'user_id';
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

          // Salva o ID do usuário no localStorage
          if (response.userId) {
            console.log('Atualizando ID do usuário:', response.userId);
            localStorage.setItem(this.USER_ID_KEY, response.userId.toString());
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
          
          // Extrair o ID do token JWT 
          try {
            const tokenParts = response.token.split('.');
            if (tokenParts.length === 3) {
              const tokenPayload = JSON.parse(atob(tokenParts[1]));
              console.log('Token payload:', tokenPayload);
              if (tokenPayload.id) {
                console.log('Salvando ID do usuário do token:', tokenPayload.id);
                localStorage.setItem(this.USER_ID_KEY, String(tokenPayload.id));
              }
            }
          } catch (e) {
            console.error('Erro ao decodificar token:', e);
          }
          
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
    localStorage.removeItem(this.USER_ID_KEY);
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

  getUserInfo(): Observable<UserInfo> {
    // Se tivermos uma validação de token prévia que retornou o ID do usuário
    const userId = localStorage.getItem(this.USER_ID_KEY);
    const username = this.getUsername();
    
    if (userId && username) {
      // Retorna as informações armazenadas localmente
      return of({ id: parseInt(userId), username });
    } else {
      // Se não tivermos o ID do usuário ainda, realizamos uma nova validação
      return this.apiService.validateToken().pipe(
        tap(response => {
          if (response && response.valid) {
            // Verificar se userId existe antes de usar toString()
            if (response.userId !== undefined && response.userId !== null) {
              localStorage.setItem(this.USER_ID_KEY, String(response.userId));
            } else if (response.id !== undefined && response.id !== null) {
              // Tenta usar response.id como alternativa
              localStorage.setItem(this.USER_ID_KEY, String(response.id));
            }
            
            // Atualiza também o nome de usuário se estiver presente
            if (response.username) {
              localStorage.setItem(this.USERNAME_KEY, response.username);
            }
          }
        }),
        catchError(error => {
          console.error('Erro ao obter informações do usuário:', error);
          this.logout();
          throw error;
        }),
        map(response => {
          if (response && response.valid) {
            // Verificar diferentes possibilidades para o ID do usuário
            let id: number | undefined;
            
            if (response.userId !== undefined && response.userId !== null) {
              id = typeof response.userId === 'string' ? parseInt(response.userId) : response.userId;
            } else if (response.id !== undefined && response.id !== null) {
              id = typeof response.id === 'string' ? parseInt(response.id) : response.id;
            }
            
            if (id !== undefined) {
              return {
                id,
                username: response.username || 'Usuário'
              };
            }
            
            // Se não encontrar ID válido, lança erro
            throw new Error('ID do usuário não encontrado na resposta');
          } else {
            throw new Error('Não foi possível obter informações do usuário');
          }
        })
      );
    }
  }
}
