import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { PacienteListadoDTO } from '../models/paciente.model'; // importa tu interfaz

@Component({
  selector: 'app-menu-principal',
  templateUrl: './menu-principal.component.html',
  styleUrls: ['./menu-principal.component.css']
})
export class MenuPrincipalComponent {
  pacientes: PacienteListadoDTO[] = [];
  pacientesFiltrados: PacienteListadoDTO[] = [];
  searchQuery: string = '';
  isPopupVisible: boolean = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const medicoLogueado = this.authService.getMedicoLogueado();
    if (!medicoLogueado) {
      this.router.navigate(['/iniciar-sesion']);
    } else {
      this.obtenerPacientes();
    }
  }

  obtenerPacientes(): void {
    this.http.get<PacienteListadoDTO[]>('http://localhost:8080/pacientes/listar')
      .subscribe({
        next: (data) => {
          this.pacientes = data;
          this.pacientesFiltrados = data;
        },
        error: (error) => {
          console.error('Error al obtener pacientes:', error);
        }
      });
  }

  buscarPaciente(): void {
    const query = this.searchQuery.trim().toLowerCase();
    this.pacientesFiltrados = this.pacientes.filter(paciente =>
      paciente.nombreCompleto.toLowerCase().includes(query) ||
      paciente.apellidoCompleto.toLowerCase().includes(query) ||
      paciente.identificacion.includes(query)
    );
  }

  agregarPaciente() {
    this.router.navigate(['/registro-paciente']);
  }  

  editarPaciente(paciente: PacienteListadoDTO): void {
    console.log('Editar paciente', paciente);
  }

  verPaciente(paciente: PacienteListadoDTO): void {
    console.log('Ver paciente', paciente);
  }

  imprimirReceta(paciente: PacienteListadoDTO): void {
    console.log('Imprimir receta de', paciente);
  }

  eliminarPaciente(){

  }

  mostrarPopup(): void {
    this.isPopupVisible = true;
  }

  cerrarSesion(): void {
    this.isPopupVisible = false;
  }

  cancelarPopup(): void {
    this.isPopupVisible = false;
  }
}
