import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, catchError, switchMap, take } from 'rxjs/operators';
import { of, Observable } from 'rxjs';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const adminRoutes = ['/admin'];
  const isAdminRoute = adminRoutes.some(adminPath => state.url.startsWith(adminPath));

  console.log(`[AUTH GUARD] Verificando acesso à rota: ${state.url}`);
  console.log(`[AUTH GUARD] É rota administrativa: ${isAdminRoute}`);

  // Usar o observable isAuthenticated para reagir a mudanças no estado de autenticação
  return authService.isAuthenticated.pipe(
    take(1), // Pega o valor mais recente e completa
    switchMap(isAuthenticated => {
      console.log(`[AUTH GUARD] Estado de autenticação inicial (do isAuthenticated subject): ${isAuthenticated}`);

      if (!isAuthenticated) {
        // Se o BehaviorSubject diz que não está autenticado, tenta validar o token uma vez.
        // Isso cobre o caso de recarregar a página com um token válido.
        console.log('[AUTH GUARD] Não autenticado pelo subject, tentando validar token...');
        return authService.validateToken().pipe(
          map(validationResponse => {
            console.log('[AUTH GUARD] Resposta da validação do token:', validationResponse);
            if (validationResponse && validationResponse.valid) {
              // Token válido, agora verifica se é rota de admin e se o usuário é admin
              if (isAdminRoute) {
                // Precisamos do valor atualizado de isAdmin após a validação
                // Vamos pegar diretamente do authService após a validação ter atualizado os subjects
                const userIsAdmin = authService.isAdmin(); // Pega o valor atualizado
                console.log(`[AUTH GUARD] Rota de admin. Usuário é admin (após validação): ${userIsAdmin}`);
                if (!userIsAdmin) {
                  router.navigate(['/']); // Redireciona para home se não for admin
                  return false;
                }
              }
              return true; // Permitido se token válido (e verificação de admin passou)
            } else {
              console.log('[AUTH GUARD] Token inválido ou ausente após tentativa de validação. Redirecionando para /welcome.');
              router.navigate(['/welcome']);
              return false;
            }
          }),
          catchError(() => {
            console.log('[AUTH GUARD] Erro na validação do token. Redirecionando para /welcome.');
            router.navigate(['/welcome']);
            return of(false);
          })
        );
      } else {
        // Já está autenticado pelo BehaviorSubject (provavelmente após login)
        console.log('[AUTH GUARD] Autenticado pelo subject.');
        if (isAdminRoute) {
          const userIsAdmin = authService.isAdmin(); // Pega o valor atualizado
          console.log(`[AUTH GUARD] Rota de admin. Usuário é admin: ${userIsAdmin}`);
          if (!userIsAdmin) {
            router.navigate(['/']); // Redireciona para home se não for admin
            return of(false);
          }
        }
        return of(true); // Permitido
      }
    })
  );
};
