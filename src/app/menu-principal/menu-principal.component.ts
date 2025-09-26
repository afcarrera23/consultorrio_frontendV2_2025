import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { AuthService } from '../services/auth.service';
import { PacienteListadoDTO, PacienteRegistroDTO } from '../models/paciente.model';

// Manejo de flujo y estado temporal
import { HistoriaFlowService } from '../services/historia-flow.service';
import { RegistroTempService } from '../services/registro-temporal';
import { FormulaMedica, PrintService } from '../services/print-service';

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
  loadingImprimirId: number | null = null;

  // si usas environments, cámbialo por environment.apiUrl
  private apiBase = 'http://localhost:8080';

  constructor(
    private router: Router,
    private authService: AuthService,
    private http: HttpClient,
    private flow: HistoriaFlowService,
    private registroTemp: RegistroTempService,
    private printSvc: PrintService
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
          // al cargar, respeta lo que haya escrito el usuario
          this.buscarPaciente();
        },
        error: (error) => {
          console.error('Error al obtener pacientes:', error);
          this.pacientes = [];
          this.pacientesFiltrados = [];
        }
      });
  }

  /** Normaliza: quita acentos, minúsculas, recorta */
  private normalize(v: any): string {
    return String(v ?? '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().trim();
  }

  /** Filtra en vivo por nombre, apellido o identificación (multi-palabra) */
  buscarPaciente(): void {
    const q = this.normalize(this.searchQuery);

    // sin query => copia completa
    if (!q) {
      this.pacientesFiltrados = this.pacientes.slice();
      return;
    }

    const tokens = q.split(/\s+/).filter(Boolean);

    this.pacientesFiltrados = this.pacientes.filter(p => {
      const nombre   = this.normalize(p?.nombreCompleto);
      const apellido = this.normalize(p?.apellidoCompleto);
      const ident    = this.normalize(p?.identificacion);

      // cada token debe existir en alguno de los campos
      return tokens.every(t =>
        nombre.includes(t) || apellido.includes(t) || ident.includes(t)
      );
    });
  }

  /** =========== Flujo: Paciente nuevo =========== */
  agregarPaciente(): void {
    // 1) inicializa el flujo como NUEVO PACIENTE
    const medico = this.authService.getMedicoLogueado();
    const usuarioId = Number(medico?.id || medico?.usuarioId || 0);
    this.flow.initNew(usuarioId);

    // 2) limpia cualquier rastro previo en el registro temporal
    this.registroTemp.limpiarPaciente();

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
      this.registroTemp.guardarPaciente(detalle);

      // 3) inicializa el flujo como EXISTING_PATIENT
      const medico = this.authService.getMedicoLogueado();
      const usuarioId = Number(medico?.id || medico?.usuarioId || 0);
      this.flow.initExisting(detalle.id, usuarioId, detalle);

      // 4) limpiar borradores previos
      this.registroTemp.resetDrafts();

      // 5) navega al primer paso del flujo de historia clínica
      this.router.navigate([`/antecedente-patologico/${detalle.id}`]);

    } catch (e) {
      console.error('Error al abrir historia para paciente existente:', e);
      alert('No fue posible abrir la historia. Intenta de nuevo.');
    }
  }

  /** =========== Otras acciones =========== */
  verPaciente(p: PacienteListadoDTO): void {
    console.log('Ver paciente', p);
    // this.router.navigate([`/paciente/${p.id}`]);
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
    this.router.navigate([`/historial-medico/${p.id}`]);
  }

  /**
   * Imprime la fórmula médica del paciente mostrando al menos Plan/Observaciones.
   * Intenta traer la última fórmula/plan desde backend y, si no hay,
   * imprime un mínimo con encabezado del paciente y fecha actual.
   */
  async imprimirReceta(p: PacienteListadoDTO): Promise<void> {
    if (!p?.id) return;
    this.loadingImprimirId = p.id;
    try {
      await this.printSvc.printFromEndpoint(p.id, {
        nombre: p.nombreCompleto,
        apellido: p.apellidoCompleto,
        doc: p.identificacion
      });
    } catch (e) {
      console.error('Error al preparar impresión:', e);
      alert('No fue posible preparar la impresión.');
    } finally {
      this.loadingImprimirId = null;
    }
  }
  
}
