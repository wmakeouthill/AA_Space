import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRewardSystemEntities1747611180526 implements MigrationInterface {
    name = 'AddRewardSystemEntities1747611180526'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_blocked_ips" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "ip_address" varchar NOT NULL, "reason" varchar, "created_at" timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP), CONSTRAINT "UQ_d9a4a34a43215adb2f0c3612837" UNIQUE ("ip_address"))`);
        await queryRunner.query(`INSERT INTO "temporary_blocked_ips"("id", "ip_address", "reason", "created_at") SELECT "id", "ip_address", "reason", "created_at" FROM "blocked_ips"`);
        await queryRunner.query(`DROP TABLE "blocked_ips"`);
        await queryRunner.query(`ALTER TABLE "temporary_blocked_ips" RENAME TO "blocked_ips"`);
        await queryRunner.query(`CREATE TABLE "reward" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "milestone" varchar(100) NOT NULL, "name" varchar(100) NOT NULL, "designConcept" text, "colorPalette" varchar(100), "iconUrl" varchar)`);
        await queryRunner.query(`CREATE TABLE "user_reward" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "user_id" integer NOT NULL, "reward_id" integer NOT NULL, "date_earned" datetime NOT NULL DEFAULT (datetime('now')), "awarded_by_user_id" integer)`);
        await queryRunner.query(`CREATE TABLE "temporary_user" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "username" varchar NOT NULL, "password" varchar NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "isAdmin" boolean NOT NULL DEFAULT (0), "isMainAdmin" boolean NOT NULL DEFAULT (0), "email" varchar, "phone" varchar, "profileImage" varchar, "lastIpAddress" varchar(45), "role" varchar(20) NOT NULL DEFAULT ('member'))`);
        await queryRunner.query(`INSERT INTO "temporary_user"("id", "username", "password", "created_at", "isAdmin", "isMainAdmin", "email", "phone", "profileImage", "lastIpAddress") SELECT "id", "username", "password", "created_at", "isAdmin", "isMainAdmin", "email", "phone", "profileImage", "lastIpAddress" FROM "user"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`ALTER TABLE "temporary_user" RENAME TO "user"`);
        await queryRunner.query(`CREATE TABLE "temporary_chat_message" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "conversation_id" integer NOT NULL, "sender_id" integer NOT NULL, "content" varchar NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "is_read" boolean NOT NULL DEFAULT (0), "status" varchar(10) DEFAULT ('sent'), CONSTRAINT "FK_aa14fc981646b7f4806f8b2b379" FOREIGN KEY ("conversation_id") REFERENCES "chat_conversation" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_bd00cce706735f1c4d05c69a310" FOREIGN KEY ("sender_id") REFERENCES "user" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_chat_message"("id", "conversation_id", "sender_id", "content", "created_at", "is_read", "status") SELECT "id", "conversation_id", "sender_id", "content", "created_at", "is_read", "status" FROM "chat_message"`);
        await queryRunner.query(`DROP TABLE "chat_message"`);
        await queryRunner.query(`ALTER TABLE "temporary_chat_message" RENAME TO "chat_message"`);
        await queryRunner.query(`CREATE TABLE "temporary_blocked_ips" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "ip_address" varchar NOT NULL, "reason" varchar, "created_at" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_d9a4a34a43215adb2f0c3612837" UNIQUE ("ip_address"))`);
        await queryRunner.query(`INSERT INTO "temporary_blocked_ips"("id", "ip_address", "reason", "created_at") SELECT "id", "ip_address", "reason", "created_at" FROM "blocked_ips"`);
        await queryRunner.query(`DROP TABLE "blocked_ips"`);
        await queryRunner.query(`ALTER TABLE "temporary_blocked_ips" RENAME TO "blocked_ips"`);
        await queryRunner.query(`CREATE TABLE "temporary_user_reward" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "user_id" integer NOT NULL, "reward_id" integer NOT NULL, "date_earned" datetime NOT NULL DEFAULT (datetime('now')), "awarded_by_user_id" integer, CONSTRAINT "FK_e1af1d9aa9a9f2483339a7fd681" FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_610e50c29c8f4ef953f444481d2" FOREIGN KEY ("reward_id") REFERENCES "reward" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_cb3336bbf7dcf3528b7c9691882" FOREIGN KEY ("awarded_by_user_id") REFERENCES "user" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_user_reward"("id", "user_id", "reward_id", "date_earned", "awarded_by_user_id") SELECT "id", "user_id", "reward_id", "date_earned", "awarded_by_user_id" FROM "user_reward"`);
        await queryRunner.query(`DROP TABLE "user_reward"`);
        await queryRunner.query(`ALTER TABLE "temporary_user_reward" RENAME TO "user_reward"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_reward" RENAME TO "temporary_user_reward"`);
        await queryRunner.query(`CREATE TABLE "user_reward" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "user_id" integer NOT NULL, "reward_id" integer NOT NULL, "date_earned" datetime NOT NULL DEFAULT (datetime('now')), "awarded_by_user_id" integer)`);
        await queryRunner.query(`INSERT INTO "user_reward"("id", "user_id", "reward_id", "date_earned", "awarded_by_user_id") SELECT "id", "user_id", "reward_id", "date_earned", "awarded_by_user_id" FROM "temporary_user_reward"`);
        await queryRunner.query(`DROP TABLE "temporary_user_reward"`);
        await queryRunner.query(`ALTER TABLE "blocked_ips" RENAME TO "temporary_blocked_ips"`);
        await queryRunner.query(`CREATE TABLE "blocked_ips" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "ip_address" varchar NOT NULL, "reason" varchar, "created_at" timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP), CONSTRAINT "UQ_d9a4a34a43215adb2f0c3612837" UNIQUE ("ip_address"))`);
        await queryRunner.query(`INSERT INTO "blocked_ips"("id", "ip_address", "reason", "created_at") SELECT "id", "ip_address", "reason", "created_at" FROM "temporary_blocked_ips"`);
        await queryRunner.query(`DROP TABLE "temporary_blocked_ips"`);
        await queryRunner.query(`ALTER TABLE "chat_message" RENAME TO "temporary_chat_message"`);
        await queryRunner.query(`CREATE TABLE "chat_message" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "conversation_id" integer NOT NULL, "sender_id" integer NOT NULL, "content" varchar NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "is_read" boolean NOT NULL DEFAULT (0), "status" varchar, CONSTRAINT "FK_aa14fc981646b7f4806f8b2b379" FOREIGN KEY ("conversation_id") REFERENCES "chat_conversation" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_bd00cce706735f1c4d05c69a310" FOREIGN KEY ("sender_id") REFERENCES "user" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "chat_message"("id", "conversation_id", "sender_id", "content", "created_at", "is_read", "status") SELECT "id", "conversation_id", "sender_id", "content", "created_at", "is_read", "status" FROM "temporary_chat_message"`);
        await queryRunner.query(`DROP TABLE "temporary_chat_message"`);
        await queryRunner.query(`ALTER TABLE "user" RENAME TO "temporary_user"`);
        await queryRunner.query(`CREATE TABLE "user" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "username" varchar NOT NULL, "password" varchar NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "isAdmin" boolean NOT NULL DEFAULT (0), "isMainAdmin" boolean NOT NULL DEFAULT (0), "email" varchar, "phone" varchar, "profileImage" varchar, "lastIpAddress" varchar(45))`);
        await queryRunner.query(`INSERT INTO "user"("id", "username", "password", "created_at", "isAdmin", "isMainAdmin", "email", "phone", "profileImage", "lastIpAddress") SELECT "id", "username", "password", "created_at", "isAdmin", "isMainAdmin", "email", "phone", "profileImage", "lastIpAddress" FROM "temporary_user"`);
        await queryRunner.query(`DROP TABLE "temporary_user"`);
        await queryRunner.query(`DROP TABLE "user_reward"`);
        await queryRunner.query(`DROP TABLE "reward"`);
        await queryRunner.query(`ALTER TABLE "blocked_ips" RENAME TO "temporary_blocked_ips"`);
        await queryRunner.query(`CREATE TABLE "blocked_ips" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "ip_address" varchar NOT NULL, "reason" varchar, "created_at" timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP), CONSTRAINT "UQ_d9a4a34a43215adb2f0c3612837" UNIQUE ("ip_address"))`);
        await queryRunner.query(`INSERT INTO "blocked_ips"("id", "ip_address", "reason", "created_at") SELECT "id", "ip_address", "reason", "created_at" FROM "temporary_blocked_ips"`);
        await queryRunner.query(`DROP TABLE "temporary_blocked_ips"`);
    }

}
