import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, BlockedIp } from '../../services/api.service'; // Import BlockedIp
import { AuthService } from '../../services/auth.service';
import { FrontendUserReward } from '../../models/chat/chat.interface';
import { RewardBadgesInlineComponent } from '../reward-badges-inline/reward-badges-inline.component';

interface AdminUser {
  id?: number;
  username: string;
  isRemovable: boolean;
  isTransferEligible: boolean;
  isMainAdmin?: boolean;
}

interface User {
  id: number;
  username: string;
  email?: string;
  phone?: string;
  isAdmin: boolean;
  isMainAdmin?: boolean;
  lastIpAddress?: string; // Adicionar lastIpAddress
  userRewards?: FrontendUserReward[]; // Adicionar recompensas do usuário
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RewardBadgesInlineComponent],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {
  promoteForm: FormGroup;
  removeForm: FormGroup;
  transferForm: FormGroup;
  searchForm: FormGroup;
  blockIpForm: FormGroup; // Novo formulário para bloquear IP
  isSubmitting = false;
  isRemoveSubmitting = false;
  isTransferSubmitting = false;
  isBlockingIp = false; // Estado de carregamento para bloqueio de IP
  error: string | null = null;
  successMessage: string | null = null;
  isAdmin = false;
  isMainAdmin = false;
  adminUsers: AdminUser[] = [];
  allUsers: User[] = [];
  filteredUsers: User[] = [];
  currentUsername: string | null = null;
  currentUserId: number | null = null;
  isLoadingUsers = false;
  searchTerm = '';
  blockedIps: BlockedIp[] = []; // Lista de IPs bloqueados
  isLoadingBlockedIps = false; // Estado de carregamento para lista de IPs bloqueados

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

    this.searchForm = this.fb.group({
      search: ['']
    });

    // Inicializar o novo formulário
    this.blockIpForm = this.fb.group({
      ipAddress: ['', [Validators.required, Validators.pattern(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^::1$|^localhost$/)]],
      reason: ['']
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

    // Busca todos os usuários para a lista lateral
    this.fetchAllUsers();

    // Inicializa o listener para pesquisa
    this.searchForm.get('search')?.valueChanges.subscribe(term => {
      this.searchTerm = term;
      this.filterUsers();
    });

    // Carrega a lista de IPs bloqueados
    this.fetchBlockedIps();
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

  fetchAllUsers(): void {
    this.isLoadingUsers = true;

    this.apiService.listAllUsers().subscribe({
      next: (response) => {
        console.log('Usuários encontrados (resposta completa):', response);

        if (response && response.users && Array.isArray(response.users)) {
          this.allUsers = response.users;
          this.filteredUsers = [...this.allUsers];

          // Log detalhado para depurar informações de contato e IP
          console.log('Detalhes dos usuários:');
          this.allUsers.forEach(user => {
            console.log(`Usuário: ${user.username}, Email: ${user.email || 'não definido'}, Telefone: ${user.phone || 'não definido'}, Último IP: ${user.lastIpAddress || 'não definido'}`);
          });
        }
        this.isLoadingUsers = false;
      },
      error: (error) => {
        console.error('Erro ao buscar usuários:', error);
        this.error = 'Não foi possível buscar a lista de usuários.';
        this.isLoadingUsers = false;
      }
    });
  }

  fetchBlockedIps(): void {
    this.isLoadingBlockedIps = true;
    this.error = null;
    this.apiService.getBlockedIps().subscribe({
      next: (ips) => {
        this.blockedIps = ips;
        this.isLoadingBlockedIps = false;
      },
      error: (err) => {
        console.error('Erro ao buscar IPs bloqueados:', err);
        this.error = err.error?.message || 'Não foi possível carregar a lista de IPs bloqueados.';
        this.isLoadingBlockedIps = false;
      }
    });
  }

  filterUsers(): void {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.filteredUsers = [...this.allUsers];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredUsers = this.allUsers.filter(user =>
      user.username.toLowerCase().includes(term) ||
      (user.email && user.email.toLowerCase().includes(term)) ||
      (user.phone && user.phone.toLowerCase().includes(term))
    );
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
      this.promoteForm.get('username')?.disable(); // Disable control
      this.error = null;
      this.successMessage = null;

      const username = this.promoteForm.value.username;

      this.apiService.promoteToAdmin({ username }).subscribe({
        next: (response: any) => {
          console.log('Usuário promovido com sucesso:', response);
          this.successMessage = response.message || 'Usuário promovido a administrador com sucesso.';
          this.promoteForm.reset();
          this.isSubmitting = false;
          this.promoteForm.get('username')?.enable(); // Enable control

          // Atualiza a lista de administradores
          this.fetchAdmins();
          // Também atualiza a lista de todos os usuários
          this.fetchAllUsers();
        },
        error: (error) => {
          console.error('Erro ao promover usuário:', error);
          this.error = error.error?.message || 'Não foi possível promover o usuário. Por favor, verifique o nome e tente novamente.';
          this.isSubmitting = false;
          this.promoteForm.get('username')?.enable(); // Enable control on error
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
      this.removeForm.get('username')?.disable(); // Disable control
      this.error = null;
      this.successMessage = null;

      const username = this.removeForm.value.username;

      // Verificações locais antes de fazer a chamada de API
      const adminToRemove = this.adminUsers.find(admin => admin.username === username);

      if (adminToRemove?.isMainAdmin) {
        this.error = 'Não é possível remover os privilégios do administrador principal.';
        this.isRemoveSubmitting = false;
        this.removeForm.get('username')?.enable(); // Enable control
        return;
      }

      if (username === this.currentUsername) {
        this.error = 'Você não pode remover seus próprios privilégios de administrador.';
        this.isRemoveSubmitting = false;
        this.removeForm.get('username')?.enable(); // Enable control
        return;
      }

      this.apiService.removeAdmin(username).subscribe({
        next: (response: any) => {
          console.log('Privilégios de administrador removidos com sucesso:', response);
          this.successMessage = response.message || 'Privilégios de administrador removidos com sucesso.';
          this.removeForm.reset();
          this.isRemoveSubmitting = false;
          this.removeForm.get('username')?.enable(); // Enable control

          // Atualiza a lista de administradores
          this.fetchAdmins();
          // Também atualiza a lista de todos os usuários
          this.fetchAllUsers();
        },
        error: (error) => {
          console.error('Erro ao remover privilégios de administrador:', error);
          this.error = error.error?.message || 'Não foi possível remover os privilégios do administrador. Por favor, verifique o nome e tente novamente.';
          this.isRemoveSubmitting = false;
          this.removeForm.get('username')?.enable(); // Enable control on error
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
      this.transferForm.get('username')?.disable(); // Disable control
      this.error = null;
      this.successMessage = null;

      const username = this.transferForm.value.username;

      // Verificações locais
      if (username === this.currentUsername) {
        this.error = 'Você já é o administrador principal.';
        this.isTransferSubmitting = false;
        this.transferForm.get('username')?.enable(); // Enable control
        return;
      }

      this.apiService.transferMainAdmin(username).subscribe({
        next: (response: any) => {
          console.log('Título de administrador principal transferido com sucesso:', response);
          this.successMessage = response.message || 'Título de administrador principal transferido com sucesso.';
          this.transferForm.reset();
          this.isTransferSubmitting = false;
          this.transferForm.get('username')?.enable(); // Enable control

          // Atualiza a interface depois da transferência
          this.isMainAdmin = false;
          this.fetchAdmins();
          // Também atualiza a lista de todos os usuários
          this.fetchAllUsers();
        },
        error: (error) => {
          console.error('Erro ao transferir título de administrador principal:', error);
          this.error = error.error?.message || 'Não foi possível transferir o título de administrador principal. Por favor, verifique o nome e tente novamente.';
          this.isTransferSubmitting = false;
          this.transferForm.get('username')?.enable(); // Enable control on error
        }
      });
    }
  }

  onBlockIp(): void {
    if (this.blockIpForm.invalid) {
      this.error = 'Por favor, insira um endereço IP válido (IPv4, localhost ou ::1).';
      // Marcar campos como tocados para exibir erros de validação do formulário, se houver
      this.blockIpForm.markAllAsTouched();
      return;
    }
    this.isBlockingIp = true;
    this.blockIpForm.get('ipAddress')?.disable();
    this.blockIpForm.get('reason')?.disable();
    this.error = null;
    this.successMessage = null;

    const { ipAddress, reason } = this.blockIpForm.value;

    this.apiService.blockIp({ ipAddress, reason }).subscribe({
      next: (response) => {
        this.successMessage = response.message || 'IP bloqueado com sucesso.';
        this.blockIpForm.reset();
        this.fetchBlockedIps(); // Atualiza a lista
        this.isBlockingIp = false;
        this.blockIpForm.get('ipAddress')?.enable();
        this.blockIpForm.get('reason')?.enable();
      },
      error: (err) => {
        console.error('Erro ao bloquear IP:', err);
        this.error = err.error?.message || 'Não foi possível bloquear o IP. Verifique se já não está bloqueado ou se o formato é válido.';
        this.isBlockingIp = false;
        this.blockIpForm.get('ipAddress')?.enable();
        this.blockIpForm.get('reason')?.enable();
      }
    });
  }

  onUnblockIp(ipAddress: string): void {
    this.error = null;
    this.successMessage = null;
    // Adicionar um estado de carregamento específico se necessário, e.g., this.isUnblockingIp = ipAddress;

    this.apiService.unblockIp(ipAddress).subscribe({
      next: (response) => {
        this.successMessage = response.message || 'IP desbloqueado com sucesso.';
        this.fetchBlockedIps(); // Atualiza a lista
        // Resetar estado de carregamento específico se usado
      },
      error: (err) => {
        console.error('Erro ao desbloquear IP:', err);
        this.error = err.error?.message || 'Não foi possível desbloquear o IP.';
        // Resetar estado de carregamento específico se usado
      }
    });
  }

  // Função para copiar o IP para o formulário de bloqueio
  copyIpToBlockForm(ipAddress?: string): void {
    if (ipAddress) {
      this.blockIpForm.patchValue({ ipAddress: ipAddress });
      this.successMessage = `IP ${ipAddress} copiado para o formulário de bloqueio.`;
      this.error = null;
      // Opcional: rolar para o formulário de bloqueio ou focar no campo
      const ipInput = document.getElementById('ipAddress');
      if (ipInput) {
        ipInput.focus();
      }
    } else {
      this.error = 'Não foi possível copiar o IP: endereço IP não disponível.';
      this.successMessage = null;
    }
  }
}
