import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Post, Comment, PostLike, User, CommentLike } from '../models/entities';
import { DeepPartial } from 'typeorm';

interface AuthRequest extends Request {
    user?: { id: number; username: string };
}

export const getPosts = async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user?.id;
        console.log(`[GET POSTS] Buscando posts para usuário ${userId}`);

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
            // Verifica se existe like do usuário
            const hasLike = userId ? await postLikeRepository.findOne({
                where: {
                    post: { id: post.id },
                    user: { id: userId }
                }
            }) : null;

            console.log(`[GET POSTS] Post ${post.id} - Like do usuário: ${!!hasLike}`);

            // Conta o total de likes
            const totalLikes = await postLikeRepository.count({
                where: {
                    post: { id: post.id }
                }
            });

            console.log(`[GET POSTS] Post ${post.id} - Total de likes: ${totalLikes}`);

            const author = post.anonymous ? 'Anônimo' : (post.originalAuthor || post.author);

            return {
                ...post,
                author,
                comment_count: post.comments?.length || 0,
                likes: totalLikes,
                userLiked: !!hasLike
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
        const userId = (req as AuthRequest).user?.id;

        console.log(`[GET POST] Buscando post ${id} para usuário ${userId}`);

        const postRepository = AppDataSource.getRepository(Post);
        const postLikeRepository = AppDataSource.getRepository(PostLike);

        // Modificado para incluir um join com postLikes e user
        const post = await postRepository
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
        const userLike = userId ? await postLikeRepository.findOne({
            where: {
                post: { id: post.id },
                user: { id: userId }
            }
        }) : null;

        console.log(`[GET POST] Like do usuário encontrado: ${!!userLike}`);

        const totalLikes = await postLikeRepository.count({
            where: {
                post: { id: post.id }
            }
        });

        console.log(`[GET POST] Total de likes: ${totalLikes}`);

        const author = post.anonymous ? 'Anônimo' : (post.originalAuthor || post.author);

        const formattedPost = {
            ...post,
            author,
            likes: totalLikes,
            userLiked: !!userLike
        };

        console.log(`[GET POST] Resposta final - userLiked: ${!!userLike}, totalLikes: ${totalLikes}`);

        res.json(formattedPost);
    } catch (error) {
        console.error('Erro ao buscar post:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
};

export const createPost = async (req: AuthRequest, res: Response) => {
    try {
        const { title, content, anonymous = false, guestNickname } = req.body;
        const userId = req.user?.id;

        const postRepository = AppDataSource.getRepository(Post);
        const userRepository = AppDataSource.getRepository(User);

        let userData: DeepPartial<User> | undefined = undefined;
        let author: string;

        if (userId) {
            const user = await userRepository.findOne({ where: { id: userId } });
            if (user) {
                userData = { id: user.id } as DeepPartial<User>;
                author = user.username;
            } else {
                author = 'Anônimo';
            }
        } else if (guestNickname) {
            author = `Convidado: ${guestNickname}`;
        } else {
            author = 'Anônimo';
        }

        const postData: DeepPartial<Post> = {
            title,
            content,
            anonymous,
            user: userData,
            author,
            originalAuthor: author
        };

        const newPost = postRepository.create(postData);
        await postRepository.save(newPost);

        const responsePost = {
            ...newPost,
            author: anonymous ? 'Anônimo' : author
        };

        res.status(201).json(responsePost);
    } catch (error) {
        console.error('Erro ao criar post:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
};

export const createComment = async (req: AuthRequest, res: Response) => {
    try {
        const { content, anonymous = false, guestNickname } = req.body;
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
        let author: string;

        if (userId) {
            const user = await userRepository.findOne({ where: { id: userId } });
            if (user) {
                userData = { id: user.id } as DeepPartial<User>;
                author = user.username;
            } else {
                author = 'Anônimo';
            }
        } else if (guestNickname) {
            author = `Convidado: ${guestNickname}`;
        } else {
            author = 'Anônimo';
        }

        const commentData: DeepPartial<Comment> = {
            content,
            anonymous: anonymous,
            user: userData,
            author,
            originalAuthor: author,
            post: { id: post.id } as DeepPartial<Post>
        };

        const newComment = commentRepository.create(commentData);
        await commentRepository.save(newComment);

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
    } catch (error) {
        console.error('Erro ao criar comentário:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
};

export const likePost = async (req: AuthRequest, res: Response) => {
    try {
        const { postId } = req.params;
        const userId = req.user?.id;

        console.log(`[LIKE POST] Recebida requisição de like - postId: ${postId}, userId: ${userId}`);

        if (!userId) {
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }

        const postRepository = AppDataSource.getRepository(Post);
        const postLikeRepository = AppDataSource.getRepository(PostLike);

        const post = await postRepository.findOne({
            where: { id: parseInt(postId) }
        });

        if (!post) {
            return res.status(404).json({ message: 'Post não encontrado' });
        }

        // Verifica se já existe um like deste usuário
        let existingLike = await postLikeRepository.findOne({
            where: {
                post: { id: parseInt(postId) },
                user: { id: userId }
            }
        });

        console.log(`[LIKE POST] Like existente: ${!!existingLike}`);

        // Se existe like, remove; se não existe, cria
        if (existingLike) {
            await postLikeRepository.remove(existingLike);
            console.log(`[LIKE POST] Like removido para post ${postId}`);
        } else {
            const newLike = postLikeRepository.create({
                post: { id: parseInt(postId) },
                user: { id: userId }
            });
            await postLikeRepository.save(newLike);
            console.log(`[LIKE POST] Novo like criado para post ${postId}`);
        }

        // Verifica novamente se existe like para retornar o estado atual
        const userHasLike = await postLikeRepository.findOne({
            where: {
                post: { id: parseInt(postId) },
                user: { id: userId }
            }
        });

        // Conta o total de likes (de todos os usuários)
        const totalLikes = await postLikeRepository.count({
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
    } catch (error) {
        console.error('[LIKE POST] Erro:', error);
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

        const comment = await commentRepository.findOne({
            where: { id: parseInt(commentId) }
        });

        if (!comment) {
            return res.status(404).json({ message: 'Comentário não encontrado' });
        }

        // Verifica se já existe um like deste usuário
        let existingLike = await commentLikeRepository.findOne({
            where: {
                comment: { id: parseInt(commentId) },
                user: { id: userId }
            }
        });

        // Se existe like, remove; se não existe, cria
        if (existingLike) {
            await commentLikeRepository.remove(existingLike);
        } else {
            const newLike = commentLikeRepository.create({
                comment: { id: parseInt(commentId) },
                user: { id: userId }
            });
            await commentLikeRepository.save(newLike);
        }

        // Verifica novamente se existe like para retornar o estado atual
        const userHasLike = await commentLikeRepository.findOne({
            where: {
                comment: { id: parseInt(commentId) },
                user: { id: userId }
            }
        });

        // Conta o total de likes (de todos os usuários)
        const totalLikes = await commentLikeRepository.count({
            where: {
                comment: { id: parseInt(commentId) }
            }
        });

        return res.json({
            message: userHasLike ? 'Comentário curtido' : 'Like removido',
            likes: totalLikes, // Número total de likes
            userLiked: !!userHasLike // Boolean indicando se este usuário tem like
        });
    } catch (error) {
        console.error('Erro ao processar like no comentário:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
};

export const getComments = async (req: Request, res: Response) => {
    try {
        const { postId } = req.params;
        const userId = (req as AuthRequest).user?.id;
        const commentRepository = AppDataSource.getRepository(Comment);
        const commentLikeRepository = AppDataSource.getRepository(CommentLike);

        const comments = await commentRepository
            .createQueryBuilder('comment')
            .leftJoinAndSelect('comment.user', 'user')
            .leftJoinAndSelect('comment.post', 'post')
            .where('comment.post.id = :postId', { postId: parseInt(postId) })
            .orderBy('comment.created_at', 'DESC')
            .getMany();

        const formattedComments = await Promise.all(comments.map(async comment => {
            // Verifica se existe like do usuário
            const hasLike = userId ? await commentLikeRepository.findOne({
                where: {
                    comment: { id: comment.id },
                    user: { id: userId }
                }
            }) : null;

            // Conta o total de likes
            const totalLikes = await commentLikeRepository.count({
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
        }));

        res.json(formattedComments);
    } catch (error) {
        console.error('Erro ao buscar comentários:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
};
