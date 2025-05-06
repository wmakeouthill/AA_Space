import { MigrationInterface, QueryRunner } from "typeorm";
import * as bcrypt from 'bcrypt';

export class CreateFirstAdmin1746558605356 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Verificar se já existe algum usuário
        const userCount = await queryRunner.query(`SELECT COUNT(*) as count FROM "user"`);
        
        // Se não houver nenhum usuário, cria o primeiro usuário como admin
        // Se já existirem usuários, promove o primeiro a admin
        if (userCount[0].count === '0') {
            // Cria um novo usuário administrador
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await queryRunner.query(`
                INSERT INTO "user" (username, password, "isAdmin") 
                VALUES ('admin', '${hashedPassword}', true)
            `);
            console.log('Usuário administrador criado com sucesso! Username: admin, Senha: admin123');
        } else {
            // Promove o usuário com ID 1 a administrador
            await queryRunner.query(`
                UPDATE "user" SET "isAdmin" = true WHERE id = 1
            `);
            console.log('Primeiro usuário promovido a administrador com sucesso!');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reverte a promoção a administrador
        await queryRunner.query(`
            UPDATE "user" SET "isAdmin" = false WHERE username = 'admin' OR id = 1
        `);
    }
}
