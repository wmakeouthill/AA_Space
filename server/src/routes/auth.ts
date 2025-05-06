import express from 'express';
import { register, login, validateToken, promoteToAdmin } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();

// Rota de debug para verificar se o path está correto
router.get('/promote-check', (req, res) => {
    console.log('[DEBUG] Rota /api/auth/promote-check acessada');
    res.status(200).json({ message: 'Rota de promoção está configurada corretamente' });
});

// Rota alternativa para promoção de administradores
router.post('/make-admin', authMiddleware, promoteToAdmin);

router.post('/register', register);
router.post('/login', login);
router.get('/validate', authMiddleware, validateToken);
router.post('/promote', authMiddleware, promoteToAdmin); // Mantemos a rota original também

export default router;
