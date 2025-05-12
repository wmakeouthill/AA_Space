import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, UpdateDateColumn, JoinColumn } from "typeorm";

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    username: string;

    @Column()
    password: string;

    @Column({ default: false })
    isAdmin: boolean;

    @Column({ default: false })
    isMainAdmin: boolean;

    @Column({ nullable: true })
    email: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    profileImage: string;

    @CreateDateColumn()
    created_at: Date;

    @OneToMany(() => Post, post => post.user)
    posts: Post[];

    @OneToMany(() => Comment, comment => comment.user)
    comments: Comment[];

    @OneToMany(() => PostLike, postLike => postLike.user)
    postLikes: PostLike[];

    @OneToMany(() => CommentLike, commentLike => commentLike.user)
    commentLikes: CommentLike[];

    // Novas relações para o chat
    @OneToMany(() => ChatConversation, conversation => conversation.createdBy)
    createdConversations: ChatConversation[];

    @OneToMany(() => ChatParticipant, participant => participant.user)
    chatParticipations: ChatParticipant[];

    @OneToMany(() => ChatMessage, message => message.sender)
    chatMessages: ChatMessage[];
}

@Entity()
export class Post {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column()
    content: string;

    @Column({ nullable: true })
    user_id: number;

    @Column({ default: false })
    anonymous: boolean;

    @Column({ nullable: true })
    author: string;

    @Column({ nullable: true })
    originalAuthor: string;

    @CreateDateColumn()
    created_at: Date;

    @ManyToOne(() => User, user => user.posts)
    user: User;

    @OneToMany(() => Comment, comment => comment.post)
    comments: Comment[];

    @OneToMany(() => PostLike, postLike => postLike.post)
    postLikes: PostLike[];
}

@Entity()
export class Comment {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    content: string;

    @Column({ nullable: true })
    user_id: number;

    @Column({ default: false })
    anonymous: boolean;

    @Column({ nullable: true })
    author: string;

    @Column({ nullable: true })
    originalAuthor: string;

    @CreateDateColumn()
    created_at: Date;

    @ManyToOne(() => Post, post => post.comments)
    post: Post;

    @ManyToOne(() => User, user => user.comments)
    user: User;

    @OneToMany(() => CommentLike, commentLike => commentLike.comment)
    commentLikes: CommentLike[];
}

@Entity()
export class PostLike {
    @PrimaryGeneratedColumn()
    id: number;

    @CreateDateColumn()
    created_at: Date;

    @ManyToOne(() => Post, post => post.postLikes)
    post: Post;

    @ManyToOne(() => User, user => user.postLikes)
    user: User;
}

@Entity()
export class CommentLike {
    @PrimaryGeneratedColumn()
    id: number;

    @CreateDateColumn()
    created_at: Date;

    @ManyToOne(() => Comment, comment => comment.commentLikes)
    comment: Comment;

    @ManyToOne(() => User, user => user.commentLikes)
    user: User;
}

// Novas entidades para o sistema de chat

@Entity('chat_conversation')
export class ChatConversation {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    name: string;

    @Column({ name: 'is_group', default: false })
    isGroup: boolean;

    @Column({ type: 'varchar', length: 255, nullable: true })
    avatarPath?: string | null;

    @Column({ name: 'created_by', nullable: true })
    createdById: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @ManyToOne(() => User, user => user.createdConversations)
    @JoinColumn({ name: 'created_by' })
    createdBy: User;

    @OneToMany(() => ChatParticipant, participant => participant.conversation)
    participants: ChatParticipant[];

    @OneToMany(() => ChatMessage, message => message.conversation)
    messages: ChatMessage[];
}

@Entity('chat_participant')
export class ChatParticipant {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'conversation_id' })
    conversationId: number;

    @Column({ name: 'user_id' })
    userId: number;

    @Column({ name: 'is_admin', default: false })
    isAdmin: boolean;

    @CreateDateColumn({ name: 'joined_at' })
    joinedAt: Date;

    @ManyToOne(() => ChatConversation, conversation => conversation.participants)
    @JoinColumn({ name: 'conversation_id' })
    conversation: ChatConversation;

    @ManyToOne(() => User, user => user.chatParticipations)
    @JoinColumn({ name: 'user_id' })
    user: User;
}

@Entity('chat_message')
export class ChatMessage {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'conversation_id' })
    conversationId: number;

    @Column({ name: 'sender_id' })
    senderId: number;

    @Column()
    content: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @Column({ name: 'is_read', default: false })
    isRead: boolean;

    @ManyToOne(() => ChatConversation, conversation => conversation.messages)
    @JoinColumn({ name: 'conversation_id' })
    conversation: ChatConversation;

    @ManyToOne(() => User, user => user.chatMessages)
    @JoinColumn({ name: 'sender_id' })
    sender: User;
}
