import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FrontendUserReward } from '../../models/chat/chat.interface';

@Component({
  selector: 'app-reward-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reward-badge.component.html',
  styleUrls: ['./reward-badge.component.css']
})
export class RewardBadgeComponent {
  @Input() userReward!: FrontendUserReward;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() showDetails: boolean = false;
  @Input() showTooltip: boolean = true;

  getRewardIcon(): string {
    // Map different types of rewards to emojis
    const rewardName = this.userReward.reward.name.toLowerCase();

    if (rewardName.includes('pioneer') || rewardName.includes('primeiro')) return '🚀';
    if (rewardName.includes('commentator') || rewardName.includes('comentar')) return '💬';
    if (rewardName.includes('social') || rewardName.includes('social')) return '🤝';
    if (rewardName.includes('creator') || rewardName.includes('criar')) return '✨';
    if (rewardName.includes('veteran') || rewardName.includes('veteran')) return '🏅';
    if (rewardName.includes('expert') || rewardName.includes('expert')) return '🎯';
    if (rewardName.includes('master') || rewardName.includes('mestre')) return '👑';
    if (rewardName.includes('legend') || rewardName.includes('lenda')) return '🌟';

    // Default icons based on milestone numbers
    const milestone = parseInt(this.userReward.reward.milestone);
    if (milestone >= 1000) return '💎';
    if (milestone >= 500) return '🏆';
    if (milestone >= 100) return '🥇';
    if (milestone >= 50) return '🥈';
    if (milestone >= 10) return '🥉';

    return '🎖️'; // Default reward icon
  }

  getRewardColor(): string {
    const milestone = parseInt(this.userReward.reward.milestone);
    if (milestone >= 1000) return '#9b59b6'; // Purple for legendary
    if (milestone >= 500) return '#f39c12'; // Gold for high tier
    if (milestone >= 100) return '#e74c3c'; // Red for mid-high tier
    if (milestone >= 50) return '#3498db'; // Blue for mid tier
    if (milestone >= 10) return '#27ae60'; // Green for low-mid tier
    return '#95a5a6'; // Gray for basic tier
  }

  getTooltipText(): string {
    return `${this.userReward.reward.name} - Marco: ${this.userReward.reward.milestone}`;
  }
}
