import { Injectable } from '@angular/core';
import { FrontendUserReward } from '../models/chat/chat.interface';

@Injectable({
  providedIn: 'root'
})
export class RewardDisplayService {

  constructor() { }  /**
   * Get the top rewards to display next to usernames (usually 1-3 most prestigious)
   */
  getTopRewardsForDisplay(userRewards: FrontendUserReward[], maxCount: number = 2): FrontendUserReward[] {
    if (!userRewards || userRewards.length === 0) {
      return [];
    }

    // Filter out rewards with invalid structure first
    const validRewards = userRewards.filter(reward =>
      reward && reward.reward && reward.reward.milestone
    );

    if (validRewards.length === 0) {
      return [];
    }

    // Sort by milestone value (descending) to get most prestigious first
    return validRewards
      .sort((a, b) => {
        const milestoneA = this.getMilestoneValue(a.reward.milestone);
        const milestoneB = this.getMilestoneValue(b.reward.milestone);
        return milestoneB - milestoneA;
      })
      .slice(0, maxCount);
  }
  /**
   * Convert milestone text to numeric value for sorting
   */
  private getMilestoneValue(milestone: string): number {
    if (!milestone) {
      return 0;
    }

    const milestoneMap: { [key: string]: number } = {
      'Primeira Conexão': 1,
      '24 Horas': 2,
      '2 Semanas': 3,
      '30 Dias': 4,
      '90 Dias': 5,
      '6 Meses': 6,
      '1 Ano': 7,
      '2 Anos': 8,
      '3 Anos': 9,
      '5 Anos': 10,
      '10 Anos': 11,
      '15 Anos': 12,
      '20 Anos': 13
    };
    return milestoneMap[milestone] || 0;
  }/**
   * Get reward color based on milestone
   */
  getRewardColor(milestone: string): string {
    if (!milestone) {
      return '#95a5a6'; // Gray for unknown/invalid milestone
    }

    const milestoneValue = this.getMilestoneValue(milestone);

    if (milestoneValue >= 10) return '#9b59b6'; // Purple for legendary (5+ years)
    if (milestoneValue >= 7) return '#f39c12'; // Gold for high tier (1+ years)
    if (milestoneValue >= 5) return '#e74c3c'; // Red for mid-high tier (90+ days)
    if (milestoneValue >= 3) return '#3498db'; // Blue for mid tier (2+ weeks)
    if (milestoneValue >= 2) return '#27ae60'; // Green for low-mid tier (24+ hours)
    return '#95a5a6'; // Gray for basic tier
  }

  /**
   * Get reward icon based on reward name or milestone
   */
  getRewardIcon(rewardName: string, milestone: string): string {
    const name = rewardName.toLowerCase();
    const milestoneNum = parseInt(milestone) || 0;

    // Specific reward type icons
    if (name.includes('pioneer') || name.includes('primeiro')) return '🚀';
    if (name.includes('commentator') || name.includes('comentar')) return '💬';
    if (name.includes('social') || name.includes('social')) return '🤝';
    if (name.includes('creator') || name.includes('criar')) return '✨';
    if (name.includes('veteran') || name.includes('veteran')) return '🏅';
    if (name.includes('expert') || name.includes('expert')) return '🎯';
    if (name.includes('master') || name.includes('mestre')) return '👑';
    if (name.includes('legend') || name.includes('lenda')) return '🌟';

    // Milestone-based icons
    if (milestoneNum >= 1000) return '💎';
    if (milestoneNum >= 500) return '🏆';
    if (milestoneNum >= 100) return '🥇';
    if (milestoneNum >= 50) return '🥈';
    if (milestoneNum >= 10) return '🥉';

    return '🎖️'; // Default
  }
  /**
   * Check if user has specific type of reward
   */
  hasRewardType(userRewards: FrontendUserReward[], rewardType: string): boolean {
    if (!userRewards || userRewards.length === 0 || !rewardType) {
      return false;
    }
    return userRewards.some(ur =>
      ur && ur.reward && ur.reward.name &&
      ur.reward.name.toLowerCase().includes(rewardType.toLowerCase())
    );
  }
  /**
   * Get highest milestone achieved
   */
  getHighestMilestone(userRewards: FrontendUserReward[]): number {
    if (!userRewards || userRewards.length === 0) return 0;

    return Math.max(...userRewards
      .filter(ur => ur && ur.reward && ur.reward.milestone)
      .map(ur => this.getMilestoneValue(ur.reward.milestone))
    );
  }
  /**
   * Format reward display text for tooltips
   */
  formatRewardTooltip(userReward: FrontendUserReward): string {
    if (!userReward || !userReward.reward) {
      return 'Reward information unavailable';
    }
    return `${userReward.reward.name || 'Unknown'} - Marco: ${userReward.reward.milestone || 'Unknown'}`;
  }

  /**
   * Get user's reward tier based on their achievements
   */
  getUserTier(userRewards: FrontendUserReward[]): { name: string, color: string, icon: string } {
    const highestMilestone = this.getHighestMilestone(userRewards);
    const rewardCount = userRewards.length;

    if (highestMilestone >= 1000 || rewardCount >= 10) {
      return { name: 'Lendário', color: '#9b59b6', icon: '👑' };
    }
    if (highestMilestone >= 500 || rewardCount >= 7) {
      return { name: 'Mestre', color: '#f39c12', icon: '🏆' };
    }
    if (highestMilestone >= 100 || rewardCount >= 5) {
      return { name: 'Expert', color: '#e74c3c', icon: '🥇' };
    }
    if (highestMilestone >= 50 || rewardCount >= 3) {
      return { name: 'Veterano', color: '#3498db', icon: '🥈' };
    }
    if (highestMilestone >= 10 || rewardCount >= 1) {
      return { name: 'Iniciante', color: '#27ae60', icon: '🥉' };
    }

    return { name: 'Novato', color: '#95a5a6', icon: '🎖️' };
  }
}
