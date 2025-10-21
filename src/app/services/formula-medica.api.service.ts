// services/formula-medica.api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';

import { FormulaMedicaDTO } from '../interfaces/formula-medica.dto';
import { Medicamento } from '../models/medicamento';
import { UsuarioMedico } from '../models/usuario-medico.model';

const API_URL = 'http://localhost:8080'; // raíz del backend

// ---- Util para desempaquetar respuestas paginadas de Spring ----
type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // página actual
  size: number;   // tamaño de página
};

// ---- Tipos para crear múltiples fórmulas (unión: con id o con nombre) ----
type ItemBase = { cantidad: number; via: string; posologia: string };
export type ItemConId   = ItemBase & { medicamentoId: number };
export type ItemLibre   = ItemBase & { medicamentoNombre: string };
export type ItemFormula = ItemConId | ItemLibre;

@Injectable({ providedIn: 'root' })
export class FormulaMedicaApiService {
  constructor(private http: HttpClient) {}

  // ==================== FÓRMULAS ====================

  crearFormula(dto: FormulaMedicaDTO): Observable<FormulaMedicaDTO> {
    return this.http.post<FormulaMedicaDTO>(`${API_URL}/formula-medica`, dto);
  }

  actualizarFormula(id: number, dto: FormulaMedicaDTO): Observable<FormulaMedicaDTO> {
    return this.http.put<FormulaMedicaDTO>(`${API_URL}/formula-medica/${id}`, dto);
  }

  obtenerFormula(id: number): Observable<FormulaMedicaDTO> {
    return this.http.get<FormulaMedicaDTO>(`${API_URL}/formula-medica/${id}`);
  }

  listarFormulas(): Observable<FormulaMedicaDTO[]> {
    // El backend ya devuelve agrupadas
    return this.http.get<FormulaMedicaDTO[]>(`${API_URL}/formula-medica`);
  }

  listarFormulasPorIdentificacion(numero: string): Observable<FormulaMedicaDTO[]> {
    // El backend ya devuelve agrupadas por identificación
    return this.http.get<FormulaMedicaDTO[]>(
      `${API_URL}/formula-medica/por-identificacion/${encodeURIComponent(numero)}`
    );
  }

  /**
   * ❌ Elimina SOLO una fila por id (no recomendado si tu UI lista agrupado).
   * Se mantiene por compatibilidad.
   */
  eliminarFormula(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/formula-medica/${id}`);
  }

  /**
   * ✅ Elimina TODA la fórmula (grupo completo) usando el id representativo
   * que ves en la tabla agrupada.
   * Backend: DELETE /formula-medica/grupo/{id}
   */
  eliminarFormulaGrupo(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/formula-medica/grupo/${id}`);
  }

  /**
   * Crea varias fórmulas (una por ítem de 'meds').
   * Cada ítem puede ser:
   *  - { medicamentoId, cantidad, via, posologia }  (ItemConId)
   *  - { medicamentoNombre, cantidad, via, posologia } (ItemLibre)
   *
   * El backend resuelve/crea el medicamento cuando llega solo 'medicamentoNombre'.
   */
  crearFormulasMultiples(
    base: Omit<FormulaMedicaDTO, 'id' | 'medicamentoId' | 'cantidad' | 'via' | 'posologia' | 'medicamentoNombre'>,
    meds: ItemFormula[]
  ): Observable<FormulaMedicaDTO[]> {
    // Para cada item, combinamos con los campos base del paciente/usuario/fecha/planTratamiento
    const reqs = meds.map(m => this.crearFormula({ ...base, ...m } as FormulaMedicaDTO));
    return forkJoin(reqs);
  }

  // ==================== MEDICAMENTOS ====================

  /**
   * Lista de medicamentos paginada (admin) y devuelve solo 'content'.
   * @param q filtro por nombre (contiene)
   * @param page número de página (0-based)
   * @param size tamaño de página
   */
  // services/formula-medica.api.service.ts
  listarMedicamentos(q = '', page = 0, size = 1000, bust = false): Observable<Medicamento[]> {
    let params = new HttpParams()
      .set('q', q)
      .set('page', page)
      .set('size', size);
  
    // 👇 fuerza URL única para evitar caché del browser/CDN
    if (bust) params = params.set('_ts', Date.now().toString());
  
    return this.http
      .get<PageResponse<Medicamento>>(
        `${API_URL}/api/admin/medicamentos`,
        { params, headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } }
      )
      .pipe(map(resp => resp.content ?? []));
  }
  


  // ==================== MÉDICOS ====================

  obtenerMedico(id: number): Observable<UsuarioMedico> {
    return this.http.get<UsuarioMedico>(`${API_URL}/usuarios/${id}`);
  }

  listarMedicos(): Observable<UsuarioMedico[]> {
    return this.http.get<UsuarioMedico[]>(`${API_URL}/usuarios/medicos`);
  }

  // ==================== (Opcional) Util front para deduplicar si fuera necesario ====================
  /**
   * Si por alguna razón recibes filas no agrupadas, puedes deduplicar en el front
   * por (identificación|fecha|plan|usuarioId).
   */
  dedupe(list: FormulaMedicaDTO[]): FormulaMedicaDTO[] {
    const seen = new Set<string>();
    const out: FormulaMedicaDTO[] = [];
    for (const f of list ?? []) {
      const key = [
        (f.numeroIdentificacion ?? '').trim(),
        (f.fecha ?? '').toString(),
        (f.planTratamiento ?? '').trim().toLowerCase(),
        (f as any).usuarioId ?? '' // según tu DTO
      ].join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(f);
    }
    return out;
  }
}