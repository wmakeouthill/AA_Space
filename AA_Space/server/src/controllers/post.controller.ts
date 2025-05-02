import { Request, Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../config/database';
import { Post, Comment } from '../models/entities';

// Interface para o usuário autenticado na requisição
interface AuthRequest extends Request {
  user?: { id: number; username: string };
}

interface PostWithAuthor extends Post, RowDataPacket {
  author: string;
  comment_count?: number;
  like_count?: number;
}

interface CommentWithAuthor extends Comment, RowDataPacket {
  author: string;
}

export const getPosts = async (req: Request, res: Response) => {
  try {
    const [posts] = await pool.query<PostWithAuthor[]>(`
      SELECT p.*,
             COUNT(DISTINCT c.id) as comment_count,
             COUNT(DISTINCT pl.id) as like_count,
             CASE WHEN p.anonymous = 1 THEN 'Anônimo' ELSE u.username END as author
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN comments c ON p.id = c.post_id
      LEFT JOIN post_likes pl ON p.id = pl.post_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);

    res.json(posts);
  } catch (error) {
    console.error('Erro ao buscar posts:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

export const getPost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [posts] = await pool.query<PostWithAuthor[]>(`
      SELECT p.*,
             CASE WHEN p.anonymous = 1 THEN 'Anônimo' ELSE u.username END as author
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `, [id]);

    if (posts.length === 0) {
      return res.status(404).json({ message: 'Post não encontrado' });
    }

    const post = posts[0];

    // Buscar comentários do post
    const [comments] = await pool.query<CommentWithAuthor[]>(`
      SELECT c.*,
             CASE WHEN c.anonymous = 1 THEN 'Anônimo' ELSE u.username END as author
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at DESC
    `, [id]);

    res.json({
      ...post,
      comments
    });
  } catch (error) {
    console.error('Erro ao buscar post:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

export const createPost = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, anonymous } = req.body;
    const userId = req.user?.id;

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO posts (title, content, user_id, anonymous) VALUES (?, ?, ?, ?)',
      [title, content, userId, anonymous]
    );

    const [posts] = await pool.query<PostWithAuthor[]>('SELECT * FROM posts WHERE id = ?', [result.insertId]);
    res.status(201).json(posts[0]);
  } catch (error) {
    console.error('Erro ao criar post:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

export const createComment = async (req: AuthRequest, res: Response) => {
  try {
    const { content, anonymous } = req.body;
    const { postId } = req.params;
    const userId = req.user?.id;

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO comments (content, post_id, user_id, anonymous) VALUES (?, ?, ?, ?)',
      [content, postId, userId, anonymous]
    );

    const [comments] = await pool.query<CommentWithAuthor[]>(
      `SELECT c.*,
              CASE WHEN c.anonymous = 1 THEN 'Anônimo' ELSE u.username END as author
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [result.insertId]
    );

    res.status(201).json(comments[0]);
  } catch (error) {
    console.error('Erro ao criar comentário:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

export const likePost = async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = req.user?.id;

    // Verificar se o usuário já curtiu o post
    const [existingLikes] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM post_likes WHERE post_id = ? AND user_id = ?',
      [postId, userId]
    );

    if (existingLikes.length > 0) {
      // Se já curtiu, remove o like
      await pool.query(
        'DELETE FROM post_likes WHERE post_id = ? AND user_id = ?',
        [postId, userId]
      );

      await pool.query(
        'UPDATE posts SET likes = likes - 1 WHERE id = ?',
        [postId]
      );

      res.json({ message: 'Like removido' });
    } else {
      // Se não curtiu, adiciona o like
      await pool.query(
        'INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)',
        [postId, userId]
      );

      await pool.query(
        'UPDATE posts SET likes = likes + 1 WHERE id = ?',
        [postId]
      );

      res.json({ message: 'Post curtido' });
    }
  } catch (error) {
    console.error('Erro ao processar like:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};
