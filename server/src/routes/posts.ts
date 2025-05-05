import { Router } from 'express';
import { getPosts, getPost, createPost, createComment, likePost, getComments, likeComment } from '../controllers/post.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Rotas públicas (sem autenticação)
router.get('/', getPosts);
router.get('/:id', getPost);
router.get('/:postId/comments', getComments);
router.post('/', createPost);  // Permitir criação de posts anônimos
router.post('/:postId/comments', createComment);  // Permitir comentários anônimos

// Rotas autenticadas
router.post('/:postId/like', authMiddleware, likePost);
router.post('/:postId/comments/:commentId/like', authMiddleware, likeComment);

export default router;
