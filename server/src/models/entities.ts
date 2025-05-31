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

    @Column({ type: 'varchar', length: 45, nullable: true }) // IPv6 can be up to 45 chars, IPv4 is 15
    lastIpAddress: string;

    @Column({ type: 'varchar', length: 20, default: 'member' }) // Adicionando o campo role
    role: string; // Pode ser 'member', 'leader', 'admin'

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

    @OneToMany(() => UserReward, userReward => userReward.user) // Relação com UserReward
    userRewards: UserReward[];
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

    @Column({ type: 'varchar', length: 10, nullable: true, default: 'sent' })
    status: 'sent' | 'delivered' | 'read';

    @ManyToOne(() => ChatConversation, conversation => conversation.messages)
    @JoinColumn({ name: 'conversation_id' })
    conversation: ChatConversation;

    @ManyToOne(() => User, user => user.chatMessages)
    @JoinColumn({ name: 'sender_id' })
    sender: User;
}

@Entity('blocked_ips')
export class BlockedIp {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'ip_address', unique: true })
    ipAddress: string;

    @Column({ nullable: true })
    reason: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}

// Novas entidades para o sistema de Recompensas

@Entity('reward')
export class Reward {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 100 })
    milestone: string; // Ex: "24 Horas", "1 Mês"

    @Column({ length: 100 })
    name: string; // Ex: "Nova Aurora", "Renovação Mensal"

    @Column({ type: 'text', nullable: true })
    designConcept: string; // Ex: "Sol nascente sutil, chama de vela única, círculo simples."

    @Column({ length: 100, nullable: true })
    colorPalette: string; // Ex: "Amarelo suave, branco"

    @Column({ nullable: true })
    iconUrl: string; // Futuramente para armazenar o caminho do ícone/emoji

    @OneToMany(() => UserReward, userReward => userReward.reward)
    userRewards: UserReward[];
}

@Entity('user_reward')
export class UserReward {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, user => user.userRewards)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column()
    user_id: number;

    @ManyToOne(() => Reward, reward => reward.userRewards)
    @JoinColumn({ name: 'reward_id' })
    reward: Reward;

    @Column()
    reward_id: number;

    @CreateDateColumn({ name: 'date_earned' })
    dateEarned: Date;

    @Column({ name: 'awarded_by_user_id', nullable: true })
    awardedByUserId: number; // ID do usuário (líder/admin) que concedeu a recompensa

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'awarded_by_user_id' })
    awardedBy: User;
}
