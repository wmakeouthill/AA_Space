# AA Space

Um fórum seguro e acolhedor para compartilhar experiências e encontrar apoio. Este projeto foi desenvolvido usando Angular 19 para o frontend e Node.js com Express para o backend.

## Requisitos do Sistema

- Node.js (v18 ou superior)
- npm (v9 ou superior)
- Angular CLI (v19.2.10)
- SQLite3

## Estrutura do Projeto

O projeto está dividido em duas partes principais:

- `/src` - Frontend Angular
- `/server` - Backend Node.js/Express

## Instalação

1. Clone o repositório:
```bash
git clone [url-do-repositorio]
```

2. Instale as dependências do frontend:
```bash
npm install
```

3. Instale as dependências do backend:
```bash
cd server
npm install
```

### Dependências Principais

#### Frontend (Angular):
- @angular/common: ^19.2.0
- @angular/compiler: ^19.2.0
- @angular/core: ^19.2.0
- @angular/forms: ^19.2.0
- @angular/platform-browser: ^19.2.0
- @angular/platform-browser-dynamic: ^19.2.0
- @angular/router: ^19.2.0
- rxjs: ~7.8.0
- zone.js: ~0.15.0

#### Backend (Node.js):
- express: ^5.1.0
- typeorm: ^0.3.22
- sqlite3: ^5.1.7
- bcrypt: ^5.1.1
- jsonwebtoken: ^9.0.0
- cors: ^2.8.5
- dotenv: ^16.5.0

## Configuração

1. Configure as variáveis de ambiente do backend:
   Crie um arquivo `.env` na pasta `/server` com as seguintes variáveis:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=aa_space
JWT_SECRET=seu_segredo_jwt_super_secreto
PORT=3001
```

## Configuração do Banco de Dados e Migrações

1. Compile o backend:
```bash
cd server
npm run build
```

2. Execute as migrações para criar o banco de dados e tabelas:
```bash
cd server
npm run migration:run
```

Isso criará o arquivo de banco de dados SQLite e aplicará todas as migrações necessárias, incluindo:
- Criação das tabelas principais (User, Post, Comment, PostLike, CommentLike)
- Tabelas do sistema de chat (ChatConversation, ChatParticipant, ChatMessage)
- Adição de colunas especiais (isAdmin, isMainAdmin)
- Adição de informações de contato (email, telefone)
- Criação do usuário administrador padrão (usuário: admin, senha: admin123)

## Executando o Projeto

1. Inicie o servidor backend:
```bash
cd server
npm run dev    # Para ambiente de desenvolvimento
# OU
npm run start  # Para versão compilada
```

2. Em outro terminal, inicie o frontend:
```bash
npm start
```

O frontend estará disponível em `http://localhost:4200` e o backend em `http://localhost:3001`.

## Acessando o Sistema

1. **Usuário Administrador Padrão**:
   - Username: admin
   - Senha: admin123

2. **Conta de Usuário Normal**:
   - Registre um novo usuário na página de login/registro

## Administração do Sistema

### Painel de Administração
O sistema inclui um painel de administração acessível apenas para usuários com privilégios de administrador. Para acessar:

1. Faça login como administrador
2. Acesse o menu de administração através do cabeçalho

### Gerenciamento de Administradores
O sistema permite:
- Adicionar novos administradores
- Remover privilégios de administração
- Transferir o título de administrador principal

**IMPORTANTE**: A transferência de administrador principal apenas transfere privilégios especiais de um usuário para outro, mantendo os nomes de usuário e senhas originais. Após a transferência, use as credenciais originais para fazer login.

## Funcionalidades

- Sistema de autenticação com JWT
- Criação de posts anônimos ou identificados
- Sistema de comentários
- Sistema de curtidas em posts e comentários
- Sistema de chat (novo!)
  - Conversas privadas entre usuários
  - Grupos de chat com múltiplos participantes
  - Status de leitura de mensagens
  - Administradores de grupos de chat
- Modo convidado com nickname
- Interface responsiva e amigável
- Painel de administração para gerenciar usuários
- Armazenamento de informações de contato (email, telefone)

