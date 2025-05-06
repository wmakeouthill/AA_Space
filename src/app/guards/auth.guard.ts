import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();
  
  // Se já tem um token no localStorage, considera inicialmente autenticado
  // e faz a validação do token em segundo plano
  if (token) {
    console.log('AuthGuard: Token encontrado, permitindo acesso inicial');
    
    // Valida o token em segundo plano
    authService.validateToken().pipe(
      catchError(() => of(null))
    ).subscribe(result => {
      if (!authService.getToken()) {
        console.log('AuthGuard: Token invalidado após verificação, redirecionando');
        router.navigate(['/auth']);
      }
    });
    
    return true;
  }
  
  // Se não tem token, redireciona para login
  console.log('AuthGuard: Sem token, redirecionando para login');
  router.navigate(['/auth']);
  return false;
};