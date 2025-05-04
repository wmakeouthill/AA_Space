import "reflect-metadata";
import { DataSource } from "typeorm";
import { User, Post, Comment, PostLike, CommentLike } from "../models/entities";
import { join } from "path";

const dbPath = join(__dirname, "../../../database.sqlite");
console.log('Database path:', dbPath);

export const AppDataSource = new DataSource({
    type: "sqlite",
    database: dbPath,
    synchronize: true,
    logging: true,
    entities: [User, Post, Comment, PostLike, CommentLike],
    migrations: [join(__dirname, "../migrations/*.ts")]
});
