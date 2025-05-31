import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of, BehaviorSubject } from 'rxjs'; // Added BehaviorSubject
import { catchError, map, mergeMap, tap } from 'rxjs/operators'; // Added tap
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { FrontendUserReward } from '../models/chat/chat.interface';

export interface UserProfile {
  id: number;
  username: string;
  email?: string;
  phone?: string;
  profileImage?: string;
  isAdmin?: boolean;
  userRewards?: FrontendUserReward[];
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private apiUrl: string;
  private defaultImage = '/assets/images/user.png';
  private readonly API_ORIGIN: string; // Type annotation added

  // Added BehaviorSubject for current user profile
  private currentUserProfileSubject = new BehaviorSubject<UserProfile | null>(null);
  public currentUserProfile$ = this.currentUserProfileSubject.asObservable();

  // Fallback profile definition
  private get fallbackUserProfile(): UserProfile {
    return {
      id: 0,
      username: 'Guest',
      profileImage: this.formatImageUrl(this.defaultImage),
      isAdmin: false,
      userRewards: []
    };
  }

  constructor(
    private http: HttpClient,
    private apiService: ApiService,
    private authService: AuthService
  ) {
    this.API_ORIGIN = this.apiService.getApiBaseUrl(); // Changed to getApiBaseUrl
    this.apiUrl = `${this.API_ORIGIN}/api/profile`; // Caminho base para rotas de perfil
    // console.warn('[ProfileService] API_ORIGIN:', this.API_ORIGIN);
    // console.warn('[ProfileService] apiUrl (base for profile routes):', this.apiUrl);
    this.loadCurrentUserProfile(); // Load profile on service initialization
  }

  private loadCurrentUserProfile(): void {
    this.getCurrentUserProfile().subscribe(); // Subscribe to trigger the load and update BehaviorSubject
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
    // Check for undefined or empty first
    if (!imagePath || imagePath === '' || imagePath === this.defaultImage) {
      return this.getFullImageUrl(this.defaultImage);
    }
    // Check for known default asset paths
    if (imagePath.endsWith('default-avatar.png') || imagePath.endsWith('default-group-avatar.png')) {
      if (imagePath.startsWith('assets/')) return imagePath; // Already a local asset path
      // If not starting with assets/, it might be a full path or a server path, handle accordingly or fallback
      // For simplicity, if it ends with default names but isn't a direct asset, treat as needing full URL or is already full
    }
    if (imagePath.startsWith('http')) {
      return imagePath.split('?')[0];
    }
    // Ensure API_ORIGIN is used for constructing the full URL
    const base = this.API_ORIGIN;
    if (imagePath.includes('_') && !imagePath.includes('/')) {
      const timestamp = Date.now();
      const path = `/uploads/profiles/${imagePath}`;
      return `${base}${path}?t=${timestamp}`;
    }
    if (imagePath.includes('profiles/')) {
      const path = imagePath.startsWith('/') ? imagePath : `/uploads/${imagePath}`;
      const timestamp = Date.now();
      return `${base}${path}?t=${timestamp}`;
    }
    const path = imagePath.startsWith('/') ? imagePath : `/uploads/${imagePath}`;
    return `${base}${path}`;
  }

  isDefaultImage(imagePath: string | undefined): boolean {
    return !imagePath || imagePath === this.defaultImage || imagePath === '' || imagePath === this.getFullImageUrl(this.defaultImage);
  }

