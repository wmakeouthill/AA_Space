import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddProfileImageColumn1746589000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            'user',
            new TableColumn({
                name: 'profileImage',
                type: 'varchar',
                isNullable: true,
                default: null
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('user', 'profileImage');
    }
}