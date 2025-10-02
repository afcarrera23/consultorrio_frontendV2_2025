import { Injectable } from '@angular/core';
import { PacienteRegistroDTO } from '../models/paciente.model';
import { AntecedentePatologicoDTO } from '../models/antecedente-patologico.model';
import { AntecedentePersonalDTO } from '../models/antecedente-personal.model';
import { ExamenFisicoDTO } from '../models/examen-fisico.model';
import { DiagnosticoItem } from '../models/diagnostico.model';

// Tipo auxiliar para permitir id y createdInThisFlow sin tocar tu DTO
type PacienteRegistroDTOExt = PacienteRegistroDTO & {
  id?: number;
  createdInThisFlow?: boolean;
};

@Injectable({ providedIn: 'root' })
export class RegistroTempService {
  /* ================== Estado principal (historial) ================== */
  paciente: PacienteRegistroDTOExt | null = null;
  antecedentes: AntecedentePatologicoDTO[] = [];
  antecedentePersonal: AntecedentePersonalDTO[] = [];
  examenesFisicos: ExamenFisicoDTO[] = [];
  diagnosticos: DiagnosticoItem[] = [];

  /* ================== Drafts por paso (última edición) ================== */
  private draftAntPatologico?: AntecedentePatologicoDTO;
  private draftAntPersonal?: AntecedentePersonalDTO;
  private draftExamenFisico?: ExamenFisicoDTO;
  private draftDiagnosticos?: DiagnosticoItem[];

  /* ================== Claves de storage ================== */
  private KEY_PACIENTE = 'tempPaciente';
  private KEY_ANT_PAT = 'tempAntecedentes';
  private KEY_ANT_PER = 'tempAntecedentesPersonales';
  private KEY_EXA_FIS = 'tempExamenesFisicos';
  private KEY_DIAG    = 'tempDiagnosticos';

  private DRAFT_ANT_PAT_KEY = 'draftAntecedentePatologico';
  private DRAFT_ANT_PER_KEY = 'draftAntecedentePersonal';
  private DRAFT_EXA_FIS_KEY = 'draftExamenFisico';
  private DRAFT_DIAG_KEY    = 'draftDiagnosticos';

  /* ================== PACIENTE ================== */
  guardarPaciente(paciente: PacienteRegistroDTOExt) {
    // Guardamos todo el objeto, incluida la marca createdInThisFlow si existe
    this.paciente = { ...paciente };

    // Propagar pacienteId a colecciones ya guardadas
    if (this.antecedentes.length > 0) {
      const pid = paciente.id ?? 0;
      this.antecedentes = this.antecedentes.map(a => ({ ...a, pacienteId: pid }));
    }

    const pid = paciente.id ?? 0;
    if (this.draftAntPatologico) this.draftAntPatologico.pacienteId = pid;
    if (this.draftAntPersonal)   this.draftAntPersonal.pacienteId   = pid;
    if (this.draftExamenFisico)  this.draftExamenFisico.pacienteId  = pid;

    localStorage.setItem(this.KEY_PACIENTE, JSON.stringify(this.paciente));

    // Persistir drafts si existen
    if (this.draftAntPatologico) localStorage.setItem(this.DRAFT_ANT_PAT_KEY, JSON.stringify(this.draftAntPatologico));
    if (this.draftAntPersonal)   localStorage.setItem(this.DRAFT_ANT_PER_KEY, JSON.stringify(this.draftAntPersonal));
    if (this.draftExamenFisico)  localStorage.setItem(this.DRAFT_EXA_FIS_KEY, JSON.stringify(this.draftExamenFisico));
    if (this.draftDiagnosticos)  localStorage.setItem(this.DRAFT_DIAG_KEY, JSON.stringify(this.draftDiagnosticos));
  }

  obtenerPaciente(): PacienteRegistroDTOExt | null {
    if (!this.paciente) {
      const data = localStorage.getItem(this.KEY_PACIENTE);
      if (data) this.paciente = JSON.parse(data);
    }
    return this.paciente ? { ...this.paciente } : null;
  }

  /** Helpers para cancelar correctamente */
  tienePacienteCreadoEnEsteFlujo(): boolean {
    const p = this.obtenerPaciente();
    return !!(p && p.createdInThisFlow && p.id);
  }

