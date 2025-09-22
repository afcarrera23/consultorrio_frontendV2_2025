import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { AuthService } from '../services/auth.service';
import { PacienteListadoDTO, PacienteRegistroDTO } from '../models/paciente.model';

// 👇 agrega estos dos servicios para manejar el flujo y el estado temporal
import { HistoriaFlowService } from '../services/historia-flow.service';
import { RegistroTempService } from '../services/registro-temporal';

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

  // si usas environments, cámbialo por environment.apiUrl
  private apiBase = 'http://localhost:8080';

  constructor(
    private router: Router,
    private authService: AuthService,
    private http: HttpClient,
    private flow: HistoriaFlowService,          // ⬅️ nuevo
    private registroTemp: RegistroTempService,  // ⬅️ nuevo
  ) {}

  ngOnInit(): void {
    const medicoLogueado = this.authService.getMedicoLogueado();
    if (!medicoLogueado) {
      this.router.navigate(['/iniciar-sesion']);
    } else {
      this.obtenerPacientes();
    }
  }

  /** =========== Data =========== */
  obtenerPacientes(): void {
    this.http.get<PacienteListadoDTO[]>(`${this.apiBase}/pacientes/listar`)
      .subscribe({
        next: (data) => {
          this.pacientes = data || [];
          this.pacientesFiltrados = data || [];
        },
        error: (error) => {
          console.error('Error al obtener pacientes:', error);
        }
      });
  }

  buscarPaciente(): void {
    const query = (this.searchQuery || '').trim().toLowerCase();
    if (!query) {
      this.pacientesFiltrados = this.pacientes.slice();
      return;
    }
    this.pacientesFiltrados = this.pacientes.filter(p =>
      (p.nombreCompleto || '').toLowerCase().includes(query) ||
      (p.apellidoCompleto || '').toLowerCase().includes(query) ||
      (p.identificacion || '').toLowerCase().includes(query)
    );
  }

  /** =========== Flujo: Paciente nuevo =========== */
  agregarPaciente(): void {
    // 1) inicializa el flujo como NUEVO PACIENTE
    const medico = this.authService.getMedicoLogueado();
    const usuarioId = Number(medico?.id || medico?.usuarioId || 0); // ajusta según tu AuthService
    this.flow.initNew(usuarioId);

    // 2) limpia cualquier rastro de paciente previo en el registro temporal
    this.registroTemp.limpiarPaciente?.();

    // 3) navega al registro del paciente (primer paso del flujo)
    this.router.navigate(['/registro-paciente']);
  }

  /** =========== Flujo: Nueva historia para paciente existente =========== */
  async editarPaciente(paciente: PacienteListadoDTO): Promise<void> {
    try {
      // 1) trae el detalle completo del paciente
      const detalle = await this.http
        .get<PacienteRegistroDTO>(`${this.apiBase}/pacientes/${paciente.id}`)
        .toPromise();
  
      if (!detalle?.id) {
        alert('No se pudo cargar el detalle del paciente.');
        return;
      }
  
      // 2) guarda el paciente en el registro temporal
      this.registroTemp.guardarPaciente(detalle);   // ✅ usar el método que ya tienes
  
      // 3) inicializa el flujo como EXISTING_PATIENT
      const medico = this.authService.getMedicoLogueado();
      const usuarioId = Number(medico?.id || medico?.usuarioId || 0);
      this.flow.initExisting(detalle.id, usuarioId, detalle);
  
      // 4) limpiar borradores previos (opcional)
      this.registroTemp.setDraftAntecedentePatologico(undefined as any);
      this.registroTemp.setDraftAntecedentePersonal(undefined as any);
      this.registroTemp.setDraftExamenFisico(undefined as any);
      this.registroTemp.setDraftDiagnosticos([]);
  
      // 5) navega al primer paso del flujo de historia clínica
      this.router.navigate([`/antecedente-patologico/${detalle.id}`]);
  
    } catch (e) {
      console.error('Error al abrir historia para paciente existente:', e);
      alert('No fue posible abrir la historia. Intenta de nuevo.');
    }
  }
  

  /** =========== Otras acciones (pendientes de implementar) =========== */
  verPaciente(p: PacienteListadoDTO): void {
    // Vista de solo lectura (opcional)
    // this.router.navigate([`/paciente/${p.id}`]);
    console.log('Ver paciente', p);
  }

  imprimirReceta(p: PacienteListadoDTO): void {
    console.log('Imprimir receta de', p);
  }

  eliminarPaciente(): void {
    // Implementa confirmación + DELETE si aplica
  }

  mostrarPopup(): void {
    this.isPopupVisible = true;
  }

  cerrarSesion(): void {
    this.isPopupVisible = false;
  }

  verHistorias(p: PacienteListadoDTO) {
    this.router.navigate([`/historial-medico/${p.id}`]); // ✅ ruta existente
  }
  
  
}
