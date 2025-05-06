"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddOriginalAuthorColumn1683312000000 = void 0;
class AddOriginalAuthorColumn1683312000000 {
    constructor() {
        this.name = 'AddOriginalAuthorColumn1683312000000';
    }
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`ALTER TABLE "post" ADD COLUMN "originalAuthor" TEXT`);
            yield queryRunner.query(`ALTER TABLE "comment" ADD COLUMN "originalAuthor" TEXT`);
            // Copia os valores existentes de author para originalAuthor
            yield queryRunner.query(`UPDATE "post" SET "originalAuthor" = "author"`);
            yield queryRunner.query(`UPDATE "comment" SET "originalAuthor" = "author"`);
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`ALTER TABLE "post" DROP COLUMN "originalAuthor"`);
            yield queryRunner.query(`ALTER TABLE "comment" DROP COLUMN "originalAuthor"`);
        });
    }
}
exports.AddOriginalAuthorColumn1683312000000 = AddOriginalAuthorColumn1683312000000;
