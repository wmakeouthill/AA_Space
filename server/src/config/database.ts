import "reflect-metadata";
import { DataSource } from "typeorm";
import { User, Post, Comment, PostLike, CommentLike, ChatConversation, ChatParticipant, ChatMessage, BlockedIp, Reward, UserReward } from "../models/entities";
import { join } from "path";

const dbPath = join(__dirname, "../../../database.sqlite");
console.log('Database path:', dbPath);

export const AppDataSource = new DataSource({
    type: "sqlite",
    database: dbPath,
    synchronize: false, // Alterado de true para false para evitar conflitos com migrações
    logging: true,
    entities: [User, Post, Comment, PostLike, CommentLike, ChatConversation, ChatParticipant, ChatMessage, BlockedIp, Reward, UserReward],
    migrations: [join(__dirname, "../migrations/*.ts")]
});
