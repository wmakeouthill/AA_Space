"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getComments = exports.likeComment = exports.likePost = exports.createComment = exports.createPost = exports.getPost = exports.getPosts = void 0;
const database_1 = require("../config/database");
const entities_1 = require("../models/entities");
const getPosts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id; // Pode ser undefined para usuários não autenticados
        const postRepository = database_1.AppDataSource.getRepository(entities_1.Post);
        const postLikeRepository = database_1.AppDataSource.getRepository(entities_1.PostLike);
        const posts = yield postRepository
            .createQueryBuilder('post')
            .leftJoinAndSelect('post.user', 'user')
            .leftJoinAndSelect('post.comments', 'comments')
            .leftJoinAndSelect('post.postLikes', 'postLikes')
            .orderBy('post.created_at', 'DESC')
            .getMany();
        const formattedPosts = yield Promise.all(posts.map((post) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c;
            let userLiked = false;
            let totalLikes = 0;
            // Verifica se o usuário atual deu like (apenas se estiver autenticado)
            if (userId) {
                const userLike = yield postLikeRepository.findOne({
                    where: {
                        post: { id: post.id },
                        user: { id: userId }
                    }
                });
                userLiked = (_a = userLike === null || userLike === void 0 ? void 0 : userLike.userLiked) !== null && _a !== void 0 ? _a : false;
            }
            // Conta o total de likes ativos
            totalLikes = yield postLikeRepository.count({
                where: {
                    post: { id: post.id },
                    userLiked: true
                }
            });
            return Object.assign(Object.assign({}, post), { author: post.anonymous ? 'Anônimo' : (_b = post.user) === null || _b === void 0 ? void 0 : _b.username, comment_count: ((_c = post.comments) === null || _c === void 0 ? void 0 : _c.length) || 0, likes: totalLikes, userLiked });
        })));
        res.json(formattedPosts);
    }
    catch (error) {
        console.error('Erro ao buscar posts:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});
exports.getPosts = getPosts;
const getPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const postRepository = database_1.AppDataSource.getRepository(entities_1.Post);
        const postLikeRepository = database_1.AppDataSource.getRepository(entities_1.PostLike);
        const post = yield postRepository
            .createQueryBuilder('post')
            .leftJoinAndSelect('post.user', 'user')
            .leftJoinAndSelect('post.postLikes', 'postLikes')
            .where('post.id = :id', { id: parseInt(id) })
            .getOne();
        if (!post) {
            return res.status(404).json({ message: 'Post não encontrado' });
        }
        // Verifica se o usuário atual deu like
        const userLike = userId ? yield postLikeRepository.findOne({
            where: {
                post: { id: post.id },
                user: { id: userId }
            }
        }) : null;
        // Conta o total de likes ativos
        const totalLikes = yield postLikeRepository.count({
            where: {
                post: { id: post.id },
                userLiked: true
            }
        });
        const formattedPost = Object.assign(Object.assign({}, post), { author: post.anonymous ? 'Anônimo' : (_b = post.user) === null || _b === void 0 ? void 0 : _b.username, likes: totalLikes, userLiked: (_c = userLike === null || userLike === void 0 ? void 0 : userLike.userLiked) !== null && _c !== void 0 ? _c : false });
        res.json(formattedPost);
    }
    catch (error) {
        console.error('Erro ao buscar post:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});
exports.getPost = getPost;
const createPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { title, content, anonymous = false, guestNickname } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const postRepository = database_1.AppDataSource.getRepository(entities_1.Post);
        const userRepository = database_1.AppDataSource.getRepository(entities_1.User);
        let userData = undefined;
        let author = 'Anônimo';
        if (userId) {
            // Usuário autenticado
            const user = yield userRepository.findOne({ where: { id: userId } });
            if (user) {
                userData = { id: user.id };
                author = anonymous ? 'Anônimo' : user.username;
            }
        }
        else if (guestNickname) {
            // Usuário convidado com apelido
            author = `Convidado: ${guestNickname}`;
        }
        const postData = {
            title,
            content,
            anonymous,
            user: userData,
            author,
            likes: 0
        };
        const newPost = postRepository.create(postData);
        yield postRepository.save(newPost);
        const responsePost = Object.assign(Object.assign({}, newPost), { author // Inclui o autor formatado na resposta
         });
        res.status(201).json(responsePost);
    }
    catch (error) {
        console.error('Erro ao criar post:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});
exports.createPost = createPost;
const createComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { content, anonymous = false, guestNickname } = req.body;
        const { postId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const commentRepository = database_1.AppDataSource.getRepository(entities_1.Comment);
        const postRepository = database_1.AppDataSource.getRepository(entities_1.Post);
        const userRepository = database_1.AppDataSource.getRepository(entities_1.User);
        const post = yield postRepository.findOne({ where: { id: parseInt(postId) } });
        if (!post) {
            return res.status(404).json({ message: 'Post não encontrado' });
        }
        let userData = undefined;
        let author = 'Anônimo';
        if (userId) {
            const user = yield userRepository.findOne({ where: { id: userId } });
            if (user) {
                userData = { id: user.id };
                author = anonymous ? 'Anônimo' : user.username;
            }
        }
        else if (guestNickname) {
            author = `Convidado: ${guestNickname}`;
        }
        const commentData = {
            content,
            anonymous,
            user: userData,
            author,
            post: { id: post.id }
        };
        const newComment = commentRepository.create(commentData);
        yield commentRepository.save(newComment);
        const formattedComment = {
            id: newComment.id,
            content: newComment.content,
            author,
            created_at: newComment.created_at,
            post_id: post.id,
            anonymous: newComment.anonymous,
            likes: 0,
            userLiked: false
        };
        res.status(201).json(formattedComment);
    }
    catch (error) {
        console.error('Erro ao criar comentário:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});
exports.createComment = createComment;
const likePost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { postId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }
        const postLikeRepository = database_1.AppDataSource.getRepository(entities_1.PostLike);
        // Verifica se já existe um like deste usuário
        let existingLike = yield postLikeRepository.findOne({
            where: {
                post: { id: parseInt(postId) },
                user: { id: userId }
            }
        });
        let userLiked = false;
        if (existingLike) {
            // Se existe, alterna o estado do like
            existingLike.userLiked = !existingLike.userLiked;
            yield postLikeRepository.save(existingLike);
            userLiked = existingLike.userLiked;
        }
        else {
            // Se não existe, cria um novo like
            const newLike = postLikeRepository.create({
                post: { id: parseInt(postId) },
                user: { id: userId },
                userLiked: true
            });
            yield postLikeRepository.save(newLike);
            userLiked = true;
        }
        // Conta APENAS os likes ativos usando uma query SQL direta
        const result = yield postLikeRepository
            .createQueryBuilder('postLike')
            .select('COUNT(*)', 'count')
            .where('postLike.postId = :postId', { postId: parseInt(postId) })
            .andWhere('postLike.userLiked = :state', { state: true })
            .getRawOne();
        const totalLikes = Number(result === null || result === void 0 ? void 0 : result.count) || 0;
        return res.json({
            message: userLiked ? 'Post curtido' : 'Like removido',
            likes: totalLikes,
            userLiked: userLiked
        });
    }
    catch (error) {
        console.error('[LIKE POST] Erro:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});
exports.likePost = likePost;
const likeComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { commentId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }
        const commentRepository = database_1.AppDataSource.getRepository(entities_1.Comment);
        const commentLikeRepository = database_1.AppDataSource.getRepository(entities_1.CommentLike);
        const comment = yield commentRepository
            .createQueryBuilder('comment')
            .leftJoinAndSelect('comment.commentLikes', 'commentLikes')
            .where('comment.id = :id', { id: parseInt(commentId) })
            .getOne();
        if (!comment) {
            return res.status(404).json({ message: 'Comentário não encontrado' });
        }
        // Verifica se já existe um like deste usuário
        let existingLike = yield commentLikeRepository.findOne({
            where: {
                comment: { id: parseInt(commentId) },
                user: { id: userId }
            }
        });
        if (existingLike) {
            // Se existe, alterna o estado do like
            existingLike.userLiked = !existingLike.userLiked;
            yield commentLikeRepository.save(existingLike);
        }
        else {
            // Se não existe, cria um novo like
            const newLike = commentLikeRepository.create({
                comment: { id: parseInt(commentId) },
                user: { id: userId },
                userLiked: true
            });
            yield commentLikeRepository.save(newLike);
        }
        // Conta o total de likes ativos (onde userLiked = true)
        const totalLikes = yield commentLikeRepository.count({
            where: {
                comment: { id: parseInt(commentId) },
                userLiked: true
            }
        });
        // Verifica o estado atual do like do usuário
        const currentUserLike = yield commentLikeRepository.findOne({
            where: {
                comment: { id: parseInt(commentId) },
                user: { id: userId }
            }
        });
        return res.json({
            message: (currentUserLike === null || currentUserLike === void 0 ? void 0 : currentUserLike.userLiked) ? 'Comentário curtido' : 'Like removido',
            likes: totalLikes,
            userLiked: (_b = currentUserLike === null || currentUserLike === void 0 ? void 0 : currentUserLike.userLiked) !== null && _b !== void 0 ? _b : false
        });
    }
    catch (error) {
        console.error('Erro ao processar like no comentário:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});
exports.likeComment = likeComment;
const getComments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { postId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const commentRepository = database_1.AppDataSource.getRepository(entities_1.Comment);
        const commentLikeRepository = database_1.AppDataSource.getRepository(entities_1.CommentLike);
        const comments = yield commentRepository
            .createQueryBuilder('comment')
            .leftJoinAndSelect('comment.user', 'user')
            .leftJoinAndSelect('comment.post', 'post')
            .leftJoinAndSelect('comment.commentLikes', 'commentLikes')
            .where('comment.post.id = :postId', { postId: parseInt(postId) })
            .orderBy('comment.created_at', 'DESC')
            .getMany();
        const formattedComments = yield Promise.all(comments.map((comment) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            // Verifica se o usuário atual deu like
            const userLike = userId ? yield commentLikeRepository.findOne({
                where: {
                    comment: { id: comment.id },
                    user: { id: userId }
                }
            }) : null;
            // Conta o total de likes ativos
            const totalLikes = yield commentLikeRepository.count({
                where: {
                    comment: { id: comment.id },
                    userLiked: true
                }
            });
            return {
                id: comment.id,
                content: comment.content,
                author: comment.anonymous ? 'Anônimo' : (_a = comment.user) === null || _a === void 0 ? void 0 : _a.username,
                created_at: comment.created_at,
                post_id: parseInt(postId),
                anonymous: comment.anonymous,
                likes: totalLikes,
                userLiked: (_b = userLike === null || userLike === void 0 ? void 0 : userLike.userLiked) !== null && _b !== void 0 ? _b : false // Use o estado atual do like
            };
        })));
        res.json(formattedComments);
    }
    catch (error) {
        console.error('Erro ao buscar comentários:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});
exports.getComments = getComments;
