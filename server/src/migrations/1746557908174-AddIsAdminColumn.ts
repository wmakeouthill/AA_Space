import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsAdminColumn1746557908174 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Verifica se a coluna já existe antes de tentar criá-la
        const hasColumn = await queryRunner.hasColumn('user', 'isAdmin');
        if (!hasColumn) {
            // Adiciona a coluna isAdmin à tabela user com valor padrão false
            await queryRunner.query(`ALTER TABLE "user" ADD "isAdmin" boolean NOT NULL DEFAULT false`);
        } else {
            console.log('Coluna isAdmin já existe. Pulando criação da coluna.');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Verifica se a coluna existe antes de tentar removê-la
        const hasColumn = await queryRunner.hasColumn('user', 'isAdmin');
        if (hasColumn) {
            // Remove a coluna isAdmin se precisar reverter a migração
            await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "isAdmin"`);
        }
    }

}
