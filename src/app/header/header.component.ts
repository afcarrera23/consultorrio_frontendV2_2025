import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  mostrarCerrarSesion: boolean = false;

  constructor(private router: Router) {
    // Detectar cuando cambia la URL
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.mostrarCerrarSesion = event.url !== '/iniciar-sesion';
      });
  }
}
