"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const post_controller_1 = require("../controllers/post.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Rotas públicas (sem autenticação)
router.get('/', post_controller_1.getPosts);
router.get('/:id', post_controller_1.getPost);
router.get('/:postId/comments', post_controller_1.getComments);
router.post('/', post_controller_1.createPost); // Permitir criação de posts anônimos
router.post('/:postId/comments', post_controller_1.createComment); // Permitir comentários anônimos
// Rotas que requerem autenticação
router.post('/:postId/like', auth_middleware_1.authMiddleware, post_controller_1.likePost);
router.post('/:postId/comments/:commentId/like', auth_middleware_1.authMiddleware, post_controller_1.likeComment);
exports.default = router;
