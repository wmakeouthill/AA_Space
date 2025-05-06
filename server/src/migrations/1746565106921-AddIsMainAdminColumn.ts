import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsMainAdminColumn1746565106921 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Verifica se a coluna já existe antes de tentar criá-la
        const hasColumn = await queryRunner.hasColumn('user', 'isMainAdmin');
        if (!hasColumn) {
            // Adiciona a coluna isMainAdmin com valor padrão false
            await queryRunner.query(`ALTER TABLE "user" ADD "isMainAdmin" boolean NOT NULL DEFAULT false`);

            // Define o usuário 'admin' como administrador principal
            await queryRunner.query(`UPDATE "user" SET "isMainAdmin" = true WHERE "username" = 'admin'`);
        } else {
            console.log('Coluna isMainAdmin já existe. Pulando criação da coluna.');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Verifica se a coluna existe antes de tentar removê-la
        const hasColumn = await queryRunner.hasColumn('user', 'isMainAdmin');
        if (hasColumn) {
            // Remove a coluna isMainAdmin se precisar reverter a migração
            await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "isMainAdmin"`);
        }
    }
}
