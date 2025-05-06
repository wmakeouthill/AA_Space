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
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        console.log(`[GET POSTS] Buscando posts para usuário ${userId}`);
        const postRepository = database_1.AppDataSource.getRepository(entities_1.Post);
        const postLikeRepository = database_1.AppDataSource.getRepository(entities_1.PostLike);
        const posts = yield postRepository
            .createQueryBuilder('post')
            .leftJoinAndSelect('post.user', 'user')
            .leftJoinAndSelect('post.comments', 'comments')
            .leftJoinAndSelect('post.postLikes', 'postLikes')
            .leftJoinAndSelect('postLikes.user', 'likeUser')
            .orderBy('post.created_at', 'DESC')
            .getMany();
        const formattedPosts = yield Promise.all(posts.map((post) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            // Verifica se existe like do usuário
            const hasLike = userId ? yield postLikeRepository.findOne({
                where: {
                    post: { id: post.id },
                    user: { id: userId }
                }
            }) : null;
            console.log(`[GET POSTS] Post ${post.id} - Like do usuário: ${!!hasLike}`);
            // Conta o total de likes
            const totalLikes = yield postLikeRepository.count({
                where: {
                    post: { id: post.id }
                }
            });
            console.log(`[GET POSTS] Post ${post.id} - Total de likes: ${totalLikes}`);
            const author = post.anonymous ? 'Anônimo' : (post.originalAuthor || post.author);
            return Object.assign(Object.assign({}, post), { author, comment_count: ((_a = post.comments) === null || _a === void 0 ? void 0 : _a.length) || 0, likes: totalLikes, userLiked: !!hasLike });
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
    var _a;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        console.log(`[GET POST] Buscando post ${id} para usuário ${userId}`);
        const postRepository = database_1.AppDataSource.getRepository(entities_1.Post);
        const postLikeRepository = database_1.AppDataSource.getRepository(entities_1.PostLike);
        // Modificado para incluir um join com postLikes e user
        const post = yield postRepository
            .createQueryBuilder('post')
            .leftJoinAndSelect('post.user', 'user')
            .leftJoinAndSelect('post.postLikes', 'postLikes')
            .leftJoinAndSelect('postLikes.user', 'likeUser')
            .where('post.id = :id', { id: parseInt(id) })
            .getOne();
        if (!post) {
            return res.status(404).json({ message: 'Post não encontrado' });
        }
        // Verifica se o usuário atual tem um like neste post
        const userLike = userId ? yield postLikeRepository.findOne({
            where: {
                post: { id: post.id },
                user: { id: userId }
            }
        }) : null;
        console.log(`[GET POST] Like do usuário encontrado: ${!!userLike}`);
        const totalLikes = yield postLikeRepository.count({
            where: {
                post: { id: post.id }
            }
        });
        console.log(`[GET POST] Total de likes: ${totalLikes}`);
        const author = post.anonymous ? 'Anônimo' : (post.originalAuthor || post.author);
        const formattedPost = Object.assign(Object.assign({}, post), { author, likes: totalLikes, userLiked: !!userLike });
        console.log(`[GET POST] Resposta final - userLiked: ${!!userLike}, totalLikes: ${totalLikes}`);
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
        let author;
        if (userId) {
            const user = yield userRepository.findOne({ where: { id: userId } });
            if (user) {
                userData = { id: user.id };
                author = user.username;
            }
            else {
                author = 'Anônimo';
            }
        }
        else if (guestNickname) {
            author = `Convidado: ${guestNickname}`;
        }
        else {
            author = 'Anônimo';
        }
        const postData = {
            title,
            content,
            anonymous,
            user: userData,
            author,
            originalAuthor: author
        };
        const newPost = postRepository.create(postData);
        yield postRepository.save(newPost);
        const responsePost = Object.assign(Object.assign({}, newPost), { author: anonymous ? 'Anônimo' : author });
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
        let author;
        if (userId) {
            const user = yield userRepository.findOne({ where: { id: userId } });
            if (user) {
                userData = { id: user.id };
                author = user.username;
            }
            else {
                author = 'Anônimo';
            }
        }
        else if (guestNickname) {
            author = `Convidado: ${guestNickname}`;
        }
        else {
            author = 'Anônimo';
        }
        const commentData = {
            content,
            anonymous: anonymous,
            user: userData,
            author,
            originalAuthor: author,
            post: { id: post.id }
        };
        const newComment = commentRepository.create(commentData);
        yield commentRepository.save(newComment);
        const formattedComment = {
            id: newComment.id,
            content: newComment.content,
            author: anonymous ? 'Anônimo' : author,
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
        console.log(`[LIKE POST] Recebida requisição de like - postId: ${postId}, userId: ${userId}`);
        if (!userId) {
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }
        const postRepository = database_1.AppDataSource.getRepository(entities_1.Post);
        const postLikeRepository = database_1.AppDataSource.getRepository(entities_1.PostLike);
        const post = yield postRepository.findOne({
            where: { id: parseInt(postId) }
        });
        if (!post) {
            return res.status(404).json({ message: 'Post não encontrado' });
        }
        // Verifica se já existe um like deste usuário
        let existingLike = yield postLikeRepository.findOne({
            where: {
                post: { id: parseInt(postId) },
                user: { id: userId }
            }
        });
        console.log(`[LIKE POST] Like existente: ${!!existingLike}`);
        // Se existe like, remove; se não existe, cria
        if (existingLike) {
            yield postLikeRepository.remove(existingLike);
            console.log(`[LIKE POST] Like removido para post ${postId}`);
        }
        else {
            const newLike = postLikeRepository.create({
                post: { id: parseInt(postId) },
                user: { id: userId }
            });
            yield postLikeRepository.save(newLike);
            console.log(`[LIKE POST] Novo like criado para post ${postId}`);
        }
        // Verifica novamente se existe like para retornar o estado atual
        const userHasLike = yield postLikeRepository.findOne({
            where: {
                post: { id: parseInt(postId) },
                user: { id: userId }
            }
        });
        // Conta o total de likes (de todos os usuários)
        const totalLikes = yield postLikeRepository.count({
            where: {
                post: { id: parseInt(postId) }
            }
        });
        console.log(`[LIKE POST] Estado final - userHasLike: ${!!userHasLike}, totalLikes: ${totalLikes}`);
        return res.json({
            message: userHasLike ? 'Post curtido' : 'Like removido',
            likes: totalLikes,
            userLiked: !!userHasLike
        });
    }
    catch (error) {
        console.error('[LIKE POST] Erro:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});
exports.likePost = likePost;
const likeComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { commentId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }
        const commentRepository = database_1.AppDataSource.getRepository(entities_1.Comment);
        const commentLikeRepository = database_1.AppDataSource.getRepository(entities_1.CommentLike);
        const comment = yield commentRepository.findOne({
            where: { id: parseInt(commentId) }
        });
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
        // Se existe like, remove; se não existe, cria
        if (existingLike) {
            yield commentLikeRepository.remove(existingLike);
        }
        else {
            const newLike = commentLikeRepository.create({
                comment: { id: parseInt(commentId) },
                user: { id: userId }
            });
            yield commentLikeRepository.save(newLike);
        }
        // Verifica novamente se existe like para retornar o estado atual
        const userHasLike = yield commentLikeRepository.findOne({
            where: {
                comment: { id: parseInt(commentId) },
                user: { id: userId }
            }
        });
        // Conta o total de likes (de todos os usuários)
        const totalLikes = yield commentLikeRepository.count({
            where: {
                comment: { id: parseInt(commentId) }
            }
        });
        return res.json({
            message: userHasLike ? 'Comentário curtido' : 'Like removido',
            likes: totalLikes, // Número total de likes
            userLiked: !!userHasLike // Boolean indicando se este usuário tem like
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
            .where('comment.post.id = :postId', { postId: parseInt(postId) })
            .orderBy('comment.created_at', 'DESC')
            .getMany();
        const formattedComments = yield Promise.all(comments.map((comment) => __awaiter(void 0, void 0, void 0, function* () {
            // Verifica se existe like do usuário
            const hasLike = userId ? yield commentLikeRepository.findOne({
                where: {
                    comment: { id: comment.id },
                    user: { id: userId }
                }
            }) : null;
            // Conta o total de likes
            const totalLikes = yield commentLikeRepository.count({
                where: {
                    comment: { id: comment.id }
                }
            });
            const author = comment.anonymous ? 'Anônimo' : (comment.originalAuthor || comment.author);
            return {
                id: comment.id,
                content: comment.content,
                author,
                created_at: comment.created_at,
                post_id: parseInt(postId),
                anonymous: comment.anonymous,
                likes: totalLikes,
                userLiked: !!hasLike
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
