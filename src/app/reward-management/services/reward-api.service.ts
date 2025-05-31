import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../../services/auth.service'; // Ajuste o caminho conforme necessário

// Definições de interface (podem ser movidas para um arquivo de modelos separado)
export interface Reward {
  id: number;
  milestone: string;
  name: string;
  designConcept: string;
  colorPalette: string;
  // Outros campos relevantes da recompensa
}

export interface UserReward {
  id: number;
  user_id: number;
  reward_id: number;
  awarded_at: Date;
  awardedByUserId: number;
  reward: Reward; // Detalhes da recompensa aninhados
}

@Injectable({
  providedIn: 'root' // Alterado para 'root' para ser um singleton, ou fornecido no RewardManagementModule
})
export class RewardApiService {
  private apiUrl = '/api/rewards'; // URL base da API de recompensas

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  getAllRewards(): Observable<Reward[]> {
    return this.http.get<Reward[]>(`${this.apiUrl}/`, {
      headers: this.getAuthHeaders()
    });
  }

  getUserRewards(userId: number): Observable<UserReward[]> {
    return this.http.get<UserReward[]>(`${this.apiUrl}/user/${userId}`, {
      headers: this.getAuthHeaders()
    });
  }

  grantRewardToUser(userId: number, rewardId: number): Observable<UserReward> {
    return this.http.post<UserReward>(`${this.apiUrl}/grant`, { userId, rewardId }, {
      headers: this.getAuthHeaders()
    });
  }

  // Opcional: Método para semear recompensas (se necessário e protegido adequadamente no backend)
  seedRewards(): Observable<any> {
    return this.http.post(`${this.apiUrl}/seed`, {}, {
      headers: this.getAuthHeaders()
    });
  }
}
