"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockedIp = exports.ChatMessage = exports.ChatParticipant = exports.ChatConversation = exports.CommentLike = exports.PostLike = exports.Comment = exports.Post = exports.User = void 0;
const typeorm_1 = require("typeorm");
let User = class User {
};
exports.User = User;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], User.prototype, "username", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], User.prototype, "password", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "isAdmin", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "isMainAdmin", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "profileImage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 45, nullable: true }) // IPv6 can be up to 45 chars, IPv4 is 15
    ,
    __metadata("design:type", String)
], User.prototype, "lastIpAddress", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Post, post => post.user),
    __metadata("design:type", Array)
], User.prototype, "posts", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Comment, comment => comment.user),
    __metadata("design:type", Array)
], User.prototype, "comments", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => PostLike, postLike => postLike.user),
    __metadata("design:type", Array)
], User.prototype, "postLikes", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => CommentLike, commentLike => commentLike.user),
    __metadata("design:type", Array)
], User.prototype, "commentLikes", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ChatConversation, conversation => conversation.createdBy),
    __metadata("design:type", Array)
], User.prototype, "createdConversations", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ChatParticipant, participant => participant.user),
    __metadata("design:type", Array)
], User.prototype, "chatParticipations", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ChatMessage, message => message.sender),
    __metadata("design:type", Array)
], User.prototype, "chatMessages", void 0);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)()
], User);
let Post = class Post {
};
exports.Post = Post;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Post.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Post.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Post.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Post.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Post.prototype, "anonymous", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Post.prototype, "author", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Post.prototype, "originalAuthor", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Post.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User, user => user.posts),
    __metadata("design:type", User)
], Post.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Comment, comment => comment.post),
    __metadata("design:type", Array)
], Post.prototype, "comments", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => PostLike, postLike => postLike.post),
    __metadata("design:type", Array)
], Post.prototype, "postLikes", void 0);
exports.Post = Post = __decorate([
    (0, typeorm_1.Entity)()
], Post);
let Comment = class Comment {
};
exports.Comment = Comment;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Comment.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Comment.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Comment.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Comment.prototype, "anonymous", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Comment.prototype, "author", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Comment.prototype, "originalAuthor", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Comment.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Post, post => post.comments),
    __metadata("design:type", Post)
], Comment.prototype, "post", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User, user => user.comments),
    __metadata("design:type", User)
], Comment.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => CommentLike, commentLike => commentLike.comment),
    __metadata("design:type", Array)
], Comment.prototype, "commentLikes", void 0);
exports.Comment = Comment = __decorate([
    (0, typeorm_1.Entity)()
], Comment);
let PostLike = class PostLike {
};
exports.PostLike = PostLike;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], PostLike.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PostLike.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Post, post => post.postLikes),
    __metadata("design:type", Post)
], PostLike.prototype, "post", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User, user => user.postLikes),
    __metadata("design:type", User)
], PostLike.prototype, "user", void 0);
exports.PostLike = PostLike = __decorate([
    (0, typeorm_1.Entity)()
], PostLike);
let CommentLike = class CommentLike {
};
exports.CommentLike = CommentLike;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], CommentLike.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], CommentLike.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Comment, comment => comment.commentLikes),
    __metadata("design:type", Comment)
], CommentLike.prototype, "comment", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User, user => user.commentLikes),
    __metadata("design:type", User)
], CommentLike.prototype, "user", void 0);
exports.CommentLike = CommentLike = __decorate([
    (0, typeorm_1.Entity)()
], CommentLike);
// Novas entidades para o sistema de chat
let ChatConversation = class ChatConversation {
};
exports.ChatConversation = ChatConversation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ChatConversation.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ChatConversation.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_group', default: false }),
    __metadata("design:type", Boolean)
], ChatConversation.prototype, "isGroup", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], ChatConversation.prototype, "avatarPath", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by', nullable: true }),
    __metadata("design:type", Number)
], ChatConversation.prototype, "createdById", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], ChatConversation.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], ChatConversation.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User, user => user.createdConversations),
    (0, typeorm_1.JoinColumn)({ name: 'created_by' }),
    __metadata("design:type", User)
], ChatConversation.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ChatParticipant, participant => participant.conversation),
    __metadata("design:type", Array)
], ChatConversation.prototype, "participants", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ChatMessage, message => message.conversation),
    __metadata("design:type", Array)
], ChatConversation.prototype, "messages", void 0);
exports.ChatConversation = ChatConversation = __decorate([
    (0, typeorm_1.Entity)('chat_conversation')
], ChatConversation);
let ChatParticipant = class ChatParticipant {
};
exports.ChatParticipant = ChatParticipant;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ChatParticipant.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'conversation_id' }),
    __metadata("design:type", Number)
], ChatParticipant.prototype, "conversationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id' }),
    __metadata("design:type", Number)
], ChatParticipant.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_admin', default: false }),
    __metadata("design:type", Boolean)
], ChatParticipant.prototype, "isAdmin", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'joined_at' }),
    __metadata("design:type", Date)
], ChatParticipant.prototype, "joinedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ChatConversation, conversation => conversation.participants),
    (0, typeorm_1.JoinColumn)({ name: 'conversation_id' }),
    __metadata("design:type", ChatConversation)
], ChatParticipant.prototype, "conversation", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User, user => user.chatParticipations),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", User)
], ChatParticipant.prototype, "user", void 0);
exports.ChatParticipant = ChatParticipant = __decorate([
    (0, typeorm_1.Entity)('chat_participant')
], ChatParticipant);
let ChatMessage = class ChatMessage {
};
exports.ChatMessage = ChatMessage;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ChatMessage.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'conversation_id' }),
    __metadata("design:type", Number)
], ChatMessage.prototype, "conversationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sender_id' }),
    __metadata("design:type", Number)
], ChatMessage.prototype, "senderId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ChatMessage.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], ChatMessage.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_read', default: false }),
    __metadata("design:type", Boolean)
], ChatMessage.prototype, "isRead", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10, nullable: true, default: 'sent' }),
    __metadata("design:type", String)
], ChatMessage.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ChatConversation, conversation => conversation.messages),
    (0, typeorm_1.JoinColumn)({ name: 'conversation_id' }),
    __metadata("design:type", ChatConversation)
], ChatMessage.prototype, "conversation", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User, user => user.chatMessages),
    (0, typeorm_1.JoinColumn)({ name: 'sender_id' }),
    __metadata("design:type", User)
], ChatMessage.prototype, "sender", void 0);
exports.ChatMessage = ChatMessage = __decorate([
    (0, typeorm_1.Entity)('chat_message')
], ChatMessage);
let BlockedIp = class BlockedIp {
};
exports.BlockedIp = BlockedIp;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], BlockedIp.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ip_address', unique: true }),
    __metadata("design:type", String)
], BlockedIp.prototype, "ipAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], BlockedIp.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], BlockedIp.prototype, "createdAt", void 0);
exports.BlockedIp = BlockedIp = __decorate([
    (0, typeorm_1.Entity)('blocked_ips')
], BlockedIp);
