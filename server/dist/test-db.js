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
const database_1 = require("./config/database");
const entities_1 = require("./models/entities");
function testDatabaseConnection() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield database_1.AppDataSource.initialize();
            console.log("Database connection initialized successfully");
            // Teste criando um post
            const postRepository = database_1.AppDataSource.getRepository(entities_1.Post);
            const testPost = postRepository.create({
                title: "Test Post",
                content: "This is a test post to verify database connection",
                anonymous: true,
                likes: 0
            });
            yield postRepository.save(testPost);
            console.log("Test post created successfully:", testPost);
            // Teste buscando posts
            const posts = yield postRepository.find();
            console.log("Current posts in database:", posts);
            yield database_1.AppDataSource.destroy();
            console.log("Database connection closed successfully");
        }
        catch (error) {
            console.error("Error testing database connection:", error);
            process.exit(1);
        }
    });
}
testDatabaseConnection().then(() => process.exit(0));
