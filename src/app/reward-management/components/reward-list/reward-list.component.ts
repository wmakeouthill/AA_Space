import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Reward, RewardApiService } from '../../services/reward-api.service'; // Ajuste o caminho se necessário

@Component({
  selector: 'app-reward-list',
  standalone: true, // Certifique-se de que é standalone
  imports: [CommonModule, RouterLink], // CommonModule para *ngIf, *ngFor, async pipe
  templateUrl: './reward-list.component.html',
  styleUrl: './reward-list.component.css'
})
export class RewardListComponent implements OnInit {
  rewards$: Observable<Reward[]>;
  error: string | null = null;

  constructor(private rewardApiService: RewardApiService) {
    this.rewards$ = of([]); // Inicialização padrão
  }

  ngOnInit(): void {
    this.loadRewards();
  }

  loadRewards(): void {
    this.error = null;
    this.rewards$ = this.rewardApiService.getAllRewards().pipe(
      catchError(err => {
        console.warn('Error loading rewards:', err); // Changed to console.warn
        this.error = 'Falha ao carregar as recompensas. Tente novamente mais tarde.';
        return of([]); // Retorna um array vazio em caso de erro para o async pipe não quebrar
      })
    );
  }

  // Opcional: Método para acionar o seed de recompensas (se houver um botão para isso)
  seedInitialRewards(): void {
    this.rewardApiService.seedRewards().subscribe({
      next: () => {
        alert('Recompensas iniciais semeadas com sucesso!');
        this.loadRewards(); // Recarrega a lista
      },
      error: (err) => {
        console.warn('Error seeding rewards:', err); // Changed to console.warn
        alert('Falha ao semear recompensas: ' + (err.error?.message || err.message));
      }
    });
  }
}
