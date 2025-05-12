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
const JWT_SECRET = process.env.JWT_SECRET || 'bondedobumbiboladao';
const authMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    console.log(`[AUTH MIDDLEWARE V3] Método: ${req.method}, URL: ${req.originalUrl}`);
    const authHeader = req.headers.authorization;
    req.user = undefined; // Inicializa req.user como undefined
    // 1. Tenta decodificar o token e definir req.user se o token estiver presente e for válido
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        console.log(`[AUTH MIDDLEWARE V3] Token Bearer detectado.`);
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            console.log(`[AUTH MIDDLEWARE V3] Token decodificado: UserID ${decoded.id}, Username ${decoded.username}`);
            const userRepository = database_1.AppDataSource.getRepository(entities_1.User);
            // Garante que estamos buscando pelo ID correto e que o usuário existe
            const userFromDb = yield userRepository.findOne({ where: { id: decoded.id } });
            if (userFromDb) {
                req.user = {
                    id: userFromDb.id,
                    username: userFromDb.username,
                    isAdmin: (_a = userFromDb.isAdmin) !== null && _a !== void 0 ? _a : false // Garante que isAdmin tenha um valor booleano
                };
                console.log(`[AUTH MIDDLEWARE V3] Usuário autenticado via token: ${req.user.username} (ID: ${req.user.id})`);
            }
            else {
                console.warn(`[AUTH MIDDLEWARE V3] Token válido, mas usuário ID ${decoded.id} não encontrado no banco de dados.`);
                // req.user permanece undefined, acesso não autenticado
            }
        }
        catch (error) {
            console.warn(`[AUTH MIDDLEWARE V3] Falha na verificação do token: ${error.message}. Acesso prosseguirá como não autenticado se a rota permitir.`);
            // req.user permanece undefined
        }
    }
    else {
        console.log('[AUTH MIDDLEWARE V3] Nenhum token de autenticação Bearer fornecido.');
    }
    // 2. Define rotas/ações que EXIGEM autenticação (o usuário DEVE estar logado)
    const strictlyProtectedRules = [
        // Rotas de Administração
        { pathPattern: /^\/api\/admin/, methods: ['GET', 'POST', 'PUT', 'DELETE'] },
        { pathPattern: /^\/api\/users/, methods: ['GET', 'POST', 'PUT', 'DELETE'] }, // Assumindo que /api/users é admin
        // Rotas de Chat
        { pathPattern: /^\/api\/chat/, methods: ['GET', 'POST', 'PUT', 'DELETE'] },
        // Rotas de Perfil do Usuário Logado
        { pathPattern: /^\/api\/profile\/me$/, methods: ['GET', 'PUT'] },
        // Ações de Like/Unlike (exigem saber QUEM está curtindo)
        { pathPattern: /^\/api\/posts\/\d+\/like$/, methods: ['POST'] },
        { pathPattern: /^\/api\/posts\/\d+\/unlike$/, methods: ['POST'] },
        { pathPattern: /^\/api\/posts\/\d+\/comments\/\d+\/like$/, methods: ['POST'] },
        { pathPattern: /^\/api\/posts\/\d+\/comments\/\d+\/unlike$/, methods: ['POST'] },
        // Edição e Deleção de Posts e Comentários (geralmente exigem autoria ou admin)
        // Se a lógica de permissão estiver no controller, estas podem não ser estritamente protegidas aqui,
        // mas é mais seguro exigir login para modificar/deletar conteúdo.
        { pathPattern: /^\/api\/posts\/\d+$/, methods: ['PUT', 'DELETE'] },
        { pathPattern: /^\/api\/posts\/\d+\/comments\/\d+$/, methods: ['PUT', 'DELETE'] }
    ];
    let requiresAuth = false;
    for (const rule of strictlyProtectedRules) {
        if (rule.pathPattern.test(req.originalUrl) && rule.methods.includes(req.method)) {
            requiresAuth = true;
            console.log(`[AUTH MIDDLEWARE V3] Rota/método (${req.method} ${req.originalUrl}) requer autenticação estrita.`);
            break;
        }
    }
    // Criar posts (POST /api/posts) e comentários (POST /api/posts/:id/comments)
    // Se posts/comentários anônimos são permitidos, estas rotas NÃO exigem autenticação estrita.
    // O controller usará req.user se presente, ou criará anonimamente se ausente.
    // A lógica anterior permitia acesso como convidado, então não vamos exigir auth aqui.
    // Se a política mudar para exigir login para postar, adicione estas rotas a strictlyProtectedRules.
    if (requiresAuth && !req.user) {
        console.log(`[AUTH MIDDLEWARE V3] Acesso negado. Autenticação é obrigatória para ${req.method} ${req.originalUrl} e usuário não está autenticado.`);
        return res.status(401).json({ message: 'Autenticação obrigatória' });
    }
    // Para todos os outros casos (GETs públicos, ou acesso autenticado às rotas acima, ou rotas não listadas que permitem acesso anônimo como criar posts/comentários)
    // req.user é populado se o token era válido, caso contrário, é undefined.
    // Os controllers podem verificar req.user para adaptar respostas (ex: userLiked, ou associar post/comentário ao usuário).
    console.log(`[AUTH MIDDLEWARE V3] Prosseguindo para ${req.method} ${req.originalUrl}. Usuário autenticado: ${req.user ? `${req.user.username} (ID: ${req.user.id})` : 'Nenhum (anônimo/convidado)'}`);
    return next();
});
exports.authMiddleware = authMiddleware;
