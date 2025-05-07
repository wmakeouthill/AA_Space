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
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const database_1 = require("./config/database");
const auth_1 = __importDefault(require("./routes/auth"));
const posts_1 = __importDefault(require("./routes/posts"));
const chat_1 = __importDefault(require("./routes/chat"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = Number(process.env.PORT || 3001);
const isCodespacesEnv = process.env.CODESPACES === 'true' || process.env.GITHUB_CODESPACES === 'true';
// Lista de origens permitidas
const allowedOrigins = [
    'http://localhost:4200',
    'https://localhost:4200',
    /^https:\/\/.*\.app\.github\.dev$/, // Permite qualquer subdomínio do GitHub Codespaces
    /^https:\/\/.*\.github\.dev$/, // Formato alternativo de domínio Codespaces
    /^https:\/\/.*\.github\.io$/ // Suporte para GitHub Pages
];
// Configuração CORS detalhada
const corsOptions = {
    origin: function (origin, callback) {
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
        }
        else {
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
app.use(express_1.default.json());
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
// Configuração das rotas API
app.use('/api/auth', auth_1.default);
app.use('/api/posts', posts_1.default);
app.use('/api/chat', chat_1.default);
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
    }
    catch (error) {
        console.error('Error during initialization:', error);
        process.exit(1);
    }
});
startServer();
