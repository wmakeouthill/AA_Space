import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  let token: string | null = null;
  if (typeof window !== 'undefined') { // Garantir que estamos no navegador
    token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  }

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
    '/api/chat',
    '/api/rewards' // Adicionado para garantir envio do token
  ];

  // Verifica se é uma rota pública que não precisa de token
  const isPublicRoute = publicRoutes.some(pattern => {
    const pathMatches = req.url.endsWith(pattern.path) ||
                      (pattern.path === '/api/posts' && req.url.includes('/api/posts/'));
    return pathMatches && req.method === pattern.method;
  });

  // Verifica se é uma rota protegida que sempre precisa de token
  const isProtectedRoute = protectedPaths.some(path => req.url.includes(path));

  // Always add the token if we have one
  if (token) {
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    return next(authReq);
  }

  // If it's a protected route and we don't have a token, log and continue anyway
  // The server will respond with 401 if needed
  if (isProtectedRoute) {
  }

  return next(req);
};
