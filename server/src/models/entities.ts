import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany } from "typeorm";

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    username: string;

    @Column()
    password: string;

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

    @Column({ default: 0 })
    likes: number;

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

    @Column({ default: 0 })
    likes: number;

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

    @Column({ default: false })
    userLiked: boolean;

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

    @Column({ default: false })
    userLiked: boolean;

    @ManyToOne(() => Comment, comment => comment.commentLikes)
    comment: Comment;

    @ManyToOne(() => User, user => user.commentLikes)
    user: User;
}
