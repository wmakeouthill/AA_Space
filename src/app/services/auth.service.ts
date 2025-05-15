import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, tap, catchError, map, shareReplay, finalize, distinctUntilChanged } from 'rxjs';
import { ApiService } from './api.service';

interface UserInfo {
  id: number;
  username: string;
  isAdmin?: boolean;
}

interface ValidationResponse {
  valid: boolean;
  username?: string;
  userId?: number;
  isAdmin?: boolean;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USERNAME_KEY = 'username';
  private readonly USER_ID_KEY = 'user_id';
  private readonly IS_ADMIN_KEY = 'is_admin';
  private readonly REMEMBER_ME_KEY = 'remember_me'; // Nova chave para localStorage

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private userIdSubject = new BehaviorSubject<string | null>(null);
  public userId$ = this.userIdSubject.asObservable().pipe(distinctUntilChanged());

  private initialValidation$: Observable<ValidationResponse>;

  constructor(private apiService: ApiService) {
    this.initialValidation$ = this.createValidationObservable();
    this.initializeAuthState();
    this.userIdSubject.next(localStorage.getItem(this.USER_ID_KEY) || sessionStorage.getItem(this.USER_ID_KEY));
  }

  public getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY) || sessionStorage.getItem(this.TOKEN_KEY);
  }

  private createValidationObservable(): Observable<ValidationResponse> {
    const token = this.getToken();
    console.log('[AUTH SERVICE] createValidationObservable - Token from storage:', token); // LOG ADICIONADO/EXISTENTE
    if (!token) {
      console.log('[AUTH SERVICE] createValidationObservable - No token, returning { valid: false }');
      this.userIdSubject.next(null);
      this.isAuthenticatedSubject.next(false); // Garantir que isAuthenticatedSubject seja atualizado
      return of({ valid: false, error: 'No token on creation' }).pipe(shareReplay(1));
    }

    const shouldRemember = localStorage.getItem(this.REMEMBER_ME_KEY) === 'true';
    console.log(`[AUTH SERVICE] createValidationObservable - shouldRemember flag from localStorage: ${shouldRemember}`); // LOG ADICIONADO/EXISTENTE

    console.log('[AUTH SERVICE] createValidationObservable - Token exists, calling apiService.validateToken()');
    return this.apiService.validateToken().pipe(
      tap((response: ValidationResponse) => {
        console.log('[AUTH SERVICE] createValidationObservable - API validateToken response:', response); // LOG ADICIONADO/EXISTENTE
        if (response && response.valid) {
          // O token em si não é re-salvo aqui, pois já deve estar no storage correto.
          // Apenas os dados do usuário são atualizados/confirmados no storage correto.
          if (response.username) {
            this.setData(this.USERNAME_KEY, response.username, shouldRemember);
            console.log(`[AUTH SERVICE] User data set with shouldRemember=${shouldRemember}: USERNAME_KEY`);
          }
          if (response.userId) {
            const userIdStr = response.userId.toString();
            this.setData(this.USER_ID_KEY, userIdStr, shouldRemember);
            this.userIdSubject.next(userIdStr); // Emitir o ID do usuário
            console.log(`[AUTH SERVICE] User data set with shouldRemember=${shouldRemember}: USER_ID_KEY = ${userIdStr}`);
          }
          if (response.isAdmin !== undefined) {
            this.setData(this.IS_ADMIN_KEY, response.isAdmin ? 'true' : 'false', shouldRemember);
            console.log(`[AUTH SERVICE] User data set with shouldRemember=${shouldRemember}: IS_ADMIN_KEY`);
          }
          this.isAuthenticatedSubject.next(true);
          console.log('[AUTH SERVICE] createValidationObservable - isAuthenticatedSubject set to true.');
        } else {
          console.warn('[AUTH SERVICE] createValidationObservable - Token validation failed or response invalid. Logging out.');
          this.logout(); // logout() já lida com a limpeza correta e reseta os subjects.
        }
      }),
      map((response: ValidationResponse): ValidationResponse => { // Este map é mais para o consumidor do observable
        return {
          valid: !!(response && response.valid),
          username: response?.username,
          userId: response?.userId,
          isAdmin: response?.isAdmin,
          originalResponse: response
        };
      }),
      catchError(error => {
        console.error('[AUTH SERVICE] createValidationObservable - Error during API validateToken:', error); // LOG ADICIONADO
        this.logout(); // logout() já lida com a limpeza correta e reseta os subjects.
        return of({ valid: false, error: error });
      }),
      shareReplay(1)
    );
  }

  private initializeAuthState(): void {
    console.log('[AUTH SERVICE] initializeAuthState - Initializing authentication state.'); // LOG ADICIONADO
    // Verifica o token síncronamente primeiro para um estado inicial rápido
    const token = this.getToken();
    if (token) {
        console.log('[AUTH SERVICE] initializeAuthState - Token found. Subscribing to initialValidation$.');
        this.isAuthenticatedSubject.next(true); // Otimisticamente define como true, será corrigido pela validação se inválido
        this.initialValidation$.subscribe({
            next: (validationResult) => {
                console.log('[AUTH SERVICE] initializeAuthState - initialValidation$ next:', validationResult);
                if (!validationResult.valid) {
                    // Se a validação falhar (após ter sido otimisticamente true), corrija.
                    // logout() dentro de createValidationObservable já deve ter limpado e setado isAuthenticatedSubject para false.
                }
            },
            error: (err) => {
                console.error('[AUTH SERVICE] initializeAuthState - initialValidation$ error:', err);
                // logout() dentro de createValidationObservable já deve ter limpado e setado isAuthenticatedSubject para false.
            }
        });
    } else {
        console.log('[AUTH SERVICE] initializeAuthState - No token found. Setting isAuthenticated to false.');
        this.isAuthenticatedSubject.next(false);
        this.userIdSubject.next(null);
        // Não precisa se inscrever em initialValidation$ se não há token, pois ele já retorna of({valid: false})
    }
  }

  public isAuthenticated(): Observable<boolean> {
    return this.isAuthenticatedSubject.asObservable();
  }

  public validateToken(): Observable<ValidationResponse> {
    if (!this.getToken()) {
      if (this.isAuthenticatedSubject.value) {
        this.isAuthenticatedSubject.next(false);
        this.userIdSubject.next(null);
      }
      return of({ valid: false, error: 'No token for explicit validation call' });
    }
    return this.initialValidation$;
  }

  login(username: string, password: string, rememberMe: boolean = false): Observable<any> { // Adicionar rememberMe
    return this.apiService.login({ username, password }).pipe(
      tap(response => {
        if (response && response.token) {
          this.setData(this.TOKEN_KEY, response.token, rememberMe);
          this.setData(this.USERNAME_KEY, response.username, rememberMe);
          let userIdToStore: string | null = null;
          if (response.isAdmin !== undefined) {
            this.setData(this.IS_ADMIN_KEY, response.isAdmin ? 'true' : 'false', rememberMe);
          }
          try {
            const tokenParts = response.token.split('.');
            if (tokenParts.length === 3) {
              const tokenPayload = JSON.parse(atob(tokenParts[1]));
              if (tokenPayload.id) {
                userIdToStore = String(tokenPayload.id);
                this.setData(this.USER_ID_KEY, userIdToStore, rememberMe);
              }
              if (tokenPayload.isAdmin !== undefined) {
                this.setData(this.IS_ADMIN_KEY, tokenPayload.isAdmin ? 'true' : 'false', rememberMe);
              }
            }
          } catch (e) {
            console.error('[AUTH SERVICE] Error parsing token during login:', e);
          }

          this.userIdSubject.next(userIdToStore);
          this.isAuthenticatedSubject.next(true);
          // Armazenar a preferência de "rememberMe"
          localStorage.setItem(this.REMEMBER_ME_KEY, rememberMe ? 'true' : 'false');
          this.initialValidation$ = this.createValidationObservable();
          this.initialValidation$.subscribe();
          console.log('[AUTH SERVICE] Login successful, isAuthenticatedSubject and userIdSubject updated.');
        }
      })
    );
  }

  register(username: string, password: string, email?: string, phone?: string): Observable<any> {
    return this.apiService.register({ username, password, email, phone }).pipe(
      tap(response => {
        if (response && response.token) {
          // Por padrão, o registro não marca "lembrar sessão"
          const rememberMe = false;
          this.setData(this.TOKEN_KEY, response.token, rememberMe);
          this.setData(this.USERNAME_KEY, response.username, rememberMe);
          let userIdToStore: string | null = null;
          try {
            const tokenParts = response.token.split('.');
            if (tokenParts.length === 3) {
              const tokenPayload = JSON.parse(atob(tokenParts[1]));
              if (tokenPayload.id) {
                userIdToStore = String(tokenPayload.id);
                this.setData(this.USER_ID_KEY, userIdToStore, rememberMe);
              }
              if (tokenPayload.isAdmin !== undefined) {
                this.setData(this.IS_ADMIN_KEY, tokenPayload.isAdmin ? 'true' : 'false', rememberMe);
              }
            }
          } catch (e) {
            console.error('[AUTH SERVICE] Error parsing token during registration:', e);
          }
          this.userIdSubject.next(userIdToStore);
          this.isAuthenticatedSubject.next(true);
          localStorage.setItem(this.REMEMBER_ME_KEY, rememberMe ? 'true' : 'false');
          this.initialValidation$ = this.createValidationObservable();
          this.initialValidation$.subscribe();
          console.log('[AUTH SERVICE] Registration successful, isAuthenticatedSubject and userIdSubject updated.');
        }
      })
    );
  }

  logout(): void {
    console.log('[AUTH SERVICE] logout - Clearing authentication data.');
    const rememberMeFlag = localStorage.getItem(this.REMEMBER_ME_KEY) === 'true'; // Lê a flag antes de limpar
    console.log(`[AUTH SERVICE] logout - rememberMeFlag was: ${rememberMeFlag}`);

    this.clearData(this.TOKEN_KEY, rememberMeFlag);
    this.clearData(this.USERNAME_KEY, rememberMeFlag);
    this.clearData(this.USER_ID_KEY, rememberMeFlag);
    this.clearData(this.IS_ADMIN_KEY, rememberMeFlag);
    localStorage.removeItem(this.REMEMBER_ME_KEY); // Limpar a preferência de rememberMe

    this.isAuthenticatedSubject.next(false);
    this.userIdSubject.next(null);

    // Recriar o observable de validação para refletir o estado de logout (sem token)
    this.initialValidation$ = this.createValidationObservable();
    // Opcionalmente, pode-se inscrever e desinscrever para "executá-lo" e colocar no cache o {valid:false}
    // this.initialValidation$.subscribe().unsubscribe();
    console.log('[AUTH SERVICE] logout - Authentication data cleared and subjects reset.');
  }

  getUsername(): string | null {
    return localStorage.getItem(this.USERNAME_KEY) || sessionStorage.getItem(this.USERNAME_KEY);
  }

  getUserId(): string | null {
    const userId = localStorage.getItem(this.USER_ID_KEY) || sessionStorage.getItem(this.USER_ID_KEY);
    console.log('[AUTH SERVICE] getUserId - Returning from storage:', userId);
    return userId;
  }

  isAdmin(): boolean {
    return (localStorage.getItem(this.IS_ADMIN_KEY) || sessionStorage.getItem(this.IS_ADMIN_KEY)) === 'true';
  }

  private hasToken(): boolean {
    const tokenExists = !!this.getToken();
    return tokenExists;
  }

  getUserInfo(): Observable<UserInfo> {
    const userId = localStorage.getItem(this.USER_ID_KEY) || sessionStorage.getItem(this.USER_ID_KEY);
    const username = this.getUsername();
    const isAdmin = this.isAdmin();

    if (userId && username) {
      return of({ id: parseInt(userId), username, isAdmin });
    } else {
      return this.apiService.validateToken().pipe(
        tap(response => {
          if (response && response.valid) {
            if (response.userId !== undefined && response.userId !== null) {
              this.setData(this.USER_ID_KEY, String(response.userId));
            } else if (response.id !== undefined && response.id !== null) {
              this.setData(this.USER_ID_KEY, String(response.id));
            }

            if (response.username) {
              this.setData(this.USERNAME_KEY, response.username);
            }

            if (response.isAdmin !== undefined) {
              this.setData(this.IS_ADMIN_KEY, response.isAdmin ? 'true' : 'false');
            }
          }
        }),
        catchError(error => {
          this.logout();
          throw error;
        }),
        map(response => {
          if (response && response.valid) {
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

            throw new Error('ID do usuário não encontrado na resposta');
          } else {
            throw new Error('Não foi possível obter informações do usuário');
          }
        })
      );
    }
  }

  private setData(key: string, value: string, remember: boolean = false): void {
    console.log(`[AUTH SERVICE] setData - Key: ${key}, Value: ${value}, Remember: ${remember}`); // LOG ADICIONADO
    if (remember) {
      localStorage.setItem(key, value);
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, value);
      localStorage.removeItem(key);
    }
  }

  private clearData(key: string, wasRemembered: boolean): void { // 'wasRemembered' vem da REMEMBER_ME_KEY
    console.log(`[AUTH SERVICE] clearData - Key: ${key}, WasRemembered: ${wasRemembered}`); // LOG ADICIONADO
    if (wasRemembered) {
      localStorage.removeItem(key);
    } else {
      sessionStorage.removeItem(key);
    }
    // Não limpar a REMEMBER_ME_KEY aqui, ela é limpa separadamente no logout.
  }

  forceAdminForUserAdmin() {
    // Method intentionally left blank
  }
}
