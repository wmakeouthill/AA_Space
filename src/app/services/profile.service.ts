import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

export interface UserProfile {
  id: number;
  username: string;
  email?: string;
  phone?: string;
  profileImage?: string;
  isAdmin?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {  private apiUrl: string;
  private defaultImage = '/assets/images/user.png';
  private readonly API_ORIGIN = window.location.hostname === 'localhost'
      ? 'http://localhost:3001'
      : window.location.origin.replace(/-4200\./, '-3001.');

  constructor(
    private http: HttpClient,
    private apiService: ApiService,
    private authService: AuthService
  ) {
    const baseApiUrl = (this.apiService as any).API_URL;
    this.apiUrl = `${baseApiUrl}/profile`;
    console.log('ProfileService usando URL da API:', this.apiUrl);
  }  formatImageUrl(imagePath: string | undefined): string {
    // Handle base64 images
    if (imagePath?.startsWith('data:')) {
      return imagePath;
    }

    // Handle default image
    if (!imagePath || imagePath === this.defaultImage || imagePath === '') {
      return `${this.API_ORIGIN}${this.defaultImage}`;
    }

    // Handle full URLs
    if (imagePath.startsWith('http')) {
      return imagePath.split('?')[0];
    }    // Handle filename-only images (8_a30d4645808aaf13.jpeg) - pattern is userId_randomhash.extension
    // These are just filenames without path, stored in uploads/profiles
    if (imagePath.includes('_') && !imagePath.includes('/')) {
      // Add a timestamp to prevent caching
      const timestamp = Date.now();
      const path = `/uploads/profiles/${imagePath}`;
      const url = `${this.API_ORIGIN}${path}?t=${timestamp}`;
      console.log(`[PROFILE SERVICE] Image filename detected, formatted URL with timestamp: ${url}`);
      return url;
    }

    // Handle full paths that include 'profiles' directory
    if (imagePath.includes('profiles/')) {
      // Make sure it starts with /uploads
      const path = imagePath.startsWith('/') ? imagePath : `/uploads/${imagePath}`;
      // Add a timestamp to prevent caching
      const timestamp = Date.now();
      const url = `${this.API_ORIGIN}${path}?t=${timestamp}`;
      console.log(`[PROFILE SERVICE] Profiles path detected, formatted URL with timestamp: ${url}`);
      return url;
    }

    // Default case - ensure correct path prefix
    const path = imagePath.startsWith('/') ? imagePath : `/uploads/${imagePath}`;
    console.log(`[PROFILE SERVICE] Default case, formatted URL: ${this.API_ORIGIN}${path}`);
    return `${this.API_ORIGIN}${path}`;
  }
  isDefaultImage(imagePath: string | undefined): boolean {
    return !imagePath || imagePath === this.defaultImage || imagePath === '';
  }  // Obter perfil do usuário atual
  getCurrentUserProfile(): Observable<UserProfile> {
    const token = this.authService.getToken();
    // Authorization header should not be set if token is null or empty
    const headers: { [header: string]: string | string[]; } = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      // If there's no token, we can expect a 401, so no need to even make the call
      // or handle it in a way that makes sense for your app (e.g., redirect to login)
      console.warn('[PROFILE SERVICE] No token found. User is likely not authenticated. Using fallback.');
      // Option 1: Return an observable that errors, to be caught by the component
      // return throwError(() => new Error('Not authenticated'));
      // Option 2: Return fallback, but be aware this hides the auth issue
      return this.getFallbackUserProfile(); // Current behavior
    }

    console.log('[PROFILE SERVICE] Getting current user profile with token:', token ? token.substring(0, 15) + '...' : 'none');

    return this.http.get<UserProfile>(`${this.apiUrl}/me`, { headers }).pipe(
      map(profile => {
        console.log('[PROFILE SERVICE] Profile received from server:', profile);

        // Format the profile image URL if exists
        if (profile?.profileImage) {
          profile.profileImage = this.formatImageUrl(profile.profileImage);
          console.log('[PROFILE SERVICE] Formatted profile image URL:', profile.profileImage);
        }

        return profile;
      }),
      catchError(error => {
        console.error('[PROFILE SERVICE] Error fetching profile, status: ' + (error.status !== undefined ? error.status : 'unknown'), error);
        if (error.status === 401) {
          console.warn('[PROFILE SERVICE] Unauthorized (401) fetching profile. Token might be invalid or expired. Using fallback.');
          // Optionally, trigger a logout or a specific auth error event
          // this.authService.logout(); // Example: force logout
          // window.dispatchEvent(new CustomEvent('auth:expired'));
        }
        // Fallback to mock data, but be mindful this can hide auth issues.
        return this.getFallbackUserProfile();
      })
    );
  }

  // Método auxiliar para obter perfil de fallback (mock)
  private getFallbackUserProfile(): Observable<UserProfile> {
    console.log('[PROFILE SERVICE] Usando perfil de fallback');
    const username = this.authService.getUsername() || 'Usuário';
    const id = parseInt(this.authService.getUserId() || '1');

    return of({
      id: id,
      username: username,
      profileImage: this.defaultImage,
      isAdmin: true
    });
  }

