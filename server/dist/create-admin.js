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
const database_1 = require("./config/database");
const bcrypt = __importStar(require("bcrypt"));
function createAdminUser() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Iniciando criação de usuário administrador...");
        try {
            // Inicializa a conexão com o banco de dados
            yield database_1.AppDataSource.initialize();
            console.log("Conexão com o banco de dados inicializada com sucesso.");
            // Primeiro, verificamos se a coluna isAdmin existe, se não, criamos ela
            const queryRunner = database_1.AppDataSource.createQueryRunner();
            console.log("Verificando se a coluna isAdmin existe...");
            const tableColumns = yield queryRunner.query(`PRAGMA table_info(user)`);
            const isAdminColumnExists = tableColumns.some((column) => column.name === 'isAdmin');
            if (!isAdminColumnExists) {
                console.log("Coluna isAdmin não encontrada. Criando a coluna...");
                yield queryRunner.query(`ALTER TABLE "user" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false`);
                console.log("Coluna isAdmin criada com sucesso.");
            }
            else {
                console.log("Coluna isAdmin já existe.");
            }
            // Agora podemos criar ou atualizar o usuário admin
            console.log("Verificando se o usuário admin existe...");
            const adminExists = yield queryRunner.query(`SELECT * FROM "user" WHERE "username" = 'admin'`);
            const hashedPassword = yield bcrypt.hash("admin123", 10);
            if (adminExists.length > 0) {
                console.log("Usuário admin encontrado. Atualizando senha e permissões...");
                yield queryRunner.query(`UPDATE "user" SET "password" = ?, "isAdmin" = true WHERE "username" = 'admin'`, [hashedPassword]);
                console.log("Usuário admin atualizado com sucesso!");
            }
            else {
                console.log("Criando novo usuário admin...");
                yield queryRunner.query(`INSERT INTO "user" ("username", "password", "isAdmin", "created_at") VALUES (?, ?, true, datetime('now'))`, ["admin", hashedPassword]);
                console.log("Usuário admin criado com sucesso!");
            }
            // Confirmação
            console.log("Detalhes do usuário admin:");
            console.log("Username: admin");
            console.log("Senha: admin123");
            console.log("isAdmin: true");
            yield queryRunner.release();
        }
        catch (error) {
            console.error("Erro ao configurar usuário administrador:", error);
        }
        finally {
            // Fecha a conexão com o banco de dados
            if (database_1.AppDataSource.isInitialized) {
                yield database_1.AppDataSource.destroy();
                console.log("Conexão com o banco de dados fechada.");
            }
        }
    });
}
// Executa a função
createAdminUser().catch(error => console.error(error));
