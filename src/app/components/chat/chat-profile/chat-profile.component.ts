import { Component, OnDestroy, OnInit, ViewChild, ElementRef, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { ProfileService } from '../../../services/profile.service';

@Component({
  selector: 'app-chat-profile',
  templateUrl: './chat-profile.component.html',
  styleUrls: ['./chat-profile.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class ChatProfileComponent implements OnInit, OnDestroy {
  profileImage: string | null = null;
  defaultImage = 'assets/images/user.png';
  username: string = 'Nome do Usuário';
  isUploading = false;
  error: string | null = null;
  showEnlargedImage = false;
  showProfileMenu = false;

  private userInfoSubscription!: Subscription;

  @ViewChild('profileImageInput') profileImageInput!: ElementRef<HTMLInputElement>;
  @ViewChild('avatarMenu') avatarMenu!: ElementRef;
  @ViewChild('clickableProfileImage') clickableProfileImage!: ElementRef<HTMLImageElement>;

  constructor(
    private authService: AuthService,
    private profileService: ProfileService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.userInfoSubscription = this.authService.getUserInfo().subscribe({
      next: (user) => {
        if (user && user.id) {
          this.username = user.username;
          this.loadProfileImage();
        } else {
          this.username = 'Convidado';
          this.profileImage = this.defaultImage;
          this.cdr.detectChanges();
        }
      },
      error: () => {
        this.username = 'Convidado';
        this.profileImage = this.defaultImage;
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.userInfoSubscription) {
      this.userInfoSubscription.unsubscribe();
    }
  }

  loadProfileImage(): void {
    this.profileService.getCurrentUserProfile().subscribe({
      next: (profile) => {
        if (profile && profile.profileImage && !this.profileService.isDefaultImage(profile.profileImage)) {
          this.profileImage = profile.profileImage;
        } else {
          this.profileImage = this.defaultImage;
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.profileImage = this.defaultImage;
        this.cdr.detectChanges();
      }
    });
  }

  hasCustomProfileImage(): boolean {
    return !!this.profileImage && this.profileImage !== this.defaultImage;
  }

  toggleProfileMenu(event: MouseEvent): void {
    event.stopPropagation();
    console.log('[ChatProfileComponent] toggleProfileMenu. Current showProfileMenu:', this.showProfileMenu);
    this.showProfileMenu = !this.showProfileMenu;
    console.log('[ChatProfileComponent] New showProfileMenu:', this.showProfileMenu);
    this.cdr.detectChanges();
    if (this.showProfileMenu) {
      console.log('[ChatProfileComponent] Menu is intended to be open. Pausing with debugger...');
      // debugger; // PAUSE HERE WHEN MENU SHOULD BE OPEN - Commented out for now
    }
    console.log('[ChatProfileComponent] Exiting toggleProfileMenu. Final showProfileMenu:', this.showProfileMenu);
  }

  /*
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // If the menu isn't even supposed to be open, do nothing.
    if (!this.showProfileMenu) {
      return;
    }

    const clickedElement = event.target as HTMLElement;

    // Check if ViewChild references are available
    if (!this.clickableProfileImage || !this.clickableProfileImage.nativeElement ||
        !this.avatarMenu || !this.avatarMenu.nativeElement) {
      console.warn('[ChatProfileComponent] onDocumentClick: ViewChild elements not ready, but showProfileMenu is true. Target:', clickedElement);
      return;
    }

    const avatarImageElement = this.clickableProfileImage.nativeElement;
    const menuElement = this.avatarMenu.nativeElement;

    const isClickOnAvatarImage = avatarImageElement.contains(clickedElement);
    const isClickOnMenu = menuElement.contains(clickedElement);

    console.log(`[ChatProfileComponent] onDocumentClick: showProfileMenu=${this.showProfileMenu}, clickOnImage=${isClickOnAvatarImage}, clickOnMenu=${isClickOnMenu}, target=${clickedElement.tagName}, imageElem=${avatarImageElement.tagName}, menuElem=${menuElement.tagName}`);

    if (isClickOnAvatarImage) {
      console.log('[ChatProfileComponent] Click detected on avatar image. toggleProfileMenu should have handled this.');
      return;
    }

    if (isClickOnMenu) {
      console.log('[ChatProfileComponent] Click detected inside avatar menu. Menu\'s own stopPropagation should have handled this.');
      return;
    }

    console.log('[ChatProfileComponent] Document click detected outside menu and image. Closing menu.');
    this.showProfileMenu = false;
    this.cdr.detectChanges();
  }
  */

  selectProfileImageFile(): void {
    this.profileImageInput.nativeElement.click();
    this.showProfileMenu = false;
  }

  viewEnlargedImage(): void {
    if (this.hasCustomProfileImage()) {
      this.showEnlargedImage = true;
      this.showProfileMenu = false;
    }
  }

  onFileSelected(event: Event): void {
    const element = event.target as HTMLInputElement;
    if (element.files && element.files[0]) {
      const file = element.files[0];
      this.isUploading = true;
      this.error = null;
      this.showProfileMenu = false;

      const reader = new FileReader();
      reader.onload = (e: any) => {
        const base64Image = e.target.result as string;
        this.profileService.uploadProfileImageBase64(base64Image).subscribe({
          next: (response) => {
            this.isUploading = false;
            if (response && response.profileImage) {
              this.profileImage = response.profileImage;
            }
            console.log('Imagem de perfil enviada com sucesso:', response);
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.isUploading = false;
            this.error = 'Erro ao enviar imagem. Tente novamente.';
            console.error('Erro ao enviar imagem de perfil:', err);
            this.cdr.detectChanges();
          }
        });
      };
      reader.readAsDataURL(file);
      element.value = '';
    }
  }

  removeProfileImage(): void {
    this.isUploading = true;
    this.error = null;
    this.showProfileMenu = false;

    this.profileService.removeProfileImage().subscribe({
      next: (response) => {
        this.isUploading = false;
        this.profileImage = this.defaultImage;
        console.log('Imagem de perfil removida com sucesso.');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isUploading = false;
        this.error = 'Erro ao remover imagem. Tente novamente.';
        console.error('Erro ao remover imagem de perfil:', err);
        this.cdr.detectChanges();
      }
    });
  }

  toggleEnlargedImage(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.showEnlargedImage = !this.showEnlargedImage;
  }
}
