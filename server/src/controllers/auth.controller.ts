import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User } from '../models/entities';
import { AuthRequest } from '../middleware/auth.middleware'; // Import AuthRequest

const JWT_SECRET = process.env.JWT_SECRET || 'bondedobumbiboladao';
const TOKEN_EXPIRATION = '24h';

export const register = async (req: Request, res: Response) => {
    try {
        const { username, password, email, phone } = req.body;
        const ipAddress = req.ip || req.socket?.remoteAddress; // Get IP address from request

        if (!username || !password) {
            return res.status(400).json({ message: 'Usuário e senha são obrigatórios' });
        }

        const userRepository = AppDataSource.getRepository(User);

        // Verifica se o usuário já existe
        const existingUser = await userRepository.findOne({ where: { username } });
        if (existingUser) {
            return res.status(400).json({ message: 'Nome de usuário já está em uso' });
        }

        // Hash da senha
        const hashedPassword = await bcrypt.hash(password, 10);

        // Cria novo usuário
        const user = userRepository.create({
            username,
            password: hashedPassword,
            email: email || null,
            phone: phone || null,
            lastIpAddress: ipAddress // Store IP address
        });

        const savedUser = await userRepository.save(user);
        // console.log('Usuário criado:', { id: savedUser.id, username: savedUser.username });

        // Gera token JWT
        const token = jwt.sign(
            { id: savedUser.id, username: savedUser.username },
            JWT_SECRET,
            { expiresIn: TOKEN_EXPIRATION }
        );

        res.status(201).json({
            message: 'Usuário registrado com sucesso',
            token,
            username: savedUser.username
        });
    } catch (error) {
        console.error('Erro ao registrar usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        let { username, password } = req.body; // Alterado para let para permitir reatribuição
        const ipAddress = req.ip || req.socket?.remoteAddress; // Get IP address from request

        // Aparar espaços em branco do nome de usuário e senha
        if (username) {
            username = username.trim();
        }
        // Embora aparar senhas seja debatível, para fins de depuração e robustez contra erros comuns:
        if (password) {
            password = password.trim();
        }

        if (!username || !password) {
            return res.status(400).json({ message: 'Usuário e senha são obrigatórios' });
        }

        const userRepository = AppDataSource.getRepository(User);

        // Busca o usuário
        const user = await userRepository.findOne({ where: { username } });
        if (!user) {
            return res.status(401).json({ message: 'Usuário não encontrado' });
        }

        // Verifica a senha
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Senha inválida' });
        }

        // Update last IP address
        if (ipAddress) {
            user.lastIpAddress = ipAddress;
            await userRepository.save(user);
        }

        // Gera o token JWT incluindo a informação de admin, role e isMainAdmin
        const token = jwt.sign(
            { id: user.id, username: user.username, isAdmin: user.isAdmin, role: user.role, isMainAdmin: user.isMainAdmin },
            JWT_SECRET,
            { expiresIn: TOKEN_EXPIRATION }
        );

        // console.log('Login bem-sucedido:', { id: user.id, username: user.username, isAdmin: user.isAdmin, role: user.role, isMainAdmin: user.isMainAdmin });

        res.json({
            token,
            id: user.id, // Adicionar o ID do usuário na resposta
            username: user.username,
            isAdmin: user.isAdmin,
            role: user.role,
            isMainAdmin: user.isMainAdmin, // Added isMainAdmin
            message: 'Login realizado com sucesso'
        });
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
};

export const validateToken = async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: 'Token não fornecido', valid: false });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Token malformado ou não fornecido', valid: false });
        }

        // Explicitly type the decoded payload to include isMainAdmin
        const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string; isAdmin?: boolean; role?: string; isMainAdmin?: boolean };
        const userRepository = AppDataSource.getRepository(User);
        const user = await userRepository.findOne({ where: { id: decoded.id } });

        if (!user) {
            return res.status(401).json({ message: 'Usuário do token não encontrado', valid: false });
        }

        // Retornar a role e isMainAdmin do usuário que está no banco de dados
        res.json({
            valid: true,
            username: user.username,
            userId: user.id,
            isAdmin: user.isAdmin,
            role: user.role,
            isMainAdmin: user.isMainAdmin // Added isMainAdmin
        });
    } catch (error) {
        console.error('Erro ao validar token:', error);
        // Adicionar mais detalhes sobre o erro do JWT, se aplicável
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ message: `Token inválido: ${error.message}`, valid: false });
        }
        return res.status(401).json({ message: 'Token inválido ou expirado', valid: false }); // Added valid: false
    }
};

