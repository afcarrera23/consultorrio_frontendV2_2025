import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { PacienteRegistroDTO } from '../models/paciente.model';
import { AntecedentePatologicoDTO } from '../models/antecedente-patologico.model';
import { AntecedenteRegistroDTO } from '../models/antecedente-registro.model';
import { AntecedentePersonalDTO } from '../models/antecedente-personal.model';
import { ExamenFisicoDTO } from '../models/examen-fisico.model';
import { Diagnostico } from '../models/diagnostico.model';

@Injectable({ providedIn: 'root' })
export class PacienteService {

  private apiUrl = 'http://localhost:8080/pacientes'; // URL base
  private readonly FULL_CREATE_PATH  = `${this.apiUrl}/registrar-con-antecedentes`;

  constructor(private http: HttpClient) {}

  /** ===================== CREACIÓN ===================== */

  /**
   * Crear paciente inicial (devuelve id real).
   * ⚠️ Si tu backend solo expone `registrar-con-antecedentes`, usamos ese.
   */
  registrar(paciente: PacienteRegistroDTO): Observable<PacienteRegistroDTO> {
    // se pueden mandar arrays vacíos en los campos no capturados aún
    const payload: PacienteRegistroDTO = {
      ...paciente,
      antecedentesPatologicos: paciente.antecedentesPatologicos ?? [],
      antecedentePersonal: paciente.antecedentePersonal ?? []
    };
    return this.http.post<PacienteRegistroDTO>(this.FULL_CREATE_PATH, payload);
  }

  /**
   * Registrar TODO (paciente + antecedentes + examen + diagnóstico)
   * Úsalo en el ÚLTIMO paso.
   */
  registrarConTodo(paciente: PacienteRegistroDTO) {
    return this.http.post<PacienteRegistroDTO>(this.FULL_CREATE_PATH, paciente);
  }

  /** ================== ANTECEDENTES PATOLÓGICOS ================== */

  agregarAntecedenteAPaciente(dto: AntecedenteRegistroDTO): Observable<any> {
    return this.http.post(`${this.apiUrl}/agregar-antecedente`, dto);
  }

  agregarAntecedentePatologico(antecedente: AntecedentePatologicoDTO) {
    return this.http.post(`${this.apiUrl}/agregar-antecedente`, {
      antecedentePatologico: antecedente,
      pacienteId: antecedente.pacienteId,
      usuarioRegistroId: antecedente.usuarioId
    });
  }

  /** ================== ANTECEDENTE PERSONAL ================== */

  agregarAntecedentePersonal(dto: AntecedentePersonalDTO): Observable<AntecedentePersonalDTO> {
    return this.http.post<AntecedentePersonalDTO>(
      `${this.apiUrl}/agregar-antecedente-personal`,
      dto
    );
  }

  /** ================== EXAMEN FÍSICO ================== */

  registrarExamenFisico(examen: ExamenFisicoDTO): Observable<ExamenFisicoDTO> {
    return this.http.post<ExamenFisicoDTO>(
      `${this.apiUrl}/agregar-examen-fisico`,
      examen
    );
  }

  obtenerExamenesFisicos(pacienteId: number): Observable<ExamenFisicoDTO[]> {
    return this.http.get<ExamenFisicoDTO[]>(
      `${this.apiUrl}/${pacienteId}/examenes-fisicos`
    );
  }

  actualizarExamenFisico(examen: ExamenFisicoDTO): Observable<ExamenFisicoDTO> {
    return this.http.put<ExamenFisicoDTO>(
      `${this.apiUrl}/examen-fisico/${examen.id}`,
      examen
    );
  }

  eliminarExamenFisico(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/examen-fisico/${id}`);
  }

  /** ================== DIAGNÓSTICO ================== */

  guardarDiagnostico(pacienteId: number, diagnostico: Diagnostico) {
    return this.http.post(`${this.apiUrl}/agregar-diagnostico`, {
      ...diagnostico,
      pacienteId
    });
  }
}
