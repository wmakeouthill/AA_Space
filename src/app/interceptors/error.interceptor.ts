import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { Router } from '@angular/router';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  // Lista de rotas públicas que não devem causar logout em caso de erro 401
  const publicRoutes = [
    { path: '/api/auth/login', method: 'POST' },
    { path: '/api/auth/register', method: 'POST' }
  ];

  // Verifica se é uma rota pública estática
  const isPublicRoute = publicRoutes.some(pattern => {
    const pathMatches = req.url.endsWith(pattern.path);
    return pathMatches && req.method === pattern.method;
  });

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Só redireciona para welcome se não for uma rota pública
        if (!isPublicRoute) {
          console.log('Erro 401 interceptado - redirecionando para welcome');
          router.navigate(['/welcome']);
        }
      }
      return throwError(() => error);
    })
  );
};
