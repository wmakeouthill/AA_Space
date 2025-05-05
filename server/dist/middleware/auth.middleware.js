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
        // Lista de rotas que permitem acesso sem autenticação
        const publicPatterns = [
            { path: '/api/auth/login', method: 'POST' },
            { path: '/api/auth/register', method: 'POST' },
            { path: '/api/posts', method: 'GET' },
            { path: '/api/posts', method: 'POST' }
        ];
        // Verifica se a URL corresponde a rotas dinâmicas públicas
        const isDynamicPublicRoute = ((req.method === 'GET' && req.path.match(/^\/api\/posts\/\d+$/)) || // GET individual post
            (req.method === 'GET' && req.path.match(/^\/api\/posts\/\d+\/comments$/)) || // GET post comments
            (req.method === 'POST' && req.path.match(/^\/api\/posts\/\d+\/comments$/)) // POST comments
        );
        // Verifica se é uma rota pública estática
        const isStaticPublicRoute = publicPatterns.some(pattern => {
            const pathMatches = pattern.path === req.path || (pattern.path === '/api/posts' && req.path.startsWith('/api/posts'));
            return pathMatches && pattern.method === req.method;
        });
        // Se for rota pública, permite o acesso mesmo sem token
        if (isStaticPublicRoute || isDynamicPublicRoute) {
            // Se tiver token, tenta decodificar para ter acesso ao usuário
            if (authHeader) {
                const token = authHeader.split(' ')[1];
                if (token) {
                    try {
                        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'seu_segredo_jwt_super_secreto');
                        req.user = decoded;
                    }
                    catch (error) {
                        // Para rotas públicas, se o token for inválido, continua sem autenticação
                        console.log('Token inválido em rota pública, continuando sem autenticação');
                    }
                }
            }
            return next();
        }
        // Para rotas protegidas, exige token válido
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
