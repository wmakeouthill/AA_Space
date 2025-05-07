import { AppDataSource } from './src/config/database';

// Função para inicializar o banco de dados e executar migrações
async function initialize() {
  try {
    // Inicializar a conexão
    await AppDataSource.initialize();
    console.log("Data Source inicializado com sucesso");
    
    // Executar as migrações pendentes
    const migrations = await AppDataSource.runMigrations();
    console.log(`${migrations.length} migrações foram executadas:`);
    migrations.forEach(migration => {
      console.log(`- ${migration.name}`);
    });
    
    // Fechar a conexão
    await AppDataSource.destroy();
    console.log("Conexão fechada com sucesso");
  } catch (error) {
    console.error("Erro durante a inicialização ou migrações:", error);
    process.exit(1);
  }
}

// Executar o script
initialize().then(() => {
  console.log("Processo concluído com sucesso");
  process.exit(0);
});