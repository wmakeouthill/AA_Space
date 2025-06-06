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
exports.broadcastMessageStatusUpdate = broadcastMessageStatusUpdate;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const fs_1 = __importDefault(require("fs"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const database_1 = require("./config/database");
const entities_1 = require("./models/entities");
const auth_1 = __importDefault(require("./routes/auth"));
const posts_1 = __importDefault(require("./routes/posts"));
const chat_1 = __importDefault(require("./routes/chat"));
const profile_1 = __importDefault(require("./routes/profile"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes")); // Adicionar import para as rotas de admin
const ip_block_middleware_1 = require("./middleware/ip-block.middleware"); // Adicionar import
const reward_controller_1 = require("./controllers/reward.controller");
const auth_middleware_1 = require("./middleware/auth.middleware");
// Chave secreta para JWT - deve ser igual à usada no controlador de auth
const JWT_SECRET = process.env.JWT_SECRET || 'bondedobumbiboladao';
dotenv_1.default.config();
const app = (0, express_1.default)();
// Robust port initialization
const envPort = process.env.PORT;
let port = 3000; // Default port
if (envPort) {
    const parsedPort = parseInt(envPort, 10);
    if (!isNaN(parsedPort) && parsedPort >= 0 && parsedPort < 65536) {
        port = parsedPort;
    }
    else {
        console.warn(`[SERVER] Invalid PORT environment variable: "${envPort}". Falling back to default port ${port}.`);
    }
}
else {
    console.log(`[SERVER] PORT environment variable not set. Using default port ${port}.`);
}
const isCodespacesEnv = process.env.CODESPACES === 'true' || process.env.GITHUB_CODESPACES === 'true';
// Lista de origens permitidas
const allowedOrigins = [
    'http://localhost:4200',
    'https://localhost:4200',
    'https://v3mrhcvc-4200.brs.devtunnels.ms',
    'http://localhost:3000',
    'http://localhost:3001',
    'https://v3mrhcvc-3000.brs.devtunnels.ms',
    'https://v3mrhcvc-3001.brs.devtunnels.ms',
    /^https:\/\/.*\.app\.github\.dev$/,
    /^https:\/\/.*\.github\.dev$/,
    /^https:\/\/.*\.github\.io$/
];
// Create HTTP server
const server = http_1.default.createServer(app);
// Create Socket.io server
const io = new socket_io_1.Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});
// Store active Socket.io connections by chat room
const chatRooms = new Map();
console.log('[SOCKET.IO] Socket.io server initialized. Chat rooms map created.');
// Socket.io connection handler
io.on('connection', (socket) => {
    console.log(`[SOCKET.IO] New connection: ${socket.id}`);
    // Handle user connection
    socket.on('userConnected', (data) => {
        socket.userId = data.userId;
        console.log(`[SOCKET.IO] User ${data.userId} connected with socket ${socket.id}`);
    });
    // Handle joining chat rooms
    socket.on('joinChat', (chatId) => {
        socket.join(`chat_${chatId}`);
        console.log(`[SOCKET.IO] Socket ${socket.id} joined chat_${chatId}`);
        // Add to our tracking map
        if (!chatRooms.has(chatId)) {
            chatRooms.set(chatId, new Set());
        }
        chatRooms.get(chatId).add(socket);
        console.log(`[SOCKET.IO] Chat room ${chatId} now has ${chatRooms.get(chatId).size} members`);
    });
    // Handle leaving chat rooms
    socket.on('leaveChat', (chatId) => {
        socket.leave(`chat_${chatId}`);
        console.log(`[SOCKET.IO] Socket ${socket.id} left chat_${chatId}`);
        // Remove from our tracking map
        const room = chatRooms.get(chatId);
        if (room) {
            room.delete(socket);
            if (room.size === 0) {
                chatRooms.delete(chatId);
                console.log(`[SOCKET.IO] Chat room ${chatId} is now empty and removed`);
            }
        }
    });
    // Handle sending messages
    socket.on('sendMessage', (messageData, ack) => {
        console.log(`[SOCKET.IO] Received sendMessage:`, messageData);
        // This will be handled by HTTP endpoints, but we can acknowledge receipt
        if (ack) {
            ack({ success: true, message: 'Message received' });
        }
    });
    // Handle disconnect
    socket.on('disconnect', (reason) => {
        console.log(`[SOCKET.IO] Socket ${socket.id} disconnected: ${reason}`);
        // Remove from all chat rooms
        chatRooms.forEach((clients, chatId) => {
            if (clients.has(socket)) {
                clients.delete(socket);
                if (clients.size === 0) {
                    chatRooms.delete(chatId);
                    console.log(`[SOCKET.IO] Chat room ${chatId} is now empty and removed on disconnect`);
                }
            }
        });
    });
});
// Function to broadcast messages to a specific chat room
function broadcastMessageToChat(chatId, message) {
    console.log(`[SOCKET.IO] broadcastMessageToChat called for chatId: ${chatId}, message status: ${message === null || message === void 0 ? void 0 : message.status}`);
    const roomName = `chat_${chatId}`;
    const connectedSockets = io.sockets.adapter.rooms.get(roomName);
    if (connectedSockets && connectedSockets.size > 0) {
        console.log(`[SOCKET.IO] Broadcasting to chat ${chatId} (${connectedSockets.size} clients)`);
        try {
            // Emit to all sockets in the chat room
            io.to(roomName).emit('newMessage', message);
            console.log(`[SOCKET.IO] Successfully broadcasted message to chat ${chatId}`);
        }
        catch (e) {
            console.error(`[SOCKET.IO] Error broadcasting message to chat ${chatId}. Error: ${e.message}`);
        }
    }
    else {
        console.log(`[SOCKET.IO] No clients found in chat ${chatId} to broadcast message`);
    }
}
// Function to broadcast message status updates to a specific chat room
function broadcastMessageStatusUpdate(chatId, readerUserId, status, messageIds) {
    const roomName = `chat_${chatId}`;
    const connectedSockets = io.sockets.adapter.rooms.get(roomName);
    if (connectedSockets && connectedSockets.size > 0) {
        const payload = {
            type: 'messageStatusUpdate',
            chatId,
            readerUserId, // The user who performed the action (e.g., read the messages)
            status,
            messageIds
        };
        console.log(`[SOCKET.IO] Broadcasting message status update to chat ${chatId} (${connectedSockets.size} clients)`);
        try {
            // Emit to all sockets in the chat room
            io.to(roomName).emit('messageStatusUpdate', payload);
            console.log(`[SOCKET.IO] Successfully broadcasted message status update to chat ${chatId}`);
        }
        catch (e) {
            console.error(`[SOCKET.IO] Error broadcasting message status update to chat ${chatId}. Error: ${e.message}`);
        }
    }
    else {
        console.log(`[SOCKET.IO] No clients found for chat ${chatId} to broadcast message status update.`);
    }
}
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
            return match;
        });
        if (isAllowed) {
            console.log(`[CORS] Server: Origin allowed: ${origin}`);
            callback(null, true);
        }
        else {
            console.error(`[CORS] Server: Origin denied: ${origin}.`);
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
// Aplicar o middleware de bloqueio de IP globalmente ANTES das rotas da API
app.use(ip_block_middleware_1.checkIpBlocked);
// Aplicar o middleware de autenticação globalmente para todas as rotas da API
app.use('/api', auth_middleware_1.authMiddleware);
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
console.log('Diretório de uploads configurado:', path_1.default.join(__dirname, '../uploads'));
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Improve access to profile images with special logging and cache control
app.use('/uploads/profiles', (req, res, next) => {
    console.log(`[STATIC MIDDLEWARE] Profile image request: ${req.url}`);
    console.log(`[STATIC MIDDLEWARE] Full path: ${path_1.default.join(__dirname, '../uploads/profiles', req.url)}`);
    const filePath = path_1.default.join(__dirname, '../uploads/profiles', req.url);
    if (fs_1.default.existsSync(filePath)) {
        console.log(`[STATIC MIDDLEWARE] File exists: ${filePath}`);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('X-Served-At', new Date().toISOString());
    }
    else {
        console.log(`[STATIC MIDDLEWARE] File NOT found: ${filePath}`);
    }
    next();
}, express_1.default.static(path_1.default.join(__dirname, '../uploads/profiles')));
// Rota alternativa para acessar uploads através da API
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
        const uploadsExists = fs_1.default.existsSync(uploadsDir);
        const profilesExists = fs_1.default.existsSync(profilesDir);
        let files = [];
        if (profilesExists) {
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
        const hostname = req.headers.host || 'unknown';
        const origin = req.headers.origin || 'unknown';
        const forwardedHost = req.headers['x-forwarded-host'] || 'none';
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
app.use('/api/admin', admin_routes_1.default); // Adicionar rota para admin
// Rotas de recompensas consolidadas - com middlewares específicos para proteção
app.post('/api/rewards/seed', auth_middleware_1.authenticateToken, auth_middleware_1.isAdmin, reward_controller_1.seedRewards);
app.get('/api/rewards', auth_middleware_1.authenticateToken, auth_middleware_1.isLeaderOrAdmin, reward_controller_1.getAllRewards);
app.get('/api/rewards/user/:userId', auth_middleware_1.authenticateToken, reward_controller_1.getUserRewards);
app.get('/api/rewards/username/:username', auth_middleware_1.authenticateToken, reward_controller_1.getUserRewardsByUsername);
app.post('/api/rewards/grant', auth_middleware_1.authenticateToken, auth_middleware_1.isLeaderOrAdmin, reward_controller_1.grantRewardToUser);
app.delete('/api/rewards/clear', auth_middleware_1.authenticateToken, auth_middleware_1.isLeaderOrAdmin, reward_controller_1.clearUserRewards);
app.delete('/api/rewards/remove', auth_middleware_1.authenticateToken, auth_middleware_1.isLeaderOrAdmin, reward_controller_1.removeUserReward);
// Rota explícita de fallback para o perfil do usuário atual
app.get('/api/profile/me', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('[FALLBACK ROUTE] Interceptada requisição para /api/profile/me');
    console.log('[FALLBACK ROUTE] Headers:', req.headers);
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('[FALLBACK ROUTE] No auth token provided for /api/profile/me');
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
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        console.log('[FALLBACK ROUTE] Decoded token:', decoded);
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
if (process.env.NODE_ENV === 'production' || isCodespacesEnv) {
    const distPath = path_1.default.join(__dirname, '../../dist/aa-space');
    console.log('Servindo arquivos estáticos do Angular de:', distPath);
    app.use(express_1.default.static(distPath));
    app.get('*', (req, res, next) => {
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
