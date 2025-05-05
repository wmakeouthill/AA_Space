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
        const postRepository = AppDataSource.getRepository(Post);
        const postLikeRepository = AppDataSource.getRepository(PostLike);

        const posts = await postRepository
            .createQueryBuilder('post')
            .leftJoinAndSelect('post.user', 'user')
            .leftJoinAndSelect('post.comments', 'comments')
            .leftJoinAndSelect('post.postLikes', 'postLikes')
            .orderBy('post.created_at', 'DESC')
            .getMany();

        const formattedPosts = await Promise.all(posts.map(async post => {
            let userLiked = false;
            let totalLikes = 0;

            if (userId) {
                const userLike = await postLikeRepository.findOne({
                    where: {
                        post: { id: post.id },
                        user: { id: userId }
                    }
                });
                userLiked = userLike?.userLiked ?? false;
            }

            totalLikes = await postLikeRepository.count({
                where: {
                    post: { id: post.id },
                    userLiked: true
                }
            });

            // Se o post é anônimo, retorna 'Anônimo', caso contrário usa o autor original
            const author = post.anonymous ? 'Anônimo' : (post.originalAuthor || post.author);

            return {
                ...post,
                author,
                comment_count: post.comments?.length || 0,
                likes: totalLikes,
                userLiked
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

        // Verifica se o usuário atual deu like
        const userLike = userId ? await postLikeRepository.findOne({
            where: {
                post: { id: post.id },
                user: { id: userId }
            }
        }) : null;

        // Conta o total de likes ativos
        const totalLikes = await postLikeRepository.count({
            where: {
                post: { id: post.id },
                userLiked: true
            }
        });

        // Se o post é anônimo, retorna 'Anônimo', caso contrário usa o autor original
        const author = post.anonymous ? 'Anônimo' : (post.originalAuthor || post.author);

        const formattedPost = {
            ...post,
            author,
            likes: totalLikes,
            userLiked: userLike?.userLiked ?? false
        };

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

        // Determina o autor real
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
            author, // Salvamos o autor real
            originalAuthor: author, // Salvamos uma cópia do autor original
            likes: 0
        };

        const newPost = postRepository.create(postData);
        await postRepository.save(newPost);

        // Para a resposta, se for anônimo, retornamos 'Anônimo'
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

        // Criamos o commentData com o author original, mesmo que seja anônimo
        const commentData: DeepPartial<Comment> = {
            content,
            anonymous: anonymous,
            user: userData,
            author, // Salvamos o autor real
            originalAuthor: author, // Salvamos uma cópia do autor original
            post: { id: post.id } as DeepPartial<Post>
        };

        const newComment = commentRepository.create(commentData);
        await commentRepository.save(newComment);

        // Para a resposta, se for anônimo, retornamos 'Anônimo'
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

        if (!userId) {
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }

        const postLikeRepository = AppDataSource.getRepository(PostLike);

        // Verifica se já existe um like deste usuário
        let existingLike = await postLikeRepository.findOne({
            where: {
                post: { id: parseInt(postId) },
                user: { id: userId }
            }
        });

        let userLiked = false;

        if (existingLike) {
            // Se existe, alterna o estado do like
            existingLike.userLiked = !existingLike.userLiked;
            await postLikeRepository.save(existingLike);
            userLiked = existingLike.userLiked;
        } else {
            // Se não existe, cria um novo like
            const newLike = postLikeRepository.create({
                post: { id: parseInt(postId) },
                user: { id: userId },
                userLiked: true
            });
            await postLikeRepository.save(newLike);
            userLiked = true;
        }

        // Conta APENAS os likes ativos usando uma query SQL direta
        const result = await postLikeRepository
            .createQueryBuilder('postLike')
            .select('COUNT(*)', 'count')
            .where('postLike.postId = :postId', { postId: parseInt(postId) })
            .andWhere('postLike.userLiked = :state', { state: true })
            .getRawOne();

        const totalLikes = Number(result?.count) || 0;

        return res.json({
            message: userLiked ? 'Post curtido' : 'Like removido',
            likes: totalLikes,
            userLiked: userLiked
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

        const comment = await commentRepository
            .createQueryBuilder('comment')
            .leftJoinAndSelect('comment.commentLikes', 'commentLikes')
            .where('comment.id = :id', { id: parseInt(commentId) })
            .getOne();

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

        if (existingLike) {
            // Se existe, alterna o estado do like
            existingLike.userLiked = !existingLike.userLiked;
            await commentLikeRepository.save(existingLike);
        } else {
            // Se não existe, cria um novo like
            const newLike = commentLikeRepository.create({
                comment: { id: parseInt(commentId) },
                user: { id: userId },
                userLiked: true
            });
            await commentLikeRepository.save(newLike);
        }

        // Conta o total de likes ativos (onde userLiked = true)
        const totalLikes = await commentLikeRepository.count({
            where: {
                comment: { id: parseInt(commentId) },
                userLiked: true
            }
        });

        // Verifica o estado atual do like do usuário
        const currentUserLike = await commentLikeRepository.findOne({
            where: {
                comment: { id: parseInt(commentId) },
                user: { id: userId }
            }
        });

        return res.json({
            message: currentUserLike?.userLiked ? 'Comentário curtido' : 'Like removido',
            likes: totalLikes,
            userLiked: currentUserLike?.userLiked ?? false
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
            .where('comment.post.id = :postId', { postId: parseInt(postId) })
            .orderBy('comment.created_at', 'DESC')
            .getMany();

        const formattedComments = await Promise.all(comments.map(async comment => {
            // Verifica se o usuário atual deu like
            const userLike = userId ? await commentLikeRepository.findOne({
                where: {
                    comment: { id: comment.id },
                    user: { id: userId }
                }
            }) : null;

            // Conta o total de likes ativos
            const totalLikes = await commentLikeRepository.count({
                where: {
                    comment: { id: comment.id },
                    userLiked: true
                }
            });

            // Se o comentário é anônimo, retorna 'Anônimo', 
            // caso contrário usa o autor original se disponível, ou faz o fallback para o autor normal
            const author = comment.anonymous ? 'Anônimo' : (comment.originalAuthor || comment.author);

            return {
                id: comment.id,
                content: comment.content,
                author,
                created_at: comment.created_at,
                post_id: parseInt(postId),
                anonymous: comment.anonymous,
                likes: totalLikes,
                userLiked: userLike?.userLiked ?? false
            };
        }));

        res.json(formattedComments);
    } catch (error) {
        console.error('Erro ao buscar comentários:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
};
