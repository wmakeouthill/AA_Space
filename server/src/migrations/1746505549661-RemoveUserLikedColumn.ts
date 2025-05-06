import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveUserLikedColumn1746505549661 implements MigrationInterface {
    name = 'RemoveUserLikedColumn1746505549661';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Remove a coluna userLiked da tabela post_like
        await queryRunner.query(`ALTER TABLE "post_like" DROP COLUMN "userLiked"`);
        
        // Remove a coluna userLiked da tabela comment_like
        await queryRunner.query(`ALTER TABLE "comment_like" DROP COLUMN "userLiked"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Adiciona de volta a coluna userLiked na tabela post_like
        await queryRunner.query(`ALTER TABLE "post_like" ADD COLUMN "userLiked" boolean NOT NULL DEFAULT false`);
        
        // Adiciona de volta a coluna userLiked na tabela comment_like
        await queryRunner.query(`ALTER TABLE "comment_like" ADD COLUMN "userLiked" boolean NOT NULL DEFAULT false`);
    }
}
