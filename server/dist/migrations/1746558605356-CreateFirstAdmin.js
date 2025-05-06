"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.CreateFirstAdmin1746558605356 = void 0;
const bcrypt = __importStar(require("bcrypt"));
class CreateFirstAdmin1746558605356 {
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            // Verificar se já existe algum usuário
            const userCount = yield queryRunner.query(`SELECT COUNT(*) as count FROM "user"`);
            // Se não houver nenhum usuário, cria o primeiro usuário como admin
            // Se já existirem usuários, promove o primeiro a admin
            if (userCount[0].count === '0') {
                // Cria um novo usuário administrador
                const hashedPassword = yield bcrypt.hash('admin123', 10);
                yield queryRunner.query(`
                INSERT INTO "user" (username, password, "isAdmin") 
                VALUES ('admin', '${hashedPassword}', true)
            `);
                console.log('Usuário administrador criado com sucesso! Username: admin, Senha: admin123');
            }
            else {
                // Promove o usuário com ID 1 a administrador
                yield queryRunner.query(`
                UPDATE "user" SET "isAdmin" = true WHERE id = 1
            `);
                console.log('Primeiro usuário promovido a administrador com sucesso!');
            }
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            // Reverte a promoção a administrador
            yield queryRunner.query(`
            UPDATE "user" SET "isAdmin" = false WHERE username = 'admin' OR id = 1
        `);
        });
    }
}
exports.CreateFirstAdmin1746558605356 = CreateFirstAdmin1746558605356;
