import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddStatusToChatMessage1747157121124 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn("chat_message", new TableColumn({
            name: "status",
            type: "varchar",
            isNullable: true,
            comment: "Status da mensagem (sent, delivered, read)"
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("chat_message", "status");
    }

}
