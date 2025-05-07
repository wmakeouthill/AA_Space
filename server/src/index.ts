import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { AppDataSource } from './config/database';
import authRoutes from './routes/auth';
import postRoutes from './routes/posts';
import chatRoutes from './routes/chat';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);
const isCodespacesEnv = process.env.CODESPACES === 'true' || process.env.GITHUB_CODESPACES === 'true';

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
app.use(express.json());

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

// Configuração das rotas API
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/chat', chatRoutes);

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

        app.listen(port, '0.0.0.0', () => {
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
