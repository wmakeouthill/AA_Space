import { AppDataSource } from "./config/database";
import { User } from "./models/entities";
import * as bcrypt from 'bcrypt';

async function createAdminUser() {
    console.log("Iniciando criação de usuário administrador...");
    
    try {
        // Inicializa a conexão com o banco de dados
        await AppDataSource.initialize();
        console.log("Conexão com o banco de dados inicializada com sucesso.");
        
        // Primeiro, verificamos se a coluna isAdmin existe, se não, criamos ela
        const queryRunner = AppDataSource.createQueryRunner();
        
        console.log("Verificando se a coluna isAdmin existe...");
        const tableColumns = await queryRunner.query(`PRAGMA table_info(user)`);
        const isAdminColumnExists = tableColumns.some((column: any) => column.name === 'isAdmin');
        
        if (!isAdminColumnExists) {
            console.log("Coluna isAdmin não encontrada. Criando a coluna...");
            await queryRunner.query(`ALTER TABLE "user" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false`);
            console.log("Coluna isAdmin criada com sucesso.");
        } else {
            console.log("Coluna isAdmin já existe.");
        }
        
        // Agora podemos criar ou atualizar o usuário admin
        console.log("Verificando se o usuário admin existe...");
        const adminExists = await queryRunner.query(`SELECT * FROM "user" WHERE "username" = 'admin'`);
        
        const hashedPassword = await bcrypt.hash("admin123", 10);
        
        if (adminExists.length > 0) {
            console.log("Usuário admin encontrado. Atualizando senha e permissões...");
            await queryRunner.query(
                `UPDATE "user" SET "password" = ?, "isAdmin" = true WHERE "username" = 'admin'`,
                [hashedPassword]
            );
            console.log("Usuário admin atualizado com sucesso!");
        } else {
            console.log("Criando novo usuário admin...");
            await queryRunner.query(
                `INSERT INTO "user" ("username", "password", "isAdmin", "created_at") VALUES (?, ?, true, datetime('now'))`,
                ["admin", hashedPassword]
            );
            console.log("Usuário admin criado com sucesso!");
        }
        
        // Confirmação
        console.log("Detalhes do usuário admin:");
        console.log("Username: admin");
        console.log("Senha: admin123");
        console.log("isAdmin: true");
        
        await queryRunner.release();
        
    } catch (error) {
        console.error("Erro ao configurar usuário administrador:", error);
    } finally {
        // Fecha a conexão com o banco de dados
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
            console.log("Conexão com o banco de dados fechada.");
        }
    }
}

// Executa a função
createAdminUser().catch(error => console.error(error));