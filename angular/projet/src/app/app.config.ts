import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';

import { routes } from './app.routes'; // Ensure this import is correct

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),  // )Sets up routing
    provideHttpClient(withFetch())     // Enables HttpClient for API calls
  ]
};


