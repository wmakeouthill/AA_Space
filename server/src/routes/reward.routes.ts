import { Router } from 'express';
import { authenticateToken, isAdmin, isLeaderOrAdmin } from '../middleware/auth.middleware'; // Ajuste o caminho conforme necessário
import { getAllRewards, getUserRewards, grantRewardToUser, seedRewards } from '../controllers/reward.controller';

const router = Router();

// Rota para popular as recompensas iniciais (apenas admin)
// Considere remover ou proteger melhor esta rota em produção
router.post('/seed', authenticateToken, isAdmin, seedRewards);

// Rota para listar todas as recompensas (acessível por líderes/padrinhos/madrinhas e admins)
router.get('/', authenticateToken, isLeaderOrAdmin, getAllRewards);

// Rota para buscar as recompensas de um usuário específico (acessível por usuários autenticados para verem as próprias, ou líderes/admins para verem de outros)
// A lógica de quem pode ver o quê pode ser refinada no serviço ou aqui, se necessário.
router.get('/user/:userId', authenticateToken, getUserRewards);

// Rota para conceder uma recompensa a um usuário (apenas líderes/padrinhos/madrinhas e admins)
router.post('/grant', authenticateToken, isLeaderOrAdmin, grantRewardToUser);

export default router;
