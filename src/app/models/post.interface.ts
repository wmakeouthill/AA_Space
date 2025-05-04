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
}

export interface Comment {
    id: number;
    content: string;
    author: string;
    created_at: Date;
    post_id: number;
    anonymous: boolean;
    likes: number;
    userLiked: boolean;
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
