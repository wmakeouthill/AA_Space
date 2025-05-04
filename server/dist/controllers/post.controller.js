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
        const postRepository = database_1.AppDataSource.getRepository(entities_1.Post);
        const posts = yield postRepository
            .createQueryBuilder('post')
            .leftJoinAndSelect('post.user', 'user')
            .leftJoinAndSelect('post.comments', 'comments')
            .leftJoinAndSelect('post.postLikes', 'postLikes')
            .leftJoinAndSelect('postLikes.user', 'likeUser')
            .orderBy('post.created_at', 'DESC')
            .getMany();
        const formattedPosts = posts.map(post => {
            var _a, _b, _c, _d;
            return (Object.assign(Object.assign({}, post), { author: post.anonymous ? 'Anônimo' : (_a = post.user) === null || _a === void 0 ? void 0 : _a.username, comment_count: ((_b = post.comments) === null || _b === void 0 ? void 0 : _b.length) || 0, likes: ((_c = post.postLikes) === null || _c === void 0 ? void 0 : _c.length) || 0, userLiked: userId ? (_d = post.postLikes) === null || _d === void 0 ? void 0 : _d.some(like => like.user.id === userId) : false }));
        });
        res.json(formattedPosts);
    }
    catch (error) {
        console.error('Erro ao buscar posts:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});
exports.getPosts = getPosts;
const getPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const postRepository = database_1.AppDataSource.getRepository(entities_1.Post);
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
        const formattedPost = Object.assign(Object.assign({}, post), { author: post.anonymous ? 'Anônimo' : (_b = post.user) === null || _b === void 0 ? void 0 : _b.username, likes: ((_c = post.postLikes) === null || _c === void 0 ? void 0 : _c.length) || 0, userLiked: userId ? (_d = post.postLikes) === null || _d === void 0 ? void 0 : _d.some(like => like.user.id === userId) : false });
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
        const { title, content, anonymous = false } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const postRepository = database_1.AppDataSource.getRepository(entities_1.Post);
        const userRepository = database_1.AppDataSource.getRepository(entities_1.User);
        let userData = undefined;
        if (userId) {
            const user = yield userRepository.findOne({ where: { id: userId } });
            if (user) {
                userData = { id: user.id };
            }
        }
        const postData = {
            title,
            content,
            anonymous,
            user: userData,
            likes: 0
        };
        const newPost = postRepository.create(postData);
        yield postRepository.save(newPost);
        res.status(201).json(newPost);
    }
    catch (error) {
        console.error('Erro ao criar post:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});
exports.createPost = createPost;
const createComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { content, anonymous = false } = req.body;
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
        if (userId) {
            const user = yield userRepository.findOne({ where: { id: userId } });
            if (user) {
                userData = { id: user.id };
            }
        }
        const commentData = {
            content,
            anonymous,
            user: userData,
            post: { id: post.id }
        };
        const newComment = commentRepository.create(commentData);
        yield commentRepository.save(newComment);
        // Carregar o comentário com as relações e formatar a resposta
        const savedComment = yield commentRepository.findOne({
            where: { id: newComment.id },
            relations: ['user', 'post']
        });
        if (!savedComment) {
            throw new Error('Erro ao carregar o comentário salvo');
        }
        const formattedComment = {
            id: savedComment.id,
            content: savedComment.content,
            author: savedComment.anonymous ? 'Anônimo' : (_c = (_b = savedComment.user) === null || _b === void 0 ? void 0 : _b.username) !== null && _c !== void 0 ? _c : 'Usuário Desconhecido',
            created_at: savedComment.created_at,
            post_id: savedComment.post.id,
            anonymous: savedComment.anonymous
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
        const postRepository = database_1.AppDataSource.getRepository(entities_1.Post);
        const likeRepository = database_1.AppDataSource.getRepository(entities_1.PostLike);
        const post = yield postRepository.findOne({
            where: { id: parseInt(postId) }
        });
        if (!post) {
            return res.status(404).json({ message: 'Post não encontrado' });
        }
        const existingLike = yield likeRepository.findOne({
            where: {
                post: { id: parseInt(postId) },
                user: { id: userId }
            }
        });
        if (existingLike) {
            // Se o like já existe, remove o like
            yield likeRepository.remove(existingLike);
            post.likes = Math.max(0, post.likes - 1);
            yield postRepository.save(post);
            return res.json({
                message: 'Like removido',
                likes: post.likes,
                userLiked: false
            });
        }
        else {
            // Se o like não existe, cria um novo
            const newLike = likeRepository.create({
                post: { id: parseInt(postId) },
                user: { id: userId }
            });
            yield likeRepository.save(newLike);
            post.likes++;
            yield postRepository.save(post);
            return res.json({
                message: 'Post curtido',
                likes: post.likes,
                userLiked: true
            });
        }
    }
    catch (error) {
        console.error('Erro ao processar like:', error);
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
        const likeRepository = database_1.AppDataSource.getRepository(entities_1.CommentLike);
        const comment = yield commentRepository
            .createQueryBuilder('comment')
            .leftJoinAndSelect('comment.commentLikes', 'commentLikes')
            .leftJoinAndSelect('commentLikes.user', 'user')
            .where('comment.id = :id', { id: parseInt(commentId) })
            .getOne();
        if (!comment) {
            return res.status(404).json({ message: 'Comentário não encontrado' });
        }
        const existingLike = yield likeRepository.findOne({
            where: {
                comment: { id: parseInt(commentId) },
                user: { id: userId }
            }
        });
        if (existingLike) {
            yield likeRepository.remove(existingLike);
            comment.likes = Math.max(0, (comment.likes || 0) - 1);
            yield commentRepository.save(comment);
            return res.json({
                message: 'Like removido',
                likes: comment.commentLikes.length - 1,
                userLiked: false
            });
        }
        const newLike = likeRepository.create({
            comment: { id: parseInt(commentId) },
            user: { id: userId }
        });
        yield likeRepository.save(newLike);
        comment.likes = (comment.likes || 0) + 1;
        yield commentRepository.save(comment);
        return res.json({
            message: 'Comentário curtido',
            likes: comment.commentLikes.length + 1,
            userLiked: true
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
        const comments = yield commentRepository
            .createQueryBuilder('comment')
            .leftJoinAndSelect('comment.user', 'user')
            .leftJoinAndSelect('comment.post', 'post')
            .leftJoinAndSelect('comment.commentLikes', 'commentLikes')
            .leftJoinAndSelect('commentLikes.user', 'likeUser')
            .where('comment.post.id = :postId', { postId: parseInt(postId) })
            .orderBy('comment.created_at', 'DESC')
            .getMany();
        const formattedComments = comments.map(comment => {
            var _a, _b, _c;
            return ({
                id: comment.id,
                content: comment.content,
                author: comment.anonymous ? 'Anônimo' : (_a = comment.user) === null || _a === void 0 ? void 0 : _a.username,
                created_at: comment.created_at,
                post_id: parseInt(postId),
                anonymous: comment.anonymous,
                likes: ((_b = comment.commentLikes) === null || _b === void 0 ? void 0 : _b.length) || 0,
                userLiked: userId ? (_c = comment.commentLikes) === null || _c === void 0 ? void 0 : _c.some(like => like.user.id === userId) : false
            });
        });
        res.json(formattedComments);
    }
    catch (error) {
        console.error('Erro ao buscar comentários:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});
exports.getComments = getComments;
