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
export class ProfileService {
  private apiUrl: string;
  private defaultImage = '/assets/images/user.png';
  private readonly API_ORIGIN = this.determineApiOrigin();

  constructor(
    private http: HttpClient,
    private apiService: ApiService,
    private authService: AuthService
  ) {
    const baseApiUrl = (this.apiService as any).API_URL;
    this.apiUrl = baseApiUrl;
    console.log('ProfileService API_ORIGIN:', this.API_ORIGIN);
    console.log('ProfileService apiUrl:', this.apiUrl);
  }

  private determineApiOrigin(): string {
    const currentOrigin = window.location.origin;
    if (currentOrigin.includes('v3mrhcvc-4200.brs.devtunnels.ms')) {
      return 'https://v3mrhcvc-3001.brs.devtunnels.ms';
    } else if (currentOrigin.includes('.github.dev') || currentOrigin.includes('.github.io') || currentOrigin.includes('.app.github.dev')) {
      return currentOrigin.replace(/-\d+(\.app\.github\.dev|\.github\.dev|\.github\.io)/, '-3001$1');
    }
    return 'http://localhost:3001';
  }

  getFullImageUrl(imagePath?: string): string {
    if (!imagePath) {
      return this.API_ORIGIN + this.defaultImage;
    }
    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
      let correctedPath = imagePath;
      if (correctedPath.includes('localhost:4200')) {
        correctedPath = correctedPath.replace('localhost:4200', 'localhost:3001');
      }
      if (correctedPath.includes('v3mrhcvc-4200.brs.devtunnels.ms')) {
        correctedPath = correctedPath.replace('v3mrhcvc-4200.brs.devtunnels.ms', 'v3mrhcvc-3001.brs.devtunnels.ms');
      }
      return correctedPath.replace(/([^:])\/\//g, '$1/');
    }
    const pathStartsWithSlash = imagePath.startsWith('/');
    let fullPath = this.API_ORIGIN;
    if (pathStartsWithSlash) {
      fullPath += imagePath;
    } else {
      fullPath += '/' + imagePath;
    }
    return fullPath.replace(/([^:])\/\//g, '$1/');
  }

  formatImageUrl(imagePath: string | undefined): string {
    if (imagePath?.startsWith('data:')) {
      return imagePath;
    }
    if (!imagePath || imagePath === this.defaultImage || imagePath === '') {
      return this.getFullImageUrl(this.defaultImage);
    }
    if (imagePath.startsWith('http')) {
      return imagePath.split('?')[0];
    }
    if (imagePath.includes('_') && !imagePath.includes('/')) {
      const timestamp = Date.now();
      const path = `/uploads/profiles/${imagePath}`;
      const url = this.getFullImageUrl(`${path}?t=${timestamp}`);
      return url;
    }
    if (imagePath.includes('profiles/')) {
      const path = imagePath.startsWith('/') ? imagePath : `/uploads/${imagePath}`;
      const timestamp = Date.now();
      const url = this.getFullImageUrl(`${path}?t=${timestamp}`);
      return url;
    }
    const path = imagePath.startsWith('/') ? imagePath : `/uploads/${imagePath}`;
    return this.getFullImageUrl(path);
  }

  isDefaultImage(imagePath: string | undefined): boolean {
    return !imagePath || imagePath === this.defaultImage || imagePath === '';
  }

  getCurrentUserProfile(): Observable<UserProfile> {
    const token = this.authService.getToken();
    const headers: { [header: string]: string | string[]; } = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      console.warn('[ProfileService] getCurrentUserProfile: No token found, returning fallback profile.');
      return this.getFallbackUserProfile();
    }

    return this.http.get<UserProfile>(`${this.apiUrl.replace('/api', '/api/profile')}/me`, { headers }).pipe(
      map(profile => {
        if (profile?.profileImage) {
          profile.profileImage = this.formatImageUrl(profile.profileImage);
        } else {
          profile.profileImage = this.formatImageUrl(this.defaultImage);
        }
        return profile;
      }),
      catchError(error => {
        console.error('[ProfileService] getCurrentUserProfile: Error fetching profile', error);
        if (error.status === 401) {
          console.warn('[ProfileService] getCurrentUserProfile: Unauthorized, returning fallback.');
        }
        return this.getFallbackUserProfile();
      })
    );
  }

