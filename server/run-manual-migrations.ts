import "reflect-metadata";
import { DataSource } from "typeorm";
import { join } from "path";
import { AddOriginalAuthorColumn1683312000000 } from './src/migrations/1683312000000-AddOriginalAuthorColumn';
import { RemoveUserLikedColumn1746505549661 } from './src/migrations/1746505549661-RemoveUserLikedColumn';
import { UpdateLikeTables1746505549662 } from './src/migrations/1746505549662-UpdateLikeTables';
import { AddIsAdminColumn1746557908174 } from './src/migrations/1746557908174-AddIsAdminColumn';
import { CreateFirstAdmin1746558605356 } from './src/migrations/1746558605356-CreateFirstAdmin';
import { AddIsMainAdminColumn1746565106921 } from './src/migrations/1746565106921-AddIsMainAdminColumn';
import { AddContactInfoColumns1746574982521 } from './src/migrations/1746574982521-AddContactInfoColumns';
import { AddChatTables1746588461222 } from './src/migrations/1746588461222-AddChatTables';
import { AddProfileImageColumn1746589000000 } from './src/migrations/1746589000000-AddProfileImageColumn';

// Importando as entidades
import { User, Post, Comment, PostLike, CommentLike, ChatConversation, ChatParticipant, ChatMessage } from './src/models/entities';

const dbPath = join(__dirname, "../database.sqlite");
console.log('Database path:', dbPath);

const AppDataSource = new DataSource({
    type: "sqlite",
    database: dbPath,
    synchronize: false,
    logging: true,
    entities: [User, Post, Comment, PostLike, CommentLike, ChatConversation, ChatParticipant, ChatMessage],
    migrations: [
        AddOriginalAuthorColumn1683312000000,
        RemoveUserLikedColumn1746505549661,
        UpdateLikeTables1746505549662,
        AddIsAdminColumn1746557908174,
        CreateFirstAdmin1746558605356,
        AddIsMainAdminColumn1746565106921,
        AddContactInfoColumns1746574982521,
        AddChatTables1746588461222,
        AddProfileImageColumn1746589000000 // Adicionando migração para perfil de imagem
    ]
});

async function runMigrations() {
    try {
        // Inicializar a conexão
        await AppDataSource.initialize();
        console.log("Data Source inicializado com sucesso");

        // Executar as migrações pendentes
        console.log("Executando migrações...");
        const migrations = await AppDataSource.runMigrations();
        
        console.log(`${migrations.length} migrações foram executadas com sucesso!`);
        
        if (migrations.length > 0) {
            migrations.forEach(migration => {
                console.log(`- ${migration.name}`);
            });
        }
        
        await AppDataSource.destroy();
        console.log("Conexão fechada com sucesso");
    } catch (error) {
        console.error("Erro durante as migrações:", error);
    }
}

runMigrations().then(() => {
    console.log("Processo de migração concluído");
});