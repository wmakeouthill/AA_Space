import { AppDataSource } from './database';

// Execute as migrações necessárias
export async function runMigrations() {
    try {
        await AppDataSource.runMigrations();
        console.log('Migrations executed successfully');
    } catch (error) {
        console.error('Error executing migrations:', error);
        throw error;
    }
}
