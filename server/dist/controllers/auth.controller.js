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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAllUsers = exports.listAdmins = exports.transferMainAdmin = exports.removeAdmin = exports.promoteToAdmin = exports.validateToken = exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../config/database");
const entities_1 = require("../models/entities");
const JWT_SECRET = process.env.JWT_SECRET || 'bondedobumbiboladao';
const TOKEN_EXPIRATION = '24h';
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { username, password, email, phone } = req.body;
        const ipAddress = req.ip || ((_a = req.socket) === null || _a === void 0 ? void 0 : _a.remoteAddress); // Get IP address from request
        if (!username || !password) {
            return res.status(400).json({ message: 'Usuário e senha são obrigatórios' });
        }
        const userRepository = database_1.AppDataSource.getRepository(entities_1.User);
        // Verifica se o usuário já existe
        const existingUser = yield userRepository.findOne({ where: { username } });
        if (existingUser) {
            return res.status(400).json({ message: 'Nome de usuário já está em uso' });
        }
        // Hash da senha
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        // Cria novo usuário
        const user = userRepository.create({
            username,
            password: hashedPassword,
            email: email || null,
            phone: phone || null,
            lastIpAddress: ipAddress // Store IP address
        });
        const savedUser = yield userRepository.save(user);
        console.log('Usuário criado:', { id: savedUser.id, username: savedUser.username });
        // Gera token JWT
        const token = jsonwebtoken_1.default.sign({ id: savedUser.id, username: savedUser.username }, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });
        res.status(201).json({
            message: 'Usuário registrado com sucesso',
            token,
            username: savedUser.username
        });
    }
    catch (error) {
        console.error('Erro ao registrar usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { username, password } = req.body;
        const ipAddress = req.ip || ((_a = req.socket) === null || _a === void 0 ? void 0 : _a.remoteAddress); // Get IP address from request
        if (!username || !password) {
            return res.status(400).json({ message: 'Usuário e senha são obrigatórios' });
        }
        const userRepository = database_1.AppDataSource.getRepository(entities_1.User);
        // Busca o usuário
        const user = yield userRepository.findOne({ where: { username } });
        if (!user) {
            return res.status(401).json({ message: 'Usuário não encontrado' });
        }
        // Verifica a senha
        const validPassword = yield bcrypt_1.default.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Senha inválida' });
        }
        // Update last IP address
        if (ipAddress) {
            user.lastIpAddress = ipAddress;
            yield userRepository.save(user);
        }
        // Gera o token JWT incluindo a informação de admin
        const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });
        console.log('Login bem-sucedido:', { id: user.id, username: user.username, isAdmin: user.isAdmin });
        res.json({
            token,
            username: user.username,
            isAdmin: user.isAdmin,
            message: 'Login realizado com sucesso'
        });
    }
    catch (error) {
        console.error('Erro ao fazer login:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});
exports.login = login;
const validateToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: 'Token não fornecido' });
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Token não fornecido' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const userRepository = database_1.AppDataSource.getRepository(entities_1.User);
        const user = yield userRepository.findOne({ where: { id: decoded.id } });
        if (!user) {
            return res.status(401).json({ message: 'Usuário não encontrado' });
        }
        res.json({
            valid: true,
            username: user.username,
            userId: user.id,
            isAdmin: user.isAdmin
        });
    }
    catch (error) {
        console.error('Erro ao validar token:', error);
        res.status(401).json({ message: 'Token inválido' });
    }
});
exports.validateToken = validateToken;
const promoteToAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        // Verificar se o usuário que faz a solicitação é um administrador
        const requestingUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const isRequestingUserAdmin = (_b = req.user) === null || _b === void 0 ? void 0 : _b.isAdmin;
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
        const userRepository = database_1.AppDataSource.getRepository(entities_1.User);
        let userToPromote;
        // Encontrar o usuário pelo ID ou nome de usuário
        if (userId) {
            userToPromote = yield userRepository.findOne({
                where: { id: userId }
            });
        }
        else {
            userToPromote = yield userRepository.findOne({
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
        yield userRepository.save(userToPromote);
        return res.status(200).json({
            message: `Usuário ${userToPromote.username} promovido a administrador com sucesso`,
            user: {
                id: userToPromote.id,
                username: userToPromote.username,
                isAdmin: userToPromote.isAdmin
            }
        });
    }
    catch (error) {
        console.error('Erro ao promover usuário a administrador:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});
exports.promoteToAdmin = promoteToAdmin;
const removeAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        // Verificar se o usuário que faz a solicitação é um administrador
        const requestingUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const isRequestingUserAdmin = (_b = req.user) === null || _b === void 0 ? void 0 : _b.isAdmin;
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
        const userRepository = database_1.AppDataSource.getRepository(entities_1.User);
        let userToRemove;
        // Encontrar o usuário pelo nome de usuário
        userToRemove = yield userRepository.findOne({
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
        yield userRepository.save(userToRemove);
        return res.status(200).json({
            message: `Privilégios de administrador removidos de ${userToRemove.username} com sucesso`,
            user: {
                id: userToRemove.id,
                username: userToRemove.username,
                isAdmin: userToRemove.isAdmin
            }
        });
    }
    catch (error) {
        console.error('Erro ao remover privilégios de administrador:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});
exports.removeAdmin = removeAdmin;
const transferMainAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        // Verificar se o usuário que faz a solicitação é um administrador
        const requestingUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const isRequestingUserAdmin = (_b = req.user) === null || _b === void 0 ? void 0 : _b.isAdmin;
        if (!requestingUserId) {
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }
        if (!isRequestingUserAdmin) {
            return res.status(403).json({ message: 'Apenas administradores podem transferir privilégios' });
        }
        const userRepository = database_1.AppDataSource.getRepository(entities_1.User);
        // Verificar se o usuário atual é o administrador principal
        const currentUser = yield userRepository.findOne({
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
        const userToPromote = yield userRepository.findOne({
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
        const queryRunner = database_1.AppDataSource.createQueryRunner();
        yield queryRunner.connect();
        yield queryRunner.startTransaction();
        try {
            // Remover status de administrador principal do atual
            currentUser.isMainAdmin = false;
            yield queryRunner.manager.save(currentUser);
            // Definir o novo administrador principal
            userToPromote.isMainAdmin = true;
            yield queryRunner.manager.save(userToPromote);
            yield queryRunner.commitTransaction();
            return res.status(200).json({
                message: `Título de administrador principal transferido com sucesso de '${currentUser.username}' para '${userToPromote.username}'.`,
                oldMainAdmin: currentUser.username,
                newMainAdmin: userToPromote.username
            });
        }
        catch (error) {
            yield queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            yield queryRunner.release();
        }
    }
    catch (error) {
        console.error('Erro ao transferir título de administrador principal:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});
exports.transferMainAdmin = transferMainAdmin;
const listAdmins = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        // Verificar se o usuário que faz a solicitação é um administrador
        const requestingUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const isRequestingUserAdmin = (_b = req.user) === null || _b === void 0 ? void 0 : _b.isAdmin;
        if (!requestingUserId) {
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }
        if (!isRequestingUserAdmin) {
            return res.status(403).json({ message: 'Apenas administradores podem listar administradores' });
        }
        const userRepository = database_1.AppDataSource.getRepository(entities_1.User);
        // Buscar todos os usuários que são administradores
        const admins = yield userRepository.find({
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
    }
    catch (error) {
        console.error('Erro ao listar administradores:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});
exports.listAdmins = listAdmins;
const listAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        // Verificar se o usuário que faz a solicitação é um administrador
        const requestingUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const isRequestingUserAdmin = (_b = req.user) === null || _b === void 0 ? void 0 : _b.isAdmin;
        if (!requestingUserId) {
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }
        if (!isRequestingUserAdmin) {
            return res.status(403).json({ message: 'Apenas administradores podem listar todos os usuários' });
        }
        const userRepository = database_1.AppDataSource.getRepository(entities_1.User);
        // Consulta SQL explícita para garantir que os campos email e phone sejam retornados
        console.log('[DEBUG] Buscando todos os usuários com informações de contato e último IP');
        const users = yield userRepository.createQueryBuilder('user')
            .select([
            'user.id',
            'user.username',
            'user.email',
            'user.phone',
            'user.isAdmin',
            'user.isMainAdmin',
            'user.lastIpAddress' // Adicionar lastIpAddress à seleção
        ])
            .getMany();
        console.log('[DEBUG] Usuários encontrados:', users);
        return res.status(200).json({
            users: users.map(user => ({
                id: user.id,
                username: user.username,
                email: user.email,
                phone: user.phone,
                isAdmin: user.isAdmin,
                isMainAdmin: user.isMainAdmin,
                lastIpAddress: user.lastIpAddress // Adicionar lastIpAddress ao mapeamento
            }))
        });
    }
    catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});
exports.listAllUsers = listAllUsers;
