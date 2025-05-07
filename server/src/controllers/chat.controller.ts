import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { ChatConversation, ChatMessage, ChatParticipant, User } from '../models/entities';
import { In } from 'typeorm';

interface AuthRequest extends Request {
    user?: { id: number; username: string; isAdmin?: boolean };
}

// Obter todas as conversas do usuário
export const getUserConversations = async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }

        // Buscar todas as conversas em que o usuário participa
        const participantRepository = AppDataSource.getRepository(ChatParticipant);
        const userRepository = AppDataSource.getRepository(User);

        const userParticipations = await participantRepository.find({
            where: { userId },
            relations: {
                conversation: true
            }
        });

        const conversationIds = userParticipations.map(p => p.conversationId);

        if (conversationIds.length === 0) {
            return res.json({ conversations: [] });
        }

        // Buscar informações completas das conversas
        const conversationRepository = AppDataSource.getRepository(ChatConversation);
        const messageRepository = AppDataSource.getRepository(ChatMessage);

        const conversations = await conversationRepository
            .createQueryBuilder('conversation')
            .leftJoinAndSelect('conversation.participants', 'participants')
            .leftJoinAndSelect('participants.user', 'participantUser')
            .where('conversation.id IN (:...ids)', { ids: conversationIds })
            .getMany();

        // Buscar a última mensagem de cada conversa
        const conversationsWithLastMessage = await Promise.all(conversations.map(async (conv) => {
            const lastMessage = await messageRepository
                .createQueryBuilder('message')
                .where('message.conversationId = :convId', { convId: conv.id })
                .orderBy('message.createdAt', 'DESC')
                .limit(1)
                .getOne();

            // Verificar se há mensagens não lidas
            const unreadMessages = await messageRepository
                .createQueryBuilder('message')
                .where('message.conversationId = :convId', { convId: conv.id })
                .andWhere('message.senderId != :userId', { userId })
                .andWhere('message.isRead = :isRead', { isRead: false })
                .getCount();

            const participantNames = conv.participants
                .filter(p => p.userId !== userId)
                .map(p => p.user.username);

            // Formatar a resposta
            return {
                id: conv.id,
                name: conv.isGroup ? conv.name : participantNames.join(', '),
                isGroup: conv.isGroup,
                participants: conv.participants.map(p => ({
                    id: p.userId,
                    username: p.user.username,
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

        // Ordenar conversas pela mensagem mais recente
        conversationsWithLastMessage.sort((a, b) => {
            if (!a.lastMessage) return 1;
            if (!b.lastMessage) return -1;
            return new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime();
        });

        res.json({ conversations: conversationsWithLastMessage });
    } catch (error) {
        console.error('Erro ao buscar conversas:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
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

        // Verificar se o usuário é participante da conversa
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

        // Buscar mensagens da conversa
        const messageRepository = AppDataSource.getRepository(ChatMessage);
        const userRepository = AppDataSource.getRepository(User);

        const messages = await messageRepository
            .createQueryBuilder('message')
            .leftJoinAndSelect('message.sender', 'sender')
            .where('message.conversationId = :conversationId', { conversationId })
            .orderBy('message.createdAt', 'ASC')
            .getMany();

        // Marcar mensagens como lidas se o remetente não for o usuário atual
        const unreadMessages = messages.filter(msg => msg.senderId !== userId && !msg.isRead);
        if (unreadMessages.length > 0) {
            await messageRepository
                .createQueryBuilder()
                .update()
                .set({ isRead: true })
                .where('id IN (:...ids)', { ids: unreadMessages.map(m => m.id) })
                .execute();
        }

        // Formatar a resposta
        const formattedMessages = messages.map(msg => ({
            id: msg.id,
            content: msg.content,
            senderId: msg.senderId,
            senderName: msg.sender.username,
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

        // Verificar se o usuário é participante da conversa
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

        // Criar e salvar a nova mensagem
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

        // Atualizar a data de atualização da conversa
        await conversationRepository.update(
            { id: conversationId },
            { updatedAt: new Date() }
        );

        // Formatar a resposta
        res.status(201).json({
            message: {
                id: newMessage.id,
                content: newMessage.content,
                senderId: newMessage.senderId,
                senderName: sender.username,
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

        // Verificar se é um grupo (precisa de um nome)
        if (isGroup && (!name || name.trim() === '')) {
            return res.status(400).json({ message: 'O nome do grupo é obrigatório' });
        }

        // Verificar se todos os participantes existem
        const userRepository = AppDataSource.getRepository(User);
        const existingUsers = await userRepository.findBy({
            id: In([...participants, userId])
        });

        if (existingUsers.length !== participants.length + 1) {
            return res.status(400).json({ message: 'Um ou mais participantes selecionados não existem' });
        }

        // Se for conversa direta, verificar se já existe conversa com este usuário
        if (!isGroup && participants.length === 1) {
            const participantRepository = AppDataSource.getRepository(ChatParticipant);
            const conversationRepository = AppDataSource.getRepository(ChatConversation);

            // Buscar todas as conversas que não são grupos
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
                // Verificar se o outro usuário já participa de alguma dessas conversas
                // Iterar sobre as conversas em vez de usar um array no where
                for (const conversationId of directConversationIds) {
                    const existingConversation = await participantRepository.findOne({
                        where: {
                            userId: participants[0],
                            conversationId: conversationId // Single ID instead of array
                        },
                        relations: {
                            conversation: true
                        }
                    });

                    if (existingConversation) {
                        // Retorna a conversa existente em vez de criar uma nova
                        const conversation = existingConversation.conversation;
                        const otherParticipant = await userRepository.findOneBy({ id: participants[0] });

                        return res.status(200).json({
                            message: 'Conversa já existe',
                            conversation: {
                                id: conversation.id,
                                name: otherParticipant?.username || 'Usuário',
                                isGroup: false,
                                participants: [
                                    { id: userId, username: existingUsers.find(u => u.id === userId)?.username || 'Você' },
                                    { id: participants[0], username: otherParticipant?.username || 'Usuário' }
                                ],
                                createdAt: conversation.createdAt,
                                updatedAt: conversation.updatedAt
                            }
                        });
                    }
                }
            }
        }

        // Criar a nova conversa
        const conversationRepository = AppDataSource.getRepository(ChatConversation);
        const participantRepository = AppDataSource.getRepository(ChatParticipant);

        const newConversation = conversationRepository.create({
            name: isGroup ? name : null,
            isGroup,
            createdById: userId
        });

        await conversationRepository.save(newConversation);

        // Adicionar todos os participantes (incluindo o criador)
        const allParticipantIds = [...new Set([...participants, userId])];

        for (const participantId of allParticipantIds) {
            await participantRepository.save({
                conversationId: newConversation.id,
                userId: participantId,
                isAdmin: participantId === userId // apenas o criador é admin inicialmente
            });
        }

        // Formatar a resposta
        const participantUsers = existingUsers.map(user => ({
            id: user.id,
            username: user.username,
            isAdmin: user.id === userId
        }));

        res.status(201).json({
            message: 'Conversa criada com sucesso',
            conversation: {
                id: newConversation.id,
                name: isGroup ? name : participantUsers.find(p => p.id !== userId)?.username,
                isGroup,
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

// Listar todos os usuários disponíveis para chat
export const getAvailableUsers = async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Usuário não autenticado' });
        }

        // Buscar todos os usuários exceto o atual
        const userRepository = AppDataSource.getRepository(User);
        const users = await userRepository.find({
            select: ['id', 'username', 'email'],
            where: [
                { id: userId },
            ]
        });

        // Excluir o usuário atual e formatar a resposta
        const availableUsers = (await userRepository.find())
            .filter(user => user.id !== userId)
            .map(user => ({
                id: user.id,
                username: user.username,
                email: user.email
            }));

        res.json({ users: availableUsers });
    } catch (error) {
        console.error('Erro ao listar usuários disponíveis:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
};
