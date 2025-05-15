export interface Chat {
    id: number;
    name?: string; // Nome do grupo ou do outro participante em chat individual
    isGroup: boolean;
    participants: ChatParticipant[];
    lastMessage?: Message;
    avatarPath?: string | null; // Caminho para o avatar do chat (grupo ou usuário)
    createdAt: Date;
    updatedAt: Date;
    unreadCount?: number; // <--- ADICIONAR ESTA LINHA
}

export interface ChatParticipant {
    id: number;
    username: string;
    isAdmin?: boolean;
    profileImage?: string; // URL da imagem de perfil do participante
}

export interface Message {
    id: number;
    content: string;
    senderId: number;
    senderName?: string;
    senderProfileImage?: string; // URL da imagem de perfil do remetente
    timestamp: Date | string;
    read: boolean;
    status?: 'sent' | 'delivered' | 'read'; // Novo campo para status da mensagem
}

export interface CreateChatRequest {
    name?: string;
    isGroup: boolean;
    participants: number[];
}

export interface ApiResponse<T> {
    statusMessage?: string;
    conversations?: T[];
    conversation?: T;
    messages?: Message[];
    message?: Message;
    users?: User[];
}

export interface User {
    id: number;
    username: string;
    email?: string;
    profileImage?: string; // URL da imagem de perfil do usuário
}

export interface NewMessageEvent {
    message: Message;
    chatId: number;
    isNewUnread?: boolean; // Added to indicate if the message contributes to unread count
}
