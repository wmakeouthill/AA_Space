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
exports.broadcastMessageToChat = broadcastMessageToChat;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const fs_1 = __importDefault(require("fs"));
const http_1 = __importDefault(require("http")); // Added
const ws_1 = require("ws"); // Added
const database_1 = require("./config/database");
const entities_1 = require("./models/entities");
const auth_1 = __importDefault(require("./routes/auth"));
const posts_1 = __importDefault(require("./routes/posts"));
const chat_1 = __importDefault(require("./routes/chat"));
const profile_1 = __importDefault(require("./routes/profile"));
// Chave secreta para JWT - deve ser igual à usada no controlador de auth
const JWT_SECRET = process.env.JWT_SECRET || 'bondedobumbiboladao';
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = Number(process.env.PORT || 3001);
const isCodespacesEnv = process.env.CODESPACES === 'true' || process.env.GITHUB_CODESPACES === 'true';
// Create HTTP server
const server = http_1.default.createServer(app); // Added
// Create WebSocket server
const wss = new ws_1.WebSocketServer({ server }); // Added
// Store active WebSocket connections (you'll need a more robust way to manage this, e.g., by chatId)
const clients = new Map(); // Example: Map<chatId, Set<WebSocket>>
wss.on('connection', (ws, req) => {
    // Extract chatId from the URL, e.g., /1, /2
    const url = req.url; // In a real setup, req.url might be undefined here depending on ws version and setup.
    // It's often better to get the path from the initial HTTP upgrade request if possible,
    // or pass it via a subprotocol or initial message.
    // For now, let's assume the path is directly available or can be derived.
    // A common pattern is to expect the chatId in the path, like /<chatId>
    // Example: ws://localhost:3001/2
    const pathParts = url ? url.split('/').filter(part => part) : [];
    const chatId = pathParts[0]; // This assumes the URL is like /<chatId>
    if (!chatId) {
        console.log('[WSS] Connection attempt without chatId, closing.');
        ws.close();
        return;
    }
    console.log(`[WSS] Client connected to chat: ${chatId}`);
    if (!clients.has(chatId)) {
        clients.set(chatId, new Set());
    }
    clients.get(chatId).add(ws);
    ws.on('message', (message) => {
        // For this application, the client primarily listens.
        // If clients were to send messages over WS, you'd handle them here.
        console.log(`[WSS] Received message on chat ${chatId}: ${message.toString()}`);
        // Example: Broadcast to other clients in the same chat
        // clients.get(chatId)?.forEach(client => {
        //     if (client !== ws && client.readyState === WebSocket.OPEN) {
        //         client.send(message.toString());
        //     }
        // });
    });
    ws.on('close', () => {
        var _a, _b;
        console.log(`[WSS] Client disconnected from chat: ${chatId}`);
        (_a = clients.get(chatId)) === null || _a === void 0 ? void 0 : _a.delete(ws);
        if (((_b = clients.get(chatId)) === null || _b === void 0 ? void 0 : _b.size) === 0) {
            clients.delete(chatId);
        }
    });
    ws.on('error', (error) => {
        var _a, _b;
        console.error(`[WSS] Error on chat ${chatId}:`, error);
        // Ensure client is removed on error as well
        (_a = clients.get(chatId)) === null || _a === void 0 ? void 0 : _a.delete(ws);
        if (((_b = clients.get(chatId)) === null || _b === void 0 ? void 0 : _b.size) === 0) {
            clients.delete(chatId);
        }
    });
});
// Function to broadcast messages to a specific chat room
// You will call this from your chat.controller.ts after a message is saved
function broadcastMessageToChat(chatId, message) {
    const chatClients = clients.get(chatId.toString()); // Ensure chatId is a string
    if (chatClients) {
        const messageString = JSON.stringify(message);
        console.log(`[WSS] Broadcasting to chat ${chatId}:`, messageString);
        chatClients.forEach(client => {
            if (client.readyState === ws_1.WebSocket.OPEN) {
                client.send(messageString);
            }
        });
    }
    else {
        console.log(`[WSS] No clients connected to chat ${chatId} to broadcast message.`);
    }
}
// Lista de origens permitidas
const allowedOrigins = [
    'http://localhost:4200',
    'https://localhost:4200',
    'https://v3mrhcvc-4200.brs.devtunnels.ms', // Trailing slash removed
    'http://localhost:3001',
    'https://v3mrhcvc-3001.brs.devtunnels.ms', // Trailing slash removed
    /^https:\/\/.*\.app\.github\.dev$/, // Permite qualquer subdomínio do GitHub Codespaces
    /^https:\/\/.*\.github\.dev$/, // Formato alternativo de domínio Codespaces
    /^https:\/\/.*\.github\.io$/ // Suporte para GitHub Pages
];
// Configuração CORS detalhada
const corsOptions = {
    origin: function (origin, callback) {
        console.log(`[CORS] Server: Received origin for check: ${origin}`);
        if (!origin) {
            console.log('[CORS] Server: No origin received, allowing by default (e.g., curl, server-to-server).');
            return callback(null, true);
        }
        const isAllowed = allowedOrigins.some(allowedOrigin => {
            let match = false;
            if (allowedOrigin instanceof RegExp) {
                match = allowedOrigin.test(origin);
            }
            else {
                match = (allowedOrigin === origin);
            }
            // Para depuração mais detalhada, descomente a linha abaixo:
            // console.log(`[CORS] Server: Comparing origin "${origin}" against allowed entry "${allowedOrigin.toString()}": ${match}`);
            return match;
        });
        if (isAllowed) {
            console.log(`[CORS] Server: Origin allowed: ${origin}`);
            callback(null, true);
        }
        else {
            console.error(`[CORS] Server: Origin denied: ${origin}.`);
            // Log da lista de origens permitidas para facilitar a depuração
            console.error(`[CORS] Server: Current allowed origins list:`, allowedOrigins.map(o => typeof o === 'string' ? o : o.toString()));
            callback(new Error(`CORS not allowed for origin: ${origin}`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization'
    ],
    exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
    optionsSuccessStatus: 200,
    maxAge: 3600
};
// Debug middleware para logar todas as requisições e headers
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    console.log('Origin:', req.get('origin'));
    console.log('Environment:', isCodespacesEnv ? 'GitHub Codespaces' : 'Local Development');
    next();
});
// Aplica CORS
app.use((0, cors_1.default)(corsOptions));
// Parse JSON bodies
app.use(express_1.default.json({ limit: '50mb' })); // Aumentando o limite para permitir uploads de imagens
// Headers adicionais para CORS
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
        return res.status(200).json({});
    }
    next();
});
// Configuração para servir os arquivos de upload
// Fornecendo acesso aos uploads com a URL completa (sem /api)
console.log('Diretório de uploads configurado:', path_1.default.join(__dirname, '../uploads'));
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Improve access to profile images with special logging and cache control
app.use('/uploads/profiles', (req, res, next) => {
    console.log(`[STATIC MIDDLEWARE] Profile image request: ${req.url}`);
    console.log(`[STATIC MIDDLEWARE] Full path: ${path_1.default.join(__dirname, '../uploads/profiles', req.url)}`);
    // Check if the file exists
    const filePath = path_1.default.join(__dirname, '../uploads/profiles', req.url);
    if (fs_1.default.existsSync(filePath)) {
        console.log(`[STATIC MIDDLEWARE] File exists: ${filePath}`);
        // Disable caching for profile images to ensure fresh content
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        // Add timestamp for debugging
        res.setHeader('X-Served-At', new Date().toISOString());
    }
    else {
        console.log(`[STATIC MIDDLEWARE] File NOT found: ${filePath}`);
    }
    // Continue with static file handling
    next();
}, express_1.default.static(path_1.default.join(__dirname, '../uploads/profiles')));
// Rota alternativa para acessar uploads através da API (caso o cliente esteja tentando acessar via /api)
app.use('/api/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Rota de health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date(),
        environment: isCodespacesEnv ? 'GitHub Codespaces' : 'Local',
        corsConfig: corsOptions,
        headers: req.headers,
        origin: req.headers.origin
    });
});
// Rota para diagnóstico de arquivos de upload
app.get('/api/uploads/check', (req, res) => {
    try {
        const uploadsDir = path_1.default.resolve(path_1.default.join(__dirname, '../uploads'));
        const profilesDir = path_1.default.join(uploadsDir, 'profiles');
        // Verificar se os diretórios existem
        const uploadsExists = fs_1.default.existsSync(uploadsDir);
        const profilesExists = fs_1.default.existsSync(profilesDir);
        let files = [];
        if (profilesExists) {
            // Listar arquivos no diretório de perfis
            files = fs_1.default.readdirSync(profilesDir).map(file => {
                const filePath = path_1.default.join(profilesDir, file);
                const stats = fs_1.default.statSync(filePath);
                return {
                    name: file,
                    path: `/uploads/profiles/${file}`,
                    size: stats.size,
                    created: stats.birthtime,
                    permissions: stats.mode.toString(8).substring(stats.mode.toString(8).length - 3)
                };
            });
        }
        // Verificar informações sobre o host
        const hostname = req.headers.host || 'unknown';
        const origin = req.headers.origin || 'unknown';
        const forwardedHost = req.headers['x-forwarded-host'] || 'none';
        // Adicionar URLs de exemplo para testes
        const apiUrl = origin.replace(/-4200\./, '-3001.');
        const testUrls = files.slice(0, 3).map(file => `${apiUrl}${file.path}`);
        res.json({
            status: 'OK',
            uploadsPath: uploadsDir,
            profilesPath: profilesDir,
            uploadsExists,
            profilesExists,
            filesCount: files.length,
            files: files,
            requestInfo: {
                hostname,
                origin,
                forwardedHost
            },
            testUrls
        });
    }
    catch (error) {
        console.error('Erro ao verificar diretórios de upload:', error);
        res.status(500).json({
            status: 'ERROR',
            message: 'Erro ao verificar diretórios de upload',
            details: error.message
        });
    }
});
// Configuração das rotas API
app.use('/api/auth', auth_1.default);
app.use('/api/posts', posts_1.default);
app.use('/api/chat', chat_1.default);
app.use('/api/profile', profile_1.default);
// Rota explícita de fallback para o perfil do usuário atual
app.get('/api/profile/me', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('[FALLBACK ROUTE] Interceptada requisição para /api/profile/me');
    console.log('[FALLBACK ROUTE] Headers:', req.headers);
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('[FALLBACK ROUTE] No auth token provided for /api/profile/me');
            // For development purposes only, return a default profile
            if (process.env.NODE_ENV !== 'production') {
                console.log('[FALLBACK ROUTE] Returning development fallback profile');
                return res.json({
                    id: 1,
                    username: 'admin',
                    email: 'admin@example.com',
                    phone: '123-456-7890',
                    profileImage: '8_a30d4645808aaf13.jpeg',
                    isAdmin: true
                });
            }
            return res.status(401).json({ message: 'Token não fornecido ou inválido' });
        }
        const token = authHeader.split(' ')[1];
        console.log('[FALLBACK ROUTE] Token received:', token.substring(0, 20) + '...');
        // Verificar o token JWT
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        console.log('[FALLBACK ROUTE] Decoded token:', decoded);
        // Verificar se o usuário existe no banco de dados
        const userRepository = database_1.AppDataSource.getRepository(entities_1.User);
        const user = yield userRepository.findOne({ where: { id: decoded.id } });
        if (!user) {
            return res.status(401).json({ message: 'Usuário não encontrado' });
        }
        console.log(`[FALLBACK ROUTE] Retornando perfil para usuário ${user.username}`);
        return res.status(200).json({
            id: user.id,
            username: user.username,
            email: user.email,
            phone: user.phone,
            profileImage: user.profileImage,
            isAdmin: user.isAdmin
        });
    }
    catch (error) {
        console.error('[FALLBACK ROUTE] Erro ao buscar perfil do usuário:', error);
        return res.status(401).json({ message: 'Token inválido ou expirado' });
    }
}));
// Em ambiente de produção ou Codespaces, configure para servir arquivos estáticos do Angular
if (process.env.NODE_ENV === 'production' || isCodespacesEnv) {
    // Caminho correto para os arquivos compilados do Angular
    const distPath = path_1.default.join(__dirname, '../../dist/aa-space');
    console.log('Servindo arquivos estáticos do Angular de:', distPath);
    // Servir arquivos estáticos
    app.use(express_1.default.static(distPath));
    // Todas as requisições não tratadas pela API serão redirecionadas para o Angular
    app.get('*', (req, res, next) => {
        // Se a URL começar com /api, passa para os handlers de API
        if (req.url.startsWith('/api')) {
            return next();
        }
        res.sendFile(path_1.default.join(distPath, 'index.html'));
    });
}
// Tratamento de erros global
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        message: 'Internal server error',
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield database_1.AppDataSource.initialize();
        console.log('Database initialized successfully!');
        console.log('Database path:', database_1.AppDataSource.options.database);
        console.log('Environment:', isCodespacesEnv ? 'GitHub Codespaces' : 'Local Development');
        // Start the HTTP server (which now also handles WebSocket upgrades)
        server.listen(port, '0.0.0.0', () => {
            console.log(`Server is running at http://localhost:${port}`);
            console.log('CORS enabled for:', allowedOrigins);
            console.log('Available routes:');
            console.log('- GET /api/health');
            console.log('- POST /api/auth/login');
            console.log('- POST /api/auth/register');
            console.log('- GET /api/auth/validate');
            console.log('- POST /api/auth/promote [auth required, admin only]');
            console.log('- GET /api/posts');
            console.log('- GET /api/posts/:id');
            console.log('- POST /api/posts');
            console.log('- GET /api/posts/:postId/comments');
            console.log('- POST /api/posts/:postId/comments');
            console.log('- POST /api/posts/:postId/like [auth required]');
            console.log('- POST /api/posts/:postId/comments/:commentId/like [auth required]');
            console.log('- DELETE /api/posts/:id [auth required]');
            console.log('- POST /api/posts/:id/delete [auth required]');
        });
    }
    catch (error) {
        console.error('Error during initialization:', error);
        process.exit(1);
    }
});
startServer();
