import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import http from 'http'; // Added
import { WebSocketServer, WebSocket } from 'ws'; // Added

import { AppDataSource } from './config/database';
import { User } from './models/entities';
import authRoutes from './routes/auth';
import postRoutes from './routes/posts';
import chatRoutes from './routes/chat';
import profileRoutes from './routes/profile';
import adminRoutes from './routes/admin.routes'; // Adicionar import para as rotas de admin
import rewardRoutes from './routes/reward.routes'; // Importar rotas de recompensa
import { checkIpBlocked } from './middleware/ip-block.middleware'; // Adicionar import

// Chave secreta para JWT - deve ser igual à usada no controlador de auth
const JWT_SECRET = process.env.JWT_SECRET || 'bondedobumbiboladao';

dotenv.config();

const app = express();

// Robust port initialization
const envPort = process.env.PORT;
let port = 3001; // Default port
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

// Create HTTP server
const server = http.createServer(app); // Added

// Create WebSocket server
const wss = new WebSocketServer({ server }); // Added

// Store active WebSocket connections (you'll need a more robust way to manage this, e.g., by chatId)
const clients = new Map<string, Set<WebSocket>>();
console.log('[WSS] WebSocket server initialized. Clients map created.');

wss.on('connection', (ws: WebSocket, req: Request) => {
    const connectionTime = new Date().toISOString();
    console.log(`[WSS ${connectionTime}] New connection incoming. IP: ${req.socket.remoteAddress}`);

    const url = req.url;
    console.log(`[WSS DEBUG ${connectionTime}] Raw req.url: ${url}`);

    let extractedChatId: string | undefined;

    if (url) {
        const pathname = url.split('?')[0];
        console.log(`[WSS DEBUG ${connectionTime}] pathname: ${pathname}`);

        const pathSegments = pathname.split('/').filter(segment => {
            return segment.length > 0;
        });
        console.log(`[WSS DEBUG ${connectionTime}] pathSegments after filter: [${pathSegments.join(', ')}]`);
        console.log(`[WSS DEBUG ${connectionTime}] pathSegments.length: ${pathSegments.length}`);

        if (pathSegments.length > 0) {
            console.log(`[WSS DEBUG ${connectionTime}] pathSegments[0]: ${pathSegments[0]}`);
        }
        if (pathSegments.length > 1) {
            console.log(`[WSS DEBUG ${connectionTime}] pathSegments[1]: ${pathSegments[1]}`);
        }
        if (pathSegments.length > 2) {
            console.log(`[WSS DEBUG ${connectionTime}] pathSegments[2]: ${pathSegments[2]}`);
        }

        if (pathSegments.length === 3 && pathSegments[0] === 'ws' && pathSegments[1] === 'chat') {
            extractedChatId = pathSegments[2];
            console.log(`[WSS DEBUG ${connectionTime}] Condition for chatId extraction MET. extractedChatId = '${extractedChatId}'`);
        } else {
            console.log(`[WSS DEBUG ${connectionTime}] Condition for chatId extraction NOT MET. pathSegments.length=${pathSegments.length}, pathSegments[0]='${pathSegments[0]}', pathSegments[1]='${pathSegments[1]}'`);
        }
    } else {
        console.log(`[WSS DEBUG ${connectionTime}] req.url is null or undefined.`);
    }

    console.log(`[WSS ${connectionTime}] Final extracted chatId before validation: '${extractedChatId}' from URL: ${url}`);

    if (!extractedChatId || extractedChatId.trim() === '' || isNaN(parseInt(extractedChatId))) {
        console.log(`[WSS ${connectionTime}] Connection attempt with invalid or non-numeric chat ID: '${extractedChatId}' from URL: '${url}'. Expected format like /ws/chat/:chatId/ where :chatId is numeric. Closing connection.`);
        ws.close(1008, "Invalid or non-numeric URL path for chat ID");
        return;
    }

    const chatId = extractedChatId;

    console.log(`[WSS ${connectionTime}] Client attempting to connect to chat: ${chatId}. Current clients map size: ${clients.size}`);
    if (clients.has(chatId)) {
        console.log(`[WSS ${connectionTime}] Chat room ${chatId} already exists. Current members: ${clients.get(chatId)!.size}`);
    } else {
        console.log(`[WSS ${connectionTime}] Chat room ${chatId} does not exist. Creating new set for it.`);
    }

    if (!clients.has(chatId)) {
        clients.set(chatId, new Set());
        console.log(`[WSS ${connectionTime}] Created new client set for chat: ${chatId}. clients map keys:`, Array.from(clients.keys()));
    }

    const chatSpecificClients = clients.get(chatId)!;

    if (chatSpecificClients.has(ws)) {
        console.warn(`[WSS ${connectionTime}] Client (WebSocket instance) already in set for chat ${chatId}. This might indicate an issue. Not adding again.`);
    } else {
        chatSpecificClients.add(ws);
        console.log(`[WSS ${connectionTime}] Client successfully added to chat: ${chatId}. Total clients in this chat: ${chatSpecificClients.size}. Overall clients in map: ${Array.from(clients.values()).reduce((acc, set) => acc + set.size, 0)}`);
    }

    ws.on('message', (message: Buffer) => {
        console.log(`[WSS ${connectionTime}] Received message on chat ${chatId} from a client: ${message.toString().substring(0,200)}`);
    });

    ws.on('close', (code: number, reason: Buffer) => {
        const reasonString = reason ? reason.toString() : 'No reason given';
        console.log(`[WSS ${connectionTime}] Client disconnected from chat: ${chatId}. Code: ${code}, Reason: ${reasonString}. Attempting to remove client.`);
        const deleted = chatSpecificClients.delete(ws);
        if (deleted) {
            console.log(`[WSS ${connectionTime}] Client successfully removed from chat: ${chatId}. Remaining clients in this chat: ${chatSpecificClients.size}`);
        } else {
            console.warn(`[WSS ${connectionTime}] Attempted to remove client from chat ${chatId} on 'close', but client was not found in the set.`);
        }

        if (chatSpecificClients.size === 0) {
            const mapDeleted = clients.delete(chatId);
            if (mapDeleted) {
                console.log(`[WSS ${connectionTime}] Chat room ${chatId} is now empty and has been removed from clients map. clients map keys:`, Array.from(clients.keys()));
            } else {
                console.warn(`[WSS ${connectionTime}] Attempted to delete chat room ${chatId} from map, but it was not found.`);
            }
        }
    });

    ws.on('error', (error: Error) => {
        console.error(`[WSS ${connectionTime}] WebSocket error for a client in chat ${chatId}:`, error);
        console.log(`[WSS ${connectionTime}] Attempting to remove client from chat ${chatId} due to error.`);
        const deleted = chatSpecificClients.delete(ws);
        if (deleted) {
            console.log(`[WSS ${connectionTime}] Client removed from chat ${chatId} due to error. Remaining clients in this chat: ${chatSpecificClients.size}`);
        } else {
            console.warn(`[WSS ${connectionTime}] Attempted to remove client from chat ${chatId} (due to error), but client was not found.`);
        }

        if (chatSpecificClients.size === 0) {
            const mapDeleted = clients.delete(chatId);
             if (mapDeleted) {
                console.log(`[WSS ${connectionTime}] Chat room ${chatId} (due to error) is now empty and has been removed from clients map. clients map keys:`, Array.from(clients.keys()));
            } else {
                console.warn(`[WSS ${connectionTime}] Attempted to delete chat room ${chatId} from map (due to error), but it was not found.`);
            }
        }
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
            console.log(`[WSS ${connectionTime}] Terminating WebSocket for client in chat ${chatId} after error as it was still open/connecting.`);
            ws.terminate();
        }
    });
});

