import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { ChatConversation, ChatMessage, ChatParticipant, User } from '../models/entities';
import { In, Not } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { broadcastMessageToChat, broadcastMessageStatusUpdate } from '../index'; // Importar as funções
import { AuthRequest } from '../middleware/auth.middleware'; // Corrigido o caminho do import

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
        console.log(`[CHAT CONTROLLER] getUserConversations called for userId: ${userId}`);

        if (!userId) {
            console.warn('[CHAT CONTROLLER] getUserConversations: userId is missing, user not authenticated.');
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
        console.log(`[CHAT CONTROLLER] User participates in conversation IDs: ${JSON.stringify(conversationIds)}`);

        if (conversationIds.length === 0) {
            return res.json({ conversations: [] });
        }        const conversations = await conversationRepository
            .createQueryBuilder('conversation')
            .leftJoinAndSelect('conversation.participants', 'participants')
            .leftJoinAndSelect('participants.user', 'participantUser')
            .leftJoinAndSelect('participantUser.userRewards', 'userRewards')
            .leftJoinAndSelect('userRewards.reward', 'reward')
            .where('conversation.id IN (:...ids)', { ids: conversationIds })
            .orderBy('conversation.updatedAt', 'DESC')
            .getMany();

        console.log(`[CHAT CONTROLLER] Found ${conversations.length} conversations to process.`);

        const conversationsWithDetails = await Promise.all(conversations.map(async (conv) => {
            console.log(`[CHAT CONTROLLER] Processing conversation ID: ${conv.id}`);

            const lastMessage = await messageRepository
                .createQueryBuilder('message')
                .where('message.conversationId = :convId', { convId: conv.id })
                .orderBy('message.createdAt', 'DESC')
                .limit(1)
                .getOne();

            const unreadMessages = await messageRepository
                .createQueryBuilder('message')
                .where('message.conversationId = :convId', { convId: conv.id })
                .andWhere('message.senderId != :userId', { userId: Number(userId) }) // Ensure userId is number
                .andWhere('message.isRead = :isRead', { isRead: false })
                .getCount();

            const currentParticipants = Array.isArray(conv.participants) ? conv.participants : [];

            const participantNames = currentParticipants
                .filter(p => p && p.userId !== userId) // Added p null check
                .map(p => (p.user ? p.user.username : 'Unknown User'));

            let conversationName = conv.name;
            let conversationImage = conv.avatarPath;

            if (!conv.isGroup) {
                const otherParticipant = currentParticipants.find(p => p && p.userId !== userId); // Added p null check
                conversationName = otherParticipant?.user?.username || 'Usuário';
                conversationImage = otherParticipant?.user?.profileImage;
            }

            return {
                id: conv.id,
                name: conversationName,
                isGroup: conv.isGroup,
                avatarPath: conversationImage,                participants: currentParticipants.map(p => {
                    if (!p) return null;
                    return {
                        id: p.userId,
                        username: p.user ? p.user.username : 'Unknown User',
                        profileImage: p.user ? p.user.profileImage : null,
                        isAdmin: p.isAdmin,
                        userRewards: p.user?.userRewards?.map(ur => ({
                            id: ur.id,
                            reward: {
                                id: ur.reward.id,
                                name: ur.reward.name,
                                milestone: ur.reward.milestone,
                                designConcept: ur.reward.designConcept,
                                colorPalette: ur.reward.colorPalette,
                                iconUrl: ur.reward.iconUrl
                            },
                            dateEarned: ur.dateEarned
                        })) || []
                    };
                }).filter(p => p !== null),
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
            const dateAVal = a.lastMessage ? a.lastMessage.timestamp : a.updatedAt;
            const dateBVal = b.lastMessage ? b.lastMessage.timestamp : b.updatedAt;

            const dateA = dateAVal ? new Date(dateAVal).getTime() : 0;
            const dateB = dateBVal ? new Date(dateBVal).getTime() : 0;

            if (isNaN(dateA) || isNaN(dateB)) {
                // console.warn(`[CHAT CONTROLLER] Invalid date encountered in sorting. A_val: ${dateAVal}, B_val: ${dateBVal}, A_time: ${dateA}, B_time: ${dateB}`);
                if (isNaN(dateA) && isNaN(dateB)) return 0;
                return isNaN(dateA) ? 1 : -1;
            }
            return dateB - dateA;
        });

        console.log(`[CHAT CONTROLLER] Successfully processed ${conversationsWithDetails.length} conversations.`);
        res.json({ conversations: conversationsWithDetails });
    } catch (error: any) {
        console.error('-----------------------------------------------------');
        console.error('[CHAT CONTROLLER] Critical error in getUserConversations:');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        if (error.originalError) console.error('Original error:', error.originalError); // For TypeORM errors or nested errors
        if (error.query) console.error('Failed query (if TypeORM error):', error.query);
        if (error.parameters) console.error('Query parameters (if TypeORM error):', error.parameters);
        console.error('-----------------------------------------------------');
        res.status(500).json({ message: 'Erro interno do servidor ao buscar conversas', details: error.message });
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

        const messages = await messageRepository
            .createQueryBuilder('message')
            .leftJoinAndSelect('message.sender', 'sender')
            .where('message.conversationId = :conversationId', { conversationId })
            .orderBy('message.createdAt', 'ASC')
            .getMany();

        // Este bloco marca as mensagens como isRead: true para o usuário ATUAL que está visualizando a conversa.
        // Isso afeta a contagem de não lidas para ESTE usuário.
        // O campo 'status' da mensagem (sent/delivered/read) é para a perspectiva do REMETENTE
        // e é atualizado principalmente pela função markMessagesAsRead quando o DESTINATÁRIO lê.
        const unreadMessagesByOthersForThisUser = messages.filter(msg => msg.senderId !== userId && !msg.isRead);
        if (unreadMessagesByOthersForThisUser.length > 0) {
            const unreadMessageIds = unreadMessagesByOthersForThisUser.map(m => m.id);
            await messageRepository
                .createQueryBuilder()
                .update(ChatMessage)
                .set({ isRead: true }) // Apenas atualiza isRead para a visualização do usuário atual.
                .where('id IN (:...ids)', { ids: unreadMessageIds })
                .execute();

            // Atualiza o array local de mensagens para refletir isRead = true imediatamente na UI do visualizador.
            messages.forEach(msg => {
                if (unreadMessageIds.includes(msg.id)) {
                    msg.isRead = true;
                }
            });
        }

        const formattedMessages = messages.map(msg => ({
            id: msg.id,
            content: msg.content,
            senderId: msg.senderId,
            senderName: msg.sender.username,
            profileImage: msg.sender.profileImage,
            timestamp: msg.createdAt,
            read: msg.isRead,
            status: msg.status
        }));

        console.log(`[CHAT CONTROLLER] getConversationMessages - Sending ${formattedMessages.length} messages for conversation ${conversationId}:`, JSON.stringify(formattedMessages, null, 2));
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

        // 1. Criar e salvar mensagem com status 'sent'
        let newMessageEntity = messageRepository.create({
            conversationId,
            senderId: userId,
            content,
            isRead: false,
            status: 'sent'
        });
        const savedSentMessage = await messageRepository.save(newMessageEntity);

        // 2. Atualizar imediatamente o status para 'delivered' no banco de dados
        // Esta é uma simplificação. Em um sistema real, 'delivered' seria confirmado pelo cliente do destinatário.
        savedSentMessage.status = 'delivered';
        const savedDeliveredMessage = await messageRepository.save(savedSentMessage);

        await conversationRepository.update(
            { id: conversationId },
            { updatedAt: new Date() }
        );

        // 3. Preparar a mensagem para o frontend e para o broadcast com status 'delivered'
        const messageForFrontend = {
            id: savedDeliveredMessage.id,
            content: savedDeliveredMessage.content,
            senderId: sender.id,
            senderName: sender.username,
            senderProfileImage: sender.profileImage,
            timestamp: savedDeliveredMessage.createdAt,
            read: savedDeliveredMessage.isRead, // continuará false até ser lida
            status: savedDeliveredMessage.status // Deve ser 'delivered'
        };

        // Transmitir a mensagem via WebSocket para os clientes conectados na conversa
        broadcastMessageToChat(conversationId.toString(), messageForFrontend);

        // Responder à requisição HTTP
        return res.status(201).json({
            message: 'Mensagem enviada com sucesso',
            chatMessage: messageForFrontend
        });

    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao enviar mensagem', details: (error as Error).message });
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

        // Log do payload recebido
        console.log(`[CHAT CONTROLLER] createConversation - Payload recebido: isGroup=${isGroup}, name=${name}, participants=${JSON.stringify(participants)}, userId=${userId}`);

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

        // Log dos IDs que serão usados na consulta In()
        const idsForInQuery = [...new Set([...participants, userId])];
        console.log(`[CHAT CONTROLLER] createConversation - IDs para consulta In() (antes de new Set): ${JSON.stringify([...participants, userId])}`);
        console.log(`[CHAT CONTROLLER] createConversation - IDs para consulta In() (depois de new Set): ${JSON.stringify(idsForInQuery)}`);

        if (existingUsers.length !== participants.length + 1 && !isGroup && participants.length === 1) {
            // Para chat individual, esperamos encontrar o criador (userId) e o outro participante.
            // Se participants já inclui o userId, então participants.length será 1, e esperamos existingUsers.length === 1 (apenas o outro).
            // Esta lógica precisa ser cuidadosa.
            // A verificação original era: existingUsers.length !== participants.length + 1
            // Se participants = [11] e userId = 10, então [...participants, userId] = [11, 10]. Esperamos existingUsers.length === 2.
            // Se participants = [11, 10] (frontend já incluiu o criador), então [...participants, userId] = [11, 10, 10] -> Set -> [11,10]. Esperamos existingUsers.length === 2.

            // Vamos verificar se todos os IDs em idsForInQuery existem em existingUsers
            const foundUserIds = existingUsers.map(u => u.id);
            const allRequestedUsersExist = idsForInQuery.every(id => foundUserIds.includes(id));

            if (!allRequestedUsersExist) {
                 console.error(`[CHAT CONTROLLER] createConversation - Discrepância de usuários: Esperados ${idsForInQuery.length} usuários únicos, encontrados ${existingUsers.length}. IDs consultados: ${JSON.stringify(idsForInQuery)}. Usuários encontrados: ${JSON.stringify(foundUserIds)}`);
                 return res.status(400).json({ message: 'Um ou mais participantes selecionados não existem ou há uma inconsistência nos IDs.' });
            }
        } else if (isGroup && existingUsers.length !== idsForInQuery.length) {
            // Para grupos, o número de usuários existentes deve corresponder ao número de IDs únicos.
            console.error(`[CHAT CONTROLLER] createConversation - Discrepância de usuários em grupo: Esperados ${idsForInQuery.length} usuários únicos, encontrados ${existingUsers.length}. IDs consultados: ${JSON.stringify(idsForInQuery)}`);
            return res.status(400).json({ message: 'Um ou mais participantes selecionados para o grupo não existem.' });
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
        // Log final dos IDs de participantes antes de salvar
        console.log(`[CHAT CONTROLLER] createConversation - IDs finais para ChatParticipant: ${JSON.stringify(allParticipantIds)}`);

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

// Marcar mensagens como lidas
export const markMessagesAsRead = async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const conversationIdStr = req.params.id; // CORRIGIDO de req.params.conversationId para req.params.id
    const userId = authReq.user?.id; // ID do usuário que está lendo as mensagens

    // Detailed logging at the beginning of the function
    console.log('[CHAT CONTROLLER] markMessagesAsRead: Entered function.');
    console.log('[CHAT CONTROLLER] markMessagesAsRead: req.params:', JSON.stringify(req.params));
    console.log('[CHAT CONTROLLER] markMessagesAsRead: req.body:', JSON.stringify(req.body));
    console.log('[CHAT CONTROLLER] markMessagesAsRead: Raw userId from req.user:', userId);
    console.log('[CHAT CONTROLLER] markMessagesAsRead: Raw conversationIdStr from req.params.id:', conversationIdStr);

    if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
    }

    try {
        const conversationId = parseInt(conversationIdStr);
        if (isNaN(conversationId)) {
            console.error('[CHAT CONTROLLER] markMessagesAsRead: Invalid conversation ID format:', conversationIdStr);
            return res.status(400).json({ message: 'Invalid conversation ID format.' });
        }
        console.log('[CHAT CONTROLLER] markMessagesAsRead: Parsed conversationId:', conversationId);
        console.log('[CHAT CONTROLLER] markMessagesAsRead: Authenticated userId:', userId);

        const messageRepository = AppDataSource.getRepository(ChatMessage);
        const conversationRepository = AppDataSource.getRepository(ChatConversation);

        const conversation = await conversationRepository.findOne({ where: { id: conversationId } });
        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        // Encontrar mensagens nesta conversa:
        // - Não enviadas pelo usuário atual (ou seja, enviadas por OUTROS para este usuário)
        // - Cujo status atual seja 'sent' ou 'delivered' (ainda não marcadas como 'read' para o remetente)
        const messagesToUpdate = await messageRepository.find({
            where: {
                conversation: { id: conversationId },
                senderId: Not(userId), // Mensagens enviadas por OUTROS
                status: In(['sent', 'delivered']) // Apenas se o status for 'sent' ou 'delivered'
            },
            select: ['id'] // Apenas IDs são necessários para a atualização
        });

        if (messagesToUpdate.length === 0) {
            console.log(`[CHAT CONTROLLER] No messages with status 'sent' or 'delivered' to mark as read in conversation ${conversationId} for user ${userId}`);
            return res.status(200).json({ message: 'No new messages to mark as read' });
        }

        const messageIdsToUpdate = messagesToUpdate.map(msg => msg.id);
        console.log(`[CHAT CONTROLLER] Marking ${messageIdsToUpdate.length} messages as read (new status 'read'). IDs: ${messageIdsToUpdate.join(', ')}`);

        // Atualizar tanto isRead (para a perspectiva do destinatário) quanto status (para a perspectiva do remetente)
        const updateResult = await messageRepository
            .createQueryBuilder()
            .update(ChatMessage)
            .set({ isRead: true, status: 'read' }) // Define isRead para true e status para 'read'
            .whereInIds(messageIdsToUpdate)
            .execute();

        if (updateResult.affected && updateResult.affected > 0) {
            // Notificar o remetente (e outros na conversa) que estas mensagens foram lidas
            // O `userId` aqui é o ID do usuário que LEU as mensagens.
            broadcastMessageStatusUpdate(conversationId.toString(), userId.toString(), 'read', messageIdsToUpdate.map(id => id.toString()));
            console.log(`[CHAT CONTROLLER] ${updateResult.affected} messages marked as read in conversation ${conversationId} by user ${userId}. WebSocket update sent.`);
            return res.status(200).json({
                message: `${updateResult.affected} messages marked as read`,
                updatedMessageIds: messageIdsToUpdate
            });
        } else {
            console.log(`[CHAT CONTROLLER] No messages were updated in the database, though ${messageIdsToUpdate.length} were targeted.`);
            return res.status(200).json({ message: 'No messages were updated' });
        }
    } catch (error) {
        console.error('[CHAT CONTROLLER] Error marking messages as read:', error);
        return res.status(500).json({ message: 'Error marking messages as read', error: (error as Error).message });
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
