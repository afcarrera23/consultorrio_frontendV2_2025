// header.component.ts (o el componente que contiene el header)
import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../services/auth.service'; // ajusta ruta

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent {
  isLoginRoute = false;

  constructor(public auth: AuthService, private router: Router) {
    // Detectar si estamos en /iniciar-sesion para ocultar el botón allí
    this.router.events.pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.isLoginRoute = (e.urlAfterRedirects ?? e.url ?? '')
          .includes('/iniciar-sesion');
      });
  }
}
