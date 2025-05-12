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

  // Rotas administrativas que sempre devem mostrar o erro 401
  const adminRoutes = ['/api/auth/admins', '/api/auth/users'];

  // Rotas de desenvolvimento que não devem redirecionar em caso de erro 401
  const developmentRoutes = ['/api/chat', '/api/profile/me', '/api/profile'];

  // Verifica se é uma rota pública estática ou qualquer rota GET para posts
  const isPublicRoute = publicRoutes.some(pattern => {
    const pathMatches = req.url.endsWith(pattern.path);
    return pathMatches && req.method === pattern.method;
  }) || (req.method === 'GET' && req.url.includes('/api/posts'));

  // Verifica se é uma rota de área restrita (admin)
  const isRestrictedRoute = adminRoutes.some((route: string) => req.url.includes(route));

  // Verifica se é uma rota de desenvolvimento (chat, profile)
  const isDevelopmentRoute = developmentRoutes.some((route: string) => req.url.includes(route));

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Só redireciona para welcome se não for uma rota pública ou de desenvolvimento
        if (!isPublicRoute && !isDevelopmentRoute) {
          console.log('Erro 401 interceptado - redirecionando para welcome');

          // Se for uma rota de área restrita (admin), adiciona uma mensagem mais clara
          if (isRestrictedRoute) {
            console.log('Acesso negado a área administrativa. Faça login com uma conta com permissões adequadas.');
          }

          router.navigate(['/welcome']);
        } else if (isDevelopmentRoute) {
          // Se for rota de desenvolvimento, apenas logamos o erro sem redirecionar
          console.log('Erro 401 em rota de desenvolvimento - ignorando redirecionamento:', req.url);
        }
      }
      return throwError(() => error);
    })
  );
};
