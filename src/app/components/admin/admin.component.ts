import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

interface AdminUser {
  id?: number;
  username: string;
  isRemovable: boolean;
  isTransferEligible: boolean;
  isMainAdmin?: boolean;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {
  promoteForm: FormGroup;
  removeForm: FormGroup;
  transferForm: FormGroup;
  isSubmitting = false;
  isRemoveSubmitting = false;
  isTransferSubmitting = false;
  error: string | null = null;
  successMessage: string | null = null;
  isAdmin = false;
  isMainAdmin = false;
  adminUsers: AdminUser[] = [];
  currentUsername: string | null = null;
  currentUserId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router
  ) {
    this.promoteForm = this.fb.group({
      username: ['', [Validators.required]]
    });

    this.removeForm = this.fb.group({
      username: ['', [Validators.required]]
    });

    this.transferForm = this.fb.group({
      username: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    // Verifica se o usuário está autenticado e é administrador
    const isAuthenticated = this.authService.getToken() !== null;
    
    if (!isAuthenticated) {
      this.router.navigate(['/auth']);
      return;
    }

    this.isAdmin = this.authService.isAdmin();
    if (!this.isAdmin) {
      this.error = 'Esta página só está disponível para administradores.';
      return;
    }

    // Armazena o nome de usuário e ID atual
    this.currentUsername = this.authService.getUsername();
    this.currentUserId = parseInt(this.authService.getUserId() || '0', 10);

    // Inicializa a lista de administradores a partir da API
    this.fetchAdmins();
  }

  fetchAdmins(): void {
    // Limpa a lista de administradores
    this.adminUsers = [];
    
    // Faz a chamada à API para buscar todos os administradores
    this.apiService.listAdmins().subscribe({
      next: (response) => {
        console.log('Administradores encontrados:', response);
        
        if (response && response.admins && Array.isArray(response.admins)) {
          // Determina quem é o administrador principal para atualizar o estado local
          for (const admin of response.admins) {
            if (admin.isMainAdmin && admin.username === this.currentUsername) {
              this.isMainAdmin = true;
              break;
            }
          }
          
          // Processa cada administrador retornado pela API
          response.admins.forEach((admin: any) => {
            const isCurrentUser = admin.username === this.currentUsername;
            
            this.adminUsers.push({
              id: admin.id,
              username: admin.username,
              isRemovable: !isCurrentUser && !admin.isMainAdmin,
              isTransferEligible: !admin.isMainAdmin && admin.isAdmin,
              isMainAdmin: admin.isMainAdmin
            });
          });
        }
      },
      error: (error) => {
        console.error('Erro ao buscar administradores:', error);
        this.error = 'Não foi possível buscar a lista de administradores.';
        
        // Como fallback, adicionamos pelo menos o usuário atual
        this.initAdminUsers();
      }
    });
  }

  // Método de fallback para inicializar a lista de administradores quando a API falhar
  initAdminUsers(): void {
    // Adiciona o usuário atual
    this.adminUsers.push({
      username: this.currentUsername || 'Usuário atual',
      isRemovable: false,
      isTransferEligible: false,
      isMainAdmin: this.isMainAdmin
    });
  }

  onPromoteUser(): void {
    if (!this.isAdmin) {
      this.error = 'Você não tem permissão para realizar esta ação.';
      return;
    }

    if (this.promoteForm.valid) {
      this.isSubmitting = true;
      this.error = null;
      this.successMessage = null;

      const username = this.promoteForm.value.username;
      
      this.apiService.promoteToAdmin({ username }).subscribe({
        next: (response: any) => {
          console.log('Usuário promovido com sucesso:', response);
          this.successMessage = response.message || 'Usuário promovido a administrador com sucesso.';
          this.promoteForm.reset();
          this.isSubmitting = false;
          
          // Atualiza a lista de administradores
          this.fetchAdmins();
        },
        error: (error) => {
          console.error('Erro ao promover usuário:', error);
          this.error = error.error?.message || 'Não foi possível promover o usuário. Por favor, verifique o nome e tente novamente.';
          this.isSubmitting = false;
        }
      });
    }
  }

  onRemoveAdmin(): void {
    if (!this.isAdmin) {
      this.error = 'Você não tem permissão para realizar esta ação.';
      return;
    }

    if (this.removeForm.valid) {
      this.isRemoveSubmitting = true;
      this.error = null;
      this.successMessage = null;

      const username = this.removeForm.value.username;
      
      // Verificações locais antes de fazer a chamada de API
      const adminToRemove = this.adminUsers.find(admin => admin.username === username);
      
      if (adminToRemove?.isMainAdmin) {
        this.error = 'Não é possível remover os privilégios do administrador principal.';
        this.isRemoveSubmitting = false;
        return;
      }

      if (username === this.currentUsername) {
        this.error = 'Você não pode remover seus próprios privilégios de administrador.';
        this.isRemoveSubmitting = false;
        return;
      }
      
      this.apiService.removeAdmin(username).subscribe({
        next: (response: any) => {
          console.log('Privilégios de administrador removidos com sucesso:', response);
          this.successMessage = response.message || 'Privilégios de administrador removidos com sucesso.';
          this.removeForm.reset();
          this.isRemoveSubmitting = false;
          
          // Atualiza a lista de administradores
          this.fetchAdmins();
        },
        error: (error) => {
          console.error('Erro ao remover privilégios de administrador:', error);
          this.error = error.error?.message || 'Não foi possível remover os privilégios do administrador. Por favor, verifique o nome e tente novamente.';
          this.isRemoveSubmitting = false;
        }
      });
    }
  }

  onTransferMainAdmin(): void {
    if (!this.isMainAdmin) {
      this.error = 'Apenas o administrador principal pode transferir o título.';
      return;
    }

    if (this.transferForm.valid) {
      this.isTransferSubmitting = true;
      this.error = null;
      this.successMessage = null;

      const username = this.transferForm.value.username;
      
      // Verificações locais
      if (username === this.currentUsername) {
        this.error = 'Você já é o administrador principal.';
        this.isTransferSubmitting = false;
        return;
      }
      
      this.apiService.transferMainAdmin(username).subscribe({
        next: (response: any) => {
          console.log('Título de administrador principal transferido com sucesso:', response);
          this.successMessage = response.message || 'Título de administrador principal transferido com sucesso.';
          this.transferForm.reset();
          this.isTransferSubmitting = false;
          
          // Atualiza a interface depois da transferência
          this.isMainAdmin = false;
          this.fetchAdmins();
        },
        error: (error) => {
          console.error('Erro ao transferir título de administrador principal:', error);
          this.error = error.error?.message || 'Não foi possível transferir o título de administrador principal. Por favor, verifique o nome e tente novamente.';
          this.isTransferSubmitting = false;
        }
      });
    }
  }
}
