import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { ChatConversation, ChatMessage, ChatParticipant, User } from '../models/entities';
import { In } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface AuthRequest extends Request {
    user?: { id: number; username: string; isAdmin?: boolean };
}

// Diretório para armazenar as imagens de avatar de grupo
const GROUP_AVATAR_UPLOAD_DIR = path.resolve(path.join(__dirname, '../../uploads/group-avatars'));

// Garantir que o diretório de upload de avatares de grupo existe
try {
    if (!fs.existsSync(GROUP_AVATAR_UPLOAD_DIR)) {
        console.log('[CHAT CONTROLLER] Criando diretório de uploads de avatares de grupo:', GROUP_AVATAR_UPLOAD_DIR);
        fs.mkdirSync(GROUP_AVATAR_UPLOAD_DIR, { recursive: true, mode: 0o777 });
    } else {
        console.log('[CHAT CONTROLLER] Diretório de uploads de avatares de grupo já existe:', GROUP_AVATAR_UPLOAD_DIR);
        fs.chmodSync(GROUP_AVATAR_UPLOAD_DIR, 0o777);
    }
    // Verificar se é possível escrever no diretório
    const testFile = path.join(GROUP_AVATAR_UPLOAD_DIR, '.test-write-group');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log('[CHAT CONTROLLER] Teste de gravação no diretório de avatares de grupo bem-sucedido');
} catch (error) {
    console.error('[CHAT CONTROLLER] Erro ao verificar/criar diretório de uploads de avatares de grupo:', error);
}

// Função para processar e salvar uma imagem de base64 para avatares de grupo
const saveGroupAvatarBase64Image = (base64Data: string, conversationId: number): string => {
    console.log(`[CHAT CONTROLLER] Processando imagem de avatar para o grupo ${conversationId}`);

    const match = base64Data.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
    if (!match) {
        console.error('[CHAT CONTROLLER] Formato de imagem base64 inválido para avatar de grupo');
        throw new Error('Formato de imagem base64 inválido');
    }

    const imageType = match[1];
    const base64Image = match[2];
    const imageBuffer = Buffer.from(base64Image, 'base64');

    const filename = `group_${conversationId}_${crypto.randomBytes(8).toString('hex')}.${imageType}`;
    const filePath = path.join(GROUP_AVATAR_UPLOAD_DIR, filename);

    console.log(`[CHAT CONTROLLER] Salvando imagem de avatar de grupo em: ${filePath}`);
    try {
        fs.writeFileSync(filePath, imageBuffer);
        console.log(`[CHAT CONTROLLER] Imagem de avatar de grupo salva com sucesso: ${filePath}`);
    } catch (error) {
        console.error('[CHAT CONTROLLER] Erro ao salvar imagem de avatar de grupo:', error);
        throw new Error(`Erro ao salvar imagem de avatar de grupo: ${(error as Error).message}`);
    }

    if (!fs.existsSync(filePath)) {
        console.error('[CHAT CONTROLLER] Arquivo de avatar de grupo não foi criado após a gravação');
        throw new Error('Falha ao verificar arquivo de avatar de grupo após a gravação');
    }
    return `/uploads/group-avatars/${filename}`;
}

