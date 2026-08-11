import { Component, HostListener, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { PacienteRegistroDTO } from 'src/app/models/paciente.model';
import { AntecedentePersonalDTO } from 'src/app/models/antecedente-personal.model';
import { RegistroTempService } from 'src/app/services/registro-temporal';
import { AuthService } from 'src/app/services/auth.service';
import { PacienteService } from 'src/app/services/paciente.service'; // ⬅️ NUEVO
import { HistoriaFlowService } from 'src/app/services/historia-flow.service';

@Component({
  selector: 'app-antecedente-personal',
  templateUrl: './antecedente-personal.component.html',
  styleUrls: ['./antecedente-personal.component.css']
})
export class AntecedentePersonalComponent implements OnInit {

  paciente: PacienteRegistroDTO | null = null;

  antecedentePersonal: AntecedentePersonalDTO = {
    pacienteId: 0,
    antecedentesPersonales: '',
    antecedentesFamiliares: '',
    ginecoObstetricos: '',
    gestas: 0,
    partos: 0,
    abortos: 0,
    cesareas: 0,
    vivos: 0,
    mortinatos: 0,
    fechaConsulta: new Date().toISOString().slice(0,16), // YYYY-MM-DDTHH:mm
    usuarioId: 0
  };

  isPopupOpen = false;
  isSubmitting = false; // ⬅️ NUEVO
  autosaveStatus = '';
  private autosaveTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private registroTemp: RegistroTempService,
    private authService: AuthService,
    private pacienteService: PacienteService, // ⬅️ NUEVO
    private flow: HistoriaFlowService
  ) {}

  ngOnInit(): void {
    const pacienteIdParam = Number(this.route.snapshot.paramMap.get('pacienteId'));
  
    // 1) Cargar paciente desde el registro temporal
    this.paciente = this.registroTemp.obtenerPaciente();
    if (!this.paciente || this.paciente.id !== pacienteIdParam) {
      console.error('⚠ Paciente no encontrado o no coincide con la URL. Redirigiendo...');
      this.router.navigate(['/registro-paciente']);
      return;
    }
  
    // ⬅️ NUEVO: asegura modo de flujo (a prueba de F5 o ingreso directo)
    // Si el paciente fue creado en este flujo => NEW_PATIENT; si no => EXISTING_PATIENT.
    const createdHere = this.registroTemp.tienePacienteCreadoEnEsteFlujo();
    this.flow.ensureModeByFlag(createdHere);
  
    // (Opcional) mantener sincronizado usuario/paciente en el estado del flujo:
    this.flow.setUsuario(this.paciente.usuarioRegistroId);   // ⬅️ NUEVO (opcional)
    this.flow.setPaciente(this.paciente);                    // ⬅️ NUEVO (opcional)
  
    // 2) Precargar draft (si existe); si no, setear IDs
    const draft = this.registroTemp.getDraftAntecedentePersonal();
    if (draft) {
      this.antecedentePersonal = { ...this.antecedentePersonal, ...draft };
    } else {
      this.antecedentePersonal.pacienteId = this.paciente.id ?? 0;
  
      const medico = this.authService.getMedicoLogueado?.();
      this.antecedentePersonal.usuarioId = medico?.id ?? this.paciente.usuarioRegistroId ?? 0;
    }
  
    // 3) Normaliza el datetime-local
    this.antecedentePersonal.fechaConsulta = this.toLocalDateTime(
      this.antecedentePersonal.fechaConsulta
    );
  }
  

  /** Normaliza a 'YYYY-MM-DDTHH:mm' para <input type="datetime-local"> */
  private toLocalDateTime(value: string): string {
    if (value && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return value;
    try {
      const d = new Date(value || new Date());
      const pad = (n: number) => String(n).padStart(2, '0');
      const y = d.getFullYear();
      const m = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      const hh = pad(d.getHours());
      const mm = pad(d.getMinutes());
      return `${y}-${m}-${day}T${hh}:${mm}`;
    } catch {
      return new Date().toISOString().slice(0, 16);
    }
  }

  /** Siguiente → Examen Físico */
  guardarYContinuar(): void {
    if (!this.paciente?.id) {
      alert("❌ Error: No se encontró el paciente.");
      return;
    }
    this.registroTemp.setDraftAntecedentePersonal(this.antecedentePersonal);
    this.router.navigate([`/examen-fisico/${this.paciente.id}`]);
  }

  programarAutoguardado(): void {
    clearTimeout(this.autosaveTimer);
    this.autosaveStatus = 'Guardando borrador…';
    this.autosaveTimer = setTimeout(() => this.guardarBorradorLocal(), 500);
  }

  private guardarBorradorLocal(): void {
    this.registroTemp.setDraftAntecedentePersonal({ ...this.antecedentePersonal });
    this.autosaveStatus = 'Borrador guardado';
  }

  @HostListener('window:beforeunload')
  guardarAntesDeCerrar(): void { this.guardarBorradorLocal(); }

  /** Atrás → Antecedente Patológico */
  atras(): void {
    this.registroTemp.setDraftAntecedentePersonal(this.antecedentePersonal);
    this.router.navigate([`/antecedente-patologico/${this.paciente?.id}`]);
  }

  /* ===== Popup cancelar ===== */
  abrirPopupCancelar() { this.isPopupOpen = true; }
  cerrarPopup() { this.isPopupOpen = false; }

  confirmarSalida() {
    this.isPopupOpen = false;

    const id = this.registroTemp.obtenerIdPaciente();
    const fueCreado = this.registroTemp.tienePacienteCreadoEnEsteFlujo();

    if (fueCreado && id) {
      this.isSubmitting = true;
      this.pacienteService.eliminarPaciente(id).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.registroTemp.limpiarPaciente();
          this.router.navigate(['/menu-principal']);
        },
        error: (err) => {
          console.error('❌ No se pudo eliminar el paciente creado al cancelar:', err);
          this.isSubmitting = false;
          this.registroTemp.limpiarPaciente();
          this.router.navigate(['/menu-principal']);
        }
      });
    } else {
      this.registroTemp.limpiarPaciente();
      this.router.navigate(['/menu-principal']);
    }
  }

  /* UX extra: tecla ESC cierra el popup */
  @HostListener('document:keydown.escape')
  onEsc() { if (this.isPopupOpen) this.cerrarPopup(); }
}
