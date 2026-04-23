import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withFetch} from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { provideRouter } from '@angular/router';
bootstrapApplication(AppComponent, {
  providers: [provideHttpClient(withFetch()),provideRouter(routes)]
}).catch(err => console.error(err));


