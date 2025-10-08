import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

// ≈ Tu DTO interno para imprimir

export interface FormulaMedica {
  pacienteNombre: string;
  pacienteApellido: string;
  pacienteDocumento?: string;
  fecha: string;
  diagnosticos?: string[];

  medicamentos?: Array<{
    nombre: string;
    dosis: string;
    via: string;
    cantidad?: number;        // ← se mantiene por compatibilidad
    dosisCantidad?: string;   // ← se agrega para que el HTML funcione
  }>;

  planObservaciones: string;
  profesional?: {
    nombre: string;
    numeroRegistroMedico?: string;
    especialidad?: string;
    firmaBase64?: string;
  };
}


// ≈ DTO que devuelve tu back (FormulaImpresionDTO)
interface BackendFormulaDTO {
  pacienteNombre: string;
  pacienteApellido?: string;
  pacienteDocumento?: string;
  fecha?: string; // LocalDateTime -> llega como ISO
  diagnosticos?: string[];
  medicamentos?: Array<{
    nombre?: string;
    dosis?: string;
    frecuencia?: string;
    duracion?: string;
    via?: string;
    dosisCantidad?: string;
  }>;
  planObservaciones?: string;

  // 👇 Agrega esto
  profesional?: {
    nombre: string;
    // Acepta ambos nombres:
    registro?: string;                 // ← por si el back viejo devuelve 'registro'
    numeroRegistroMedico?: string;     // ← nombre nuevo
    especialidad?: string;
    firmaBase64?: string;
  };
  
}


@Injectable({ providedIn: 'root' })
export class PrintService {
  private _data: FormulaMedica | null = null;

  // si usas environments, reemplaza por environment.apiUrl
  private apiBase = 'http://localhost:8080';

  constructor(private router: Router, private http: HttpClient) {}

  /** Caso 1: ya tienes el objeto listo */
  printFormula(data: FormulaMedica) {
    this._data = data;
    this.router.navigate(['/print']);
  }

  /** Caso 2: consumo del endpoint y navego */
  async printFromEndpoint(
    pacienteId: number,
    fallback: { nombre?: string; apellido?: string; doc?: string } = {}
  ) {
    try {
      const url = `${this.apiBase}/historias/ultima-formula?pacienteId=${pacienteId}`;
      const receta = await firstValueFrom(this.http.get<BackendFormulaDTO>(url));
      console.log('🧾 ultima-formula:', receta);

      const data: FormulaMedica = this.mapBackendToFront(receta, fallback);
      return this.printFormula(data);
    } catch (err) {
      // Si el back responde 204 o falla, imprime algo mínimo para no bloquear el flujo
      const data: FormulaMedica = {
        pacienteNombre: fallback.nombre ?? '—',
        pacienteApellido: fallback.apellido ?? '—',
        pacienteDocumento: fallback.doc ?? '—',
        fecha: new Date().toISOString(),
        diagnosticos: [],
        medicamentos: [],
        planObservaciones: '—',
      };
      this.printFormula(data);
    }
  }

  /** Mapeo de DTO backend -> modelo de impresión del front */
  private mapBackendToFront(
    receta: BackendFormulaDTO | null | undefined,
    fallback: { nombre?: string; apellido?: string; doc?: string }
  ): FormulaMedica {
    return {
      pacienteNombre: receta?.pacienteNombre || fallback?.nombre || '—',
      pacienteApellido: receta?.pacienteApellido || fallback?.apellido || '—',
      pacienteDocumento: receta?.pacienteDocumento || fallback?.doc || '—',
      fecha: receta?.fecha || new Date().toISOString(),
      diagnosticos: (receta?.diagnosticos || []).filter(Boolean),
  
      medicamentos: (receta?.medicamentos || []).map(m => ({
        nombre: (m?.nombre || '').trim(),
        dosis: (m?.dosis || '').trim(),
        via: (m?.via || '—').trim(),
        dosisCantidad: (m as any)?.dosisCantidad?.toString()?.trim() || undefined, // 👈
      })),
  
      planObservaciones: receta?.planObservaciones || '—',
  
      // 👇 IMPORTANTE: aquí llenamos el médico
        profesional: receta?.profesional
        ? {
          nombre: receta.profesional.nombre ?? '—',
      // lee ambos nombres y mapea al nuevo campo del front:
        numeroRegistroMedico:
        receta.profesional.numeroRegistroMedico
        ?? receta.profesional.registro
        ?? undefined,
        especialidad: receta.profesional.especialidad ?? undefined,
        firmaBase64: receta.profesional.firmaBase64 ?? undefined,
          }
        : undefined,
    };
  }
  

  /** Consumir y limpiar para el componente de impresión */
  consume(): FormulaMedica | null {
    const d = this._data;
    this._data = null;
    return d;
  }
}
