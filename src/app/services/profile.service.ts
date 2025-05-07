import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';
import { ApiService } from './api.service';

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

  constructor(
    private http: HttpClient,
    private apiService: ApiService
  ) {
    const baseApiUrl = (this.apiService as any).API_URL;
    this.apiUrl = `${baseApiUrl}/profile`;
    console.log('ProfileService usando URL da API:', this.apiUrl);
  }

  // Obter perfil do usuário atual
  getCurrentUserProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/me`).pipe(
      catchError(error => {
        console.error('Erro ao buscar perfil de usuário:', error);
        return throwError(() => new Error('Falha ao buscar perfil de usuário.'));
      })
    );
  }

  // Obter perfil de um usuário por ID
  getUserProfile(userId: number): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/${userId}`).pipe(
      catchError(error => {
        console.error('Erro ao buscar perfil de usuário:', error);
        return throwError(() => new Error('Falha ao buscar perfil de usuário.'));
      })
    );
  }

  // Upload de imagem de perfil com compressão
  uploadProfileImage(imageFile: File): Observable<{ profileImage: string }> {
    return this.compressImage(imageFile).pipe(
      map(compressedImage => ({ profileImage: compressedImage })),
      mergeMap(imageData => this.http.post<any>(`${this.apiUrl}/image`, imageData)),
      catchError(error => {
        console.error('Erro ao upload de imagem de perfil:', error);
        return throwError(() => new Error('Falha ao fazer upload da imagem de perfil.'));
      })
    );
  }

  // Upload de imagem de perfil diretamente como base64
  uploadProfileImageBase64(base64Image: string): Observable<{ profileImage: string }> {
    return this.http.post<any>(`${this.apiUrl}/image`, { profileImage: base64Image }).pipe(
      catchError(error => {
        console.error('Erro ao upload de imagem de perfil:', error);
        return throwError(() => new Error('Falha ao fazer upload da imagem de perfil.'));
      })
    );
  }

  // Remover imagem de perfil
  removeProfileImage(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/image`).pipe(
      catchError(error => {
        console.error('Erro ao remover imagem de perfil:', error);
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
          // Define a qualidade e tamanho máximo
          const maxWidth = 800;
          const maxHeight = 800;
          const quality = 0.7; // 70% de qualidade, bom equilíbrio
          
          // Calcula as dimensões para redimensionar
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          
          // Cria canvas para comprimir a imagem
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            observer.error(new Error('Não foi possível criar contexto de canvas'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Converte para formato comprimido
          const compressedImage = canvas.toDataURL('image/jpeg', quality);
          
          // Verifica o tamanho final em bytes (aproximado)
          const byteSize = Math.round((compressedImage.length * 3) / 4) - 
                          (compressedImage.endsWith('==') ? 2 : compressedImage.endsWith('=') ? 1 : 0);
          
          console.log('Tamanho comprimido:', Math.round(byteSize / 1024), 'KB');
          
          observer.next(compressedImage);
          observer.complete();
        };
        
        img.onerror = error => {
          observer.error(new Error('Erro ao carregar imagem para compressão'));
        };
      };
      
      reader.onerror = error => {
        observer.error(new Error('Erro ao ler arquivo de imagem'));
      };
    });
  }
}