import { Router, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { BlockedIp, User } from '../models/entities'; // Adicionado User para verificar isAdmin
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware'; // Importar authMiddleware e AuthRequest

const router = Router();
const blockedIpRepository = AppDataSource.getRepository(BlockedIp);

// Middleware para verificar se o usuário é admin
const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ message: 'Acesso negado. Requer privilégios de administrador.' });
  }
};

// Rota para listar todos os IPs bloqueados (apenas admin)
router.get('/blocked-ips', authMiddleware, isAdmin, async (req: AuthRequest, res) => {
    try {
        const blockedIps = await blockedIpRepository.find();
        res.json(blockedIps);
    } catch (error) {
        console.error('Erro ao listar IPs bloqueados:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao listar IPs bloqueados' });
    }
});

// Rota para bloquear um novo IP (apenas admin)
router.post('/block-ip', authMiddleware, isAdmin, async (req: AuthRequest, res) => {
    const { ipAddress, reason } = req.body;

    if (!ipAddress) {
        return res.status(400).json({ message: 'Endereço IP é obrigatório' });
    }

    // Validação simples de formato de IP (pode ser melhorada)
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^::1$|^localhost$/;
    if (!ipRegex.test(ipAddress) && ipAddress !== '127.0.0.1') {
        // Adicionada verificação para localhost e 127.0.0.1, que são válidos mas podem não passar no regex simples
        // Regex mais complexos podem ser usados para IPv4 e IPv6
        // Este regex básico cobre IPv4 e o alias 'localhost' e '::1' (IPv6 loopback)
        // Para um regex mais robusto que cubra IPv4 e IPv6 de forma mais completa, considere bibliotecas especializadas ou regex mais detalhados.
        // Exemplo simples para IPv4:
        // const ipv4Regex = /^((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.){3}(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])$/;
        // if (!ipv4Regex.test(ipAddress) && ipAddress !== 'localhost' && ipAddress !== '::1' && ipAddress !== '127.0.0.1') {
        // return res.status(400).json({ message: 'Formato de endereço IP inválido' });
    }

    try {
        const existingEntry = await blockedIpRepository.findOne({ where: { ipAddress } });
        if (existingEntry) {
            return res.status(409).json({ message: 'Este IP já está bloqueado' });
        }

        const newBlockedIp = new BlockedIp();
        newBlockedIp.ipAddress = ipAddress;
        newBlockedIp.reason = reason || null;

        await blockedIpRepository.save(newBlockedIp);
        res.status(201).json({ message: 'IP bloqueado com sucesso', blockedIp: newBlockedIp });
    } catch (error) {
        console.error('Erro ao bloquear IP:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao bloquear IP' });
    }
});

// Rota para desbloquear um IP (apenas admin)
router.delete('/unblock-ip/:ipAddress', authMiddleware, isAdmin, async (req: AuthRequest, res) => {
    const { ipAddress } = req.params;

    if (!ipAddress) {
        return res.status(400).json({ message: 'Endereço IP é obrigatório' });
    }

    try {
        const result = await blockedIpRepository.delete({ ipAddress });
        if (result.affected === 0) {
            return res.status(404).json({ message: 'IP não encontrado na lista de bloqueio' });
        }
        res.status(200).json({ message: 'IP desbloqueado com sucesso' });
    } catch (error) {
        console.error('Erro ao desbloquear IP:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao desbloquear IP' });
    }
});

export default router;
