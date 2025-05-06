"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const post_controller_1 = require("../controllers/post.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Todas as rotas passam pelo middleware de autenticação, mas algumas permitem acesso mesmo sem token
router.use(auth_middleware_1.authMiddleware);
router.get('/', post_controller_1.getPosts);
router.get('/:id', post_controller_1.getPost);
router.get('/:postId/comments', post_controller_1.getComments);
router.post('/', post_controller_1.createPost);
router.post('/:postId/comments', post_controller_1.createComment);
router.post('/:postId/like', post_controller_1.likePost);
router.post('/:postId/comments/:commentId/like', post_controller_1.likeComment);
router.delete('/:id', post_controller_1.deletePost);
router.delete('/:postId/comments/:commentId', post_controller_1.deleteComment);
// Adicionando uma rota POST alternativa para exclusão de posts
router.post('/:id/delete', post_controller_1.deletePost);
// Adicionando uma rota POST alternativa para exclusão de comentários (para navegadores que não suportam DELETE)
router.post('/:postId/comments/:commentId/delete', post_controller_1.deleteComment);
exports.default = router;
