import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Lista de rotas públicas que não precisam de autenticação
  const publicRoutes = [
    '/api/auth/login',
    '/api/auth/register',
  ];

  // Se for uma rota pública, não adiciona o token
  const isPublicRoute = publicRoutes.some(route => req.url.endsWith(route));
  if (isPublicRoute) {
    console.log('Rota pública, não requer token:', req.url);
    return next(req);
  }

  // Para todas as outras rotas, adiciona o token se existir
  if (token) {
    console.log('Adicionando token à requisição:', req.url);
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    return next(authReq);
  }

  console.log('Requisição sem token:', req.url);
  return next(req);
};
