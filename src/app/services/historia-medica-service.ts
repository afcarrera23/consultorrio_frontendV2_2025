// src/app/services/historia-medica.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

export interface HistoriaMedicaRegistroDTO {
  pacienteId: number;
  usuarioId: number;
  motivoConsulta?: string;
  antecedentesPatologicos?: any[];
  antecedentesPersonales?: any[];
  examenFisico?: any;
  diagnosticos?: any[];
}

@Injectable({ providedIn: 'root' })
export class HistoriaMedicaService {
  /** URL base del backend, igual estilo que PacienteService */
  private readonly apiUrl = 'http://localhost:8080/historias';

  constructor(private http: HttpClient) {}

  /** POST /historias/completa  → { historiaId } */
  crearHistoriaCompleta(dto: HistoriaMedicaRegistroDTO) {
    return this.http.post<{ historiaId: number }>(`${this.apiUrl}/completa`, dto);
  }

  /** POST /historias/paciente/{pacienteId}?usuarioId=... → { historiaId } */
  abrirHistoria(pacienteId: number, usuarioId: number) {
    return this.http.post<{ historiaId: number }>(
      `${this.apiUrl}/paciente/${pacienteId}?usuarioId=${usuarioId}`, {}
    );
  }
}
