import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';
import { HistoriaDetalleDTO, HistoriaResumenDTO } from '../models/historia-medica-lectura.model';

@Injectable({ providedIn: 'root' })
export class HistoriaLecturaApiService {
  private base = 'http://localhost:8080/historias';

  constructor(private http: HttpClient) {}

  listarHistoriasResumen(pacienteId: number): Observable<HistoriaResumenDTO[]> {
    return this.http.get<HistoriaResumenDTO[]>(`${this.base}/pacientes/${pacienteId}/historias`);
  }

  listarHistoriasDetalladas(pacienteId: number): Observable<HistoriaDetalleDTO[]> {
    return this.http.get<HistoriaDetalleDTO[]>(`${this.base}/pacientes/${pacienteId}/historias/detalle`);
  }

  obtenerDetalle(historiaId: number): Observable<HistoriaDetalleDTO> {
    return this.http.get<HistoriaDetalleDTO>(`${this.base}/${historiaId}`);
  }
}