// Obter todas as conversas do usuário
export const getUserConversations = async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }

        const participantRepository = AppDataSource.getRepository(ChatParticipant);
        const conversationRepository = AppDataSource.getRepository(ChatConversation);
        const messageRepository = AppDataSource.getRepository(ChatMessage);

        const userParticipations = await participantRepository.find({
            where: { userId },
            relations: ['conversation']
        });

        const conversationIds = userParticipations.map(p => p.conversationId);

        if (conversationIds.length === 0) {
            return res.json({ conversations: [] });
        }

        const conversations = await conversationRepository
            .createQueryBuilder('conversation')
            .leftJoinAndSelect('conversation.participants', 'participants')
            .leftJoinAndSelect('participants.user', 'participantUser')
            .where('conversation.id IN (:...ids)', { ids: conversationIds })
            .orderBy('conversation.updatedAt', 'DESC')
            .getMany();

        const conversationsWithDetails = await Promise.all(conversations.map(async (conv) => {
            const lastMessage = await messageRepository
                .createQueryBuilder('message')
                .where('message.conversationId = :convId', { convId: conv.id })
                .orderBy('message.createdAt', 'DESC')
                .limit(1)
                .getOne();

            const unreadMessages = await messageRepository
                .createQueryBuilder('message')
                .where('message.conversationId = :convId', { convId: conv.id })
                .andWhere('message.senderId != :userId', { userId })
                .andWhere('message.isRead = :isRead', { isRead: false })
                .getCount();

            const participantNames = conv.participants
                .filter(p => p.userId !== userId)
                .map(p => p.user.username);

            let conversationName = conv.name;
            let conversationImage = conv.avatarPath;

            if (!conv.isGroup) {
                const otherParticipant = conv.participants.find(p => p.userId !== userId)?.user;
                conversationName = otherParticipant?.username || 'Usuário';
                conversationImage = otherParticipant?.profileImage;
            }

            return {
                id: conv.id,
                name: conversationName,
                isGroup: conv.isGroup,
                avatarPath: conversationImage,
                participants: conv.participants.map(p => ({
                    id: p.userId,
                    username: p.user.username,
                    profileImage: p.user.profileImage,
                    isAdmin: p.isAdmin
                })),
                lastMessage: lastMessage ? {
                    id: lastMessage.id,
                    content: lastMessage.content,
                    senderId: lastMessage.senderId,
                    timestamp: lastMessage.createdAt,
                    read: lastMessage.isRead
                } : null,
                unreadCount: unreadMessages,
                createdAt: conv.createdAt,
                updatedAt: conv.updatedAt
            };
        }));

        conversationsWithDetails.sort((a, b) => {
            const dateA = a.lastMessage ? new Date(a.lastMessage.timestamp) : new Date(a.updatedAt);
            const dateB = b.lastMessage ? new Date(b.lastMessage.timestamp) : new Date(b.updatedAt);
            return dateB.getTime() - dateA.getTime();
        });

        res.json({ conversations: conversationsWithDetails });
    } catch (error) {
        console.error('Erro ao buscar conversas:', error);
        res.status(500).json({ message: 'Erro interno do servidor', details: (error as Error).message });
    }
};

// Obter mensagens de uma conversa específica
export const getConversationMessages = async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user?.id;
        const conversationId = parseInt(req.params.id);

        if (!userId) {
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }

        const participantRepository = AppDataSource.getRepository(ChatParticipant);
        const isParticipant = await participantRepository.findOne({
            where: {
                userId,
                conversationId
            }
        });

        if (!isParticipant) {
            return res.status(403).json({ message: 'Você não é participante desta conversa' });
        }

        const messageRepository = AppDataSource.getRepository(ChatMessage);
        const userRepository = AppDataSource.getRepository(User);

        const messages = await messageRepository
            .createQueryBuilder('message')
            .leftJoinAndSelect('message.sender', 'sender')
            .where('message.conversationId = :conversationId', { conversationId })
            .orderBy('message.createdAt', 'ASC')
            .getMany();

        const unreadMessages = messages.filter(msg => msg.senderId !== userId && !msg.isRead);
        if (unreadMessages.length > 0) {
            await messageRepository
                .createQueryBuilder()
                .update()
                .set({ isRead: true })
                .where('id IN (:...ids)', { ids: unreadMessages.map(m => m.id) })
                .execute();
        }

        const formattedMessages = messages.map(msg => ({
            id: msg.id,
            content: msg.content,
            senderId: msg.senderId,
            senderName: msg.sender.username,
            profileImage: msg.sender.profileImage,
            timestamp: msg.createdAt,
            read: msg.isRead
        }));

        res.json({ messages: formattedMessages });
    } catch (error) {
        console.error('Erro ao buscar mensagens:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
};

// Enviar uma nova mensagem
export const sendMessage = async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user?.id;
        const conversationId = parseInt(req.params.id);
        const { content } = req.body;

        if (!userId) {
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }

        if (!content || content.trim() === '') {
            return res.status(400).json({ message: 'O conteúdo da mensagem é obrigatório' });
        }

        const participantRepository = AppDataSource.getRepository(ChatParticipant);
        const isParticipant = await participantRepository.findOne({
            where: {
                userId,
                conversationId
            }
        });

        if (!isParticipant) {
            return res.status(403).json({ message: 'Você não é participante desta conversa' });
        }

        const messageRepository = AppDataSource.getRepository(ChatMessage);
        const conversationRepository = AppDataSource.getRepository(ChatConversation);
        const userRepository = AppDataSource.getRepository(User);

        const sender = await userRepository.findOneBy({ id: userId });
        if (!sender) {
            return res.status(404).json({ message: 'Usuário remetente não encontrado' });
        }

        const newMessage = messageRepository.create({
            conversationId,
            senderId: userId,
            content,
            isRead: false
        });

        await messageRepository.save(newMessage);

        await conversationRepository.update(
            { id: conversationId },
            { updatedAt: new Date() }
        );

        res.status(201).json({
            message: {
                id: newMessage.id,
                content: newMessage.content,
                senderId: newMessage.senderId,
                senderName: sender.username,
                profileImage: sender.profileImage,
                timestamp: newMessage.createdAt,
                read: newMessage.isRead
            }
        });
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
};

