import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Post, Comment, PostLike, User, CommentLike } from '../models/entities';
import { DeepPartial } from 'typeorm';

interface AuthRequest extends Request {
    user?: { id: number; username: string; isAdmin?: boolean };
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

        console.log(`[GET POST V3] Iniciando busca para post ${id}. UserID recebido da requisição: ${userId}`);

        const postRepository = AppDataSource.getRepository(Post);
        const postLikeRepository = AppDataSource.getRepository(PostLike);

        const post = await postRepository
            .createQueryBuilder('post')
            .leftJoinAndSelect('post.user', 'user')
            .leftJoinAndSelect('post.postLikes', 'postLikes')
            .leftJoinAndSelect('postLikes.user', 'likeUser')
            .where('post.id = :id', { id: parseInt(id) })
            .getOne();

        if (!post) {
            console.log(`[GET POST V3] Post ${id} não encontrado.`);
            return res.status(404).json({ message: 'Post não encontrado' });
        }
        console.log(`[GET POST V3] Post ${id} encontrado. Detalhes: ${JSON.stringify(post)}`);

        let userLike = null;
        if (userId) {
            console.log(`[GET POST V3] Verificando like para UserID: ${userId} e PostID: ${post.id}`);
            userLike = await postLikeRepository.findOne({
                where: {
                    post: { id: post.id },
                    user: { id: userId }
                }
            });
            console.log(`[GET POST V3] Resultado da busca por like existente (userLike): ${JSON.stringify(userLike)}`);
        } else {
            console.log(`[GET POST V3] UserID não fornecido, userLike será null.`);
        }

        const totalLikes = await postLikeRepository.count({
            where: {
                post: { id: post.id }
            }
        });
        const author = post.anonymous ? 'Anônimo' : (post.originalAuthor || post.author); // Definição de author corrigida

        // Preserva explicitamente a informação do usuário autor
        const formattedPost = {
            ...post,
            author,
            likes: totalLikes,
            userLiked: !!userLike,
            // Garantir que a informação do usuário seja preservada
            user: post.user ? {
                id: post.user.id,
                username: post.user.username
            } : null,
            // Adicionar user_id explicitamente para facilitar a verificação de autoria
            user_id: post.user ? post.user.id : null
        };

        // Para debug
        console.log(`[GET POST] Resposta final - post.user: ${post.user ? JSON.stringify(post.user) : 'null'}`);
        console.log(`[GET POST] Resposta final - formattedPost.user_id: ${formattedPost.user_id}`);
        console.log(`[GET POST V3] Enviando resposta para post ${id}: userLiked = ${!!userLike}, totalLikes = ${totalLikes}`);

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

        console.log(`[LIKE POST V3] Iniciando - PostID: ${postId}, UserID da requisição: ${userId}`);

        if (!userId) {
            console.log('[LIKE POST V3] Usuário não autenticado, retornando 401.');
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }

        const postRepository = AppDataSource.getRepository(Post);
        const postLikeRepository = AppDataSource.getRepository(PostLike);

        const post = await postRepository.findOne({
            where: { id: parseInt(postId) }
        });

        if (!post) {
            console.log(`[LIKE POST V3] Post ${postId} não encontrado, retornando 404.`);
            return res.status(404).json({ message: 'Post não encontrado' });
        }
        console.log(`[LIKE POST V3] Post ${postId} encontrado.`);

        // Verifica se já existe um like deste usuário
        console.log(`[LIKE POST V3] Verificando like existente para UserID: ${userId}, PostID: ${parseInt(postId)}`);
        let existingLike = await postLikeRepository.findOne({
            where: {
                post: { id: parseInt(postId) },
                user: { id: userId }
            }
        });
        console.log(`[LIKE POST V3] Resultado da busca por like existente (existingLike): ${JSON.stringify(existingLike)}`);

        // Se existe like, remove; se não existe, cria
        if (existingLike) {
            console.log(`[LIKE POST V3] Removendo like existente. ID do like: ${existingLike.id}`);
            await postLikeRepository.remove(existingLike);
            console.log(`[LIKE POST V3] Like removido para post ${postId}`);
        } else {
            console.log(`[LIKE POST V3] Criando novo like para UserID: ${userId}, PostID: ${parseInt(postId)}`);
            const newLikeEntity = postLikeRepository.create({
                post: { id: parseInt(postId) },
                user: { id: userId }
            });
            const newLike = await postLikeRepository.save(newLikeEntity);
            console.log(`[LIKE POST V3] Novo like salvo. Detalhes: ${JSON.stringify(newLike)}`);
        }

        // Verifica novamente se existe like para retornar o estado atual
        console.log(`[LIKE POST V3] Verificando estado final do like para UserID: ${userId}, PostID: ${parseInt(postId)}`);
        const userHasLike = await postLikeRepository.findOne({
            where: {
                post: { id: parseInt(postId) },
                user: { id: userId }
            }
        });
        console.log(`[LIKE POST V3] Resultado da verificação final (userHasLike): ${JSON.stringify(userHasLike)}`);

