import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Reward, ApiService } from '../../../services/api.service'; // Usando ApiService centralizado

@Component({
  selector: 'app-reward-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './reward-list.component.html',
  styleUrl: './reward-list.component.css'
})
export class RewardListComponent implements OnInit {
  rewards$: Observable<Reward[]>;
  error: string | null = null;

  constructor(private apiService: ApiService) {
    this.rewards$ = of([]);
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

  seedInitialRewards(): void {
    this.apiService.seedRewards().subscribe({
      next: () => {
        alert('Recompensas iniciais semeadas com sucesso!');
        this.loadRewards();
      },
      error: (err) => {
        console.warn('Error seeding rewards:', err);
        alert('Falha ao semear recompensas: ' + (err.error?.message || err.message));
      }
    });
  }
}
