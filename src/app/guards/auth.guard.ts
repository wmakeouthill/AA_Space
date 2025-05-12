import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  // Log adicional para depuração
  console.log(`[AUTH GUARD] Verificando acesso à rota: ${state.url}`);
  console.log(`[AUTH GUARD] Token existe: ${!!token}`);

  // Rotas administrativas e de chat que exigem autenticação completa
  const adminRoutes = ['/admin'];
  const chatRoutes = ['/chat'];

  const isAdminRoute = adminRoutes.some(route => state.url.startsWith(route));
  const isChatRoute = chatRoutes.some(route => state.url.startsWith(route));

  console.log(`[AUTH GUARD] É rota administrativa: ${isAdminRoute}, É rota de chat: ${isChatRoute}`);

  // Se já tem um token no localStorage, considera inicialmente autenticado
  // e faz a validação do token em segundo plano
  if (token) {
    console.log('AuthGuard: Token encontrado, permitindo acesso inicial');

    // Valida o token em segundo plano
    authService.validateToken().pipe(
      catchError(error => {
        console.error('[AUTH GUARD] Erro ao validar token:', error);
        return of(null);
      })
    ).subscribe(result => {
      if (!authService.getToken()) {
        console.log('AuthGuard: Token invalidado após verificação, redirecionando');
        router.navigate(['/welcome']);
      } else if (isAdminRoute && !authService.isAdmin()) {
        console.log('AuthGuard: Usuário não é administrador, redirecionando');
        router.navigate(['/']);
      }
    });    // Verificação adicional para rotas administrativas
    if (isAdminRoute && !authService.isAdmin()) {
      console.log('AuthGuard: Acesso negado à área administrativa. Usuário não é admin.');
      router.navigate(['/']);
      return false;
    }

    return true;
  }

  // Para chat e outros recursos em desenvolvimento, permitimos acesso temporário
  if (isChatRoute || state.url.includes('/profile')) {
    console.log('AuthGuard: Permitindo acesso às rotas protegidas em desenvolvimento');
    // Temporariamente permitir acesso para testes
    return true;
  }

  // Se não tem token, redireciona para welcome
  console.log('AuthGuard: Sem token, redirecionando para welcome');
  router.navigate(['/welcome']);
  return false;
};
