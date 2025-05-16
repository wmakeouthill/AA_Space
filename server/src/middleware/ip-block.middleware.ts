import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { BlockedIp } from '../models/entities';

export const checkIpBlocked = async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress;

    if (!ip) {
        // Se não for possível obter o IP, permite continuar, mas loga um aviso
        console.warn('Não foi possível obter o endereço IP do cliente.');
        return next();
    }

    try {
        const blockedIpRepository = AppDataSource.getRepository(BlockedIp);
        const entry = await blockedIpRepository.findOne({ where: { ipAddress: ip } });

        if (entry) {
            return res.status(403).json({ message: 'Acesso bloqueado para este endereço IP.' });
        }

        return next();
    } catch (error) {
        console.error('Erro ao verificar IP bloqueado:', error);
        // Em caso de erro na verificação, permite continuar para não bloquear usuários indevidamente
        return next();
    }
};
