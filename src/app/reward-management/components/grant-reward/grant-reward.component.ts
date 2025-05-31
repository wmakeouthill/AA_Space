import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Reward, RewardApiService } from '../../services/reward-api.service';

@Component({
  selector: 'app-grant-reward',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './grant-reward.component.html',
  styleUrls: ['./grant-reward.component.css']
})
export class GrantRewardComponent implements OnInit {
  grantRewardForm: FormGroup;
  rewards$: Observable<Reward[]>;
  successMessage: string | null = null;
  errorMessage: string | null = null;
  isLoadingRewards = false;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private rewardApiService: RewardApiService
  ) {
    this.grantRewardForm = this.fb.group({
      userId: ['', [Validators.required, Validators.pattern(/^[0-9]+$/)]],
      rewardId: ['', Validators.required]
    });
    this.rewards$ = of([]);
  }

  ngOnInit(): void {
    this.loadRewards();
  }

  loadRewards(): void {
    this.isLoadingRewards = true;
    this.rewards$ = this.rewardApiService.getAllRewards().pipe(
      tap(() => this.isLoadingRewards = false),
      catchError(err => {
        console.warn('Erro ao carregar recompensas:', err); // Changed to console.warn
        this.errorMessage = 'Falha ao carregar a lista de recompensas.';
        this.isLoadingRewards = false;
        return of([]);
      })
    );
  }

  onSubmit(): void {
    this.successMessage = null;
    this.errorMessage = null;

    if (this.grantRewardForm.invalid) {
      this.errorMessage = 'Formulário inválido. Verifique os campos.';
      return;
    }

    this.isSubmitting = true;
    const { userId, rewardId } = this.grantRewardForm.value;

    this.rewardApiService.grantRewardToUser(Number(userId), Number(rewardId)).subscribe({
      next: (response) => {
        this.successMessage = `Recompensa "${response.reward.name}" concedida com sucesso ao usuário ID ${userId}!`;
        this.grantRewardForm.reset();
        this.isSubmitting = false;
      },
      error: (err) => {
        console.warn('Erro ao conceder recompensa:', err); // Changed to console.warn
        if (err.status === 404) {
          this.errorMessage = err.error?.message || 'Usuário ou recompensa não encontrado.';
        } else if (err.status === 409) {
          this.errorMessage = err.error?.message || 'O usuário já possui esta recompensa.';
        } else {
          this.errorMessage = 'Falha ao conceder recompensa. ' + (err.error?.message || 'Tente novamente mais tarde.');
        }
        this.isSubmitting = false;
      }
    });
  }
}
