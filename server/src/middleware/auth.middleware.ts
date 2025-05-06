import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User } from '../models/entities';

interface AuthRequest extends Request {
    user?: { id: number; username: string; isAdmin?: boolean };
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    // Adiciona logs para diagnóstico
    console.log(`[AUTH MIDDLEWARE] Método: ${req.method}, URL: ${req.url}`);
    console.log(`[AUTH MIDDLEWARE] Headers Authorization:`, req.headers.authorization);
    
    const token = req.headers.authorization?.split(' ')[1];
    console.log(`[AUTH MIDDLEWARE] Token presente: ${!!token}`);

    if (!token) {
        console.log('[AUTH MIDDLEWARE] Sem token, continuando...');
        return next();
    }

    try {
        const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_jwt_super_secreto';
        const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string; isAdmin?: boolean };
        console.log('[AUTH MIDDLEWARE] Token verificado:', decoded);
        
        // Buscar informações atualizadas do usuário do banco de dados
        const userRepository = AppDataSource.getRepository(User);
        const user = await userRepository.findOne({ 
            where: { id: decoded.id } 
        });
            
        if (user) {
            // Adicionar informações do usuário ao request
            (req as AuthRequest).user = {
                id: user.id,
                username: user.username,
                isAdmin: !!user.isAdmin // Garante que seja boolean (true/false)
            };
            console.log(`[AUTH MIDDLEWARE] Usuário encontrado: ${user.username}, isAdmin: ${user.isAdmin}`);
        } else {
            console.log(`[AUTH MIDDLEWARE] Usuário não encontrado no banco de dados para id: ${decoded.id}`);
            // Usar informações do token se o usuário não for encontrado no banco
            (req as AuthRequest).user = {
                id: decoded.id,
                username: decoded.username,
                isAdmin: decoded.isAdmin
            };
        }
        next();
    } catch (error) {
        console.error('[AUTH MIDDLEWARE] Erro ao verificar token:', error);
        // Não enviamos erro, apenas continuamos sem autenticação
        next();
    }
};
