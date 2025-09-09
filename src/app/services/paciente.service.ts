import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PacienteRegistroDTO } from '../models/paciente.model';
import { AntecedentePatologicoDTO } from '../models/antecedente-patologico.model';
import { AntecedenteRegistroDTO } from '../models/antecedente-registro.model';
import { AntecedentePersonalDTO } from '../models/antecedente-personal.model';
import { ExamenFisicoDTO } from '../models/examen-fisico.model';
import { Diagnostico } from '../models/diagnostico.model';

@Injectable({
  providedIn: 'root'
})
export class PacienteService {

  private apiUrl = 'http://localhost:8080/pacientes'; // URL base

  constructor(private http: HttpClient) {}

  // Registrar paciente con antecedentes (caso creación completa)
  registrarConAntecedentes(paciente: PacienteRegistroDTO): Observable<any> {
    return this.http.post(`${this.apiUrl}/registrar-con-antecedentes`, paciente);
  }

  // Agregar antecedente patológico a un paciente ya existente
  agregarAntecedenteAPaciente(dto: AntecedenteRegistroDTO): Observable<any> {
    return this.http.post(`${this.apiUrl}/agregar-antecedente`, dto);
  }
  
  registrar(paciente: PacienteRegistroDTO): Observable<PacienteRegistroDTO> {
    return this.http.post<PacienteRegistroDTO>(`${this.apiUrl}/registrar-con-antecedentes`, paciente);
  }
  
  // paciente.service.ts
agregarAntecedentePatologico(antecedente: AntecedentePatologicoDTO) {
  return this.http.post(`${this.apiUrl}/agregar-antecedente`, { antecedentePatologico: antecedente, pacienteId: antecedente.pacienteId, usuarioRegistroId: antecedente.usuarioId });
}

agregarAntecedentePersonal(dto: AntecedentePersonalDTO): Observable<AntecedentePersonalDTO> {
  return this.http.post<AntecedentePersonalDTO>(
    `${this.apiUrl}/agregar-antecedente-personal`, dto
  );
}


// -------------------------------
  // 💉 Métodos Examen Físico
  // -------------------------------

  registrarExamenFisico(examen: ExamenFisicoDTO): Observable<ExamenFisicoDTO> {
    return this.http.post<ExamenFisicoDTO>(
      `${this.apiUrl}/agregar-examen-fisico`, examen
    );
  }

  obtenerExamenesFisicos(pacienteId: number): Observable<ExamenFisicoDTO[]> {
    return this.http.get<ExamenFisicoDTO[]>(
      `${this.apiUrl}/${pacienteId}/examenes-fisicos`
    );
  }

  actualizarExamenFisico(examen: ExamenFisicoDTO): Observable<ExamenFisicoDTO> {
    return this.http.put<ExamenFisicoDTO>(
      `${this.apiUrl}/examen-fisico/${examen.id}`, examen
    );
  }

  eliminarExamenFisico(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/examen-fisico/${id}`
    );
  }

  guardarDiagnostico(pacienteId: number, diagnostico: Diagnostico) {
    // Opción A (usar tu endpoint actual del backend):
    return this.http.post(`${this.apiUrl}/agregar-diagnostico`, {
      ...diagnostico,
      pacienteId // lo aseguras aquí
    });
  }
  
  
  registrarConTodo(paciente: PacienteRegistroDTO) {
    return this.http.post<PacienteRegistroDTO>(
      `${this.apiUrl}/registrar-con-antecedentes`,
      paciente
    );
  }
  

}