// Function to broadcast messages to a specific chat room
export function broadcastMessageToChat(chatId: string, message: any) {
    console.log(`[WSS DEBUG] broadcastMessageToChat called for chatId: ${chatId}, message status: ${message?.status}`); // <<< ADDED THIS LOG
    const chatClients = clients.get(chatId.toString()); // Ensure chatId is a string
    if (chatClients) {
        let messageString: string;
        try {
            messageString = JSON.stringify(message);
        } catch (e: any) { // Catch if message is not stringifiable
            console.error(`[WSS] Failed to stringify message for chat ${chatId}. Error: ${e.message}. Message data:`, message);
            return; // Do not proceed if message cannot be stringified
        }

        console.log(`[WSS] Broadcasting to chat ${chatId} (${chatClients.size} clients). Message (first 100 chars): "${messageString.substring(0, 100)}${messageString.length > 100 ? '...' : ''}"`);
        let sendErrors = 0;
        let closedClientsDuringBroadcast = 0;

        chatClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                try {
                    client.send(messageString);
                } catch (e: any) { // Catch errors during send
                    sendErrors++;
                    console.error(`[WSS] Error sending message to a client in chat ${chatId}. Error: ${e.message}. Client readyState: ${client.readyState}`);
                }
            } else {
                closedClientsDuringBroadcast++;
            }
        });

        if (sendErrors > 0) {
            console.warn(`[WSS] Encountered ${sendErrors} errors while broadcasting to chat ${chatId}.`);
        }
        if (closedClientsDuringBroadcast > 0) {
            console.log(`[WSS] Skipped sending to ${closedClientsDuringBroadcast} clients in chat ${chatId} as they were not in OPEN state.`);
        }
    }
}

