import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
    user?: { id: number; username: string };
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
            (req as AuthRequest).user = decoded;
            console.log(`[AUTH MIDDLEWARE] Token válido, usuário: ${decoded.id} (${decoded.username})`);
        } catch (error) {
            console.error('Erro ao verificar token:', error);
        }
    }

    // Permite que a requisição continue mesmo sem token
    next();
};
