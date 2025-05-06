import express from 'express';
import { register, login, validateToken, promoteToAdmin } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/validate', authMiddleware, validateToken);
router.post('/promote', authMiddleware, promoteToAdmin);

export default router;
