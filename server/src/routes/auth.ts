import express from 'express';
import { register, login, validateToken, promoteToAdmin, removeAdmin, transferMainAdmin, listAdmins } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();

// Rota de debug para verificar se o path está correto
router.get('/promote-check', (req, res) => {
    console.log('[DEBUG] Rota /api/auth/promote-check acessada');
    res.status(200).json({ message: 'Rota de promoção está configurada corretamente' });
});

// Rota para listar todos os administradores
router.get('/admins', authMiddleware, listAdmins);

// Rota para promoção de administradores
router.post('/make-admin', authMiddleware, promoteToAdmin);

// Rota para remover privilégios de administrador
router.post('/remove-admin', authMiddleware, removeAdmin);

// Rota para transferir o título de administrador principal
router.post('/transfer-admin', authMiddleware, transferMainAdmin);

router.post('/register', register);
router.post('/login', login);
router.get('/validate', authMiddleware, validateToken);
router.post('/promote', authMiddleware, promoteToAdmin); // Mantemos a rota original também

export default router;
