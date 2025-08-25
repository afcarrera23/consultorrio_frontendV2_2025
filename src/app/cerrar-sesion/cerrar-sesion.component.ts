import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-cerrar-sesion',
  templateUrl: './cerrar-sesion.component.html',
  styleUrls: ['./cerrar-sesion.component.css']
})
export class CerrarSesionComponent {
  mostrarPopup: boolean = false; // Controla si el popup se muestra o no

  constructor(private router: Router) {}

  // Método que muestra el popup al intentar cerrar sesión
  cerrarSesion() {
    this.mostrarPopup = true;
  }

  confirmarCerrarSesion() {
    // Primero oculta el popup
    this.mostrarPopup = false;
  
    // Espera un instante antes de cerrar sesión y redirigir
    setTimeout(() => {
      // Elimina los datos del médico logueado del localStorage
      localStorage.removeItem('medico');
  
      // Redirige al usuario a la página de inicio de sesión
      this.router.navigate(['/iniciar-sesion']);
    }, 100); // 100 milisegundos es suficiente para que el *ngIf se actualice visualmente
  }
  

  // Método para cancelar la acción
  cancelarCerrarSesion() {
    this.mostrarPopup = false; // Solo oculta el popup
  }

}
