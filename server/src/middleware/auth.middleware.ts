import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User } from '../models/entities';

interface AuthRequest extends Request {
    user?: { id: number; username: string; isAdmin?: boolean };
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Adiciona logs para diagnóstico
    console.log(`[AUTH MIDDLEWARE] Método: ${req.method}, URL: ${req.url}`);
    console.log(`[AUTH MIDDLEWARE] Headers Authorization:`, req.headers.authorization);
    
    const token = req.headers.authorization?.split(' ')[1];
    console.log(`[AUTH MIDDLEWARE] Token presente: ${!!token}`);

    if (token) {
        try {
            const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_jwt_super_secreto';
            const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string };
            
            // Buscar informações adicionais do usuário do banco de dados
            AppDataSource.getRepository(User).findOne({ where: { id: decoded.id } })
                .then(user => {
                    if (user) {
                        (req as AuthRequest).user = {
                            id: decoded.id,
                            username: decoded.username,
                            isAdmin: user.isAdmin
                        };
                        console.log(`[AUTH MIDDLEWARE] Token válido, usuário: ${decoded.id} (${decoded.username}), isAdmin: ${user.isAdmin}`);
                    } else {
                        (req as AuthRequest).user = decoded;
                        console.log(`[AUTH MIDDLEWARE] Token válido, usuário: ${decoded.id} (${decoded.username})`);
                    }
                    next();
                })
                .catch(err => {
                    console.error('Erro ao buscar informações do usuário:', err);
                    (req as AuthRequest).user = decoded;
                    next();
                });
        } catch (error) {
            console.error('Erro ao verificar token:', error);
            next();
        }
    } else {
        next();
    }
};
