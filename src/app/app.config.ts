import { APP_INITIALIZER, ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors, HttpClient } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { errorInterceptor } from './interceptors/error.interceptor';
import { AuthService } from './services/auth.service';

// Função que será executada durante a inicialização da aplicação
function initializeApp(authService: AuthService) {
  return () => {
    console.log('App Initializer: Verificando autenticação...');
    // Se não há token, não precisamos validar
    if (!authService.getToken()) {
      console.log('App Initializer: Sem token para validar');
      return Promise.resolve(true);
    }
    
    // Valida o token e captura qualquer erro para não bloquear a inicialização
    return firstValueFrom(
      authService.validateToken().pipe(
        catchError(err => {
          console.error('App Initializer: Erro ao validar token', err);
          return of(false);
        })
      )
    ).then(result => {
      console.log('App Initializer: Validação concluída:', result);
      return true;
    });
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    { provide: HttpClient, useClass: HttpClient },
    provideHttpClient(
      withFetch(),
      withInterceptors([errorInterceptor, authInterceptor])
    ),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AuthService],
      multi: true
    }
  ]
};
