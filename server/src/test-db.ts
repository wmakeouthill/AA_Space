import { AppDataSource } from "./config/database";
import { Post } from "./models/entities";

async function testDatabaseConnection() {
    try {
        await AppDataSource.initialize();
        console.log("Database connection initialized successfully");

        // Teste criando um post
        const postRepository = AppDataSource.getRepository(Post);
        const testPost = postRepository.create({
            title: "Test Post",
            content: "This is a test post to verify database connection",
            anonymous: true
        });

        await postRepository.save(testPost);
        console.log("Test post created successfully:", testPost);

        // Teste buscando posts
        const posts = await postRepository.find();
        console.log("Current posts in database:", posts);

        await AppDataSource.destroy();
        console.log("Database connection closed successfully");

    } catch (error) {
        console.error("Error testing database connection:", error);
        process.exit(1);
    }
}

testDatabaseConnection().then(() => process.exit(0));