  private getFallbackUserProfile(): Observable<UserProfile> {
    const username = this.authService.getUsername() || 'Usuário';
    const id = parseInt(this.authService.getUserId() || '1');

    return of({
      id: id,
      username: username,
      profileImage: this.defaultImage,
      isAdmin: true
    });
  }

  getUserProfile(userId: number): Observable<UserProfile> {
    const headers = { 'Content-Type': 'application/json' };
    return this.http.get<UserProfile>(`${this.apiUrl}/${userId}`, { headers, withCredentials: true }).pipe(
      map(profile => ({
        ...profile,
        profileImage: this.formatImageUrl(profile.profileImage)
      })),
      catchError(error => {
        if (error.status === 401) {
          if (this.apiService && (this.apiService as any).isDevMode) {
            return of({
              id: userId,
              username: `Usuário ${userId}`,
              profileImage: this.formatImageUrl('/uploads/profiles/1_65b417ebc8def341.jpeg'),
              isAdmin: userId === 1
            });
          }
          const authError = new CustomEvent('auth:error', { detail: { message: 'Sessão expirada' } });
          window.dispatchEvent(authError);
          return throwError(() => new Error('Sua sessão expirou. Por favor, faça login novamente.'));
        }
        return throwError(() => new Error('Falha ao buscar perfil de usuário.'));
      })
    );
  }

  uploadProfileImage(imageFile: File): Observable<{ profileImage: string }> {
    const headers = { 'Content-Type': 'application/json' };
    return this.compressImage(imageFile).pipe(
      mergeMap(base64Image => {
        return this.http.post<any>(
          `${this.apiUrl.replace('/api', '/api/profile')}/image`,
          { profileImage: base64Image },
          { headers, withCredentials: true }
        );
      }),
      map(response => {
        console.log('[ProfileService] uploadProfileImage response:', response);
        return {
          ...response,
          profileImage: this.formatImageUrl(response.profileImage || response.filePath)
        };
      }),
      catchError(error => {
        if (error.status === 401) {
          const authError = new CustomEvent('auth:error', { detail: { message: 'Sessão expirada' } });
          window.dispatchEvent(authError);
          return throwError(() => new Error('Sua sessão expirou. Por favor, faça login novamente.'));
        }
        return throwError(() => new Error('Falha ao fazer upload da imagem de perfil.'));
      })
    );
  }

  uploadProfileImageBase64(base64Image: string): Observable<{ profileImage: string }> {
    const headers = { 'Content-Type': 'application/json' };
    return this.http.post<any>(
      `${this.apiUrl.replace('/api', '/api/profile')}/image`,
      { profileImage: base64Image },
      { headers, withCredentials: true }
    ).pipe(
      map(response => {
        console.log('[ProfileService] uploadProfileImageBase64 response:', response);
        return {
          ...response,
          profileImage: this.formatImageUrl(response.profileImage || response.filePath)
        };
      }),
      catchError(error => {
        if (error.status === 401) {
          const authError = new CustomEvent('auth:error', { detail: { message: 'Sessão expirada' } });
          window.dispatchEvent(authError);
          return throwError(() => new Error('Sua sessão expirou. Por favor, faça login novamente.'));
        }
        return throwError(() => new Error('Falha ao fazer upload da imagem de perfil.'));
      })
    );
  }

  removeProfileImage(): Observable<any> {
    const headers = { 'Content-Type': 'application/json' };
    return this.http.delete(`${this.apiUrl.replace('/api', '/api/profile')}/image`, {
      headers,
      withCredentials: true
    }).pipe(
      map(response => ({
        ...response,
        profileImage: this.formatImageUrl(undefined)
      })),
      catchError(error => {
        if (error.status === 401) {
          const authError = new CustomEvent('auth:error', { detail: { message: 'Sessão expirada' } });
          window.dispatchEvent(authError);
          return throwError(() => new Error('Sua sessão expirou. Por favor, faça login novamente.'));
        }
        return throwError(() => new Error('Falha ao remover imagem de perfil.'));
      })
    );
  }

  private compressImage(file: File): Observable<string> {
    return new Observable<string>(observer => {
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = () => {
        const img = new Image();
        img.src = reader.result as string;

        img.onload = () => {
          const canvas = document.createElement('canvas');

          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;

          let width = img.width;
          let height = img.height;

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

  private base64ToBlob(base64: string, type = 'application/octet-stream') {
    const base64WithoutPrefix = base64.startsWith('data:') ? base64.split(',')[1] : base64;
    const byteCharacters = atob(base64WithoutPrefix);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type });
  }
}
