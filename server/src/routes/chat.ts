import { Router } from 'express';
import { createConversation, getAvailableUsers, getConversationMessages, getUserConversations, sendMessage } from '../controllers/chat.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Todas as rotas de chat exigem autenticação
router.use(authMiddleware);

// Rotas para conversas
router.get('/', getUserConversations);
router.post('/', createConversation);
router.get('/users', getAvailableUsers);
router.get('/:id/messages', getConversationMessages);
router.post('/:id/messages', sendMessage);

export default router;
