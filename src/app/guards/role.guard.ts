import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';
import { combineLatest } from 'rxjs';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const expectedRoles = route.data?.['roles'] as Array<string>;
  console.log(`[ROLE GUARD] Verificando acesso à rota: ${state.url}`);
  console.log(`[ROLE GUARD] Roles esperados:`, expectedRoles);

  if (!expectedRoles || expectedRoles.length === 0) {
    console.log(`[ROLE GUARD] Nenhum role específico necessário, permitindo acesso`);
    return true; // No specific roles required, allow access
  }
  return combineLatest([
    authService.userRole$.pipe(take(1)),
    authService.isAdmin$.pipe(take(1))
  ]).pipe(
    map(([userRole, isAdmin]) => {      console.log(`[ROLE GUARD] Role do usuário: ${userRole}, isAdmin: ${isAdmin}`);
      console.log(`[ROLE GUARD] Expected roles:`, expectedRoles);

      // Check if user has the required role
      if (userRole && expectedRoles.includes(userRole)) {
        console.log(`[ROLE GUARD] Usuário tem role necessário (${userRole}), permitindo acesso`);
        return true;
      }      // Check if user is admin and 'admin' is in expected roles
      if (isAdmin && expectedRoles.includes('admin')) {
        console.log(`[ROLE GUARD] Usuário é admin e 'admin' está nos roles esperados, permitindo acesso`);
        return true;
      }

      // Redirect to home or an unauthorized page if role doesn't match
      console.log(`[ROLE GUARD] Acesso negado - role não corresponde. Redirecionando para home.`);
      router.navigate(['/']);
      return false;
    })
  );
};
