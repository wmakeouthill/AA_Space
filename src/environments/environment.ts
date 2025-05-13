export const environment = {
  production: false,
  apiUrl: determineApiUrl() // Usa a função para definir dinamicamente
};

function determineApiUrl(): string {
  const currentOrigin = window.location.origin;
  if (currentOrigin.includes('v3mrhcvc-4200.brs.devtunnels.ms')) {
    return 'https://v3mrhcvc-3001.brs.devtunnels.ms/api';
  } else if (currentOrigin.includes('.github.dev') || currentOrigin.includes('.github.io') || currentOrigin.includes('.app.github.dev')) {
    const codespacesApiUrl = currentOrigin.replace(/-\d+(\.app\.github\.dev|\.github\.dev|\.github\.io)/, '-3001$1') + '/api';
    return codespacesApiUrl.replace(/\/api\/api$/, '/api');
  }
  return 'http://localhost:3001/api';
}