  obtenerIdPaciente(): number | null {
    const p = this.obtenerPaciente();
    return p?.id ?? null;
  }

  /* ================== ANTECEDENTE PATOLÓGICO ================== */
  setDraftAntecedentePatologico(a?: AntecedentePatologicoDTO | null) {
    if (!a) {
      this.draftAntPatologico = undefined;
      localStorage.removeItem(this.DRAFT_ANT_PAT_KEY);
      return;
    }
    a.pacienteId = this.paciente?.id ?? a.pacienteId ?? 0;
    this.draftAntPatologico = { ...a };
    localStorage.setItem(this.DRAFT_ANT_PAT_KEY, JSON.stringify(this.draftAntPatologico));
  }

  getDraftAntecedentePatologico(): AntecedentePatologicoDTO | undefined {
    if (!this.draftAntPatologico) {
      const raw = localStorage.getItem(this.DRAFT_ANT_PAT_KEY);
      if (raw) this.draftAntPatologico = JSON.parse(raw);
    }
    return this.draftAntPatologico ? { ...this.draftAntPatologico } : undefined;
  }

  guardarAntecedente(antecedente: AntecedentePatologicoDTO) {
    antecedente.pacienteId = this.paciente?.id ?? 0;
    this.antecedentes.push({ ...antecedente });
    localStorage.setItem(this.KEY_ANT_PAT, JSON.stringify(this.antecedentes));
    this.setDraftAntecedentePatologico(antecedente);
  }

  obtenerAntecedentes(): AntecedentePatologicoDTO[] {
    if (this.antecedentes.length === 0) {
      const data = localStorage.getItem(this.KEY_ANT_PAT);
      if (data) this.antecedentes = JSON.parse(data);
    }
    return this.antecedentes.map(a => ({ ...a }));
  }

  /* ================== ANTECEDENTE PERSONAL ================== */
  setDraftAntecedentePersonal(a?: AntecedentePersonalDTO | null) {
    if (!a) {
      this.draftAntPersonal = undefined;
      localStorage.removeItem(this.DRAFT_ANT_PER_KEY);
      return;
    }
    a.pacienteId = this.paciente?.id ?? a.pacienteId ?? 0;
    this.draftAntPersonal = { ...a };
    localStorage.setItem(this.DRAFT_ANT_PER_KEY, JSON.stringify(this.draftAntPersonal));
  }

  getDraftAntecedentePersonal(): AntecedentePersonalDTO | undefined {
    if (!this.draftAntPersonal) {
      const raw = localStorage.getItem(this.DRAFT_ANT_PER_KEY);
      if (raw) this.draftAntPersonal = JSON.parse(raw);
    }
    return this.draftAntPersonal ? { ...this.draftAntPersonal } : undefined;
  }

  guardarAntecedentePersonal(antecedente: AntecedentePersonalDTO) {
    if (this.paciente?.id) antecedente.pacienteId = this.paciente.id;
    this.antecedentePersonal.push({ ...antecedente });
    localStorage.setItem(this.KEY_ANT_PER, JSON.stringify(this.antecedentePersonal));
    this.setDraftAntecedentePersonal(antecedente);
  }

  obtenerAntecedentesPersonales(): AntecedentePersonalDTO[] {
    if (this.antecedentePersonal.length === 0) {
      const data = localStorage.getItem(this.KEY_ANT_PER);
      if (data) this.antecedentePersonal = JSON.parse(data);
    }
    return this.antecedentePersonal.map(a => ({ ...a }));
  }

  /* ================== EXAMEN FÍSICO ================== */
  setDraftExamenFisico(ex?: ExamenFisicoDTO | null) {
    if (!ex) {
      this.draftExamenFisico = undefined;
      localStorage.removeItem(this.DRAFT_EXA_FIS_KEY);
      return;
    }
    ex.pacienteId = this.paciente?.id ?? ex.pacienteId ?? 0;
    this.draftExamenFisico = { ...ex };
    localStorage.setItem(this.DRAFT_EXA_FIS_KEY, JSON.stringify(this.draftExamenFisico));
  }

