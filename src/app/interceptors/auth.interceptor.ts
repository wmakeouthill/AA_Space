import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Log detalhado para cada requisição
  console.log(`[AUTH INTERCEPTOR] Método: ${req.method}, URL: ${req.url}`);

  // Lista de rotas públicas que não precisam de autenticação
  const publicRoutes = [
    { path: '/api/auth/login', method: 'POST' },
    { path: '/api/auth/register', method: 'POST' },
    { path: '/api/posts', method: 'GET' }  // Permitir acesso público aos posts
  ];

  // Lista de rotas protegidas que sempre precisam de token
  const protectedPaths = [
    '/api/auth/admins',
    '/api/auth/users',
    '/api/auth/make-admin',
    '/api/profile', // Protegendo explicitamente os endpoints de profile
    '/api/chat'
  ];

  // Verifica se é uma rota pública que não precisa de token
  const isPublicRoute = publicRoutes.some(pattern => {
    const pathMatches = req.url.endsWith(pattern.path) ||
                      (pattern.path === '/api/posts' && req.url.includes('/api/posts/'));
    return pathMatches && req.method === pattern.method;
  });

  // Verifica se é uma rota protegida que sempre precisa de token
  const isProtectedRoute = protectedPaths.some(path => req.url.includes(path));

  // Rota de perfil é especialmente importante para identificar
  const isProfileRoute = req.url.includes('/api/profile');

  // Always add the token if we have one
  if (token) {
    console.log(`[AUTH INTERCEPTOR] Adicionando token à requisição: ${req.url}`);
    const tokenStart = token.substring(0, 15); // Just log the beginning for security
    console.log(`[AUTH INTERCEPTOR] Token: ${tokenStart}...`);

    // For profile requests, log more details to debug
    if (isProfileRoute) {
      console.log(`[AUTH INTERCEPTOR] PROFILE REQUEST TOKEN: ${token}`);
      console.log('[AUTH INTERCEPTOR] Headers antes:', req.headers.keys());
    }

    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    return next(authReq);
  }

  // If it's a protected route and we don't have a token, log and continue anyway
  // The server will respond with 401 if needed
  if (isProtectedRoute) {
    console.warn(`[AUTH INTERCEPTOR] ATENÇÃO: Rota protegida sem token: ${req.url}`);
  }

  // Se chegou aqui é porque não tem token e não é rota pública
  console.log('[AUTH INTERCEPTOR] Requisição sem token:', req.url);
  return next(req);
};
