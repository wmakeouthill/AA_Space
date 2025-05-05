"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const post_controller_1 = require("../controllers/post.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Rotas autenticadas para garantir persistência do like por usuário
router.get('/', auth_middleware_1.authMiddleware, post_controller_1.getPosts);
router.get('/:id', auth_middleware_1.authMiddleware, post_controller_1.getPost);
router.get('/:postId/comments', auth_middleware_1.authMiddleware, post_controller_1.getComments);
// Rotas autenticadas
router.post('/', auth_middleware_1.authMiddleware, post_controller_1.createPost);
router.post('/:postId/comments', auth_middleware_1.authMiddleware, post_controller_1.createComment);
router.post('/:postId/like', auth_middleware_1.authMiddleware, post_controller_1.likePost);
router.post('/:postId/comments/:commentId/like', auth_middleware_1.authMiddleware, post_controller_1.likeComment);
exports.default = router;
