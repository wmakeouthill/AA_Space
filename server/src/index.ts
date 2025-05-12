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

// Chave secreta para JWT - deve ser igual à usada no controlador de auth
const JWT_SECRET = process.env.JWT_SECRET || 'bondedobumbiboladao';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);
const isCodespacesEnv = process.env.CODESPACES === 'true' || process.env.GITHUB_CODESPACES === 'true';

// Create HTTP server
const server = http.createServer(app); // Added

// Create WebSocket server
const wss = new WebSocketServer({ server }); // Added

// Store active WebSocket connections (you'll need a more robust way to manage this, e.g., by chatId)
const clients = new Map<string, Set<WebSocket>>(); // Example: Map<chatId, Set<WebSocket>>

wss.on('connection', (ws: WebSocket, req: Request) => {
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
    clients.get(chatId)!.add(ws);

    ws.on('message', (message: Buffer) => {
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
        console.log(`[WSS] Client disconnected from chat: ${chatId}`);
        clients.get(chatId)?.delete(ws);
        if (clients.get(chatId)?.size === 0) {
            clients.delete(chatId);
        }
    });

    ws.on('error', (error) => {
        console.error(`[WSS] Error on chat ${chatId}:`, error);
        // Ensure client is removed on error as well
        clients.get(chatId)?.delete(ws);
        if (clients.get(chatId)?.size === 0) {
            clients.delete(chatId);
        }
    });
});

// Function to broadcast messages to a specific chat room
// You will call this from your chat.controller.ts after a message is saved
export function broadcastMessageToChat(chatId: string, message: any) {
    const chatClients = clients.get(chatId.toString()); // Ensure chatId is a string
    if (chatClients) {
        const messageString = JSON.stringify(message);
        console.log(`[WSS] Broadcasting to chat ${chatId}:`, messageString);
        chatClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(messageString);
            }
        });
    } else {
        console.log(`[WSS] No clients connected to chat ${chatId} to broadcast message.`);
    }
}

// Lista de origens permitidas
const allowedOrigins = [
    'http://localhost:4200',
    'https://localhost:4200',
    /^https:\/\/.*\.app\.github\.dev$/,  // Permite qualquer subdomínio do GitHub Codespaces
    /^https:\/\/.*\.github\.dev$/,       // Formato alternativo de domínio Codespaces
    /^https:\/\/.*\.github\.io$/         // Suporte para GitHub Pages
];

// Configuração CORS detalhada
const corsOptions = {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
        if (!origin) {
            return callback(null, true);
        }

        const isAllowed = allowedOrigins.some(allowedOrigin => {
            if (allowedOrigin instanceof RegExp) {
                return allowedOrigin.test(origin);
            }
            return allowedOrigin === origin;
        });

        if (isAllowed) {
            callback(null, true);
        } else {
            callback(new Error('CORS não permitido'));
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
// Fornecendo acesso aos uploads com a URL completa (sem /api)
console.log('Diretório de uploads configurado:', path.join(__dirname, '../uploads'));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Improve access to profile images with special logging and cache control
app.use('/uploads/profiles', (req, res, next) => {
    console.log(`[STATIC MIDDLEWARE] Profile image request: ${req.url}`);
    console.log(`[STATIC MIDDLEWARE] Full path: ${path.join(__dirname, '../uploads/profiles', req.url)}`);

    // Check if the file exists
    const filePath = path.join(__dirname, '../uploads/profiles', req.url);
    if (fs.existsSync(filePath)) {
        console.log(`[STATIC MIDDLEWARE] File exists: ${filePath}`);

        // Disable caching for profile images to ensure fresh content
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        // Add timestamp for debugging
        res.setHeader('X-Served-At', new Date().toISOString());
    } else {
        console.log(`[STATIC MIDDLEWARE] File NOT found: ${filePath}`);
    }

    // Continue with static file handling
    next();
}, express.static(path.join(__dirname, '../uploads/profiles')));

// Rota alternativa para acessar uploads através da API (caso o cliente esteja tentando acessar via /api)
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

        // Verificar se os diretórios existem
        const uploadsExists = fs.existsSync(uploadsDir);
        const profilesExists = fs.existsSync(profilesDir);

        // Definir tipagem explícita para a variável files
        interface FileInfo {
            name: string;
            path: string;
            size: number;
            created: Date;
            permissions: string;
        }

        let files: FileInfo[] = [];

        if (profilesExists) {
            // Listar arquivos no diretório de perfis
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

        // Verificar informações sobre o host
        const hostname = req.headers.host || 'unknown';
        const origin = req.headers.origin || 'unknown';
        const forwardedHost = req.headers['x-forwarded-host'] || 'none';

        // Adicionar URLs de exemplo para testes
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

// Rota explícita de fallback para o perfil do usuário atual
app.get('/api/profile/me', async (req: Request, res: Response) => {
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
        const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string; isAdmin?: boolean };
        console.log('[FALLBACK ROUTE] Decoded token:', decoded);

        // Verificar se o usuário existe no banco de dados
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

// Em ambiente de produção ou Codespaces, configure para servir arquivos estáticos do Angular
if (process.env.NODE_ENV === 'production' || isCodespacesEnv) {
    // Caminho correto para os arquivos compilados do Angular
    const distPath = path.join(__dirname, '../../dist/aa-space');

    console.log('Servindo arquivos estáticos do Angular de:', distPath);

    // Servir arquivos estáticos
    app.use(express.static(distPath));

    // Todas as requisições não tratadas pela API serão redirecionadas para o Angular
    app.get('*', (req, res, next) => {
        // Se a URL começar com /api, passa para os handlers de API
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

        // Start the HTTP server (which now also handles WebSocket upgrades)
        server.listen(port, '0.0.0.0', () => { // Changed from app.listen to server.listen
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
