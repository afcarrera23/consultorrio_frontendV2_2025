// src/app/models/historia-medica-lectura.model.ts

import { AntecedentePatologicoDTO } from './antecedente-patologico.model';
import { AntecedentePersonalDTO }   from './antecedente-personal.model';
import { ExamenFisicoDTO }          from './examen-fisico.model';
import { DiagnosticoMedicamento }   from './diagnostico-medicamento.model';

/**
 * Item para la lista/accordion.
 * Empata con GET /historias/pacientes/:pacienteId/historias
 */
export interface HistoriaResumenDTO {
  id: number;
  /** ISO-8601: "YYYY-MM-DDTHH:mm:ss" */
  fecha: string;
  /** Opcional: nombre del usuario que creó la historia (si lo mapeas en backend) */
  usuarioNombre?: string | null;
  /** Opcional: motivo (si lo mapeas en backend) */
  motivoConsulta?: string | null;
}

/**
 * Diagnóstico “de lectura” (detalle). Incluye opcionalmente los textos
 * del catálogo para mostrar directamente en UI.
 */
export interface DiagnosticoDetalleDTO {
  id?: number;
  codigoDiagnosticoId: number;

  /** Opcional: si el backend ya resuelve el catálogo, puedes mostrar esto directo */
  codigo?: string;
  descripcion?: string;

  tipoDiagnostico: number;
  plan: string;
  fechaRegistro: string; // ISO-8601
  usuarioId: number;
  medicamentos: DiagnosticoMedicamento[];
  /** Si guardas una nota/impresión diagnóstica adicional */
  descripcionLibre?: string;
}

/**
 * Detalle completo para una fila expandida del acordeón.
 * Empata con:
 *  - GET /historias/:historiaId     (si usas endpoint por id)
 *  - o con cada item de GET /historias/pacientes/:pacienteId/historias/detalle
 */
export interface HistoriaDetalleDTO {
  id: number;
  fecha: string;        // ISO-8601
  pacienteId: number;
  usuarioId: number;
  usuarioNombre?: string | null;
  motivoConsulta?: string | null;

  antecedentesPatologicos: AntecedentePatologicoDTO[];
  antecedentesPersonales:  AntecedentePersonalDTO[];
  examenFisico?: ExamenFisicoDTO | null;
  diagnosticos: DiagnosticoDetalleDTO[];
}
