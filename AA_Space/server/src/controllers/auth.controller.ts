import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { User } from '../models/entities';

export const register = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // Verificar se o usuário já existe
    const [existingUsers] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      return res.status(400).json({ message: 'Usuário já existe' });
    }

    // Hash da senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Criar novo usuário
    const [result] = await pool.query(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword]
    );

    const token = jwt.sign(
      { id: (result as any).insertId, username },
      process.env.JWT_SECRET || 'seu_segredo_jwt_super_secreto',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      id: (result as any).insertId,
      username,
      token
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // Buscar usuário
    const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    const user = Array.isArray(users) ? users[0] as User : null;

    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    // Verificar senha
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    // Gerar token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET || 'seu_segredo_jwt_super_secreto',
      { expiresIn: '24h' }
    );

    res.json({
      id: user.id,
      username: user.username,
      token
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};
