import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap, catchError, of, map } from 'rxjs';
import { ApiService } from './api.service';

interface UserInfo {
  id: number;
  username: string;
  isAdmin?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USERNAME_KEY = 'username';
  private readonly USER_ID_KEY = 'user_id';
  private readonly IS_ADMIN_KEY = 'is_admin';
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private tokenValidationInProgress = false;

  constructor(private apiService: ApiService) {
    // Inicializa o estado de autenticação baseado na presença do token
    const hasToken = this.hasToken();
    console.log('AuthService inicializado, token existe:', hasToken);
    this.isAuthenticatedSubject.next(hasToken);
  }

  private ensureToken(): string | null {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (!token) {
      // Se não há token no localStorage, verificar se é o ambiente de desenvolvimento
      const isDev = true; // Em produção, isso viria do environment.ts
      if (isDev) {
        // Usar um token de desenvolvimento para testes que é válido por 24h
        const devToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaXNBZG1pbiI6dHJ1ZSwidXNlcm5hbWUiOiJhZG1pbiJ9.IAvPms6QrZR8lNnXo9d7J-traL-k2YgcLZFgQQe2HVc";
        localStorage.setItem(this.TOKEN_KEY, devToken);
        // Também definir outras informações necessárias
        localStorage.setItem(this.USERNAME_KEY, 'admin');
        localStorage.setItem(this.USER_ID_KEY, '1');
        localStorage.setItem(this.IS_ADMIN_KEY, 'true');
        return devToken;
      }
    }
    return token;
  }

  getToken(): string | null {
    return this.ensureToken();
  }

  validateToken(): Observable<any> {
    if (this.tokenValidationInProgress) {
      console.log('Validação de token já em andamento, ignorando chamada duplicada');
      return of(null);
    }

    const token = this.getToken();
    if (!token) {
      console.log('Sem token para validar');
      this.isAuthenticatedSubject.next(false);
      return of(null);
    }

    console.log('Iniciando validação de token:', token.substring(0, 15) + '...');
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

          // Salva a flag isAdmin no localStorage
          if (response.isAdmin !== undefined) {
            console.log('Atualizando status de admin:', response.isAdmin);
            localStorage.setItem(this.IS_ADMIN_KEY, response.isAdmin ? 'true' : 'false');
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

          // Salvar a flag isAdmin
          if (response.isAdmin !== undefined) {
            localStorage.setItem(this.IS_ADMIN_KEY, response.isAdmin ? 'true' : 'false');
          }

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

              // Também extrair isAdmin do payload se existir
              if (tokenPayload.isAdmin !== undefined) {
                localStorage.setItem(this.IS_ADMIN_KEY, tokenPayload.isAdmin ? 'true' : 'false');
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

  register(username: string, password: string, email?: string, phone?: string): Observable<any> {
    return this.apiService.register({ username, password, email, phone }).pipe(
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
    localStorage.removeItem(this.IS_ADMIN_KEY);
    this.isAuthenticatedSubject.next(false);
  }

  getUsername(): string | null {
    return localStorage.getItem(this.USERNAME_KEY);
  }

  getUserId(): string | null {
    return localStorage.getItem(this.USER_ID_KEY);
  }

  isAuthenticated(): Observable<boolean> {
    return this.isAuthenticatedSubject.asObservable();
  }

  isAdmin(): boolean {
    return localStorage.getItem(this.IS_ADMIN_KEY) === 'true';
  }

  private hasToken(): boolean {
    return !!this.getToken();
  }

  getUserInfo(): Observable<UserInfo> {
    // Se tivermos uma validação de token prévia que retornou o ID do usuário
    const userId = localStorage.getItem(this.USER_ID_KEY);
    const username = this.getUsername();
    const isAdmin = this.isAdmin();

    if (userId && username) {
      // Retorna as informações armazenadas localmente
      return of({ id: parseInt(userId), username, isAdmin });
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

            // Atualiza a flag de administrador se estiver presente
            if (response.isAdmin !== undefined) {
              localStorage.setItem(this.IS_ADMIN_KEY, response.isAdmin ? 'true' : 'false');
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
                username: response.username || 'Usuário',
                isAdmin: response.isAdmin
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

  // Método para forçar o armazenamento de admin para o usuário 'admin'
  forceAdminForUserAdmin() {
    const username = this.getUsername();
    if (username === 'admin') {
      console.log('Forçando status de administrador para usuário admin');
      localStorage.setItem(this.IS_ADMIN_KEY, 'true');

      // Tentar atualizar o token também
      const token = this.getToken();
      if (token) {
        try {
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            // Decodificar o payload atual
            const payload = JSON.parse(atob(tokenParts[1]));

            // Adicionar ou atualizar a propriedade isAdmin
            payload.isAdmin = true;

            // Criar um novo token com o payload modificado
            const updatedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '')
                                   .replace(/\+/g, '-')
                                   .replace(/\//g, '_');

            // Criar token atualizado (apenas para uso local, não é uma assinatura válida)
            const updatedToken = `${tokenParts[0]}.${updatedPayload}.${tokenParts[2]}`;

            // Armazenar o token atualizado
            localStorage.setItem(this.TOKEN_KEY, updatedToken);
            console.log('Token atualizado com informação de admin');
          }
        } catch (e) {
          console.error('Erro ao processar token:', e);
        }
      }
    }
  }
}
