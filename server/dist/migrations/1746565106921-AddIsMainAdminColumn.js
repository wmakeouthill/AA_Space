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
exports.AddIsMainAdminColumn1746565106921 = void 0;
class AddIsMainAdminColumn1746565106921 {
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            // Verifica se a coluna já existe antes de tentar criá-la
            const hasColumn = yield queryRunner.hasColumn('user', 'isMainAdmin');
            if (!hasColumn) {
                // Adiciona a coluna isMainAdmin com valor padrão false
                yield queryRunner.query(`ALTER TABLE "user" ADD "isMainAdmin" boolean NOT NULL DEFAULT false`);
                // Define o usuário 'admin' como administrador principal
                yield queryRunner.query(`UPDATE "user" SET "isMainAdmin" = true WHERE "username" = 'admin'`);
            }
            else {
                console.log('Coluna isMainAdmin já existe. Pulando criação da coluna.');
            }
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            // Verifica se a coluna existe antes de tentar removê-la
            const hasColumn = yield queryRunner.hasColumn('user', 'isMainAdmin');
            if (hasColumn) {
                // Remove a coluna isMainAdmin se precisar reverter a migração
                yield queryRunner.query(`ALTER TABLE "user" DROP COLUMN "isMainAdmin"`);
            }
        });
    }
}
exports.AddIsMainAdminColumn1746565106921 = AddIsMainAdminColumn1746565106921;
