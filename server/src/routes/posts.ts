import { Router } from 'express';
import { getPosts, getPost, createPost, createComment, likePost, getComments, likeComment } from '../controllers/post.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Rotas autenticadas para garantir persistência do like por usuário
router.get('/', authMiddleware, getPosts);
router.get('/:id', authMiddleware, getPost);
router.get('/:postId/comments', authMiddleware, getComments);

// Rotas autenticadas
router.post('/', authMiddleware, createPost);
router.post('/:postId/comments', authMiddleware, createComment);
router.post('/:postId/like', authMiddleware, likePost);
router.post('/:postId/comments/:commentId/like', authMiddleware, likeComment);

export default router;
