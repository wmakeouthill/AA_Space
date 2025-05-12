import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User } from '../models/entities';

const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_jwt_super_secreto';

interface AuthRequest extends Request {
    user?: { id: number; username: string; isAdmin?: boolean };
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Fix log formatting and add more debugging info
        console.log(`[AUTH MIDDLEWARE] Método: ${req.method}, URL: ${req.url}`);
        console.log(`[AUTH MIDDLEWARE] Headers Authorization: ${req.headers.authorization ? 'Present' : 'Missing'}`);
        console.log(`[AUTH MIDDLEWARE DEBUG] OriginalUrl: ${req.originalUrl}, BaseUrl: ${req.baseUrl}, Path: ${req.path}`);

        // Log the full token for debugging if present
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            console.log(`[AUTH MIDDLEWARE] Token detectado: ${token.substring(0, 20)}...`);
        } else {
            console.log(`[AUTH MIDDLEWARE] Token não detectado`);
        }

        // Rotas administrativas e de chat que exigem autenticação completa
        const protectedAdminRoutes = ['/admins', '/users', '/make-admin', '/remove-admin', '/transfer-admin'];
        const isProtectedAdminRoute = protectedAdminRoutes.some(route => req.path.includes(route) || req.originalUrl.includes(route));

        // Detecta se é uma rota de chat
        const isChatRoute = req.baseUrl === '/api/chat' || req.path.includes('/chat') || req.originalUrl.includes('/chat');

        // Detecta se é uma rota de perfil - especial atenção para /api/profile/me
        const isProfileRoute = req.baseUrl === '/api/profile' || req.path.includes('/profile') || req.originalUrl.includes('/profile');
        const isProfileMeRoute = req.path === '/me' || req.originalUrl === '/api/profile/me';

        // Se for rota administrativa, chat ou perfil, garantimos que tem autenticação
        if (isProtectedAdminRoute || isChatRoute || isProfileRoute) {
            console.log('[AUTH MIDDLEWARE] Rota protegida detectada:', req.originalUrl);

            // Special fast path for /api/profile/me route in dev mode - critical for avatar functionality
            if (isProfileMeRoute && process.env.NODE_ENV !== 'production') {
                console.log('[AUTH MIDDLEWARE] Rota de perfil /me detectada - tratamento especial');

                if (authHeader && authHeader.startsWith('Bearer ')) {
                    const token = authHeader.split(' ')[1];
                    console.log('[AUTH MIDDLEWARE] Tentando verificar token para /profile/me. Token (início):', token.substring(0, 20) + '...');
                    console.log('[AUTH MIDDLEWARE] Usando JWT_SECRET para /profile/me:', JWT_SECRET ? `definido (início: ${JWT_SECRET.substring(0, Math.min(5, JWT_SECRET.length))}...)` : 'NÃO DEFINIDO');

                    try {
                        // Verify the token
                        const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string; isAdmin?: boolean };

                        // Set user information in request
                        (req as AuthRequest).user = {
                            id: decoded.id,
                            username: decoded.username,
                            isAdmin: decoded.isAdmin
                        };

                        console.log('[AUTH MIDDLEWARE] Token validado com sucesso para /profile/me. User set:', (req as AuthRequest).user);
                        return next();
                    } catch (error: any) {
                        console.error('[AUTH MIDDLEWARE] Erro ao verificar token para /profile/me. Token que falhou (início):', token.substring(0, 20) + '...');
                        console.error('[AUTH MIDDLEWARE] Detalhes do erro JWT:', {
                            message: error.message,
                            name: error.name,
                            // Consider logging stack selectively: error.stack
                        });
                        // Continue with other auth methods
                        console.log('[AUTH MIDDLEWARE] Falha na verificação JWT para /profile/me (dev mode special path), continuando para outros métodos de autenticação se houver...');
                    }
                } else {
                    console.log('[AUTH MIDDLEWARE] Nenhum header de autorização Bearer para /profile/me na rota especial (dev mode), verificando outros métodos de auth.');
                    // Fall through to other auth mechanisms or general token check
                }
            }

            // MODO DE DESENVOLVIMENTO: Tratamento especial para rotas protegidas em desenvolvimento
            if ((isChatRoute || isProfileRoute) && process.env.NODE_ENV !== 'production') {
                console.log('[AUTH MIDDLEWARE] Verificando token para rota protegida:', req.originalUrl);

                if (authHeader && authHeader.startsWith('Bearer ')) {
                    try {
                        // Se tiver token, tentar decodificar sem verificar assinatura para debug
                        const tokenParts = authHeader.split(' ')[1].split('.');
                        if (tokenParts.length >= 2) {
                            const decodedPayload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
                            console.log('[AUTH MIDDLEWARE] Token payload recebido:', decodedPayload);

                            // Se o token tem um ID de usuário, usá-lo diretamente mesmo se não validar
                            if (decodedPayload && decodedPayload.id) {
                                console.log('[AUTH MIDDLEWARE] Usando ID do token diretamente para desenvolvimento:', decodedPayload.id);
                                // Configurar usuário a partir do payload do token
                                (req as AuthRequest).user = {
                                    id: decodedPayload.id,
                                    username: decodedPayload.username || 'admin',
                                    isAdmin: decodedPayload.isAdmin || true
                                };
                                return next();
                            }
                        }
                    } catch (e) {
                        console.error('[AUTH MIDDLEWARE] Erro ao decodificar token em desenvolvimento:', e);
                    }

                    // Se não conseguiu decodificar, continua com a validação normal
                    console.log('[AUTH MIDDLEWARE] Prosseguindo com validação normal do token');
                } else {
                    // Se não tiver token, usar um mock apenas para desenvolvimento
                    console.log('[AUTH MIDDLEWARE] Nenhum token encontrado, usando usuário mock para desenvolvimento');
                    // Configurar um usuário mock para testes
                    (req as AuthRequest).user = {
                        id: 1,  // ID do usuário admin ou outro usuário existente no banco
                        username: 'admin_test',
                        isAdmin: true
                    };
                    return next();
                }
            }
        }

        // Permitir acesso sem autenticação para todas as requisições GET que não são rotas protegidas
        if (req.method === 'GET' && !isProtectedAdminRoute) {
            console.log('[AUTH MIDDLEWARE] Permitindo acesso para GET request público: ' + req.url);
            // Definir explicitamente que não há usuário autenticado, mas permitir acesso
            (req as AuthRequest).user = undefined;
            return next();
        } else if (req.url === '/health' || req.path === '/health') {
            console.log('[AUTH MIDDLEWARE] Permitindo acesso para health check');
            return next();
        }

        console.log('[AUTH MIDDLEWARE] Token presente:', !!authHeader);

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // Para rotas específicas que permitem acesso como convidado
            if (
                (req.method === 'POST' && req.url.startsWith('/posts')) ||
                (req.method === 'POST' && req.url.includes('/comments'))
            ) {
                console.log('[AUTH MIDDLEWARE] Permitindo acesso como convidado para criar posts/comentários');
                return next();
            }

            return res.status(401).json({ message: 'Token não fornecido ou inválido' });
        }

        const token = authHeader.split(' ')[1];

        // Verificar o token JWT
        const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string; isAdmin?: boolean };
        console.log('[AUTH MIDDLEWARE] Token verificado:', decoded);

        // Verificar se o usuário existe no banco de dados
        const userRepository = AppDataSource.getRepository(User);
        const user = await userRepository.findOne({ where: { id: decoded.id } });

        if (!user) {
            console.log('[AUTH MIDDLEWARE] Usuário não encontrado no banco de dados');
            return res.status(401).json({ message: 'Usuário não encontrado' });
        }

        // Adicionar informações do usuário ao objeto de requisição
        (req as AuthRequest).user = {
            id: user.id,
            username: user.username,
            isAdmin: user.isAdmin
        };

        console.log(`[AUTH MIDDLEWARE] Usuário encontrado: ${user.username}, isAdmin: ${user.isAdmin}`);

        next();
    } catch (error) {
        console.error('[AUTH MIDDLEWARE] Erro:', error);
        return res.status(401).json({ message: 'Token inválido ou expirado' });
    }
};
