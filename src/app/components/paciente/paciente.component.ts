import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PacienteRegistroDTO } from 'src/app/models/paciente.model';
import { PacienteService } from 'src/app/services/paciente.service';
import { RegistroTempService } from 'src/app/services/registro-temporal';

// Tipo auxiliar para no modificar tu DTO original
type PacienteRegistroDTOExt = PacienteRegistroDTO & {
  id?: number;
  createdInThisFlow?: boolean; // ⬅️ marca de “creado en este flujo”
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
    edad: undefined,       // ahora opcional (back la puede calcular)
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
    antecedentePersonal: []
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

    // Cargar draft si existe
    const guardado = this.registroTemp.obtenerPaciente();
    if (guardado) this.paciente = { ...this.paciente, ...guardado };

    // Setear usuarioRegistroId si faltara
    if (!this.paciente.usuarioRegistroId) {
      const usuarioId = Number(localStorage.getItem('usuarioId'));
      if (usuarioId > 0) this.paciente.usuarioRegistroId = usuarioId;
      else console.warn('⚠ No se encontró un usuarioId válido en localStorage');
    }
  }

  /** Edad calculada para mostrar (no obligatoria para el back) */
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
    // Si hay fechaNacimiento, podemos calcular edad localmente
    this.paciente.edad = this.edadCalculada ?? undefined;
  }

  /** Paso 1 → Paso 2 */
  siguientePanelAntecedentes(): void {
    // Guardar draft antes de navegar o crear
    this.registroTemp.guardarPaciente(this.paciente);

    // Si ya tenemos id (edición), solo navegar
    if (this.paciente.id) {
      this.router.navigate([`/antecedente-patologico/${this.paciente.id}`]);
      return;
    }

    // Construir payload (si hay fecha, no enviar edad para que la calcule el back)
    const payload: PacienteRegistroDTO = { ...this.paciente };
    if (payload.fechaNacimiento) {
      delete (payload as any).edad;
    }

    this.isSubmitting = true;
    this.pacienteService.registrar(payload).subscribe({
      next: (respuesta) => {
        const nuevoId = (respuesta as any)?.id;
        if (!nuevoId) {
          throw new Error('El backend no retornó id en la creación de paciente.');
        }
        // Marcar como creado en este flujo
        const pacienteConId: PacienteRegistroDTOExt = {
          ...this.paciente,
          id: nuevoId,
          createdInThisFlow: true
        };

        // Persistir en el storage temporal
        this.registroTemp.guardarPaciente(pacienteConId);

        this.isSubmitting = false;
        this.router.navigate([`/antecedente-patologico/${nuevoId}`]);
      },
      error: (err) => {
        console.error('❌ Error al registrar paciente (crear id):', err);
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
      // Si se creó en este flujo y se cancela, eliminar en BD
      this.pacienteService.eliminarPaciente(id).subscribe({
        next: () => {
          this.registroTemp.limpiarPaciente();
          this.router.navigate(['/menu-principal']);
        },
        error: (err) => {
          console.error('❌ No se pudo eliminar el paciente creado al cancelar:', err);
          // Aún así limpiamos el estado local para no dejar residuos en UI
          this.registroTemp.limpiarPaciente();
          this.router.navigate(['/menu-principal']);
          // (Opcional) Mostrar toast informativo
        }
      });
    } else {
      // No había sido creado en BD → solo limpiar y salir
      this.registroTemp.limpiarPaciente();
      this.router.navigate(['/menu-principal']);
    }
  }

  @HostListener('document:keydown.escape')
  onEsc() { if (this.isPopupOpen) this.cerrarPopup(); }
}
