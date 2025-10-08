import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PacienteRegistroDTO } from 'src/app/models/paciente.model';
import { PacienteService } from 'src/app/services/paciente.service';
import { RegistroTempService } from 'src/app/services/registro-temporal';

type PacienteRegistroDTOExt = PacienteRegistroDTO & {
  id?: number;
  createdInThisFlow?: boolean;
  pendienteDocumento: boolean;
};

@Component({
  selector: 'app-paciente',
  templateUrl: './paciente.component.html',
  styleUrls: ['./paciente.component.css']
})
export class PacienteComponent implements OnInit {
  paciente: PacienteRegistroDTOExt = {
    identificacion: '',
    tipoIdentificacion: '',
    fechaNacimiento: '',   // ISO (YYYY-MM-DD)
    edad: undefined,       // el back la recalcula
    nombreCompleto: '',
    apellidoCompleto: '',
    genero: '',
    profesion: '',
    numeroTelefono: '',
    nombreAcompanante: '',
    direccion: '',
    correo: '',
    usuarioRegistroId: 0,
    antecedentesPatologicos: [],
    antecedentePersonal: [],
    pendienteDocumento: false
  };

  isPopupOpen = false;
  isSubmitting = false;
  todayISO = '';

  constructor(
    private pacienteService: PacienteService,
    private router: Router,
    private registroTemp: RegistroTempService
  ) {}

  ngOnInit(): void {
    this.todayISO = new Date().toISOString().slice(0, 10);

    const guardado = this.registroTemp.obtenerPaciente();
    if (guardado) {
      const pd = typeof (guardado as any).pendienteDocumento === 'boolean'
        ? (guardado as any).pendienteDocumento
        : false;
      this.paciente = { ...this.paciente, ...guardado, pendienteDocumento: pd };
    }

    if (!this.paciente.usuarioRegistroId) {
      const usuarioId = Number(localStorage.getItem('usuarioId'));
      if (usuarioId > 0) this.paciente.usuarioRegistroId = usuarioId;
    }
  }

  /** Edad calculada (solo UI) */
  get edadCalculada(): number | null {
    const fn = this.paciente.fechaNacimiento;
    if (!fn) return null;
    const [y, m, d] = fn.split('-').map(Number);
    if (!y || !m || !d) return null;
    const hoy = new Date();
    let edad = hoy.getFullYear() - y;
    const cumpleEsteAño = new Date(hoy.getFullYear(), m - 1, d);
    if (hoy < cumpleEsteAño) edad -= 1;
    return edad < 0 ? null : edad;
  }

  onFechaChange() {
    // muestra en pantalla; el back recalcula al guardar
    this.paciente.edad = this.edadCalculada ?? undefined;
  }

  private nextTempCounter(): number {
    const key = 'tempIdentCounter';
    const current = Number(localStorage.getItem(key) || '0') + 1;
    localStorage.setItem(key, String(current));
    return current;
  }

  private generarIdentTemporal(): string {
    const now = new Date();
    const pad = (n: number, w = 2) => String(n).padStart(w, '0');
    const stamp =
      now.getFullYear().toString() +
      pad(now.getMonth() + 1) +
      pad(now.getDate()) +
      pad(now.getHours()) +
      pad(now.getMinutes()) +
      pad(now.getSeconds());
    const counter = this.nextTempCounter();
    return `TMP-${stamp}-${counter}`;
  }

  /** Paso 1 → Paso 2 */
  siguientePanelAntecedentes(): void {
    this.registroTemp.guardarPaciente(this.paciente);

    if (this.paciente.id) {
      this.router.navigate([`/antecedente-patologico/${this.paciente.id}`]);
      return;
    }

    const payload: PacienteRegistroDTO = { ...this.paciente };

    // Si marcó “pendiente de documento” y no escribió identificación → generar temporal
    if (this.paciente.pendienteDocumento) {
      const ident = (payload.identificacion ?? '').trim();
      if (!ident) (payload as any).identificacion = this.generarIdentTemporal();
    }

    // Si envías fechaNacimiento, deja que el back calcule edad.
    if (payload.fechaNacimiento) delete (payload as any).edad;

    this.isSubmitting = true;
    this.pacienteService.registrar(payload).subscribe({
      next: (respuesta) => {
        const nuevoId = (respuesta as any)?.id;
        if (!nuevoId) throw new Error('El backend no retornó id en la creación de paciente.');

        const pacienteConId: PacienteRegistroDTOExt = {
          ...this.paciente,
          id: nuevoId,
          createdInThisFlow: true,
          identificacion: (payload as any).identificacion
        };
        this.registroTemp.guardarPaciente(pacienteConId);

        this.isSubmitting = false;
        this.router.navigate([`/antecedente-patologico/${nuevoId}`]);
      },
      error: (err) => {
        console.error('❌ Error al registrar paciente:', err);
        this.isSubmitting = false;
        alert('Error al registrar paciente');
      }
    });
  }

  /* ===== Popup cancelar ===== */
  abrirPopupCancelar() { this.isPopupOpen = true; }
  cerrarPopup() { this.isPopupOpen = false; }

  confirmarSalida() {
    this.isPopupOpen = false;

    const id = this.registroTemp.obtenerIdPaciente();
    const fueCreado = this.registroTemp.tienePacienteCreadoEnEsteFlujo();

    if (fueCreado && id) {
      this.pacienteService.eliminarPaciente(id).subscribe({
        next: () => {
          this.registroTemp.limpiarPaciente();
          this.router.navigate(['/menu-principal']);
        },
        error: (err) => {
          console.error('❌ No se pudo eliminar el paciente creado al cancelar:', err);
          this.registroTemp.limpiarPaciente();
          this.router.navigate(['/menu-principal']);
        }
      });
    } else {
      this.registroTemp.limpiarPaciente();
      this.router.navigate(['/menu-principal']);
    }
  }

  @HostListener('document:keydown.escape')
  onEsc() { if (this.isPopupOpen) this.cerrarPopup(); }
}
