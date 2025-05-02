import express from 'express';
import { getPosts, getPost, createPost, createComment, likePost } from '../controllers/post.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();

// Rotas públicas
router.get('/', getPosts);
router.get('/:id', getPost);

// Rotas protegidas
router.post('/', authMiddleware, createPost);
router.post('/:postId/comments', authMiddleware, createComment);
router.post('/:postId/like', authMiddleware, likePost);

export default router;
