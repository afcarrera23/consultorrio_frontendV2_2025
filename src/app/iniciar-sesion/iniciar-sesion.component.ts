import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';


@Component({
  selector: 'app-iniciar-sesion',
  templateUrl: './iniciar-sesion.component.html',
  styleUrls: ['./iniciar-sesion.component.css']
})
export class IniciarSesionComponent {
  usuario = '';
  contrasena = '';
  medicoSeleccionadoId: number = 0; // Almacena el ID del médico seleccionado

  constructor(private router: Router, private route: ActivatedRoute, private authService: AuthService) {
    this.route.queryParams.subscribe(params => {
      this.medicoSeleccionadoId = params['medicoId'] || 0; // Asegúrate de manejar el caso donde no hay medicoId
    });
  }

  iniciarSesion() {
    console.log('Usuario:', this.usuario);
    console.log('Contraseña:', this.contrasena);
  
    if (this.usuario && this.contrasena) {
      const medicoId = this.medicoSeleccionadoId || 0;
  
      this.authService.login({
        usuario: this.usuario,
        contrasena: this.contrasena,
        medicoId: medicoId
      }).subscribe({
        next: (response) => {
          if (response && response.nombreMedico && response.apellidoMedico && response.nombreUsuario && response.rol) {
            console.log('Médico logueado:', response.nombreMedico, response.apellidoMedico);
            console.log('Usuario:', response.nombreUsuario);
            console.log('Rol:', response.rol);
  
            // ✅ Guardar datos importantes en localStorage
            localStorage.setItem('usuarioId', response.id.toString()); // <-- ID que usará paciente.component
            localStorage.setItem('usuarioNombre', response.nombreUsuario);
            localStorage.setItem('rol', response.rol.toString());
  
            this.router.navigate(['/menu-principal']);
          } else {
            console.warn('No se encontraron todos los datos del médico en la respuesta.');
            alert('Error en la respuesta del servidor. Inténtalo de nuevo.');
          }
        },
        error: (error) => {
          console.error('Error de inicio de sesión:', error);
          alert(error.error?.error || 'Error en el inicio de sesión. Por favor, verifica tus credenciales.');
        }
      });
    } else {
      alert('Por favor, completa todos los campos requeridos.');
    }
  }
  
  

  seleccionarMedico(id: number) {
    this.medicoSeleccionadoId = id;
    this.usuario = ''; // Opcional: limpiar el campo de usuario al seleccionar un médico
  }
}
