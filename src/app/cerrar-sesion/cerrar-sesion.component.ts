// cerrar-sesion.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service'; // ajusta la ruta

@Component({
  selector: 'app-cerrar-sesion',
  templateUrl: './cerrar-sesion.component.html',
  styleUrls: ['./cerrar-sesion.component.css']
})
export class CerrarSesionComponent {
  mostrarPopup = false;

  constructor(private router: Router, private auth: AuthService) {}

  cerrarSesion() {
    this.mostrarPopup = true;
  }

  confirmarCerrarSesion() {
    this.mostrarPopup = false;
    setTimeout(() => {
      this.auth.logout();                 // ✅ usa tu servicio (limpia 'medico')
      this.router.navigate(['/iniciar-sesion']);
    }, 100);
  }

  cancelarCerrarSesion() { this.mostrarPopup = false; }
}
