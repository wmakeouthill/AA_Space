import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Lista de rotas públicas que não precisam de autenticação
  const publicRoutes = [
    { path: '/api/auth/login', method: 'POST' },
    { path: '/api/auth/register', method: 'POST' },
    { path: '/api/posts', method: 'GET' },
    { path: '/api/posts', method: 'POST' }
  ];

  // Verifica se a URL corresponde a rotas dinâmicas públicas
  const isDynamicPublicRoute = (
    (req.method === 'GET' && req.url.match(/\/api\/posts\/\d+$/)) || // GET individual post
    (req.method === 'GET' && req.url.match(/\/api\/posts\/\d+\/comments$/)) || // GET post comments
    (req.method === 'POST' && req.url.match(/\/api\/posts\/\d+\/comments$/)) // POST comments
  );

  // Verifica se é uma rota pública estática
  const isStaticPublicRoute = publicRoutes.some(pattern => {
    const pathMatches = req.url.endsWith(pattern.path);
    return pathMatches && req.method === pattern.method;
  });

  // Se for rota pública, não precisamos adicionar o token
  if (isStaticPublicRoute || isDynamicPublicRoute) {
    console.log('Rota pública:', req.url);
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
