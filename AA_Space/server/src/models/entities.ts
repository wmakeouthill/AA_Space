export interface User {
  id: number;
  username: string;
  password: string;
  created_at: Date;
}

export interface Post {
  id: number;
  title: string;
  content: string;
  user_id: number | null;
  anonymous: boolean;
  likes: number;
  created_at: Date;
}

export interface Comment {
  id: number;
  content: string;
  post_id: number;
  user_id: number | null;
  anonymous: boolean;
  created_at: Date;
}

export interface PostLike {
  id: number;
  post_id: number;
  user_id: number;
  created_at: Date;
}
