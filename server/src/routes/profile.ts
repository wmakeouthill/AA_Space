import { Router } from 'express';
import { uploadProfileImage, removeProfileImage, getUserProfileInfo, getCurrentUserProfile } from '../controllers/profile.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Todas as rotas de perfil exigem autenticação
router.use(authMiddleware);

// Rotas para gerenciar o perfil do usuário
router.get('/me', getCurrentUserProfile);
router.get('/:id', getUserProfileInfo);
router.post('/image', uploadProfileImage);
router.delete('/image', removeProfileImage);

export default router;