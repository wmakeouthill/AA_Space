import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateLikeTables1746505549662 implements MigrationInterface {
    name = 'UpdateLikeTables1746505549662';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop existing tables
        await queryRunner.query(`DROP TABLE IF EXISTS "post_like"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "comment_like"`);

        // Create new post_like table
        await queryRunner.query(`
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
        await queryRunner.query(`
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
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "comment_like"`);
        await queryRunner.query(`DROP TABLE "post_like"`);
    }
}
