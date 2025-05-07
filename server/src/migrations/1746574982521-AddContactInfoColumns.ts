import { MigrationInterface, QueryRunner } from "typeorm";

export class AddContactInfoColumns1746574982521 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "email" varchar NULL`);
        await queryRunner.query(`ALTER TABLE "user" ADD "phone" varchar NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "phone"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "email"`);
    }

}
