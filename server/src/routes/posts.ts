import { Router } from 'express';
import { getPosts, getPost, createPost, createComment, likePost, getComments, likeComment } from '../controllers/post.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Todas as rotas passam pelo middleware de autenticação, mas algumas permitem acesso mesmo sem token
router.use(authMiddleware);

router.get('/', getPosts);
router.get('/:id', getPost);
router.get('/:postId/comments', getComments);
router.post('/', createPost);
router.post('/:postId/comments', createComment);
router.post('/:postId/like', likePost);
router.post('/:postId/comments/:commentId/like', likeComment);

export default router;
