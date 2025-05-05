import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOriginalAuthorColumn1683312000000 implements MigrationInterface {
    name = 'AddOriginalAuthorColumn1683312000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "post" ADD COLUMN "originalAuthor" TEXT`);
        await queryRunner.query(`ALTER TABLE "comment" ADD COLUMN "originalAuthor" TEXT`);

        // Copia os valores existentes de author para originalAuthor
        await queryRunner.query(`UPDATE "post" SET "originalAuthor" = "author"`);
        await queryRunner.query(`UPDATE "comment" SET "originalAuthor" = "author"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "post" DROP COLUMN "originalAuthor"`);
        await queryRunner.query(`ALTER TABLE "comment" DROP COLUMN "originalAuthor"`);
    }
}