// Function to broadcast message status updates to a specific chat room
export function broadcastMessageStatusUpdate(chatId: string, readerUserId: string, status: 'read' | 'delivered' | 'sent', messageIds: string[]) {
    const chatClients = clients.get(chatId.toString());
    if (chatClients) {
        const payload = {
            type: 'messageStatusUpdate',
            chatId,
            readerUserId, // The user who performed the action (e.g., read the messages)
            status,
            messageIds
        };
        let messageString: string;
        try {
            messageString = JSON.stringify(payload);
        } catch (e: any) {
            console.error(`[WSS] Failed to stringify message status update for chat ${chatId}. Error: ${e.message}. Payload:`, payload);
            return;
        }

        console.log(`[WSS] Broadcasting message status update to chat ${chatId} (${chatClients.size} clients). Payload (first 100 chars): "${messageString.substring(0, 100)}${messageString.length > 100 ? '...' : ''}"`);
        let sendErrors = 0;
        let closedClientsDuringBroadcast = 0;

        chatClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                try {
                    client.send(messageString);
                } catch (e: any) {
                    sendErrors++;
                    console.error(`[WSS] Error sending message status update to a client in chat ${chatId}. Error: ${e.message}. Client readyState: ${client.readyState}`);
                }
            } else {
                closedClientsDuringBroadcast++;
            }
        });

        if (sendErrors > 0) {
            console.warn(`[WSS] Encountered ${sendErrors} errors while broadcasting message status update to chat ${chatId}.`);
        }
        if (closedClientsDuringBroadcast > 0) {
            console.log(`[WSS] Skipped sending message status update to ${closedClientsDuringBroadcast} clients in chat ${chatId} as they were not in OPEN state.`);
        }
    } else {
        console.log(`[WSS] No clients found for chat ${chatId} to broadcast message status update.`);
    }
}

// Lista de origens permitidas
const allowedOrigins = [
    'http://localhost:4200',
    'https://localhost:4200',
    'https://v3mrhcvc-4200.brs.devtunnels.ms', // Trailing slash removed
    'http://localhost:3001',
    'https://v3mrhcvc-3001.brs.devtunnels.ms', // Trailing slash removed
    /^https:\/\/.*\.app\.github\.dev$/,  // Permite qualquer subdomínio do GitHub Codespaces
    /^https:\/\/.*\.github\.dev$/,       // Formato alternativo de domínio Codespaces
    /^https:\/\/.*\.github\.io$/         // Suporte para GitHub Pages
];

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
app.use('/api/rewards', rewardRoutes); // Adicionar rota para recompensas

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