  getDraftExamenFisico(): ExamenFisicoDTO | undefined {
    if (!this.draftExamenFisico) {
      const raw = localStorage.getItem(this.DRAFT_EXA_FIS_KEY);
      if (raw) this.draftExamenFisico = JSON.parse(raw);
    }
    return this.draftExamenFisico ? { ...this.draftExamenFisico } : undefined;
  }

  guardarExamenFisico(examen: ExamenFisicoDTO) {
    examen.pacienteId = this.paciente?.id ?? 0;
    this.examenesFisicos.push({ ...examen });
    localStorage.setItem(this.KEY_EXA_FIS, JSON.stringify(this.examenesFisicos));
    this.setDraftExamenFisico(examen);
  }

  obtenerExamenesFisicos(): ExamenFisicoDTO[] {
    if (this.examenesFisicos.length === 0) {
      const data = localStorage.getItem(this.KEY_EXA_FIS);
      if (data) this.examenesFisicos = JSON.parse(data);
    }
    return this.examenesFisicos.map(e => ({ ...e }));
  }

  /* ================== DIAGNÓSTICOS ================== */
  setDraftDiagnosticos(dxs?: DiagnosticoItem[] | null) {
    if (!dxs) {
      this.draftDiagnosticos = undefined;
      localStorage.removeItem(this.DRAFT_DIAG_KEY);
      return;
    }
    this.draftDiagnosticos = [...dxs];
    localStorage.setItem(this.DRAFT_DIAG_KEY, JSON.stringify(this.draftDiagnosticos));
  }

  getDraftDiagnosticos(): DiagnosticoItem[] {
    if (!this.draftDiagnosticos) {
      const raw = localStorage.getItem(this.DRAFT_DIAG_KEY);
      if (raw) this.draftDiagnosticos = JSON.parse(raw);
    }
    return this.draftDiagnosticos ? [...this.draftDiagnosticos] : [];
  }

  guardarDiagnosticoTemp(item: DiagnosticoItem) {
    this.diagnosticos.push({ ...item });
    localStorage.setItem(this.KEY_DIAG, JSON.stringify(this.diagnosticos));
    this.setDraftDiagnosticos(this.diagnosticos);
  }

  obtenerDiagnosticosTemp(): DiagnosticoItem[] {
    if (this.diagnosticos.length === 0) {
      const data = localStorage.getItem(this.KEY_DIAG);
      if (data) this.diagnosticos = JSON.parse(data);
    }
    return this.diagnosticos.map(d => ({ ...d }));
  }

  /* ================== RESET ================== */
  limpiarPaciente() {
    this.paciente = null;
    this.antecedentes = [];
    this.antecedentePersonal = [];
    this.examenesFisicos = [];
    this.diagnosticos = [];

    this.draftAntPatologico = undefined;
    this.draftAntPersonal = undefined;
    this.draftExamenFisico = undefined;
    this.draftDiagnosticos = undefined;

    localStorage.removeItem(this.KEY_PACIENTE);
    localStorage.removeItem(this.KEY_ANT_PAT);
    localStorage.removeItem(this.KEY_ANT_PER);
    localStorage.removeItem(this.KEY_EXA_FIS);
    localStorage.removeItem(this.KEY_DIAG);

    localStorage.removeItem(this.DRAFT_ANT_PAT_KEY);
    localStorage.removeItem(this.DRAFT_ANT_PER_KEY);
    localStorage.removeItem(this.DRAFT_EXA_FIS_KEY);
    localStorage.removeItem(this.DRAFT_DIAG_KEY);
  }

  // Alias cómodo (mantener compatibilidad con llamadas existentes)
  setPaciente(paciente: PacienteRegistroDTOExt) {
    this.guardarPaciente(paciente);
  }

  /** Limpia SOLO borradores, conservando el paciente y el historial cargado */
  resetDrafts() {
    this.draftAntPatologico = undefined;
    this.draftAntPersonal = undefined;
    this.draftExamenFisico = undefined;
    this.draftDiagnosticos = undefined;

    localStorage.removeItem(this.DRAFT_ANT_PAT_KEY);
    localStorage.removeItem(this.DRAFT_ANT_PER_KEY);
    localStorage.removeItem(this.DRAFT_EXA_FIS_KEY);
    localStorage.removeItem(this.DRAFT_DIAG_KEY);
  }
}
