import { Component, HostListener, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { HttpErrorResponse } from "@angular/common/http";

import { PacienteRegistroDTO } from "src/app/models/paciente.model";
import { ExamenFisicoDTO } from "src/app/models/examen-fisico.model";
import { PacienteService } from "src/app/services/paciente.service";
import { RegistroTempService } from "src/app/services/registro-temporal";
import { forkJoin } from "rxjs";

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
    temperatura: "",
    peso: 0,
    talla: 0,
    imc: 0,
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
    saturacion: "",
    perimetroCefalico: 0,
    frecuenciaCardiaca: "",
  };

  isSaving = false;

  // ====== NUEVO: lista de campos que deben defaultear a "Normal" ======
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

  /** Estado del popup */
  isPopupOpen = false;

  constructor(
    private pacienteService: PacienteService,
    private registroTemp: RegistroTempService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.paciente = this.registroTemp.obtenerPaciente();
    if (!this.paciente) {
      alert("❌ Error: No hay paciente cargado.");
      this.router.navigate(["/registro-paciente"]);
      return;
    }

    // ✅ Asignamos IDs al examen físico
    this.examenFisico.pacienteId = this.paciente.id || 0;
    this.examenFisico.usuarioId = this.paciente.usuarioRegistroId;
  }

  calcularIMC(): void {
    const peso = this.examenFisico.peso || 0;
    let talla = this.examenFisico.talla || 0;

    if (peso > 0 && talla > 0) {
      talla = talla / 100; // convertir cm a m
      this.examenFisico.imc = +(peso / (talla * talla)).toFixed(2); // IMC con 2 decimales
    } else {
      this.examenFisico.imc = 0;
    }
  }

  continuarADiagnostico(): void {
    if (!this.paciente || !this.paciente.id) {
      alert("❌ No hay paciente cargado. Registra el paciente antes de continuar.");
      return;
    }
  
    // Guardar el examen físico en memoria temporal
    const examenParaGuardar = this.normalizarCamposConNormal({
      ...this.examenFisico,
      pacienteId: this.paciente.id,
      usuarioId: this.paciente.usuarioRegistroId,
    });
  
    this.registroTemp.guardarExamenFisico(examenParaGuardar);
  
    // Redirigir al componente diagnóstico
    this.router.navigate([`/diagnostico/${this.paciente.id}`]);
  }

  // ====== NUEVO: helper que pone "Normal" si el campo está vacío/espacios ======
  private normalizarCamposConNormal(examen: ExamenFisicoDTO): ExamenFisicoDTO {
    const copia: ExamenFisicoDTO = { ...examen };
    const norm = (s?: string) => (s && s.trim().length ? s : "Normal");

    for (const k of this.camposNormal) {
      const v = (copia[k] as unknown as string) ?? "";
      (copia as any)[k] = norm(v);
    }

    return copia;
  }


  /** Antes navegabas directo; ahora solo abre el popup */
  abrirPopupCancelar() {
    this.isPopupOpen = true;
  }

  /** Cierra el popup sin salir */
  cerrarPopup() {
    this.isPopupOpen = false;
  }

  /** Si el usuario confirma, navega fuera (abandonar) */
  confirmarSalida() {
    this.isPopupOpen = false;
    this.router.navigate(['/menu-principal']);
  }

  /** Si en algún lugar aún llamas a cancelar(), redirige a abrir el popup */
  cancelar() {
    this.abrirPopupCancelar();
  }

  /** UX extra: tecla ESC cierra el popup */
  @HostListener('document:keydown.escape')
  onEsc() {
    if (this.isPopupOpen) this.cerrarPopup();
  }
}
