import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { GuestService } from '../../services/guest.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-welcome-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './welcome-dialog.component.html',
  styleUrl: './welcome-dialog.component.css'
})
export class WelcomeDialogComponent {
  nicknameForm: FormGroup;
  showNicknameForm = false;
  isSubmitting = false;

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private guestService: GuestService,
    private authService: AuthService
  ) {
    this.nicknameForm = this.fb.group({
      nickname: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]]
    });
  }

  onLogin() {
    this.router.navigate(['/auth'], { state: { mode: 'login' } });
  }

  onGuestWithNickname() {
    this.showNicknameForm = true;
  }

  onGuestAnonymous() {
    this.guestService.setGuestNickname('Anônimo');
    this.close();
  }

  onSubmitNickname() {
    if (this.nicknameForm.valid) {
      const nickname = this.nicknameForm.value.nickname;
      this.guestService.setGuestNickname(nickname);
      this.close();
    }
  }

  private close() {
    this.router.navigate(['/']);
  }
}
