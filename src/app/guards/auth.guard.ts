import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, catchError, switchMap, take } from 'rxjs/operators';
import { of, Observable, combineLatest } from 'rxjs';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Verifica se a rota exige roles específicos
  const expectedRoles = route.data?.['roles'] as Array<string>;
  const isRoleProtected = expectedRoles && expectedRoles.length > 0;

  // Rotas administrativas antigas (mantido para compatibilidade)
  const adminRoutes = ['/admin'];
  const isAdminRoute = adminRoutes.some(adminPath => state.url.startsWith(adminPath));

  return authService.isAuthenticated.pipe(
    take(1),
    switchMap(isAuthenticated => {
      if (!isAuthenticated) {
        return authService.validateToken().pipe(
          switchMap(validationResponse => {
            if (validationResponse && validationResponse.valid) {
              // Se a rota exige role específica
              if (isRoleProtected) {
                return combineLatest([
                  authService.userRole$.pipe(take(1)),
                  authService.isAdmin$.pipe(take(1))
                ]).pipe(
                  map(([userRole, isAdmin]) => {
                    if (userRole && expectedRoles.includes(userRole)) {
                      return true;
                    }
                    if (isAdmin && expectedRoles.includes('admin')) {
                      return true;
                    }
                    router.navigate(['/']);
                    return false;
                  })
                );
              }
              // Compatibilidade: rota admin antiga
              if (isAdminRoute) {
                const userIsAdmin = authService.isAdmin();
                if (!userIsAdmin) {
                  router.navigate(['/']);
                  return of(false);
                }
              }
              return of(true);
            } else {
              router.navigate(['/welcome']);
              return of(false);
            }
          }),
          catchError(() => {
            router.navigate(['/welcome']);
            return of(false);
          })
        );
      } else {
        // Já autenticado
        if (isRoleProtected) {
          return combineLatest([
            authService.userRole$.pipe(take(1)),
            authService.isAdmin$.pipe(take(1))
          ]).pipe(
            map(([userRole, isAdmin]) => {
              if (userRole && expectedRoles.includes(userRole)) {
                return true;
              }
              if (isAdmin && expectedRoles.includes('admin')) {
                return true;
              }
              router.navigate(['/']);
              return false;
            })
          );
        }
        if (isAdminRoute) {
          const userIsAdmin = authService.isAdmin();
          if (!userIsAdmin) {
            router.navigate(['/']);
            return of(false);
          }
        }
        return of(true);
      }
    })
  );
};
