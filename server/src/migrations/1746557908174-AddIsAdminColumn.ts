import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsAdminColumn1746557908174 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Adiciona a coluna isAdmin à tabela user com valor padrão false
        await queryRunner.query(`
            ALTER TABLE "user" ADD "isAdmin" boolean NOT NULL DEFAULT false
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove a coluna isAdmin se precisar reverter a migração
        await queryRunner.query(`
            ALTER TABLE "user" DROP COLUMN "isAdmin"
        `);
    }

}
