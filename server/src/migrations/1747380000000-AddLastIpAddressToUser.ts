import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddLastIpAddressToUser1747380000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn("user", new TableColumn({
            name: "lastIpAddress",
            type: "varchar",
            length: "45",
            isNullable: true,
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("user", "lastIpAddress");
    }
}