        // Conta o total de likes (de todos os usuários)
        const totalLikes = await postLikeRepository.count({
            where: {
                post: { id: parseInt(postId) }
            }
        });

        console.log(`[LIKE POST V3] Enviando resposta: userLiked = ${!!userHasLike}, totalLikes = ${totalLikes}`);

        return res.json({
            message: userHasLike ? 'Post curtido' : 'Like removido',
            likes: totalLikes,
            userLiked: !!userHasLike
        });
    } catch (error) {
        console.error('[LIKE POST V3] Erro:', error);
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
                userLiked: !!hasLike,
                // Adicionar informações do usuário para verificação de autoria
                user: comment.user ? {
                    id: comment.user.id,
                    username: comment.user.username
                } : null,
                user_id: comment.user ? comment.user.id : null
            };
        }));

        res.json(formattedComments);
    } catch (error) {
        console.error('Erro ao buscar comentários:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
};

export const deletePost = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const isAdmin = req.user?.isAdmin;
        const postId = parseInt(id);

        console.log(`[DELETE POST] Tentativa de excluir post ${id} pelo usuário ${userId}`);

        if (!userId) {
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }

        const postRepository = AppDataSource.getRepository(Post);
        const commentRepository = AppDataSource.getRepository(Comment);
        const postLikeRepository = AppDataSource.getRepository(PostLike);
        const commentLikeRepository = AppDataSource.getRepository(CommentLike);

        // Busca o post para verificar se o usuário atual é o autor
        const post = await postRepository.findOne({
            where: { id: postId },
            relations: ['user', 'comments', 'postLikes']
        });

        if (!post) {
            return res.status(404).json({ message: 'Post não encontrado' });
        }

        // Verifica se o usuário é o autor do post ou administrador
        if (!isAdmin && post.user && post.user.id !== userId) {
            return res.status(403).json({ message: 'Você não tem permissão para excluir este post' });
        }

        console.log(`[DELETE POST] Iniciando exclusão do post ${id} e seus relacionamentos`);

        // Passo 1: Encontrar todos os comentários relacionados ao post
        const comments = await commentRepository.find({
            where: { post: { id: postId } },
            relations: ['commentLikes']
        });

        // Passo 2: Para cada comentário, remover curtidas do comentário
        for (const comment of comments) {
            console.log(`[DELETE POST] Removendo curtidas do comentário ${comment.id}`);
            if (comment.commentLikes && comment.commentLikes.length > 0) {
                await commentLikeRepository.remove(comment.commentLikes);
            }
        }

        // Passo 3: Remover todos os comentários do post
        if (comments.length > 0) {
            console.log(`[DELETE POST] Removendo ${comments.length} comentários do post ${id}`);
            await commentRepository.remove(comments);
        }

        // Passo 4: Remover todas as curtidas do post
        if (post.postLikes && post.postLikes.length > 0) {
            console.log(`[DELETE POST] Removendo ${post.postLikes.length} curtidas do post ${id}`);
            await postLikeRepository.remove(post.postLikes);
        }

        // Passo 5: Finalmente remover o post
        console.log(`[DELETE POST] Finalizando exclusão do post ${id}`);
        await postRepository.remove(post);

        return res.status(200).json({ message: 'Post excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir post:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
};

export const deleteComment = async (req: AuthRequest, res: Response) => {
    try {
        const { commentId } = req.params;
        const userId = req.user?.id;
        const isAdmin = req.user?.isAdmin;
        const commentIdInt = parseInt(commentId);

        console.log(`[DELETE COMMENT] Tentativa de excluir comentário ${commentId} pelo usuário ${userId}`);

        if (!userId) {
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }

        const commentRepository = AppDataSource.getRepository(Comment);
        const commentLikeRepository = AppDataSource.getRepository(CommentLike);

        // Busca o comentário para verificar se o usuário atual é o autor
        const comment = await commentRepository.findOne({
            where: { id: commentIdInt },
            relations: ['user', 'commentLikes']
        });

        if (!comment) {
            return res.status(404).json({ message: 'Comentário não encontrado' });
        }

        // Verifica se o usuário é o autor do comentário ou administrador
        if (!isAdmin && comment.user && comment.user.id !== userId) {
            return res.status(403).json({ message: 'Você não tem permissão para excluir este comentário' });
        }

        console.log(`[DELETE COMMENT] Iniciando exclusão do comentário ${commentId}`);

        // Passo 1: Remover as curtidas do comentário
        if (comment.commentLikes && comment.commentLikes.length > 0) {
            console.log(`[DELETE COMMENT] Removendo ${comment.commentLikes.length} curtidas do comentário ${commentId}`);
            await commentLikeRepository.remove(comment.commentLikes);
        }

        // Passo 2: Finalmente remover o comentário
        console.log(`[DELETE COMMENT] Finalizando exclusão do comentário ${commentId}`);
        await commentRepository.remove(comment);

        return res.status(200).json({ message: 'Comentário excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir comentário:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
};
