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
exports.RemoveUserLikedColumn1746505549661 = void 0;
class RemoveUserLikedColumn1746505549661 {
    constructor() {
        this.name = 'RemoveUserLikedColumn1746505549661';
    }
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            // Remove a coluna userLiked da tabela post_like
            yield queryRunner.query(`ALTER TABLE "post_like" DROP COLUMN "userLiked"`);
            // Remove a coluna userLiked da tabela comment_like
            yield queryRunner.query(`ALTER TABLE "comment_like" DROP COLUMN "userLiked"`);
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            // Adiciona de volta a coluna userLiked na tabela post_like
            yield queryRunner.query(`ALTER TABLE "post_like" ADD COLUMN "userLiked" boolean NOT NULL DEFAULT false`);
            // Adiciona de volta a coluna userLiked na tabela comment_like
            yield queryRunner.query(`ALTER TABLE "comment_like" ADD COLUMN "userLiked" boolean NOT NULL DEFAULT false`);
        });
    }
}
exports.RemoveUserLikedColumn1746505549661 = RemoveUserLikedColumn1746505549661;
