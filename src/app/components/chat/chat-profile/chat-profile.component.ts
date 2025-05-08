import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { ProfileService, UserProfile } from '../../../services/profile.service';

@Component({
  selector: 'app-chat-profile',
  templateUrl: './chat-profile.component.html',
  styleUrls: ['./chat-profile.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class ChatProfileComponent implements OnInit {
  username: string = '';
  profileImage: string | null = null;
  defaultImage: string = 'data:image/png;base64,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';  // Incorporando uma imagem base64
  isUploading: boolean = false;
  uploadError: string | null = null;
  showProfileOptions: boolean = false;
  showEnlargedImage: boolean = false;
  userProfile: UserProfile | null = null;

  constructor(
    private authService: AuthService,
    private profileService: ProfileService
  ) { }

  ngOnInit(): void {
    // Obtém o nome de usuário e foto de perfil do serviço
    this.loadUserProfile();
  }

  loadUserProfile(): void {
    this.profileService.getCurrentUserProfile().subscribe({
      next: (profile) => {
        this.userProfile = profile;
        this.username = profile.username;
        
        if (profile.profileImage) {
          // Corrigir o caminho da imagem para usar a URL base correta
          this.profileImage = this.formatImageUrl(profile.profileImage);
        } else {
          // Se não tiver imagem no perfil, tenta usar a versão local (caso tenha)
          const savedImage = localStorage.getItem('user_profile_image');
          if (savedImage) {
            this.uploadProfileImageFromLocalStorage(savedImage);
          }
        }
      },
      error: (error) => {
        console.error('Erro ao carregar perfil:', error);
        // Caso haja erro, tenta usar o nome de usuário do AuthService
        this.username = this.authService.getUsername() || 'Usuário';
        
        // E tenta carregar a imagem do localStorage como fallback
        const savedImage = localStorage.getItem('user_profile_image');
        if (savedImage) {
          this.profileImage = savedImage;
        }
      }
    });
  }

  // Método para garantir que a URL da imagem tenha o formato correto
  formatImageUrl(imagePath: string): string {
    if (!imagePath) return '';
    
    // Se o caminho for vazio, usar imagem padrão
    if (imagePath === '') return this.defaultImage;
    
    // Se o caminho já começar com http(s), não modificar
    if (imagePath.startsWith('http')) return imagePath;
    
    // Se o caminho for uma imagem base64, não modificar
    if (imagePath.startsWith('data:')) return imagePath;
    
    // Se não começar com barra, adicionar
    if (!imagePath.startsWith('/')) {
      imagePath = '/' + imagePath;
    }
    
    // Obter origem do documento atual (para usar na URL absoluta)
    const origin = document.location.origin;
    
    // Usar a porta 3001 para acessar o backend
    const apiOrigin = origin.replace(/-4200\./, '-3001.');
    
    // Para debug
    console.log(`[PROFILE] Formatando URL de imagem: ${imagePath} -> ${apiOrigin}${imagePath}`);
    
    // Retornar URL completa
    return `${apiOrigin}${imagePath}`;
  }

  // Upload da imagem armazenada no localStorage para o servidor
  uploadProfileImageFromLocalStorage(imageBase64: string): void {
    this.isUploading = true;
    
    this.profileService.uploadProfileImageBase64(imageBase64).subscribe({
      next: (response) => {
        this.profileImage = response.profileImage;
        localStorage.removeItem('user_profile_image'); // Remove do localStorage após o upload
        this.isUploading = false;
      },
      error: (error) => {
        console.error('Erro ao enviar imagem para o servidor:', error);
        // Mantém a imagem do localStorage como fallback
        this.profileImage = imageBase64;
        this.isUploading = false;
      }
    });
  }

  toggleProfileOptions(): void {
    this.showProfileOptions = !this.showProfileOptions;
    // Ao fechar as opções, também fechamos a visualização ampliada
    if (!this.showProfileOptions) {
      this.showEnlargedImage = false;
    }
  }

  // Nova função para visualização ampliada
  toggleEnlargedImage(event: Event): void {
    if (this.profileImage) {
      event.stopPropagation(); // Para não fechar as opções do perfil ao clicar na imagem
      this.showEnlargedImage = !this.showEnlargedImage;
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Verifica o tipo de arquivo
      if (!file.type.match(/image\/(jpeg|jpg|png|gif)/)) {
        this.uploadError = 'O arquivo deve ser uma imagem (JPEG, PNG ou GIF).';
        return;
      }
      
      // Limita o tamanho do arquivo (5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.uploadError = 'A imagem deve ter menos de 5MB.';
        return;
      }

      this.uploadError = null;
      this.isUploading = true;
      
      // Usa o serviço de perfil para fazer o upload da imagem com compressão
      this.profileService.uploadProfileImage(file).subscribe({
        next: (response) => {
          this.profileImage = response.profileImage;
          this.isUploading = false;
          this.showProfileOptions = false;
          
          // Limpa qualquer imagem salva localmente
          localStorage.removeItem('user_profile_image');
        },
        error: (error) => {
          console.error('Erro ao fazer upload da imagem:', error);
          this.uploadError = 'Falha ao enviar imagem. Tente novamente.';
          this.isUploading = false;
          
          // Falha no upload para o servidor - salva temporariamente no localStorage como fallback
          this.saveImageToLocalStorage(file);
        }
      });
    }
  }

  // Salva a imagem no localStorage como fallback se o servidor falhar
  private saveImageToLocalStorage(file: File): void {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const imageBase64 = reader.result as string;
      localStorage.setItem('user_profile_image', imageBase64);
      this.profileImage = imageBase64;
    };
  }

  removeProfileImage(): void {
    this.isUploading = true;
    
    // Remove a imagem do servidor
    this.profileService.removeProfileImage().subscribe({
      next: () => {
        this.profileImage = null;
        localStorage.removeItem('user_profile_image');
        this.isUploading = false;
        this.showProfileOptions = false;
      },
      error: (error) => {
        console.error('Erro ao remover imagem de perfil:', error);
        this.uploadError = 'Erro ao remover imagem. Tente novamente.';
        this.isUploading = false;
        
        // Como fallback, remove apenas do localStorage
        localStorage.removeItem('user_profile_image');
        this.profileImage = null;
      }
    });
  }
}