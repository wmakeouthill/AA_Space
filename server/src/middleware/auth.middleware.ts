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
        console.log(`[AUTH MIDDLEWARE] Método: ${req.method}, URL: ${req.url}`);
        console.log(`[AUTH MIDDLEWARE] Headers Authorization: ${req.headers.authorization}`);
        
        // Permitir acesso sem autenticação para algumas rotas públicas
        if (
            (req.method === 'GET' && (req.url === '/posts' || req.url.startsWith('/posts/'))) ||
            req.url === '/health'
        ) {
            console.log('[AUTH MIDDLEWARE] Rota pública, permitindo acesso sem autenticação');
            return next();
        }

        const authHeader = req.headers.authorization;
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
