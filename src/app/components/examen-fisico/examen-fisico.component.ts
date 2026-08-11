import { Component, HostListener, OnInit } from "@angular/core";
import { Router, ActivatedRoute } from "@angular/router";

import { PacienteRegistroDTO } from "src/app/models/paciente.model";
import { ExamenFisicoDTO } from "src/app/models/examen-fisico.model";
import { RegistroTempService } from "src/app/services/registro-temporal";
import { PacienteService } from "src/app/services/paciente.service";
import { HistoriaFlowService } from "src/app/services/historia-flow.service";

@Component({
  selector: "app-examen-fisico",
  templateUrl: "./examen-fisico.component.html",
  styleUrls: ["./examen-fisico.component.css"],
})
export class ExamenFisicoComponent implements OnInit {
  paciente: PacienteRegistroDTO | null = null;

  examenFisico: ExamenFisicoDTO = {
    pacienteId: 0,
    tensionSistolica: "",
    tensionDiastolica: "",
    frecuenciaRespiratoria: "",
    frecuenciaCardiaca: "",
    temperatura: "",
    saturacion: "",
    peso: 0,
    talla: 0,
    imc: 0,
    perimetroCefalico: 0,
    aspectoGeneral: "",
    craneoDetalle: "",
    ojosDetalle: "",
    oidoDetalle: "",
    cuelloDetalle: "",
    cardioPulmonarDetalle: "",
    senosDetalle: "",
    abdomenDetalle: "",
    genitalesDetalle: "",
    examenRectalDetalle: "",
    neurologicoDetalle: "",
    extremidadesOsteoarticularDetalle: "",
    otrosHallazgos: "",
    usuarioId: 0,
  };

  /** Estado del popup */
  isPopupOpen = false;
  isSubmitting = false;
  autosaveStatus = '';
  private autosaveTimer?: ReturnType<typeof setTimeout>;

  /** Campos que deben normalizarse con "Normal" */
  private readonly camposNormal: Array<keyof ExamenFisicoDTO> = [
    "craneoDetalle",
    "ojosDetalle",
    "oidoDetalle",
    "cuelloDetalle",
    "cardioPulmonarDetalle",
    "senosDetalle",
    "abdomenDetalle",
    "genitalesDetalle",
    "examenRectalDetalle",
    "neurologicoDetalle",
    "extremidadesOsteoarticularDetalle",
  ];

  constructor(
    private registroTemp: RegistroTempService,
    private router: Router,
    private route: ActivatedRoute,
    private pacienteService: PacienteService,
    private flow: HistoriaFlowService
  ) {}

  ngOnInit(): void {
    const pacienteIdParam = Number(this.route.snapshot.paramMap.get("pacienteId"));
    this.paciente = this.registroTemp.obtenerPaciente();
  
    if (!this.paciente || this.paciente.id !== pacienteIdParam) {
      console.error("⚠ Paciente no encontrado o no coincide con la URL. Redirigiendo...");
      this.router.navigate(["/registro-paciente"]);
      return;
    }
  
    // ⬅️ NUEVO: asegura modo de flujo (a prueba de F5 o ingreso directo)
    // Si el paciente fue creado en este flujo => NEW_PATIENT; si no => EXISTING_PATIENT.
    const createdHere = this.registroTemp.tienePacienteCreadoEnEsteFlujo();
    this.flow.ensureModeByFlag(createdHere);
  
    // (Opcional) mantener sincronizado usuario/paciente en el estado del flujo:
    this.flow.setUsuario(this.paciente.usuarioRegistroId);   // ⬅️ NUEVO (opcional)
    this.flow.setPaciente(this.paciente);                    // ⬅️ NUEVO (opcional)
  
    // Precargar draft si existe
    const draft = this.registroTemp.getDraftExamenFisico();
    if (draft) {
      this.examenFisico = { ...this.examenFisico, ...draft };
    } else {
      this.examenFisico.pacienteId = this.paciente.id ?? 0;
      this.examenFisico.usuarioId = this.paciente.usuarioRegistroId;
    }
  
    // Calcular IMC inicial si ya había peso/talla
    this.calcularIMC();
  }
  

  /** Calcula IMC (peso / talla²) */
  calcularIMC(): void {
    const peso = this.examenFisico.peso || 0;
    let talla = this.examenFisico.talla || 0;

    if (peso > 0 && talla > 0) {
      talla = talla / 100; // cm → m
      this.examenFisico.imc = +(peso / (talla * talla)).toFixed(2);
    } else {
      this.examenFisico.imc = 0;
    }
  }

  programarAutoguardado(): void {
    clearTimeout(this.autosaveTimer);
    this.autosaveStatus = 'Guardando borrador…';
    this.autosaveTimer = setTimeout(() => this.guardarBorradorLocal(), 500);
  }

  private guardarBorradorLocal(): void {
    this.registroTemp.setDraftExamenFisico({ ...this.examenFisico });
    this.autosaveStatus = 'Borrador guardado';
  }

  @HostListener('window:beforeunload')
  guardarAntesDeCerrar(): void { this.guardarBorradorLocal(); }

  /** Botón siguiente → Diagnóstico */
  continuarADiagnostico(): void {
    if (!this.paciente?.id) {
      alert("❌ Error: no hay paciente cargado.");
      return;
    }

    const examenParaGuardar = this.normalizarCampos({
      ...this.examenFisico,
      pacienteId: this.paciente.id,
      usuarioId: this.paciente.usuarioRegistroId,
    });

    this.registroTemp.setDraftExamenFisico(examenParaGuardar);
    this.router.navigate([`/diagnostico/${this.paciente.id}`]);
  }

  /** Atrás → Antecedente Personal */
  atras(): void {
    if (!this.paciente?.id) return;

    const examenParaGuardar = this.normalizarCampos(this.examenFisico);
    this.registroTemp.setDraftExamenFisico(examenParaGuardar);

    this.router.navigate([`/antecedente-personal/${this.paciente.id}`]);
  }

  /**
   * Normaliza campos vacíos:
   * - Campos clínicos → "Normal"
   * - Otros Hallazgos → "Ninguno"
   */
  private normalizarCampos(examen: ExamenFisicoDTO): ExamenFisicoDTO {
    const copia: ExamenFisicoDTO = { ...examen };

    const normNormal = (s?: string) => (s && s.trim().length ? s.trim() : "Normal");
    for (const k of this.camposNormal) {
      (copia as any)[k] = normNormal((copia as any)[k] as string);
    }

    // Campo especial: Otros Hallazgos
    copia.otrosHallazgos =
      copia.otrosHallazgos && copia.otrosHallazgos.trim().length
        ? copia.otrosHallazgos.trim()
        : "Ninguno";

    return copia;
  }

  /** Popup cancelar */
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
          this.router.navigate(["/menu-principal"]);
        },
        error: (err) => {
          console.error("❌ No se pudo eliminar el paciente creado al cancelar:", err);
          this.isSubmitting = false;
          this.registroTemp.limpiarPaciente();
          this.router.navigate(["/menu-principal"]);
        },
      });
    } else {
      this.registroTemp.limpiarPaciente();
      this.router.navigate(["/menu-principal"]);
    }
  }

  /** Atajo teclado Escape → cerrar popup */
  @HostListener("document:keydown.escape")
  onEsc() {
    if (this.isPopupOpen) this.cerrarPopup();
  }
}
