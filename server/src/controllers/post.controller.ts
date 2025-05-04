import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Post, Comment, PostLike, User, CommentLike } from '../models/entities';
import { DeepPartial } from 'typeorm';

interface AuthRequest extends Request {
    user?: { id: number; username: string };
}

export const getPosts = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        const postRepository = AppDataSource.getRepository(Post);
        const postLikeRepository = AppDataSource.getRepository(PostLike);

        const posts = await postRepository
            .createQueryBuilder('post')
            .leftJoinAndSelect('post.user', 'user')
            .leftJoinAndSelect('post.comments', 'comments')
            .leftJoinAndSelect('post.postLikes', 'postLikes')
            .leftJoinAndSelect('postLikes.user', 'likeUser')
            .orderBy('post.created_at', 'DESC')
            .getMany();

        const formattedPosts = await Promise.all(posts.map(async post => {
            // Busca o registro específico do like do usuário atual
            let userLike = null;
            if (userId) {
                userLike = await postLikeRepository.findOne({
                    where: {
                        post: { id: post.id },
                        user: { id: userId }
                    }
                });
            }

            return {
                ...post,
                author: post.anonymous ? 'Anônimo' : post.user?.username,
                comment_count: post.comments?.length || 0,
                likes: post.postLikes?.length || 0, // Mantém a contagem total de likes
                userLiked: userLike?.userLiked || false // Usa o valor específico do usuário
            };
        }));

        res.json(formattedPosts);
    } catch (error) {
        console.error('Erro ao buscar posts:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
};

export const getPost = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.id;
        const postRepository = AppDataSource.getRepository(Post);
        const postLikeRepository = AppDataSource.getRepository(PostLike);

        const post = await postRepository
            .createQueryBuilder('post')
            .leftJoinAndSelect('post.user', 'user')
            .leftJoinAndSelect('post.postLikes', 'postLikes')
            .where('post.id = :id', { id: parseInt(id) })
            .getOne();

        if (!post) {
            return res.status(404).json({ message: 'Post não encontrado' });
        }

        // Verifica se existe um like deste usuário específico
        let userLiked = false;
        if (userId) {
            const like = await postLikeRepository.findOne({
                where: {
                    post: { id: post.id },
                    user: { id: userId }
                }
            });
            userLiked = !!like;
        }

        const formattedPost = {
            ...post,
            author: post.anonymous ? 'Anônimo' : post.user?.username,
            likes: post.postLikes?.length || 0,
            userLiked: userLiked
        };

        res.json(formattedPost);
    } catch (error) {
        console.error('Erro ao buscar post:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
};

export const createPost = async (req: AuthRequest, res: Response) => {
    try {
        const { title, content, anonymous = false } = req.body;
        const userId = req.user?.id;

        const postRepository = AppDataSource.getRepository(Post);
        const userRepository = AppDataSource.getRepository(User);

        let userData: DeepPartial<User> | undefined = undefined;
        if (userId) {
            const user = await userRepository.findOne({ where: { id: userId } });
            if (user) {
                userData = { id: user.id } as DeepPartial<User>;
            }
        }

        const postData: DeepPartial<Post> = {
            title,
            content,
            anonymous,
            user: userData,
            likes: 0
        };

        const newPost = postRepository.create(postData);
        await postRepository.save(newPost);
        res.status(201).json(newPost);
    } catch (error) {
        console.error('Erro ao criar post:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
};

export const createComment = async (req: AuthRequest, res: Response) => {
    try {
        const { content, anonymous = false } = req.body;
        const { postId } = req.params;
        const userId = req.user?.id;

        const commentRepository = AppDataSource.getRepository(Comment);
        const postRepository = AppDataSource.getRepository(Post);
        const userRepository = AppDataSource.getRepository(User);

        const post = await postRepository.findOne({ where: { id: parseInt(postId) } });
        if (!post) {
            return res.status(404).json({ message: 'Post não encontrado' });
        }

        let userData: DeepPartial<User> | undefined = undefined;
        if (userId) {
            const user = await userRepository.findOne({ where: { id: userId } });
            if (user) {
                userData = { id: user.id } as DeepPartial<User>;
            }
        }

        const commentData: DeepPartial<Comment> = {
            content,
            anonymous,
            user: userData,
            post: { id: post.id } as DeepPartial<Post>
        };

        const newComment = commentRepository.create(commentData);
        await commentRepository.save(newComment);

        // Carregar o comentário com as relações e formatar a resposta
        const savedComment = await commentRepository.findOne({
            where: { id: newComment.id },
            relations: ['user', 'post']
        });

        if (!savedComment) {
            throw new Error('Erro ao carregar o comentário salvo');
        }

        const formattedComment = {
            id: savedComment.id,
            content: savedComment.content,
            author: savedComment.anonymous ? 'Anônimo' : savedComment.user?.username ?? 'Usuário Desconhecido',
            created_at: savedComment.created_at,
            post_id: savedComment.post.id,
            anonymous: savedComment.anonymous
        };

        res.status(201).json(formattedComment);
    } catch (error) {
        console.error('Erro ao criar comentário:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
};

export const likePost = async (req: AuthRequest, res: Response) => {
    try {
        const { postId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }

        const postRepository = AppDataSource.getRepository(Post);
        const postLikeRepository = AppDataSource.getRepository(PostLike);

        const post = await postRepository
            .createQueryBuilder('post')
            .leftJoinAndSelect('post.postLikes', 'postLikes')
            .where('post.id = :id', { id: parseInt(postId) })
            .getOne();

        if (!post) {
            return res.status(404).json({ message: 'Post não encontrado' });
        }

        let existingLike = await postLikeRepository.findOne({
            where: {
                post: { id: parseInt(postId) },
                user: { id: userId }
            }
        });

        if (existingLike) {
            // Inverte o estado do like do usuário
            existingLike.userLiked = !existingLike.userLiked;
            await postLikeRepository.save(existingLike);

            return res.json({
                message: existingLike.userLiked ? 'Post curtido' : 'Like removido',
                likes: post.postLikes.length,
                userLiked: existingLike.userLiked
            });
        }

        // Cria um novo registro de like
        const newLike = postLikeRepository.create({
            post: { id: parseInt(postId) },
            user: { id: userId },
            userLiked: true
        });
        await postLikeRepository.save(newLike);

        return res.json({
            message: 'Post curtido',
            likes: post.postLikes.length + 1,
            userLiked: true
        });
    } catch (error) {
        console.error('Erro ao processar like:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
};

export const likeComment = async (req: AuthRequest, res: Response) => {
    try {
        const { commentId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }

        const commentRepository = AppDataSource.getRepository(Comment);
        const commentLikeRepository = AppDataSource.getRepository(CommentLike);

        const comment = await commentRepository
            .createQueryBuilder('comment')
            .leftJoinAndSelect('comment.commentLikes', 'commentLikes')
            .where('comment.id = :id', { id: parseInt(commentId) })
            .getOne();

        if (!comment) {
            return res.status(404).json({ message: 'Comentário não encontrado' });
        }

        let existingLike = await commentLikeRepository.findOne({
            where: {
                comment: { id: parseInt(commentId) },
                user: { id: userId }
            }
        });

        if (existingLike) {
            // Inverte o estado do like do usuário
            existingLike.userLiked = !existingLike.userLiked;
            await commentLikeRepository.save(existingLike);

            return res.json({
                message: existingLike.userLiked ? 'Comentário curtido' : 'Like removido',
                likes: comment.commentLikes.length,
                userLiked: existingLike.userLiked
            });
        }

        // Cria um novo registro de like
        const newLike = commentLikeRepository.create({
            comment: { id: parseInt(commentId) },
            user: { id: userId },
            userLiked: true
        });
        await commentLikeRepository.save(newLike);

        return res.json({
            message: 'Comentário curtido',
            likes: comment.commentLikes.length + 1,
            userLiked: true
        });
    } catch (error) {
        console.error('Erro ao processar like no comentário:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
};

export const getComments = async (req: Request, res: Response) => {
    try {
        const { postId } = req.params;
        const userId = (req as any).user?.id;
        const commentRepository = AppDataSource.getRepository(Comment);
        const commentLikeRepository = AppDataSource.getRepository(CommentLike);

        const comments = await commentRepository
            .createQueryBuilder('comment')
            .leftJoinAndSelect('comment.user', 'user')
            .leftJoinAndSelect('comment.post', 'post')
            .leftJoinAndSelect('comment.commentLikes', 'commentLikes')
            .leftJoinAndSelect('commentLikes.user', 'likeUser')
            .where('comment.post.id = :postId', { postId: parseInt(postId) })
            .orderBy('comment.created_at', 'DESC')
            .getMany();

        const formattedComments = await Promise.all(comments.map(async comment => {
            // Busca o registro específico do like do usuário atual
            let userLike = null;
            if (userId) {
                userLike = await commentLikeRepository.findOne({
                    where: {
                        comment: { id: comment.id },
                        user: { id: userId }
                    }
                });
            }

            return {
                id: comment.id,
                content: comment.content,
                author: comment.anonymous ? 'Anônimo' : comment.user?.username,
                created_at: comment.created_at,
                post_id: parseInt(postId),
                anonymous: comment.anonymous,
                likes: comment.commentLikes?.length || 0, // Mantém a contagem total de likes
                userLiked: userLike?.userLiked || false // Usa o valor específico do usuário
            };
        }));

        res.json(formattedComments);
    } catch (error) {
        console.error('Erro ao buscar comentários:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
};
