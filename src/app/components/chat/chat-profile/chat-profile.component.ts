import { Component, OnDestroy, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { ProfileService } from '../../../services/profile.service';
import { FrontendUserReward } from '../../../models/chat/chat.interface'; // Added import

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
  username: string = 'Nome do Usuário'; // Default value
  userRewards: FrontendUserReward[] = []; // Added to store user rewards
  isUploading = false;
  error: string | null = null;
  showEnlargedImage = false;
  showProfileMenu = false;

  private userInfoSubscription!: Subscription;

  @ViewChild('profileImageInput') profileImageInput!: ElementRef<HTMLInputElement>;
  @ViewChild('avatarMenu') avatarMenu!: ElementRef;
  @ViewChild('profileTrigger') profileTrigger!: ElementRef<HTMLElement>;

  constructor(
    private authService: AuthService,
    private profileService: ProfileService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.userInfoSubscription = this.authService.getUserInfo().subscribe({
      next: (user) => {
        if (user && user.id) {
          if (user.username) {
            this.username = user.username;
          } else {
            this.username = 'Usuário (sem nome)'; // Fallback if username is missing
          }
          this.loadProfileImage();
        } else {
          this.username = 'Convidado';
          this.profileImage = this.defaultImage;
        }
        this.cdr.detectChanges(); // Ensure UI updates
      },
      error: (err) => {
        this.username = 'Convidado';
        this.profileImage = this.defaultImage;
        this.cdr.detectChanges(); // Ensure UI updates
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
        if (profile && profile.userRewards) { // Added to load user rewards
          this.userRewards = profile.userRewards;
        } else {
          this.userRewards = [];
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.profileImage = this.defaultImage;
        this.userRewards = []; // Added to clear rewards on error
        this.cdr.detectChanges();
      }
    });
  }

  hasCustomProfileImage(): boolean {
    return !!this.profileImage && this.profileImage !== this.defaultImage;
  }

  toggleProfileMenu(event: MouseEvent): void {
    // [ChatProfileComponent] toggleProfileMenu CALLED
    event.stopPropagation();
    // [ChatProfileComponent] Current showProfileMenu before toggle: this.showProfileMenu
    this.showProfileMenu = !this.showProfileMenu;
    // [ChatProfileComponent] New showProfileMenu after toggle: this.showProfileMenu
    this.cdr.detectChanges(); // Ensure Angular picks up the change
    // [ChatProfileComponent] detectChanges called after toggle
  }

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
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.isUploading = false;
            this.error = 'Erro ao enviar imagem. Tente novamente.';
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
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isUploading = false;
        this.error = 'Erro ao remover imagem. Tente novamente.';
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
