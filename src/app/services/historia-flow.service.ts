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

  private load(): State {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (!raw) return { ...DEFAULT_STATE };
      const parsed = JSON.parse(raw) as Partial<State>;
      // Mezcla con defaults para garantizar todas las props requeridas
      return {
        ...DEFAULT_STATE,
        ...parsed,
        // Garantiza que 'mode' sea válido si viene basura del storage
        mode: parsed.mode === 'NEW_PATIENT' || parsed.mode === 'EXISTING_PATIENT' ? parsed.mode : null,
        // Normaliza tipos (por si vinieron strings)
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

  initNew(usuarioId: number): void {
    this.state = { ...DEFAULT_STATE, mode: 'NEW_PATIENT', usuarioId };
    this.save();
  }

  initExisting(pacienteId: number, usuarioId: number, paciente?: PacienteRegistroDTO): void {
    this.state = { ...DEFAULT_STATE, mode: 'EXISTING_PATIENT', usuarioId, pacienteId, paciente: paciente ?? null };
    this.save();
  }

  clear(): void {
    this.state = { ...DEFAULT_STATE };
    this.save();
  }

  get snapshot(): State { return this.state; }
  get mode(): HistoriaFlowMode | null { return this.state.mode; }
  get pacienteId(): number | null { return this.state.pacienteId; }
  get usuarioId(): number | null { return this.state.usuarioId; }
}
