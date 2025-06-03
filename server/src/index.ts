import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

// Extend Socket interface to include custom properties
declare module 'socket.io' {
    interface Socket {
        userId?: number;
    }
}

import { AppDataSource } from './config/database';
import { User } from './models/entities';
import authRoutes from './routes/auth';
import postRoutes from './routes/posts';
import chatRoutes from './routes/chat';
import profileRoutes from './routes/profile';
import adminRoutes from './routes/admin.routes'; // Adicionar import para as rotas de admin
import { checkIpBlocked } from './middleware/ip-block.middleware'; // Adicionar import
import { getAllRewards, getUserRewards, grantRewardToUser, seedRewards } from './controllers/reward.controller';
import { authMiddleware, authenticateToken, isAdmin, isLeaderOrAdmin } from './middleware/auth.middleware';

// Chave secreta para JWT - deve ser igual à usada no controlador de auth
const JWT_SECRET = process.env.JWT_SECRET || 'bondedobumbiboladao';

dotenv.config();

const app = express();

// Robust port initialization
const envPort = process.env.PORT;
let port = 3000; // Default port
if (envPort) {
  const parsedPort = parseInt(envPort, 10);
  if (!isNaN(parsedPort) && parsedPort >= 0 && parsedPort < 65536) {
    port = parsedPort;
  } else {
    console.warn(`[SERVER] Invalid PORT environment variable: "${envPort}". Falling back to default port ${port}.`);
  }
} else {
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
const server = http.createServer(app);

// Create Socket.io server
const io = new SocketIOServer(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Store active Socket.io connections by chat room
const chatRooms = new Map<string, Set<Socket>>();
console.log('[SOCKET.IO] Socket.io server initialized. Chat rooms map created.');

// Socket.io connection handler
io.on('connection', (socket: Socket) => {
    console.log(`[SOCKET.IO] New connection: ${socket.id}`);

    // Handle user connection
    socket.on('userConnected', (data: { userId: number }) => {
        socket.userId = data.userId;
        console.log(`[SOCKET.IO] User ${data.userId} connected with socket ${socket.id}`);
    });

    // Handle joining chat rooms
    socket.on('joinChat', (chatId: string) => {
        socket.join(`chat_${chatId}`);
        console.log(`[SOCKET.IO] Socket ${socket.id} joined chat_${chatId}`);

        // Add to our tracking map
        if (!chatRooms.has(chatId)) {
            chatRooms.set(chatId, new Set());
        }
        chatRooms.get(chatId)!.add(socket);
        console.log(`[SOCKET.IO] Chat room ${chatId} now has ${chatRooms.get(chatId)!.size} members`);
    });

    // Handle leaving chat rooms
    socket.on('leaveChat', (chatId: string) => {
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
    socket.on('sendMessage', (messageData: any, ack?: Function) => {
        console.log(`[SOCKET.IO] Received sendMessage:`, messageData);
        // This will be handled by HTTP endpoints, but we can acknowledge receipt
        if (ack) {
            ack({ success: true, message: 'Message received' });
        }
    });

    // Handle disconnect
    socket.on('disconnect', (reason: string) => {
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
export function broadcastMessageToChat(chatId: string, message: any) {
    console.log(`[SOCKET.IO] broadcastMessageToChat called for chatId: ${chatId}, message status: ${message?.status}`);

    const roomName = `chat_${chatId}`;
    const connectedSockets = io.sockets.adapter.rooms.get(roomName);

    if (connectedSockets && connectedSockets.size > 0) {
        console.log(`[SOCKET.IO] Broadcasting to chat ${chatId} (${connectedSockets.size} clients)`);

        try {
            // Emit to all sockets in the chat room
            io.to(roomName).emit('newMessage', message);
            console.log(`[SOCKET.IO] Successfully broadcasted message to chat ${chatId}`);
        } catch (e: any) {
            console.error(`[SOCKET.IO] Error broadcasting message to chat ${chatId}. Error: ${e.message}`);
        }
    } else {
        console.log(`[SOCKET.IO] No clients found in chat ${chatId} to broadcast message`);
    }
}

// Function to broadcast message status updates to a specific chat room
export function broadcastMessageStatusUpdate(chatId: string, readerUserId: string, status: 'read' | 'delivered' | 'sent', messageIds: string[]) {
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
        } catch (e: any) {
            console.error(`[SOCKET.IO] Error broadcasting message status update to chat ${chatId}. Error: ${e.message}`);
        }
    } else {
        console.log(`[SOCKET.IO] No clients found for chat ${chatId} to broadcast message status update.`);
    }
}

// Configuração CORS detalhada
const corsOptions = {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
        console.log(`[CORS] Server: Received origin for check: ${origin}`);
        if (!origin) {
            console.log('[CORS] Server: No origin received, allowing by default (e.g., curl, server-to-server).');
            return callback(null, true);
        }

        const isAllowed = allowedOrigins.some(allowedOrigin => {
            let match = false;
            if (allowedOrigin instanceof RegExp) {
                match = allowedOrigin.test(origin);
            } else {
                match = (allowedOrigin === origin);
            }
            return match;
        });

        if (isAllowed) {
            console.log(`[CORS] Server: Origin allowed: ${origin}`);
            callback(null, true);
        } else {
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
app.use((req: Request, res: Response, next: NextFunction) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    console.log('Origin:', req.get('origin'));
    console.log('Environment:', isCodespacesEnv ? 'GitHub Codespaces' : 'Local Development');
    next();
});

// Aplica CORS
app.use(cors(corsOptions));

// Parse JSON bodies
app.use(express.json({ limit: '50mb' }));  // Aumentando o limite para permitir uploads de imagens

// Aplicar o middleware de bloqueio de IP globalmente ANTES das rotas da API
app.use(checkIpBlocked);

// Aplicar o middleware de autenticação globalmente para todas as rotas da API
app.use('/api', authMiddleware);

// Headers adicionais para CORS
app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (origin) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
        return res.status(200).json({});
    }
    next();
});

// Configuração para servir os arquivos de upload
console.log('Diretório de uploads configurado:', path.join(__dirname, '../uploads'));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Improve access to profile images with special logging and cache control
app.use('/uploads/profiles', (req, res, next) => {
    console.log(`[STATIC MIDDLEWARE] Profile image request: ${req.url}`);
    console.log(`[STATIC MIDDLEWARE] Full path: ${path.join(__dirname, '../uploads/profiles', req.url)}`);

    const filePath = path.join(__dirname, '../uploads/profiles', req.url);
    if (fs.existsSync(filePath)) {
        console.log(`[STATIC MIDDLEWARE] File exists: ${filePath}`);

        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        res.setHeader('X-Served-At', new Date().toISOString());
    } else {
        console.log(`[STATIC MIDDLEWARE] File NOT found: ${filePath}`);
    }

    next();
}, express.static(path.join(__dirname, '../uploads/profiles')));

// Rota alternativa para acessar uploads através da API
app.use('/api/uploads', express.static(path.join(__dirname, '../uploads')));

// Rota de health check
app.get('/api/health', (req: Request, res: Response) => {
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
app.get('/api/uploads/check', (req: Request, res: Response) => {
    try {
        const uploadsDir = path.resolve(path.join(__dirname, '../uploads'));
        const profilesDir = path.join(uploadsDir, 'profiles');

        const uploadsExists = fs.existsSync(uploadsDir);
        const profilesExists = fs.existsSync(profilesDir);

        interface FileInfo {
            name: string;
            path: string;
            size: number;
            created: Date;
            permissions: string;
        }

        let files: FileInfo[] = [];

        if (profilesExists) {
            files = fs.readdirSync(profilesDir).map(file => {
                const filePath = path.join(profilesDir, file);
                const stats = fs.statSync(filePath);
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

        const apiUrl = (origin as string).replace(/-4200\./, '-3001.');
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
    } catch (error) {
        console.error('Erro ao verificar diretórios de upload:', error);
        res.status(500).json({
            status: 'ERROR',
            message: 'Erro ao verificar diretórios de upload',
            details: (error as Error).message
        });
    }
});

// Configuração das rotas API
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes); // Adicionar rota para admin

// Rotas de recompensas consolidadas - com middlewares específicos para proteção
app.post('/api/rewards/seed', authenticateToken, isAdmin, seedRewards);
app.get('/api/rewards', authenticateToken, isLeaderOrAdmin, getAllRewards);
app.get('/api/rewards/user/:userId', authenticateToken, getUserRewards);
app.post('/api/rewards/grant', authenticateToken, isLeaderOrAdmin, grantRewardToUser);

// Rota explícita de fallback para o perfil do usuário atual
app.get('/api/profile/me', async (req: Request, res: Response) => {
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

        const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string; isAdmin?: boolean };
        console.log('[FALLBACK ROUTE] Decoded token:', decoded);

        const userRepository = AppDataSource.getRepository(User);
        const user = await userRepository.findOne({ where: { id: decoded.id } });

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
    } catch (error) {
        console.error('[FALLBACK ROUTE] Erro ao buscar perfil do usuário:', error);
        return res.status(401).json({ message: 'Token inválido ou expirado' });
    }
});

if (process.env.NODE_ENV === 'production' || isCodespacesEnv) {
    const distPath = path.join(__dirname, '../../dist/aa-space');

    console.log('Servindo arquivos estáticos do Angular de:', distPath);

    app.use(express.static(distPath));

    app.get('*', (req, res, next) => {
        if (req.url.startsWith('/api')) {
            return next();
        }

        res.sendFile(path.join(distPath, 'index.html'));
    });
}

// Tratamento de erros global
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
        message: 'Internal server error',
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

const startServer = async () => {
    try {
        await AppDataSource.initialize();
        console.log('Database initialized successfully!');
        console.log('Database path:', AppDataSource.options.database);
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
    } catch (error) {
        console.error('Error during initialization:', error);
        process.exit(1);
    }
};

startServer();
