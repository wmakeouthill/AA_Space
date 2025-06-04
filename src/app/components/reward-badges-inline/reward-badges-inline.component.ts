import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FrontendUserReward } from '../../models/chat/chat.interface';
import { RewardDisplayService } from '../../services/reward-display.service';

@Component({
  selector: 'app-reward-badges-inline',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reward-badges-inline.component.html',
  styleUrls: ['./reward-badges-inline.component.css']
})
export class RewardBadgesInlineComponent {
  @Input() userRewards: FrontendUserReward[] = [];
  @Input() maxBadges: number = 2;
  @Input() showTooltip: boolean = true;

  constructor(private rewardDisplayService: RewardDisplayService) {}

  getTopRewards(): FrontendUserReward[] {
    return this.rewardDisplayService.getTopRewardsForDisplay(this.userRewards, this.maxBadges);
  }

  getRewardIcon(reward: FrontendUserReward): string {
    return this.rewardDisplayService.getRewardIcon(reward.reward.name, reward.reward.milestone);
  }

  getRewardColor(reward: FrontendUserReward): string {
    return this.rewardDisplayService.getRewardColor(reward.reward.milestone);
  }

  getTooltipText(reward: FrontendUserReward): string {
    return this.rewardDisplayService.formatRewardTooltip(reward);
  }

  hasRewards(): boolean {
    return this.userRewards && this.userRewards.length > 0;
  }

  getExtraCount(): number {
    return Math.max(0, this.userRewards.length - this.maxBadges);
  }
}
