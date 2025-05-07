export interface Chat {
    id: number;
    name?: string;
    isGroup: boolean;
    participants: ChatParticipant[];
    lastMessage?: Message;
    unreadCount?: number;
    createdAt: Date | string;
    updatedAt: Date | string;
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
