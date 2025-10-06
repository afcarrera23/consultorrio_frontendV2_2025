import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { PacienteService } from '../services/paciente.service'; // ⬅️ importa el servicio
import { PacienteListadoDTO, PacienteRegistroDTO } from '../models/paciente.model';
import { HistoriaFlowService } from '../services/historia-flow.service';
import { RegistroTempService } from '../services/registro-temporal';
import { PrintService } from '../services/print-service';

type ConfirmDeleteState = {
  visible: boolean;
  loading: boolean;
  paciente?: PacienteListadoDTO | null;
  error?: string | null;
};

@Component({
  selector: 'app-menu-principal',
  templateUrl: './menu-principal.component.html',
  styleUrls: ['./menu-principal.component.css']
})
export class MenuPrincipalComponent {
  pacientes: PacienteListadoDTO[] = [];
  pacientesFiltrados: PacienteListadoDTO[] = [];
  searchQuery = '';
  loadingImprimirId: number | null = null;

  // Estado del modal de eliminación
  confirmDelete: ConfirmDeleteState = { visible: false, loading: false, paciente: null, error: null };

  private apiBase = 'http://localhost:8080';

  constructor(
    private router: Router,
    private authService: AuthService,
    private http: HttpClient,
    private flow: HistoriaFlowService,
    private registroTemp: RegistroTempService,
    private printSvc: PrintService,
    private pacientesSvc: PacienteService    // ⬅️ inyecta el servicio
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
    this.http.get<PacienteListadoDTO[]>(`${this.apiBase}/pacientes/listar`).subscribe({
      next: (data) => {
        this.pacientes = data || [];
        this.buscarPaciente();
      },
      error: (error) => {
        console.error('Error al obtener pacientes:', error);
        this.pacientes = [];
        this.pacientesFiltrados = [];
      }
    });
  }

  private normalize(v: any): string {
    return String(v ?? '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().trim();
  }

  buscarPaciente(): void {
    const q = this.normalize(this.searchQuery);
    if (!q) { this.pacientesFiltrados = this.pacientes.slice(); return; }
    const tokens = q.split(/\s+/).filter(Boolean);
    this.pacientesFiltrados = this.pacientes.filter(p => {
      const nombre   = this.normalize(p?.nombreCompleto);
      const apellido = this.normalize(p?.apellidoCompleto);
      const ident    = this.normalize(p?.identificacion);
      return tokens.every(t => nombre.includes(t) || apellido.includes(t) || ident.includes(t));
    });
  }

  agregarPaciente(): void {
    const medico = this.authService.getMedicoLogueado();
    const usuarioId = Number(medico?.id || medico?.usuarioId || 0);
    this.flow.initNew(usuarioId);
    this.registroTemp.limpiarPaciente();
    this.router.navigate(['/registro-paciente']);
  }

  async editarPaciente(paciente: PacienteListadoDTO): Promise<void> {
    try {
      const detalle = await this.http.get<PacienteRegistroDTO>(`${this.apiBase}/pacientes/${paciente.id}`).toPromise();
      if (!detalle?.id) { alert('No se pudo cargar el detalle del paciente.'); return; }
      this.registroTemp.guardarPaciente(detalle);
      const medico = this.authService.getMedicoLogueado();
      const usuarioId = Number(medico?.id || medico?.usuarioId || 0);
      this.flow.initExisting(detalle.id, usuarioId, detalle);
      this.registroTemp.resetDrafts();
      this.router.navigate([`/antecedente-patologico/${detalle.id}`]);
    } catch (e) {
      console.error('Error al abrir historia para paciente existente:', e);
      alert('No fue posible abrir la historia. Intenta de nuevo.');
    }
  }

  verHistorias(p: PacienteListadoDTO) {
    this.router.navigate([`/historial-medico/${p.id}`]);
  }

  // ========= Eliminar con modal =========
  abrirConfirmarEliminar(paciente: PacienteListadoDTO): void {
    this.confirmDelete = { visible: true, loading: false, paciente, error: null };
  }

  cancelarEliminar(): void {
    this.confirmDelete.visible = false;
    this.confirmDelete.loading = false;
    this.confirmDelete.paciente = null;
    this.confirmDelete.error = null;
  }

  confirmarEliminar(): void {
    if (this.confirmDelete.loading) { return; } // <-- evita doble clic
    if (!this.confirmDelete.paciente?.id) { return; }
  
    this.confirmDelete.loading = true;
    this.confirmDelete.error = null;
  
    this.pacientesSvc.eliminarPaciente(this.confirmDelete.paciente.id).subscribe({
      next: () => {
        this.pacientes = this.pacientes.filter(p => p.id !== this.confirmDelete.paciente!.id);
        this.pacientesFiltrados = this.pacientesFiltrados.filter(p => p.id !== this.confirmDelete.paciente!.id);
        this.cancelarEliminar();
      },
      error: (err) => {
        console.error('Error al eliminar:', err);
        this.confirmDelete.loading = false;
        this.confirmDelete.error = 'No fue posible eliminar el registro. Verifica si el paciente tiene historias u otros datos relacionados.';
      }
    });
  }
  

  // (tu imprimirReceta se queda igual)
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

  nuevaFormula(): void {
    // Aquí defines qué quieres que haga el botón
    // Ejemplo: redirigir a un módulo de fórmulas
    this.router.navigate(['/formula-nueva']);
  }
  
}
