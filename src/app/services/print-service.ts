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
  medicamentos?: Array<{ nombre: string; dosis: string; via: string }>;
  planObservaciones: string;
  profesional?: { nombre: string; registro?: string; especialidad?: string };
}

// ≈ DTO que devuelve tu back (FormulaImpresionDTO)
interface BackendFormulaDTO {
  pacienteNombre: string;
  pacienteApellido?: string;   // 👈 añadido
  pacienteDocumento?: string;
  fecha?: string; // LocalDateTime -> llega como ISO
  diagnosticos?: string[];
  medicamentos?: Array<{
    nombre?: string;
    dosis?: string;
    frecuencia?: string;
    duracion?: string;
    via?: string;
  }>;
  planObservaciones?: string;
  // profesional?: { nombre?: string; registro?: string; especialidad?: string };
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
      pacienteNombre:
        receta?.pacienteNombre || fallback?.nombre || '—',
      pacienteApellido:
        receta?.pacienteApellido || fallback?.apellido || '—',
      pacienteDocumento: receta?.pacienteDocumento || fallback?.doc || '—',
      fecha: receta?.fecha || new Date().toISOString(),
      diagnosticos: (receta?.diagnosticos || []).filter(Boolean),

      medicamentos: (receta?.medicamentos || [])
        .map(m => ({
          nombre: m?.nombre?.trim() || '',
          dosis: m?.dosis?.trim() || '',
          via: m?.via?.trim() || '—',
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),

      planObservaciones: receta?.planObservaciones || '—',
      // profesional: ...
    };
  }

  /** Consumir y limpiar para el componente de impresión */
  consume(): FormulaMedica | null {
    const d = this._data;
    this._data = null;
    return d;
  }
}
