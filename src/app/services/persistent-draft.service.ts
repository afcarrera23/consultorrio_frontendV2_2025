import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

type DraftKey =
  | 'paciente'
  | 'antecedentePatologico'
  | 'antecedentePersonal'
  | 'examenFisico'
  | 'diagnostico';

interface DraftEnvelope<T = any> {
  v: number;           // versión de schema
  t: number;           // timestamp (ms)
  data: T;
}

@Injectable({ providedIn: 'root' })
export class PersistentDraftService {
  private readonly VERSION = 1;
  private readonly PREFIX  = 'draft_';
  private readonly TTL_MS  = 7 * 24 * 60 * 60 * 1000; // 7 días

  private subjects = new Map<DraftKey, BehaviorSubject<any>>();
  private queue$ = new Subject<{ key: DraftKey; value: any }>();

  constructor() {
    // autosave con debounce (reduce writes)
    this.queue$.pipe(debounceTime(300)).subscribe(({ key, value }) => {
      this.saveNow(key, value);
    });

    // restaurar desde storage al arrancar
    (['paciente','antecedentePatologico','antecedentePersonal','examenFisico','diagnostico'] as DraftKey[])
      .forEach((k) => this.ensureSubject(k));
  }

  /** Leer valor actual (sincrónico) */
  get<T>(key: DraftKey): T | null {
    const subj = this.ensureSubject(key);
    if (subj.value !== undefined) return subj.value;
    // fallback: leer del storage
    const val = this.readFromStorage<T>(key);
    subj.next(val);
    return val;
  }

  /** Observable para reaccionar a cambios (opcional) */
  watch<T>(key: DraftKey) {
    return this.ensureSubject(key).asObservable();
  }

  /** Actualiza en memoria y agenda guardado persistente */
  update<T>(key: DraftKey, value: T) {
    this.ensureSubject(key).next(value);
    this.queue$.next({ key, value });
  }

  /** Limpia una sección (y storage) */
  clear(key: DraftKey) {
    this.ensureSubject(key).next(null);
    localStorage.removeItem(this.keyName(key));
  }

  /** Limpia todo el borrador (todas las secciones) */
  clearAll() {
    (['paciente','antecedentePatologico','antecedentePersonal','examenFisico','diagnostico'] as DraftKey[])
      .forEach(k => this.clear(k));
  }

  // -------- internals --------
  private ensureSubject(key: DraftKey): BehaviorSubject<any> {
    if (!this.subjects.has(key)) {
      const initial = this.readFromStorage(key);
      this.subjects.set(key, new BehaviorSubject<any>(initial));
    }
    return this.subjects.get(key)!;
  }

  private keyName(key: DraftKey) {
    return `${this.PREFIX}${key}`;
  }

  private readFromStorage<T>(key: DraftKey): T | null {
    const raw = localStorage.getItem(this.keyName(key));
    if (!raw) return null;
    try {
      const env = JSON.parse(raw) as DraftEnvelope<T>;
      // controlar vencimiento y versión
      if (env.v !== this.VERSION) return null;
      if (Date.now() - env.t > this.TTL_MS) return null;
      return env.data ?? null;
    } catch {
      return null;
    }
  }

  private saveNow<T>(key: DraftKey, value: T) {
    const env: DraftEnvelope<T> = {
      v: this.VERSION,
      t: Date.now(),
      data: value
    };
    localStorage.setItem(this.keyName(key), JSON.stringify(env));
  }
}