  getCurrentUserProfile(): Observable<UserProfile> {
    const token = this.authService.getToken();
    if (!token) {
      this.currentUserProfileSubject.next(this.fallbackUserProfile);
      // console.warn('[ProfileService] getCurrentUserProfile: No token found, returning fallback profile.');
      return of(this.fallbackUserProfile);
    }

    return this.http.get<UserProfile>(`${this.apiUrl}/me`, { headers: this.authService.getAuthHeaders() }).pipe(
      map(profile => {
        const fullProfileImage = profile.profileImage ? this.formatImageUrl(profile.profileImage) : this.formatImageUrl(this.defaultImage);
        const updatedProfile = { ...profile, profileImage: fullProfileImage };
        this.currentUserProfileSubject.next(updatedProfile);
        return updatedProfile;
      }),
      catchError(err => {
        // console.error('[ProfileService] getCurrentUserProfile: Error fetching profile', err);
        if (err.status === 401) {
          this.currentUserProfileSubject.next(this.fallbackUserProfile);
          // console.warn('[ProfileService] getCurrentUserProfile: Unauthorized, returning fallback.');
        }
        return of(this.fallbackUserProfile);
      })
    );
  }

  getUserProfile(userId: number): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/${userId}`, { headers: this.authService.getAuthHeaders() }).pipe(
      map(profile => ({
        ...profile,
        profileImage: this.formatImageUrl(profile.profileImage)
      })),
      catchError(error => {
        // console.error(`[ProfileService] getUserProfile: Error fetching profile for user ${userId}`, error);
        // Return a more generic fallback or rethrow, depending on desired behavior
        return of({ ...this.fallbackUserProfile, id: userId, username: `User ${userId}` });
      })
    );
  }

  uploadProfileImage(imageFile: File): Observable<{ profileImage: string }> {
    return this.compressImage(imageFile).pipe(
      mergeMap(base64Image => {
        return this.http.post<{ filePath: string }>( // Expect filePath in response
          `${this.apiUrl}/image`,
          { profileImage: base64Image },
          { headers: this.authService.getAuthHeaders() }
        );
      }),
      tap(response => {
        // console.warn('[ProfileService] uploadProfileImage response:', response);
        if (response && response.filePath) {
          const currentProfile = this.currentUserProfileSubject.value;
          if (currentProfile) {
            this.currentUserProfileSubject.next({ ...currentProfile, profileImage: this.formatImageUrl(response.filePath) });
          }
        }
      }),
      map(response => ({
        profileImage: this.formatImageUrl(response.filePath)
      })),
      catchError(error => {
        // console.error('[ProfileService] uploadProfileImage: Error', error);
        return throwError(() => new Error('Falha ao fazer upload da imagem de perfil.'));
      })
    );
  }

  uploadProfileImageBase64(base64Image: string): Observable<{ profileImage: string }> {
    return this.http.post<{ filePath: string }>( // Expect filePath in response
      `${this.apiUrl}/image`,
      { profileImage: base64Image },
      { headers: this.authService.getAuthHeaders() }
    ).pipe(
      tap(response => {
        // console.warn('[ProfileService] uploadProfileImageBase64 response:', response);
        if (response && response.filePath) {
          const currentProfile = this.currentUserProfileSubject.value;
          if (currentProfile) {
            this.currentUserProfileSubject.next({ ...currentProfile, profileImage: this.formatImageUrl(response.filePath) });
          }
        }
      }),
      map(response => ({
        profileImage: this.formatImageUrl(response.filePath)
      })),
      catchError(error => {
        // console.error('[ProfileService] uploadProfileImageBase64: Error', error);
        return throwError(() => new Error('Falha ao fazer upload da imagem de perfil.'));
      })
    );
  }

  removeProfileImage(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/image`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap(() => {
        const currentProfile = this.currentUserProfileSubject.value;
        if (currentProfile) {
          this.currentUserProfileSubject.next({ ...currentProfile, profileImage: 'assets/images/user.png' }); // Use local asset path for default
        }
      }),
      map(() => ({ // Return a generic success or specific data if needed
        profileImage: 'assets/images/user.png' // Use local asset path for default
      })),
      catchError(error => {
        // console.error('[ProfileService] removeProfileImage: Error', error);
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

  // base64ToBlob can be kept if used elsewhere, or removed if not.
  // private base64ToBlob(base64: string, type = 'application/octet-stream') { ... }
}
