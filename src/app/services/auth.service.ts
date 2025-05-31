import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, tap, catchError, map, shareReplay, finalize, distinctUntilChanged, throwError } from 'rxjs'; // Ensure throwError is imported
import { ApiService } from './api.service';

interface UserInfo {
  id: number;
  username: string;
  isAdmin?: boolean;
  role?: string | null; // Changed from string | undefined
  isMainAdmin?: boolean; // Added isMainAdmin
}

interface ValidationResponse {
  valid: boolean;
  username?: string;
  userId?: number;
  isAdmin?: boolean;
  role?: string;
  [key: string]: any;
}

interface LoginResponse {
  token: string;
  username: string;
  isAdmin: boolean;
  role: string;
  isMainAdmin: boolean;
  message: string;
  id?: number; // id might not be directly in login response, but token contains it.
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USERNAME_KEY = 'username';
  private readonly USER_ID_KEY = 'user_id';
  private readonly IS_ADMIN_KEY = 'is_admin';
  private readonly USER_ROLE_KEY = 'user_role';
  private readonly REMEMBER_ME_KEY = 'remember_me';

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private userIdSubject = new BehaviorSubject<string | null>(null);
  public userId$ = this.userIdSubject.asObservable().pipe(distinctUntilChanged());
  private userRoleSubject = new BehaviorSubject<string | null>(null);
  public userRole$ = this.userRoleSubject.asObservable().pipe(distinctUntilChanged());
  private isAdminSubject = new BehaviorSubject<boolean>(false);
  public isAdmin$ = this.isAdminSubject.asObservable().pipe(distinctUntilChanged());
  private isMainAdminSubject = new BehaviorSubject<boolean>(false);
  public isMainAdmin$ = this.isMainAdminSubject.asObservable().pipe(distinctUntilChanged());

  // Add isAuthenticated as an observable
  public isAuthenticated = this.isAuthenticatedSubject.asObservable();

  private initialValidation$: Observable<ValidationResponse>;

  constructor(private apiService: ApiService) {
    this.initialValidation$ = this.createValidationObservable();
    this.initializeAuthState();
    this.userIdSubject.next(localStorage.getItem(this.USER_ID_KEY) || sessionStorage.getItem(this.USER_ID_KEY));
    const initialRole = localStorage.getItem(this.USER_ROLE_KEY) || sessionStorage.getItem(this.USER_ROLE_KEY);
    this.userRoleSubject.next(initialRole);
    // console.warn('[AUTH SERVICE] Constructor - Initial role from storage:', initialRole);
  }

  public getAuthHeaders(): { [header: string]: string } {
    const token = this.getToken();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  }