## Estrutura do Banco de Dados

O projeto utiliza SQLite3 com TypeORM e possui as seguintes entidades:

- User (Usuários)
  - Inclui flags `isAdmin` para administradores
  - Inclui flag `isMainAdmin` para identificar o administrador principal
  - Armazena informações de contato (email, telefone)
- Post (Postagens)
- Comment (Comentários)
- PostLike (Curtidas em posts)
- CommentLike (Curtidas em comentários)
- ChatConversation (Conversas de chat)
- ChatParticipant (Participantes de chat)
- ChatMessage (Mensagens de chat)

## Desenvolvimento

- Para iniciar o servidor em modo de desenvolvimento:
```bash
cd server
npm run dev
```

- Para executar os testes:
```bash
npm test
```

- Para criar uma build de produção:
```bash
npm run build
```

## Scripts Disponíveis

### Frontend:
- `npm start`: Inicia o servidor de desenvolvimento Angular
- `npm run build`: Compila o projeto para produção
- `npm run watch`: Compila o projeto em modo de observação
- `npm test`: Executa os testes do frontend

### Backend:
- `npm start`: Inicia o servidor a partir da versão compilada
- `npm run dev`: Inicia o servidor em modo de desenvolvimento com hot reload
- `npm run build`: Compila o código TypeScript
- `npm run migration:run`: Executa as migrações pendentes
- `npm run migration:revert`: Reverte a última migração aplicada
- `npm run schema:refresh`: Recria o esquema do banco de dados do zero

## Solução de Problemas

### Problemas com Migrações
Se encontrar erros relacionados a migrações já existentes:
```bash
cd server
npm run migration:revert  # Reverte a última migração
npm run migration:run     # Executa novamente as migrações
```

Para reiniciar completamente o banco de dados:
```bash
cd server
npm run schema:refresh
```

### Problemas de Login ou Acesso
- Verifique se o banco de dados foi configurado corretamente
- Certifique-se de que as migrações foram aplicadas
- Confirme se está usando as credenciais corretas para o administrador

## Endpoints da API

### Autenticação
- POST /api/auth/register - Registro de usuário
- POST /api/auth/login - Login
- GET /api/auth/validate - Validação de token

### Administração
- POST /api/auth/make-admin - Promove um usuário a administrador
- POST /api/auth/remove-admin - Remove privilégios de administrador
- POST /api/auth/transfer-admin - Transfere o título de administrador principal
- GET /api/auth/admins - Lista todos os administradores

### Posts
- GET /api/posts - Lista todos os posts
- GET /api/posts/:id - Obtém um post específico
- POST /api/posts - Cria um novo post
- GET /api/posts/:postId/comments - Lista comentários de um post
- POST /api/posts/:postId/comments - Adiciona um comentário
- POST /api/posts/:postId/like - Curtir/descurtir um post
- POST /api/posts/:postId/comments/:commentId/like - Curtir/descurtir um comentário

### Chat (Novo!)
- GET /api/chat/conversations - Lista conversas do usuário
- GET /api/chat/conversations/:id - Obtém detalhes de uma conversa
- POST /api/chat/conversations - Cria uma nova conversa
- POST /api/chat/conversations/:id/messages - Envia uma mensagem
- GET /api/chat/conversations/:id/messages - Lista mensagens de uma conversa
- POST /api/chat/conversations/:id/participants - Adiciona participante(s)
- DELETE /api/chat/conversations/:id/participants/:userId - Remove um participante
- PUT /api/chat/conversations/:id/participants/:userId/admin - Altera status de administrador
- PUT /api/chat/messages/:id/read - Marca mensagem como lida

## Contribuição

1. Faça o fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Faça commit das suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Faça push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## Atualizações Recentes (Maio 2025)

- Adição do sistema de chat completo com conversas privadas e em grupo
- Suporte para armazenamento de informações de contato (email, telefone)
- Melhorias na interface do usuário e experiência de navegação
- Otimizações de desempenho no backend
- Atualização para Angular 19
