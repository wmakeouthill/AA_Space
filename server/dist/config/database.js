"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const entities_1 = require("../models/entities");
const path_1 = require("path");
const dbPath = (0, path_1.join)(__dirname, "../../../database.sqlite");
console.log('Database path:', dbPath);
exports.AppDataSource = new typeorm_1.DataSource({
    type: "sqlite",
    database: dbPath,
    synchronize: false, // Alterado de true para false para evitar conflitos com migrações
    logging: true,
    entities: [entities_1.User, entities_1.Post, entities_1.Comment, entities_1.PostLike, entities_1.CommentLike, entities_1.ChatConversation, entities_1.ChatParticipant, entities_1.ChatMessage],
    migrations: [(0, path_1.join)(__dirname, "../migrations/*.ts")]
});
