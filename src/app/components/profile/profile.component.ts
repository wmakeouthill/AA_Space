import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileService, UserProfile } from '../../services/profile.service';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { RewardBadgeComponent } from '../reward-badge/reward-badge.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RewardBadgeComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, OnDestroy {
  userProfile$: Observable<UserProfile | null>;
  private destroy$ = new Subject<void>();

  constructor(private profileService: ProfileService) {
    this.userProfile$ = this.profileService.currentUserProfile$;
  }

  ngOnInit(): void {
    // Load current user profile if not already loaded
    this.profileService.getCurrentUserProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  getRewardCount(userProfile: UserProfile | null): number {
    return userProfile?.userRewards?.length || 0;
  }

  hasRewards(userProfile: UserProfile | null): boolean {
    return (userProfile?.userRewards?.length || 0) > 0;
  }

  getLatestReward(userProfile: UserProfile | null) {
    if (!userProfile?.userRewards || userProfile.userRewards.length === 0) {
      return null;
    }

    // Ordenar por data (mais recente primeiro) e retornar o primeiro
    const sortedRewards = [...userProfile.userRewards].sort((a, b) =>
      new Date(b.dateEarned).getTime() - new Date(a.dateEarned).getTime()
    );

    return sortedRewards[0];
  }
}
