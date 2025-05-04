import { Router } from 'express';
import { getPosts, getPost, createPost, createComment, likePost, getComments, likeComment } from '../controllers/post.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Rotas públicas
router.get('/', getPosts);
router.get('/:id', getPost);
router.get('/:postId/comments', getComments);

// Rotas autenticadas
router.post('/', authMiddleware, createPost);
router.post('/:postId/comments', authMiddleware, createComment);
router.post('/:postId/like', authMiddleware, likePost);
router.post('/:postId/comments/:commentId/like', authMiddleware, likeComment);

export default router;
