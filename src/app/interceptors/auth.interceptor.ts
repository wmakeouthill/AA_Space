import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Lista de rotas públicas que não precisam de autenticação
  const publicRoutes = [
    { path: '/api/auth/login', method: 'POST' },
    { path: '/api/auth/register', method: 'POST' }
  ];

  // Verifica se é uma rota pública estática
  const isPublicRoute = publicRoutes.some(pattern => {
    const pathMatches = req.url.endsWith(pattern.path);
    return pathMatches && req.method === pattern.method;
  });

  // Se for rota de validação de token, usa o token atual (se existir)
  const isValidateTokenRoute = req.url.endsWith('/api/auth/validate');

  // Se for rota pública, não precisamos adicionar o token
  if (isPublicRoute) {
    console.log('AuthInterceptor: Rota pública, sem token:', req.url);
    return next(req);
  }

  // Para todas as outras rotas, adiciona o token se existir
  if (token) {
    console.log('AuthInterceptor: Adicionando token à requisição:', req.url);
    
    // Clone a requisição e adicione o cabeçalho de autorização
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    
    return next(authReq);
  }

  // Caso especial - requisição para validação de token sem ter um token
  if (isValidateTokenRoute && !token) {
    console.log('AuthInterceptor: Tentativa de validar token sem ter um token');
  }

  console.log('AuthInterceptor: Requisição sem token:', req.url);
  return next(req);
};
