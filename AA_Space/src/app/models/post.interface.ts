export interface Post {
  id: number;
  title: string;
  content: string;
  author: string;
  createdAt: Date;
  likes: number;
  commentCount: number;
  anonymous: boolean;
}
