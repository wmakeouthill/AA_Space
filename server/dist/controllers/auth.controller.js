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
exports.validateToken = exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../config/database");
const entities_1 = require("../models/entities");
const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_jwt_super_secreto';
const TOKEN_EXPIRATION = '24h';
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, password } = req.body;
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
            password: hashedPassword
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
    try {
        const { username, password } = req.body;
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
        // Gera o token JWT
        const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });
        console.log('Login bem-sucedido:', { id: user.id, username: user.username });
        res.json({
            token,
            username: user.username,
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
            username: user.username
        });
    }
    catch (error) {
        console.error('Erro ao validar token:', error);
        res.status(401).json({ message: 'Token inválido' });
    }
});
exports.validateToken = validateToken;
