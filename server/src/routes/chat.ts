import { Router } from 'express';
import { createConversation, getAvailableUsers, getConversationMessages, getUserConversations, sendMessage, uploadGroupChatAvatar, removeGroupChatAvatar, markMessagesAsRead } from '../controllers/chat.controller';
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
router.post('/:id/messages/mark-as-read', markMessagesAsRead); // Nova rota

router.post('/:id/avatar', uploadGroupChatAvatar); // Route to upload group avatar
router.delete('/:id/avatar', removeGroupChatAvatar); // Route to remove group avatar

export default router;
