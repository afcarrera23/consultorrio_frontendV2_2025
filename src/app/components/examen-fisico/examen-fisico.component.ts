import { Component, HostListener, OnInit } from "@angular/core";
import { Router, ActivatedRoute } from "@angular/router";

import { PacienteRegistroDTO } from "src/app/models/paciente.model";
import { ExamenFisicoDTO } from "src/app/models/examen-fisico.model";
import { RegistroTempService } from "src/app/services/registro-temporal";

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

  // Campos que default = "Normal"
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
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const pacienteIdParam = Number(this.route.snapshot.paramMap.get("pacienteId"));
    this.paciente = this.registroTemp.obtenerPaciente();

    if (!this.paciente || this.paciente.id !== pacienteIdParam) {
      console.error("⚠ Paciente no encontrado o no coincide con la URL. Redirigiendo...");
      this.router.navigate(["/registro-paciente"]);
      return;
    }

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

  calcularIMC(): void {
    const peso = this.examenFisico.peso || 0;
    let talla = this.examenFisico.talla || 0;

    if (peso > 0 && talla > 0) {
      talla = talla / 100; // convertir cm a m
      this.examenFisico.imc = +(peso / (talla * talla)).toFixed(2);
    } else {
      this.examenFisico.imc = 0;
    }
  }

  /** Siguiente → Diagnóstico */
  continuarADiagnostico(): void {
    if (!this.paciente?.id) {
      alert("❌ Error: no hay paciente cargado.");
      return;
    }

    const examenParaGuardar = this.normalizarCamposConNormal({
      ...this.examenFisico,
      pacienteId: this.paciente.id,
      usuarioId: this.paciente.usuarioRegistroId,
    });

    // ✅ Guardar como DRAFT (usado por Diagnóstico)
    this.registroTemp.setDraftExamenFisico(examenParaGuardar);

    // (opcional) también puedes persistir en historial:
    // this.registroTemp.guardarExamenFisico(examenParaGuardar);

    this.router.navigate([`/diagnostico/${this.paciente.id}`]);
  }

  /** Atrás → Antecedente Personal */
  atras(): void {
    if (!this.paciente?.id) return;

    const examenParaGuardar = this.normalizarCamposConNormal(this.examenFisico);
    this.registroTemp.setDraftExamenFisico(examenParaGuardar);

    this.router.navigate([`/antecedente-personal/${this.paciente.id}`]);
  }

  /** Normaliza campos vacíos con "Normal" */
  private normalizarCamposConNormal(examen: ExamenFisicoDTO): ExamenFisicoDTO {
    const copia: ExamenFisicoDTO = { ...examen };
    const norm = (s?: string) => (s && s.trim().length ? s : "Normal");

    for (const k of this.camposNormal) {
      (copia as any)[k] = norm(copia[k] as unknown as string);
    }

    return copia;
  }

  /* ===== Popup cancelar ===== */
  abrirPopupCancelar() { this.isPopupOpen = true; }
  cerrarPopup() { this.isPopupOpen = false; }
  confirmarSalida() {
    this.isPopupOpen = false;
    this.router.navigate(["/menu-principal"]);
  }

  @HostListener("document:keydown.escape")
  onEsc() { if (this.isPopupOpen) this.cerrarPopup(); }
}
