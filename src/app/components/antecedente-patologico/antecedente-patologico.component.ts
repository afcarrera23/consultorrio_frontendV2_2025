import { Component, HostListener, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { PacienteRegistroDTO } from 'src/app/models/paciente.model';
import { AntecedentePatologicoDTO } from 'src/app/models/antecedente-patologico.model';
import { RegistroTempService } from 'src/app/services/registro-temporal';
import { PacienteService } from 'src/app/services/paciente.service'; // ⬅️ NUEVO
import { HistoriaFlowService } from 'src/app/services/historia-flow.service';

@Component({
  selector: 'app-antecedente-patologico',
  templateUrl: './antecedente-patologico.component.html',
  styleUrls: ['./antecedente-patologico.component.css']
})
export class AntecedentePatologicoComponent implements OnInit {
  paciente: PacienteRegistroDTO | null = null;

  antecedente: AntecedentePatologicoDTO = {
    pacienteId: 0,
    motivoConsulta: '',
    enfermedadActual: '',
    medicamentoActual: '',
    covid: false,
    cefalea: false,
    tos: false,
    rinorrea: false,
    mialgia: false,
    dolorToraxico: false,
    nausea: false,
    vomito: false,
    fiebre: false,
    odinofagia: false,
    disnea: false,
    anosmia: false,
    conjuntivitis: false,
    diarrea: false,
    disgeusia: false,
    sintomaticoRespiratorio: false,
    sintomaticoPiel: false,
    victimaViolencia: false,
    fechaConsulta: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm
    usuarioId: 0,
    revisionSintoma: ''
  };

  isPopupOpen = false;
  isSubmitting = false; // ⬅️ NUEVO para bloquear/mostrar estado

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private registroTemp: RegistroTempService,
    private pacienteService: PacienteService, // ⬅️ NUEVO
    private flow: HistoriaFlowService,
  ) {}

  ngOnInit(): void {
    const pacienteId = Number(this.route.snapshot.paramMap.get('pacienteId'));
    this.paciente = this.registroTemp.obtenerPaciente();

    if (!this.paciente || this.paciente.id !== pacienteId) {
      console.error('⚠ Paciente no coincide. Redirigiendo a registro...');
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

    // 1) Precarga desde draft (si existe)
    const draft = this.registroTemp.getDraftAntecedentePatologico();
    if (draft) {
      this.antecedente = { ...this.antecedente, ...draft };
    } else {
      // 2) Inicializa con IDs correctos si no había draft
      this.antecedente.pacienteId = this.paciente.id!;
      this.antecedente.usuarioId = this.paciente.usuarioRegistroId;
    }

    // Asegura formato de fecha compatible con <input type="datetime-local">
    this.antecedente.fechaConsulta = this.toLocalDateTime(this.antecedente.fechaConsulta);
  }

  /** Normaliza a 'YYYY-MM-DDTHH:mm' (lo que espera datetime-local) */
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

  guardarYContinuar(): void {
    this.registroTemp.setDraftAntecedentePatologico(this.antecedente);
    this.router.navigate([`/antecedente-personal/${this.paciente?.id}`]);
  }

  atras(): void {
    this.registroTemp.setDraftAntecedentePatologico(this.antecedente);
    this.router.navigate(['/registro-paciente']);
  }

  /* ==== Popup cancelar ==== */
  abrirPopupCancelar() { this.isPopupOpen = true; }
  cerrarPopup() { this.isPopupOpen = false; }

  confirmarSalida() {
    this.isPopupOpen = false;

    const id = this.registroTemp.obtenerIdPaciente();
    const fueCreado = this.registroTemp.tienePacienteCreadoEnEsteFlujo();

    // Si se creó en este flujo, elimina en BD para no dejar rastro
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
      // Si no estaba creado en BD, solo limpiar y salir
      this.registroTemp.limpiarPaciente();
      this.router.navigate(['/menu-principal']);
    }
  }

  @HostListener('document:keydown.escape')
  onEsc() { if (this.isPopupOpen) this.cerrarPopup(); }
}
