import { Component, HostListener, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { PacienteRegistroDTO } from 'src/app/models/paciente.model';
import { AntecedentePersonalDTO } from 'src/app/models/antecedente-personal.model';
import { RegistroTempService } from 'src/app/services/registro-temporal';
import { AuthService } from 'src/app/services/auth.service';

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
  isSubmitting = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private registroTemp: RegistroTempService,
    private authService: AuthService
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

    // 2) Precargar draft (si existe); si no, setear IDs
    const draft = this.registroTemp.getDraftAntecedentePersonal();
    if (draft) {
      this.antecedentePersonal = { ...this.antecedentePersonal, ...draft };
    } else {
      this.antecedentePersonal.pacienteId = this.paciente.id ?? 0;

      // usuarioId desde AuthService si existe, si no desde el paciente
      const medico = this.authService.getMedicoLogueado?.();
      this.antecedentePersonal.usuarioId = medico?.id ?? this.paciente.usuarioRegistroId ?? 0;
    }

    // 3) Normaliza el datetime-local
    this.antecedentePersonal.fechaConsulta = this.toLocalDateTime(this.antecedentePersonal.fechaConsulta);
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
    // Guarda SIEMPRE el draft antes de navegar
    this.registroTemp.setDraftAntecedentePersonal(this.antecedentePersonal);

    // (Opcional) si quieres mantener historial:
    // this.registroTemp.guardarAntecedentePersonal(this.antecedentePersonal);

    this.router.navigate([`/examen-fisico/${this.paciente.id}`]);
  }

  /** Atrás → Antecedente Patológico */
  atras(): void {
    // Guarda el draft antes de volver
    this.registroTemp.setDraftAntecedentePersonal(this.antecedentePersonal);
    this.router.navigate([`/antecedente-patologico/${this.paciente?.id}`]);
  }

  /* ===== Popup cancelar ===== */
  abrirPopupCancelar() { this.isPopupOpen = true; }
  cerrarPopup() { this.isPopupOpen = false; }
  confirmarSalida() {
    this.isPopupOpen = false;
    this.router.navigate(['/menu-principal']);
  }

  /* UX extra: tecla ESC cierra el popup */
  @HostListener('document:keydown.escape')
  onEsc() { if (this.isPopupOpen) this.cerrarPopup(); }
}
