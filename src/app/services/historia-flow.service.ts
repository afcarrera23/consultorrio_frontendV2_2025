// src/app/core/services/historia-flow.service.ts
import { Injectable } from '@angular/core';
import { HistoriaFlowMode } from '../models/historia-flow.types';
import { PacienteRegistroDTO } from 'src/app/models/paciente.model';

type State = {
  mode: HistoriaFlowMode | null;
  usuarioId: number | null;
  pacienteId: number | null;
  paciente: PacienteRegistroDTO | null;
};

const KEY = 'historiaFlowState';

const DEFAULT_STATE: State = {
  mode: null,
  usuarioId: null,
  pacienteId: null,
  paciente: null,
};

@Injectable({ providedIn: 'root' })
export class HistoriaFlowService {
  private state: State = this.load();

  // ======== Persistencia ========
  private load(): State {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (!raw) return { ...DEFAULT_STATE };
      const parsed = JSON.parse(raw) as Partial<State>;
      return {
        ...DEFAULT_STATE,
        ...parsed,
        mode:
          parsed.mode === 'NEW_PATIENT' || parsed.mode === 'EXISTING_PATIENT'
            ? parsed.mode
            : null,
        usuarioId: parsed.usuarioId != null ? Number(parsed.usuarioId) : null,
        pacienteId: parsed.pacienteId != null ? Number(parsed.pacienteId) : null,
        paciente: parsed.paciente ?? null,
      };
    } catch {
      return { ...DEFAULT_STATE };
    }
  }

  private save(): void {
    sessionStorage.setItem(KEY, JSON.stringify(this.state));
  }

  // ======== Inicialización explícita ========
  initNew(usuarioId: number): void {
    this.state = { ...DEFAULT_STATE, mode: 'NEW_PATIENT', usuarioId };
    this.save();
  }

  initExisting(pacienteId: number, usuarioId: number, paciente?: PacienteRegistroDTO): void {
    this.state = {
      ...DEFAULT_STATE,
      mode: 'EXISTING_PATIENT',
      usuarioId,
      pacienteId,
      paciente: paciente ?? null,
    };
    this.save();
  }

  clear(): void {
    this.state = { ...DEFAULT_STATE };
    this.save();
  }

  // ======== Setters utilitarios (opcionales) ========
  setMode(mode: HistoriaFlowMode): void {
    this.state.mode = mode;
    this.save();
  }

  setUsuario(usuarioId: number | null): void {
    this.state.usuarioId = usuarioId ?? null;
    this.save();
  }

  setPaciente(paciente: PacienteRegistroDTO | null): void {
    this.state.paciente = paciente ?? null;
    this.state.pacienteId = paciente?.id ?? null;
    this.save();
  }

  /** Si el modo es null, lo fija en función de si el paciente fue creado en este flujo */
  ensureModeByFlag(createdInThisFlow: boolean): HistoriaFlowMode {
    if (this.state.mode === 'NEW_PATIENT' || this.state.mode === 'EXISTING_PATIENT') {
      return this.state.mode;
    }
    const inferred: HistoriaFlowMode = createdInThisFlow ? 'NEW_PATIENT' : 'EXISTING_PATIENT';
    this.state.mode = inferred;
    this.save();
    return inferred;
  }

  // ======== Getter defensivo ========
  get effectiveMode(): HistoriaFlowMode {
    if (this.state.mode === 'NEW_PATIENT' || this.state.mode === 'EXISTING_PATIENT') {
      return this.state.mode;
    }
    return this.state.pacienteId != null && this.state.pacienteId > 0
      ? 'EXISTING_PATIENT'
      : 'NEW_PATIENT';
  }

  // ======== Getters actuales ========
  get snapshot(): State { return this.state; }
  get mode(): HistoriaFlowMode | null { return this.state.mode; }
  get pacienteId(): number | null { return this.state.pacienteId; }
  get usuarioId(): number | null { return this.state.usuarioId; }
}