  // Obter perfil de um usuário por ID
  getUserProfile(userId: number): Observable<UserProfile> {
    const headers = { 'Content-Type': 'application/json' };
    return this.http.get<UserProfile>(`${this.apiUrl}/${userId}`, { headers, withCredentials: true }).pipe(
      map(profile => ({
        ...profile,
        // Garantir que a URL da imagem está formatada corretamente
        profileImage: this.formatImageUrl(profile.profileImage)
      })),
      catchError(error => {
        console.error('Erro ao buscar perfil de usuário:', error);

        if (error.status === 401) {
          // Em desenvolvimento, tentar continuar com dados mockados
          if (this.apiService && (this.apiService as any).isDevMode) {
            console.log('[PROFILE SERVICE] Usando dados mockados para ID:', userId);
            return of({
              id: userId,
              username: `Usuário ${userId}`,
              profileImage: this.formatImageUrl('/uploads/profiles/1_65b417ebc8def341.jpeg'),
              isAdmin: userId === 1
            });
          }

          // Em produção, disparar evento de autenticação expirada
          const authError = new CustomEvent('auth:error', { detail: { message: 'Sessão expirada' } });
          window.dispatchEvent(authError);
          return throwError(() => new Error('Sua sessão expirou. Por favor, faça login novamente.'));
        }

        return throwError(() => new Error('Falha ao buscar perfil de usuário.'));
      })
    );
  }

  // Upload de imagem de perfil com compressão
  uploadProfileImage(imageFile: File): Observable<{ profileImage: string }> {
    const headers = { 'Content-Type': 'application/json' };
    console.log('[PROFILE SERVICE] Iniciando upload de imagem...');
    return this.compressImage(imageFile).pipe(
      map(compressedImage => ({ profileImage: compressedImage })),
      mergeMap(imageData => this.http.post<any>(
        `${this.apiUrl}/image`,
        imageData,
        { headers, withCredentials: true }
      )),
      map(response => ({
        ...response,
        profileImage: this.formatImageUrl(response.profileImage)
      })),
      catchError(error => {
        console.error('Erro ao upload de imagem de perfil:', error);

        if (error.status === 401) {
          // Disparar evento de autenticação expirada para que o usuário faça login novamente
          const authError = new CustomEvent('auth:error', { detail: { message: 'Sessão expirada' } });
          window.dispatchEvent(authError);
          return throwError(() => new Error('Sua sessão expirou. Por favor, faça login novamente.'));
        }

        return throwError(() => new Error('Falha ao fazer upload da imagem de perfil.'));
      })
    );
  }

  // Upload de imagem de perfil diretamente como base64
  uploadProfileImageBase64(base64Image: string): Observable<{ profileImage: string }> {
    const headers = { 'Content-Type': 'application/json' };
    console.log('[PROFILE SERVICE] Iniciando upload de imagem base64, URL:', `${this.apiUrl}/image`);

    return this.http.post<any>(
      `${this.apiUrl}/image`,
      { profileImage: base64Image },
      { headers, withCredentials: true }
    ).pipe(
      map(response => ({
        ...response,
        profileImage: this.formatImageUrl(response.profileImage)
      })),
      catchError(error => {
        console.error('Erro ao upload de imagem de perfil base64:', error);

        if (error.status === 401) {
          // Disparar evento de autenticação expirada para que o usuário faça login novamente
          const authError = new CustomEvent('auth:error', { detail: { message: 'Sessão expirada' } });
          window.dispatchEvent(authError);
          return throwError(() => new Error('Sua sessão expirou. Por favor, faça login novamente.'));
        }

        return throwError(() => new Error('Falha ao fazer upload da imagem de perfil.'));
      })
    );
  }

  // Remover imagem de perfil
  removeProfileImage(): Observable<any> {
    const headers = { 'Content-Type': 'application/json' };
    return this.http.delete(`${this.apiUrl}/image`, {
      headers,
      withCredentials: true
    }).pipe(
      map(response => ({
        ...response,
        profileImage: this.formatImageUrl(undefined) // Retorna a URL da imagem padrão
      })),
      catchError(error => {
        console.error('Erro ao remover imagem de perfil:', error);

        if (error.status === 401) {
          // Disparar evento de autenticação expirada para que o usuário faça login novamente
          const authError = new CustomEvent('auth:error', { detail: { message: 'Sessão expirada' } });
          window.dispatchEvent(authError);
          return throwError(() => new Error('Sua sessão expirou. Por favor, faça login novamente.'));
        }

        return throwError(() => new Error('Falha ao remover imagem de perfil.'));
      })
    );
  }

  // Método para comprimir imagem
  private compressImage(file: File): Observable<string> {
    return new Observable<string>(observer => {
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = () => {
        const img = new Image();
        img.src = reader.result as string;

        img.onload = () => {
          const canvas = document.createElement('canvas');

          // Definir dimensões máximas desejadas
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;

          let width = img.width;
          let height = img.height;

          // Redimensionar mantendo proporção
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);

            // Comprimir para JPEG com qualidade 0.7
            const quality = 0.7;
            const base64Image = canvas.toDataURL('image/jpeg', quality);

            observer.next(base64Image);
            observer.complete();
          } else {
            observer.error(new Error('Não foi possível obter contexto de canvas.'));
          }
        };

        img.onerror = () => {
          observer.error(new Error('Erro ao carregar imagem.'));
        };
      };

      reader.onerror = () => {
        observer.error(new Error('Erro ao ler arquivo de imagem'));
      };
    });
  }
}
