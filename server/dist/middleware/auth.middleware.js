"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({
                message: 'Token não fornecido',
                code: 'TOKEN_MISSING'
            });
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                message: 'Formato de token inválido',
                code: 'TOKEN_FORMAT_INVALID'
            });
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'seu_segredo_jwt_super_secreto');
            req.user = decoded;
            next();
        }
        catch (jwtError) {
            console.error('Erro na verificação do JWT:', jwtError);
            if (jwtError instanceof jsonwebtoken_1.default.TokenExpiredError) {
                return res.status(401).json({
                    message: 'Token expirado',
                    code: 'TOKEN_EXPIRED'
                });
            }
            return res.status(401).json({
                message: 'Token inválido',
                code: 'TOKEN_INVALID'
            });
        }
    }
    catch (error) {
        console.error('Erro no middleware de autenticação:', error);
        res.status(500).json({
            message: 'Erro interno no servidor',
            code: 'SERVER_ERROR'
        });
    }
};
exports.authMiddleware = authMiddleware;
