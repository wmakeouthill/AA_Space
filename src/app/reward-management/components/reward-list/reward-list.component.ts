import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Reward, ApiService } from '../../../services/api.service'; // Usando ApiService centralizado

@Component({
  selector: 'app-reward-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './reward-list.component.html',
  styleUrl: './reward-list.component.css'
})
export class RewardListComponent implements OnInit {
  rewards$: Observable<Reward[]>;
  error: string | null = null;
  successMessage: string | null = null;

  // Formulários para as novas funcionalidades
  clearRewardsForm: FormGroup;
  removeRewardForm: FormGroup;
  userRewards: any[] = [];

  // Estados de loading
  isLoadingClear = false;
  isLoadingRemove = false;
  isLoadingUserRewards = false;

  constructor(
    private apiService: ApiService,
    private fb: FormBuilder
  ) {
    this.rewards$ = of([]);

    // Inicializar formulários
    this.clearRewardsForm = this.fb.group({
      username: ['', Validators.required]
    });

    this.removeRewardForm = this.fb.group({
      username: ['', Validators.required],
      rewardId: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadRewards();
  }
  loadRewards(): void {
    this.error = null;
    this.rewards$ = this.apiService.getAllRewards().pipe(
      catchError(err => {
        console.warn('Error loading rewards:', err);
        this.error = 'Falha ao carregar as recompensas. Tente novamente mais tarde.';
        return of([]);
      })
    );
  }

  // Buscar recompensas de um usuário específico
  searchUserRewards(): void {
    const username = this.removeRewardForm.get('username')?.value;
    if (!username) {
      this.error = 'Por favor, insira um username para buscar as recompensas.';
      return;
    }

    this.isLoadingUserRewards = true;
    this.error = null;
    this.successMessage = null;

    this.apiService.getUserRewardsByUsername(username).subscribe({
      next: (rewards) => {
        this.userRewards = rewards;
        this.isLoadingUserRewards = false;
        if (rewards.length === 0) {
          this.error = `O usuário ${username} não possui recompensas.`;
        }
      },
      error: (err) => {
        console.warn('Error loading user rewards:', err);
        this.error = 'Falha ao carregar recompensas do usuário: ' + (err.error?.message || err.message);
        this.userRewards = [];
        this.isLoadingUserRewards = false;
      }
    });
  }

  // Zerar todas as recompensas de um usuário
  clearUserRewards(): void {
    if (this.clearRewardsForm.invalid) {
      this.error = 'Por favor, preencha o username corretamente.';
      return;
    }

    const username = this.clearRewardsForm.get('username')?.value;

    if (!confirm(`Tem certeza que deseja zerar TODAS as recompensas do usuário "${username}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    this.isLoadingClear = true;
    this.error = null;
    this.successMessage = null;

    this.apiService.clearUserRewards(username).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.clearRewardsForm.reset();
        this.isLoadingClear = false;
      },
      error: (err) => {
        console.warn('Error clearing user rewards:', err);
        this.error = 'Falha ao zerar recompensas: ' + (err.error?.message || err.message);
        this.isLoadingClear = false;
      }
    });
  }

  // Remover uma recompensa específica
  removeSpecificReward(rewardId: number): void {
    const username = this.removeRewardForm.get('username')?.value;

    const reward = this.userRewards.find(ur => ur.reward.id === rewardId);
    const rewardName = reward ? reward.reward.name : 'esta recompensa';

    if (!confirm(`Tem certeza que deseja remover "${rewardName}" do usuário "${username}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    this.isLoadingRemove = true;
    this.error = null;
    this.successMessage = null;

    this.apiService.removeUserReward(username, rewardId).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.searchUserRewards(); // Recarregar a lista de recompensas do usuário
        this.isLoadingRemove = false;
      },
      error: (err) => {
        console.warn('Error removing user reward:', err);
        this.error = 'Falha ao remover recompensa: ' + (err.error?.message || err.message);
        this.isLoadingRemove = false;
      }
    });  }
}