export const promoteToAdmin = async (req: AuthRequest, res: Response) => {
    try {
        // Verificar se o usuário que faz a solicitação é um administrador
        const requestingUserId = req.user?.id;
        const isRequestingUserAdmin = req.user?.isAdmin;

        if (!requestingUserId) {
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }

        if (!isRequestingUserAdmin) {
            return res.status(403).json({ message: 'Apenas administradores podem promover usuários' });
        }

        // Obter o ID ou nome de usuário a ser promovido
        const { userId, username } = req.body;

        if (!userId && !username) {
            return res.status(400).json({ message: 'É necessário fornecer um ID de usuário ou nome de usuário' });
        }

        const userRepository = AppDataSource.getRepository(User);
        let userToPromote;

        // Encontrar o usuário pelo ID ou nome de usuário
        if (userId) {
            userToPromote = await userRepository.findOne({
                where: { id: userId }
            });
        } else {
            userToPromote = await userRepository.findOne({
                where: { username }
            });
        }

        if (!userToPromote) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        // Verificar se o usuário já é administrador
        if (userToPromote.isAdmin) {
            return res.status(400).json({ message: 'Usuário já é administrador' });
        }

        // Promover o usuário a administrador
        userToPromote.isAdmin = true;
        await userRepository.save(userToPromote);

        return res.status(200).json({
            message: `Usuário ${userToPromote.username} promovido a administrador com sucesso`,
            user: {
                id: userToPromote.id,
                username: userToPromote.username,
                isAdmin: userToPromote.isAdmin
            }
        });
    } catch (error) {
        console.error('Erro ao promover usuário a administrador:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
};

export const removeAdmin = async (req: AuthRequest, res: Response) => {
    try {
        // Verificar se o usuário que faz a solicitação é um administrador
        const requestingUserId = req.user?.id;
        const isRequestingUserAdmin = req.user?.isAdmin;

        if (!requestingUserId) {
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }

        if (!isRequestingUserAdmin) {
            return res.status(403).json({ message: 'Apenas administradores podem remover privilégios de administrador' });
        }

        // Obter o nome de usuário a ser rebaixado
        const { username } = req.body;

        if (!username) {
            return res.status(400).json({ message: 'É necessário fornecer um nome de usuário' });
        }

        const userRepository = AppDataSource.getRepository(User);
        let userToRemove;

        // Encontrar o usuário pelo nome de usuário
        userToRemove = await userRepository.findOne({
            where: { username }
        });

        if (!userToRemove) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        // Verificar se o usuário já não é administrador
        if (!userToRemove.isAdmin) {
            return res.status(400).json({ message: 'Usuário não é administrador' });
        }

        // Verificar se o usuário está tentando remover seus próprios privilégios
        if (userToRemove.id === requestingUserId) {
            return res.status(400).json({ message: 'Você não pode remover seus próprios privilégios de administrador' });
        }

        // Verificar se é o usuário 'admin' original (proteção)
        if (userToRemove.username === 'admin') {
            return res.status(400).json({ message: 'Não é possível remover os privilégios do administrador principal' });
        }

        // Remover privilégios de administrador
        userToRemove.isAdmin = false;
        await userRepository.save(userToRemove);

        return res.status(200).json({
            message: `Privilégios de administrador removidos de ${userToRemove.username} com sucesso`,
            user: {
                id: userToRemove.id,
                username: userToRemove.username,
                isAdmin: userToRemove.isAdmin
            }
        });
    } catch (error) {
        console.error('Erro ao remover privilégios de administrador:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
};

export const transferMainAdmin = async (req: AuthRequest, res: Response) => {
    try {
        // Verificar se o usuário que faz a solicitação é um administrador
        const requestingUserId = req.user?.id;
        const isRequestingUserAdmin = req.user?.isAdmin;

        if (!requestingUserId) {
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }

        if (!isRequestingUserAdmin) {
            return res.status(403).json({ message: 'Apenas administradores podem transferir privilégios' });
        }

        const userRepository = AppDataSource.getRepository(User);

        // Verificar se o usuário atual é o administrador principal
        const currentUser = await userRepository.findOne({
            where: { id: requestingUserId }
        });

        if (!currentUser || !currentUser.isMainAdmin) {
            return res.status(403).json({ message: 'Apenas o administrador principal pode transferir o título' });
        }

        // Obter o nome de usuário para transferir o título de administrador principal
        const { username } = req.body;

        if (!username) {
            return res.status(400).json({ message: 'É necessário fornecer um nome de usuário' });
        }

        // Verificar se está tentando transferir para si mesmo
        if (username === currentUser.username) {
            return res.status(400).json({ message: 'Você já é o administrador principal' });
        }

        // Encontrar o usuário pelo nome de usuário
        const userToPromote = await userRepository.findOne({
            where: { username }
        });

        if (!userToPromote) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        // Verificar se o usuário já é administrador
        if (!userToPromote.isAdmin) {
            return res.status(400).json({ message: 'O usuário precisa ser um administrador primeiro' });
        }

        // Realizar a transferência em uma transação
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Remover status de administrador principal do atual
            currentUser.isMainAdmin = false;
            await queryRunner.manager.save(currentUser);

            // Definir o novo administrador principal
            userToPromote.isMainAdmin = true;
            await queryRunner.manager.save(userToPromote);

            await queryRunner.commitTransaction();

            return res.status(200).json({
                message: `Título de administrador principal transferido com sucesso de '${currentUser.username}' para '${userToPromote.username}'.`,
                oldMainAdmin: currentUser.username,
                newMainAdmin: userToPromote.username
            });
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    } catch (error) {
        console.error('Erro ao transferir título de administrador principal:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
};

export const listAdmins = async (req: AuthRequest, res: Response) => {
    try {
        // Verificar se o usuário que faz a solicitação é um administrador
        const requestingUserId = req.user?.id;
        const isRequestingUserAdmin = req.user?.isAdmin;

        if (!requestingUserId) {
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }

        if (!isRequestingUserAdmin) {
            return res.status(403).json({ message: 'Apenas administradores podem listar administradores' });
        }

        const userRepository = AppDataSource.getRepository(User);

        // Buscar todos os usuários que são administradores
        const admins = await userRepository.find({
            where: { isAdmin: true },
            select: ['id', 'username', 'isMainAdmin']
        });

        return res.status(200).json({
            admins: admins.map(admin => ({
                id: admin.id,
                username: admin.username,
                isMainAdmin: admin.isMainAdmin
            }))
        });
    } catch (error) {
        console.error('Erro ao listar administradores:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
};

export const listAllUsers = async (req: AuthRequest, res: Response) => {
    try {
        // Verificar se o usuário que faz a solicitação é um administrador
        const requestingUserId = req.user?.id;
        const isRequestingUserAdmin = req.user?.isAdmin;

        if (!requestingUserId) {
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }

        if (!isRequestingUserAdmin) {
            return res.status(403).json({ message: 'Apenas administradores podem listar todos os usuários' });
        }

        const userRepository = AppDataSource.getRepository(User);

        // Consulta SQL explícita para garantir que os campos email e phone sejam retornados
        // console.log('[DEBUG] Buscando todos os usuários com informações de contato e último IP');

        const users = await userRepository.createQueryBuilder('user')
            .select([
                'user.id',
                'user.username',
                'user.email',
                'user.phone',
                'user.isAdmin',
                'user.isMainAdmin',
                'user.lastIpAddress' // Adicionar lastIpAddress à seleção
            ])
            .leftJoinAndSelect('user.userRewards', 'userReward')
            .leftJoinAndSelect('userReward.reward', 'reward')
            .getMany();

        // console.log('[DEBUG] Usuários encontrados:', users);

        return res.status(200).json({
            users: users.map(user => ({
                id: user.id,
                username: user.username,
                email: user.email,
                phone: user.phone,
                isAdmin: user.isAdmin,
                isMainAdmin: user.isMainAdmin,
                lastIpAddress: user.lastIpAddress, // Adicionar lastIpAddress ao mapeamento
                userRewards: user.userRewards || [] // Incluir recompensas do usuário
            }))
        });
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
};
