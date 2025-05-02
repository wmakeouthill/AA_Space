import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import createTables from './config/migrations';
import authRoutes from './routes/auth';
import postRoutes from './routes/posts';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);

// Rota inicial
app.get('/', (req, res) => {
  res.json({ message: 'API do AA Space está funcionando!' });
});

// Inicializar banco de dados e servidor
const startServer = async () => {
  try {
    await createTables();
    console.log('Banco de dados inicializado com sucesso!');

    app.listen(port, () => {
      console.log(`Servidor rodando na porta ${port}`);
    });
  } catch (error) {
    console.error('Erro ao inicializar o servidor:', error);
    process.exit(1);
  }
};

startServer();
