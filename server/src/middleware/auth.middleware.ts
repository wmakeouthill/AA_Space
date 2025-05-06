import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
    user?: { id: number; username: string };
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { id: number; username: string };
            (req as AuthRequest).user = decoded;
        } catch (error) {
            console.error('Erro ao verificar token:', error);
        }
    }

    // Permite que a requisição continue mesmo sem token
    next();
};
