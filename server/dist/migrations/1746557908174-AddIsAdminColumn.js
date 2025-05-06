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
exports.AddIsAdminColumn1746557908174 = void 0;
class AddIsAdminColumn1746557908174 {
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            // Adiciona a coluna isAdmin à tabela user com valor padrão false
            yield queryRunner.query(`
            ALTER TABLE "user" ADD "isAdmin" boolean NOT NULL DEFAULT false
        `);
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            // Remove a coluna isAdmin se precisar reverter a migração
            yield queryRunner.query(`
            ALTER TABLE "user" DROP COLUMN "isAdmin"
        `);
        });
    }
}
exports.AddIsAdminColumn1746557908174 = AddIsAdminColumn1746557908174;