// Criar uma nova conversa ou grupo
export const createConversation = async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user?.id;
        const { name, isGroup, participants } = req.body;

        if (!userId) {
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }

        if (!participants || !Array.isArray(participants) || participants.length === 0) {
            return res.status(400).json({ message: 'É necessário selecionar pelo menos um participante' });
        }

        if (isGroup && (!name || name.trim() === '')) {
            return res.status(400).json({ message: 'O nome do grupo é obrigatório' });
        }

        const userRepository = AppDataSource.getRepository(User);
        const existingUsers = await userRepository.findBy({
            id: In([...participants, userId])
        });

        if (existingUsers.length !== participants.length + 1) {
            return res.status(400).json({ message: 'Um ou mais participantes selecionados não existem' });
        }

        if (!isGroup && participants.length === 1) {
            const participantRepository = AppDataSource.getRepository(ChatParticipant);
            const conversationRepository = AppDataSource.getRepository(ChatConversation);

            const userConversations = await participantRepository.find({
                where: {
                    userId,
                },
                relations: {
                    conversation: true
                }
            });

            const directConversationIds = userConversations
                .filter(p => !p.conversation.isGroup)
                .map(p => p.conversationId);

            if (directConversationIds.length > 0) {
                for (const conversationId of directConversationIds) {
                    const existingConversation = await participantRepository.findOne({
                        where: {
                            userId: participants[0],
                            conversationId: conversationId
                        },
                        relations: {
                            conversation: true
                        }
                    });

                    if (existingConversation) {
                        const conversation = existingConversation.conversation;
                        const otherParticipant = await userRepository.findOneBy({ id: participants[0] });

                        return res.status(200).json({
                            message: 'Conversa já existe',
                            conversation: {
                                id: conversation.id,
                                name: otherParticipant?.username || 'Usuário',
                                isGroup: false,
                                avatarPath: otherParticipant?.profileImage,
                                participants: [
                                    {
                                        id: userId,
                                        username: existingUsers.find(u => u.id === userId)?.username || 'Você',
                                        profileImage: existingUsers.find(u => u.id === userId)?.profileImage
                                    },
                                    {
                                        id: participants[0],
                                        username: otherParticipant?.username || 'Usuário',
                                        profileImage: otherParticipant?.profileImage
                                    }
                                ],
                                createdAt: conversation.createdAt,
                                updatedAt: conversation.updatedAt
                            }
                        });
                    }
                }
            }
        }

        const conversationRepository = AppDataSource.getRepository(ChatConversation);
        const participantRepository = AppDataSource.getRepository(ChatParticipant);

        const newConversation = conversationRepository.create({
            name: isGroup ? name : null,
            isGroup,
            createdById: userId,
            avatarPath: null
        });

        await conversationRepository.save(newConversation);

        const allParticipantIds = [...new Set([...participants, userId])];

        for (const participantId of allParticipantIds) {
            await participantRepository.save({
                conversationId: newConversation.id,
                userId: participantId,
                isAdmin: participantId === userId
            });
        }

        const participantUsers = existingUsers.map(user => ({
            id: user.id,
            username: user.username,
            profileImage: user.profileImage,
            isAdmin: user.id === userId
        }));

        res.status(201).json({
            message: 'Conversa criada com sucesso',
            conversation: {
                id: newConversation.id,
                name: isGroup ? name : participantUsers.find(p => p.id !== userId)?.username,
                isGroup,
                avatarPath: null,
                participants: participantUsers,
                createdAt: newConversation.createdAt,
                updatedAt: newConversation.updatedAt
            }
        });
    } catch (error) {
        console.error('Erro ao criar conversa:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
};

// Método para fazer upload de uma nova imagem de avatar para um grupo
export const uploadGroupChatAvatar = async (req: Request, res: Response) => {
    console.log('[CHAT CONTROLLER] Iniciando uploadGroupChatAvatar');
    try {
        const userId = (req as AuthRequest).user?.id;
        const conversationId = parseInt(req.params.id);
        const { groupAvatar } = req.body;

        if (!userId) {
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }
        if (!groupAvatar) {
            return res.status(400).json({ message: 'Imagem de avatar do grupo não fornecida' });
        }
        if (isNaN(conversationId)) {
            return res.status(400).json({ message: 'ID da conversa inválido' });
        }

        const conversationRepository = AppDataSource.getRepository(ChatConversation);
        const participantRepository = AppDataSource.getRepository(ChatParticipant);

        const conversation = await conversationRepository.findOneBy({ id: conversationId });
        if (!conversation) {
            return res.status(404).json({ message: 'Conversa não encontrada' });
        }
        if (!conversation.isGroup) {
            return res.status(400).json({ message: 'Esta funcionalidade é apenas para grupos' });
        }

        const participant = await participantRepository.findOne({ where: { conversationId, userId } });
        if (!participant || !participant.isAdmin) {
            return res.status(403).json({ message: 'Apenas administradores do grupo podem alterar o avatar' });
        }

        let imagePath;
        try {
            imagePath = saveGroupAvatarBase64Image(groupAvatar, conversationId);
        } catch (error) {
            console.error('[CHAT CONTROLLER] Erro ao salvar imagem de avatar de grupo:', error);
            return res.status(400).json({ message: 'Erro ao processar imagem', details: (error as Error).message });
        }

        if (conversation.avatarPath) {
            try {
                const oldFilePath = path.resolve(path.join(__dirname, '../../', conversation.avatarPath.substring(1)));
                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath);
                    console.log(`[CHAT CONTROLLER] Avatar de grupo antigo removido: ${oldFilePath}`);
                }
            } catch (error) {
                console.error('[CHAT CONTROLLER] Erro ao remover avatar de grupo antigo:', error);
            }
        }

        await conversationRepository.update(conversationId, { avatarPath: imagePath });
        console.log(`[CHAT CONTROLLER] Avatar do grupo ${conversationId} atualizado para ${imagePath}`);

        const requestOrigin = req.headers.origin || '';
        const apiUrl = requestOrigin.replace(/-4200\./, '-3001.');
        const fullImageUrl = `${apiUrl}${imagePath}`;

        return res.status(200).json({
            message: 'Avatar do grupo atualizado com sucesso',
            avatarPath: imagePath,
            fullImageUrl: fullImageUrl
        });

    } catch (error) {
        console.error('[CHAT CONTROLLER] Erro ao atualizar avatar do grupo:', error);
        return res.status(500).json({ message: 'Erro interno do servidor', details: (error as Error).message });
    }
};

