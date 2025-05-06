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
const authMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // Adiciona logs para diagnóstico
    console.log(`[AUTH MIDDLEWARE] Método: ${req.method}, URL: ${req.url}`);
    console.log(`[AUTH MIDDLEWARE] Headers Authorization:`, req.headers.authorization);
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
    console.log(`[AUTH MIDDLEWARE] Token presente: ${!!token}`);
    if (!token) {
        console.log('[AUTH MIDDLEWARE] Sem token, continuando...');
        return next();
    }
    try {
        const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_jwt_super_secreto';
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        console.log('[AUTH MIDDLEWARE] Token verificado:', decoded);
        // Buscar informações atualizadas do usuário do banco de dados
        const userRepository = database_1.AppDataSource.getRepository(entities_1.User);
        const user = yield userRepository.findOne({
            where: { id: decoded.id }
        });
        if (user) {
            // Adicionar informações do usuário ao request
            req.user = {
                id: user.id,
                username: user.username,
                isAdmin: !!user.isAdmin // Garante que seja boolean (true/false)
            };
            console.log(`[AUTH MIDDLEWARE] Usuário encontrado: ${user.username}, isAdmin: ${user.isAdmin}`);
        }
        else {
            console.log(`[AUTH MIDDLEWARE] Usuário não encontrado no banco de dados para id: ${decoded.id}`);
            // Usar informações do token se o usuário não for encontrado no banco
            req.user = {
                id: decoded.id,
                username: decoded.username,
                isAdmin: decoded.isAdmin
            };
        }
        next();
    }
    catch (error) {
        console.error('[AUTH MIDDLEWARE] Erro ao verificar token:', error);
        // Não enviamos erro, apenas continuamos sem autenticação
        next();
    }
});
exports.authMiddleware = authMiddleware;
