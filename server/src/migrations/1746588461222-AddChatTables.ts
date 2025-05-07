import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class AddChatTables1746588461222 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Criar tabela de conversas de chat
        await queryRunner.createTable(new Table({
            name: "chat_conversation",
            columns: [
                {
                    name: "id",
                    type: "integer",
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: "increment"
                },
                {
                    name: "name",
                    type: "varchar",
                    isNullable: true,
                    comment: "Nome da conversa (para grupos)"
                },
                {
                    name: "is_group",
                    type: "boolean",
                    default: false,
                    comment: "Indica se é um grupo ou conversa direta"
                },
                {
                    name: "created_by",
                    type: "integer",
                    isNullable: true,
                    comment: "ID do usuário que criou a conversa"
                },
                {
                    name: "created_at",
                    type: "datetime",
                    default: "datetime('now')"
                },
                {
                    name: "updated_at",
                    type: "datetime",
                    default: "datetime('now')"
                }
            ]
        }), true);

        // Criar tabela de participantes do chat
        await queryRunner.createTable(new Table({
            name: "chat_participant",
            columns: [
                {
                    name: "id",
                    type: "integer",
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: "increment"
                },
                {
                    name: "conversation_id",
                    type: "integer",
                },
                {
                    name: "user_id",
                    type: "integer",
                },
                {
                    name: "is_admin",
                    type: "boolean",
                    default: false,
                    comment: "Indica se o usuário é administrador do grupo"
                },
                {
                    name: "joined_at",
                    type: "datetime",
                    default: "datetime('now')"
                }
            ]
        }), true);

        // Criar tabela de mensagens de chat
        await queryRunner.createTable(new Table({
            name: "chat_message",
            columns: [
                {
                    name: "id",
                    type: "integer",
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: "increment"
                },
                {
                    name: "conversation_id",
                    type: "integer",
                },
                {
                    name: "sender_id",
                    type: "integer",
                },
                {
                    name: "content",
                    type: "text",
                },
                {
                    name: "created_at",
                    type: "datetime",
                    default: "datetime('now')"
                },
                {
                    name: "is_read",
                    type: "boolean",
                    default: false
                }
            ]
        }), true);

        // Adicionar chaves estrangeiras
        await queryRunner.createForeignKey("chat_conversation", new TableForeignKey({
            columnNames: ["created_by"],
            referencedColumnNames: ["id"],
            referencedTableName: "user",
            onDelete: "SET NULL"
        }));

        await queryRunner.createForeignKey("chat_participant", new TableForeignKey({
            columnNames: ["conversation_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "chat_conversation",
            onDelete: "CASCADE"
        }));

        await queryRunner.createForeignKey("chat_participant", new TableForeignKey({
            columnNames: ["user_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "user",
            onDelete: "CASCADE"
        }));

        await queryRunner.createForeignKey("chat_message", new TableForeignKey({
            columnNames: ["conversation_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "chat_conversation",
            onDelete: "CASCADE"
        }));

        await queryRunner.createForeignKey("chat_message", new TableForeignKey({
            columnNames: ["sender_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "user",
            onDelete: "CASCADE"
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remover tabelas na ordem inversa para evitar violações de chave estrangeira
        await queryRunner.dropTable("chat_message");
        await queryRunner.dropTable("chat_participant");
        await queryRunner.dropTable("chat_conversation");
    }
}
