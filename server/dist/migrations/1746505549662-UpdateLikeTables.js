"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateLikeTables1746505549662 = void 0;
class UpdateLikeTables1746505549662 {
    constructor() {
        this.name = 'UpdateLikeTables1746505549662';
    }
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            // Drop existing tables
            yield queryRunner.query(`DROP TABLE IF EXISTS "post_like"`);
            yield queryRunner.query(`DROP TABLE IF EXISTS "comment_like"`);
            // Create new post_like table
            yield queryRunner.query(`
            CREATE TABLE "post_like" (
                "id" INTEGER PRIMARY KEY AUTOINCREMENT,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "postId" integer,
                "userId" integer,
                CONSTRAINT "unique_post_like" UNIQUE ("postId", "userId"),
                CONSTRAINT "FK_post_like_post" FOREIGN KEY ("postId") REFERENCES "post" ("id") ON DELETE CASCADE,
                CONSTRAINT "FK_post_like_user" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE
            )
        `);
            // Create new comment_like table
            yield queryRunner.query(`
            CREATE TABLE "comment_like" (
                "id" INTEGER PRIMARY KEY AUTOINCREMENT,
                "created_at" datetime NOT NULL DEFAULT (datetime('now')),
                "commentId" integer,
                "userId" integer,
                CONSTRAINT "unique_comment_like" UNIQUE ("commentId", "userId"),
                CONSTRAINT "FK_comment_like_comment" FOREIGN KEY ("commentId") REFERENCES "comment" ("id") ON DELETE CASCADE,
                CONSTRAINT "FK_comment_like_user" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE
            )
        `);
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`DROP TABLE "comment_like"`);
            yield queryRunner.query(`DROP TABLE "post_like"`);
        });
    }
}
exports.UpdateLikeTables1746505549662 = UpdateLikeTables1746505549662;
