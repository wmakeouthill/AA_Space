import { FrontendUserReward } from './chat/chat.interface';

// Interface for rewards as returned by the backend in authorRewards
export interface AuthorReward {
    id: number;
    name: string;
    designConcept: string;
    colorPalette: string;
    iconUrl?: string;
    dateEarned: string | Date;
}

export interface Post {
    id: number;
    title: string;
    content: string;
    author: string;
    created_at: Date;
    likes: number;
    comment_count: number;
    anonymous: boolean;
    userLiked: boolean;
    user?: {
        id: number;
        username?: string;
        userRewards?: FrontendUserReward[];
    };
    user_id?: number; // Adicionando propriedade opcional user_id
    authorRewards?: AuthorReward[]; // Recompensas do autor do post
}

export interface Comment {
    id: number;
    content: string;
    author: string;
    created_at: Date;
    post_id: number;
    anonymous: boolean;
    guestNickname?: string;
    likes: number;
    userLiked: boolean;
    user?: {
        id: number;
        username?: string;
        userRewards?: FrontendUserReward[];
    };
    user_id?: number; // Adicionando propriedade opcional user_id para comentários
    authorRewards?: AuthorReward[]; // Recompensas do autor do comentário
}

export interface PostLike {
    id: number;
    post_id: number;
    user_id: number;
    created_at: Date;
}

export interface LikeResponse {
    message: string;
    likes: number;
    userLiked: boolean;
}