// Método para remover a imagem de avatar de um grupo
export const removeGroupChatAvatar = async (req: Request, res: Response) => {
    console.log('[CHAT CONTROLLER] Iniciando removeGroupChatAvatar');
    try {
        const userId = (req as AuthRequest).user?.id;
        const conversationId = parseInt(req.params.id);

        if (!userId) {
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }
        if (isNaN(conversationId)) {
            return res.status(400).json({ message: 'ID da conversa inválido' });
        }

        const conversationRepository = AppDataSource.getRepository(ChatConversation);
        const participantRepository = AppDataSource.getRepository(ChatParticipant);

        const conversation = await conversationRepository.findOneBy({ id: conversationId });
        if (!conversation) {
            return res.status(404).json({ message: 'Conversa não encontrada' });
        }
        if (!conversation.isGroup) {
            return res.status(400).json({ message: 'Esta funcionalidade é apenas para grupos' });
        }

        const participant = await participantRepository.findOne({ where: { conversationId, userId } });
        if (!participant || !participant.isAdmin) {
            return res.status(403).json({ message: 'Apenas administradores do grupo podem remover o avatar' });
        }

        if (conversation.avatarPath) {
            try {
                const filePath = path.resolve(path.join(__dirname, '../../', conversation.avatarPath.substring(1)));
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`[CHAT CONTROLLER] Avatar de grupo removido do sistema de arquivos: ${filePath}`);
                }
            } catch (error) {
                console.error('[CHAT CONTROLLER] Erro ao remover arquivo de avatar de grupo:', error);
            }
            await conversationRepository.update(conversationId, { avatarPath: null });
            console.log(`[CHAT CONTROLLER] Avatar do grupo ${conversationId} removido do banco de dados`);
        }

        return res.status(200).json({ message: 'Avatar do grupo removido com sucesso' });

    } catch (error) {
        console.error('[CHAT CONTROLLER] Erro ao remover avatar do grupo:', error);
        return res.status(500).json({ message: 'Erro interno do servidor', details: (error as Error).message });
    }
};

// Listar todos os usuários disponíveis para chat
export const getAvailableUsers = async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }

        const userRepository = AppDataSource.getRepository(User);
        const users = await userRepository.find({
            select: ['id', 'username', 'email'],
            where: [
                { id: userId },
            ]
        });

        const availableUsers = (await userRepository.find())
            .filter(user => user.id !== userId)
            .map(user => ({
                id: user.id,
                username: user.username,
                email: user.email,
                profileImage: user.profileImage
            }));

        res.json({ users: availableUsers });
    } catch (error) {
        console.error('Erro ao listar usuários disponíveis:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
};
