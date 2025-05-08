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
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../config/database");
const entities_1 = require("../models/entities");
const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_jwt_super_secreto';
const authMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log(`[AUTH MIDDLEWARE] Método: ${req.method}, URL: ${req.url}`);
        console.log(`[AUTH MIDDLEWARE] Headers Authorization: ${req.headers.authorization}`);
        // Permitir acesso sem autenticação para algumas rotas públicas
        if ((req.method === 'GET' && (req.url === '/posts' || req.url.startsWith('/posts/'))) ||
            req.url === '/health') {
            console.log('[AUTH MIDDLEWARE] Rota pública, permitindo acesso sem autenticação');
            return next();
        }
        const authHeader = req.headers.authorization;
        console.log('[AUTH MIDDLEWARE] Token presente:', !!authHeader);
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // Para rotas específicas que permitem acesso como convidado
            if ((req.method === 'POST' && req.url.startsWith('/posts')) ||
                (req.method === 'POST' && req.url.includes('/comments'))) {
                console.log('[AUTH MIDDLEWARE] Permitindo acesso como convidado para criar posts/comentários');
                return next();
            }
            return res.status(401).json({ message: 'Token não fornecido ou inválido' });
        }
        const token = authHeader.split(' ')[1];
        // Verificar o token JWT
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        console.log('[AUTH MIDDLEWARE] Token verificado:', decoded);
        // Verificar se o usuário existe no banco de dados
        const userRepository = database_1.AppDataSource.getRepository(entities_1.User);
        const user = yield userRepository.findOne({ where: { id: decoded.id } });
        if (!user) {
            console.log('[AUTH MIDDLEWARE] Usuário não encontrado no banco de dados');
            return res.status(401).json({ message: 'Usuário não encontrado' });
        }
        // Adicionar informações do usuário ao objeto de requisição
        req.user = {
            id: user.id,
            username: user.username,
            isAdmin: user.isAdmin
        };
        console.log(`[AUTH MIDDLEWARE] Usuário encontrado: ${user.username}, isAdmin: ${user.isAdmin}`);
        next();
    }
    catch (error) {
        console.error('[AUTH MIDDLEWARE] Erro:', error);
        return res.status(401).json({ message: 'Token inválido ou expirado' });
    }
});
exports.authMiddleware = authMiddleware;