  public getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY) || sessionStorage.getItem(this.TOKEN_KEY);
  }

  private createValidationObservable(): Observable<ValidationResponse> {
    const token = this.getToken();
    // console.log('[AUTH SERVICE] createValidationObservable - Token from storage:', token); // Existing log
    if (!token) {
      this.isAuthenticatedSubject.next(false);
      this.userRoleSubject.next(null); // Clear role if no token
      // console.warn('[AUTH SERVICE] createValidationObservable - No token, userRoleSubject set to null'); // Existing log
      return of({ valid: false, message: 'No token provided' });
    }

    const shouldRemember = localStorage.getItem(this.REMEMBER_ME_KEY) === 'true';
    // console.log(`[AUTH SERVICE] createValidationObservable - shouldRemember flag from localStorage: ${shouldRemember}`); // Existing log

    // console.log('[AUTH SERVICE] createValidationObservable - Token exists, calling apiService.validateToken()'); // Existing log
    return this.apiService.validateToken().pipe(
      tap((response: ValidationResponse) => {
        // console.log('[AUTH SERVICE] createValidationObservable - API validateToken response:', response);
        if (response && response.valid) {
          if (response.username) {
            this.setData(this.USERNAME_KEY, response.username, shouldRemember);
            // console.log(`[AUTH SERVICE] User data set with shouldRemember=${shouldRemember}: USERNAME_KEY`);
          }
          if (response.userId) {
            const userIdStr = response.userId.toString();
            this.setData(this.USER_ID_KEY, userIdStr, shouldRemember);
            this.userIdSubject.next(userIdStr);
            // console.log(`[AUTH SERVICE] User data set with shouldRemember=${shouldRemember}: USER_ID_KEY = ${userIdStr}`);
          }
          if (response.isAdmin !== undefined) {
            this.setData(this.IS_ADMIN_KEY, response.isAdmin ? 'true' : 'false', shouldRemember);
            // console.log(`[AUTH SERVICE] User data set with shouldRemember=${shouldRemember}: IS_ADMIN_KEY`);
          }

          if (response.role) {
            this.setData(this.USER_ROLE_KEY, response.role, shouldRemember);
            this.userRoleSubject.next(response.role);
            this.isMainAdminSubject.next(response['isMainAdmin'] || false); // Access with ['isMainAdmin']
            this.isAdminSubject.next(response.isAdmin || false);
            // console.warn(`[AUTH SERVICE] createValidationObservable - Role from API: '${response.role}', userRoleSubject updated.`);
            // No explicit return here, tap is for side effects
          } else {
            // Explicitly handle missing role even if validation is successful
            this.setData(this.USER_ROLE_KEY, '', shouldRemember); // Store empty string for role
            this.userRoleSubject.next(null);
            this.isMainAdminSubject.next(false); // Clear main admin status
            this.isAdminSubject.next(false); // Clear admin status
            // console.warn('[AUTH SERVICE] createValidationObservable - Role NOT found in API response (though token valid). userRoleSubject set to null.');
          }
          this.isAuthenticatedSubject.next(true);
          // console.log('[AUTH SERVICE] createValidationObservable - isAuthenticatedSubject set to true.');
        } else {
          // console.warn('[AUTH SERVICE] createValidationObservable - Token validation failed or response invalid. Logging out.');
          this.logout();
        }
      }),
      map((response: ValidationResponse): ValidationResponse => {
        return {
          valid: !!(response && response.valid),
          username: response?.username,
          userId: response?.userId,
          isAdmin: response?.isAdmin,
          role: response?.role,
          isMainAdmin: response?.[ 'isMainAdmin'], // Access with ['isMainAdmin']
          originalResponse: response
        };
      }),
      catchError(error => {
        // console.warn('[AUTH SERVICE] createValidationObservable - Error during API validateToken. Logging out.', error);
        this.logout();
        return of({ valid: false, error: error });
      }),
      shareReplay(1)
    );
  }

  private initializeAuthState(): void {
    // console.warn('[AUTH SERVICE] initializeAuthState - Subscribing to initialValidation$ to process auth state.');
    this.initialValidation$.subscribe({
        next: (validationResponse) => {
            // console.warn(`[AUTH SERVICE] initializeAuthState - initialValidation$ processed. Valid: ${validationResponse.valid}, Role from validation: ${validationResponse.role}, Current role subject value: ${this.userRoleSubject.value}`);
        },
        error: (err) => {
            // console.warn('[AUTH SERVICE] initializeAuthState - Error from initialValidation$. State should have been cleared by logout() in createValidationObservable.', err);
        }
    });
  }

  // Assuming setData, logout, login, clearAuthDataFromStorage methods exist as per class usage.
  // The following are placeholders based on common patterns and previous attempts if their actual code is not available.
  // Ensure these methods correctly interact with userRoleSubject.

  // Placeholder for setData if not fully defined in context (it is used above)
  private setData(key: string, value: string, remember: boolean): void {
    if (remember) {
      localStorage.setItem(key, value);
    } else {
      sessionStorage.setItem(key, value);
    }
  }

  // Placeholder for logout - ensure it clears userRoleSubject
  public logout(): void {
    // console.warn('[AUTH SERVICE] logout - Logging out user.');
    this.clearAuthDataFromStorage(); // Assumed method
    this.isAuthenticatedSubject.next(false);
    this.userIdSubject.next(null);
    this.userRoleSubject.next(null); // CRITICAL: Ensure role is cleared
    this.isAdminSubject.next(false); // Clear admin status
    this.isMainAdminSubject.next(false); // Clear main admin status
    // console.warn('[AUTH SERVICE] logout - User logged out. isAuthenticated, userId, and userRole Subjects set to false/null.');
  }

  // Placeholder for clearAuthDataFromStorage if not fully defined
  private clearAuthDataFromStorage(): void {
    const keys = [this.TOKEN_KEY, this.USERNAME_KEY, this.USER_ID_KEY, this.IS_ADMIN_KEY, this.USER_ROLE_KEY, this.REMEMBER_ME_KEY];
    keys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    // console.warn('[AUTH SERVICE] clearAuthDataFromStorage - Cleared auth keys from localStorage and sessionStorage.');
  }

  // Placeholder for login method - ensure it updates userRoleSubject
  public login(credentials: any, rememberMe: boolean): Observable<LoginResponse> {
    // console.log('[AUTH SERVICE] login - Attempting login with credentials:', credentials, 'Remember Me:', rememberMe);
    return this.apiService.login(credentials).pipe(
      tap((response: LoginResponse) => {
        // console.log('[AUTH SERVICE] login - API login response:', response);
        if (response && response.token) {
          this.setData(this.TOKEN_KEY, response.token, rememberMe);
          this.setData(this.USERNAME_KEY, response.username, rememberMe);
          // O ID do usuário geralmente vem do payload do token, não diretamente da resposta de login.
          // A validação do token (ou um endpoint /me) normalmente forneceria isso.
          // Por enquanto, vamos assumir que a resposta de login *pode* incluir o ID ou que ele será obtido após a validação.

          // Atualiza os subjects com os dados da resposta de login
          this.isAuthenticatedSubject.next(true);
          this.isAdminSubject.next(response.isAdmin || false);
          this.isMainAdminSubject.next(response.isMainAdmin || false); // Adicionado
          this.userRoleSubject.next(response.role || null); // Adicionado

          // Se o ID do usuário estiver na resposta de login, use-o. Caso contrário, será atualizado pela validação do token.
          if (response.id) {
            this.setData(this.USER_ID_KEY, response.id.toString(), rememberMe);
            this.userIdSubject.next(response.id.toString());
          }

          // console.log(`[AUTH SERVICE] login - User data set. Token stored. isAuthenticated: true, isAdmin: ${response.isAdmin}, isMainAdmin: ${response.isMainAdmin}, role: ${response.role}`);

          // Após o login bem-sucedido, é crucial revalidar ou buscar os detalhes completos do usuário
          // para garantir que todos os estados (como userId, role, etc.) estejam corretos e atualizados.
          // Disparar uma nova validação pode ser uma abordagem.
          this.initialValidation$ = this.createValidationObservable(); // Recria o observable de validação
          this.initializeAuthState(); // Reinicializa o estado de autenticação para usar o novo token

        } else {
          // console.warn('[AUTH SERVICE] login - Login failed or token not received.');
          this.logout(); // Garante que o estado seja limpo se o login falhar
        }
      }),
      catchError(error => {
        // console.error('[AUTH SERVICE] login - Error during API login:', error);
        this.logout(); // Limpa o estado em caso de erro
        return throwError(() => new Error('Login failed: ' + (error.error?.message || error.message)));
      })
    );
  }

  public getCurrentUserRole(): string | null {
    return this.userRoleSubject.value;
  }

  // Add missing methods
  public validateToken(): Observable<ValidationResponse> {
    return this.initialValidation$;
  }

  public isAdmin(): boolean {
    // Consider making this an observable if isAdmin status can change dynamically
    // and components need to react to it without polling.
    // const role = this.userRoleSubject.value;
    // return role === 'admin' || role === 'leader'; // Assuming 'leader' also has admin-like privileges based on isLeaderOrAdmin
    return this.isAdminSubject.value; // Use subject value
  }

  public getUsername(): string | null {
    return localStorage.getItem(this.USERNAME_KEY) || sessionStorage.getItem(this.USERNAME_KEY);
  }

  public getUserId(): string | null {
    return this.userIdSubject.value;
  }

  public getUserInfo(): Observable<UserInfo | null> {
    return this.isAuthenticated.pipe(
      map(isAuthenticated => {
        if (!isAuthenticated) {
          return null;
        }
        return {
          id: parseInt(this.getUserId() || '0', 10),
          username: this.getUsername() || '',
          isAdmin: this.isAdmin(),
          role: this.getCurrentUserRole(),
          isMainAdmin: this.isMainAdminSubject.value // Add isMainAdmin
        };
      })
    );
  }

  public register(credentials: any): Observable<any> {
    // console.warn(`[AUTH SERVICE] register - Attempting registration for ${credentials.username}`);
    return this.apiService.register(credentials).pipe(
      tap((response: any) => {
        // console.warn('[AUTH SERVICE] register - API register response:', response);
        // Optionally, log in the user directly after registration
        if (response && response.token && response.username) {
           // For registration, we typically don't log the user in automatically
           // unless that's the desired flow. If so, call login logic here.
           // For now, just confirm registration.
          // console.warn(`[AUTH SERVICE] register - User ${response.username} registered successfully.`);
        } else {
          // console.warn('[AUTH SERVICE] register - Registration failed or invalid response structure.');
        }
      }),
      catchError((error) => {
        // console.warn('[AUTH SERVICE] register - Error during API register.', error);
        return throwError(() => error);
      })
    );
  }
}
