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
  defaultImage: string = 'assets/images/user.png';
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
          this.profileImage = profile.profileImage;
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