import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePostCommentLikeTables implements MigrationInterface {
    name = 'CreatePostCommentLikeTables';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "post" (
                "id" SERIAL PRIMARY KEY,
                "title" VARCHAR NOT NULL,
                "content" TEXT NOT NULL,
                "likesCount" INT DEFAULT 0
            );
        `);

        await queryRunner.query(`
            CREATE TABLE "comment" (
                "id" SERIAL PRIMARY KEY,
                "content" TEXT NOT NULL,
                "postId" INT,
                CONSTRAINT "FK_post_comment" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE
            );
        `);

        await queryRunner.query(`
            CREATE TABLE "like" (
                "id" SERIAL PRIMARY KEY,
                "postId" INT,
                CONSTRAINT "FK_post_like" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE
            );
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "like";`);
        await queryRunner.query(`DROP TABLE "comment";`);
        await queryRunner.query(`DROP TABLE "post";`);
    }
}
