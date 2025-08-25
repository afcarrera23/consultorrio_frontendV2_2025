import { Injectable } from '@angular/core';
import { PacienteRegistroDTO } from '../models/paciente.model';
import { AntecedentePatologicoDTO } from '../models/antecedente-patologico.model';
import { AntecedentePersonalDTO } from '../models/antecedente-personal.model';
import { ExamenFisicoDTO } from '../models/examen-fisico.model';

@Injectable({
  providedIn: 'root'
})
export class RegistroTempService {
  paciente: PacienteRegistroDTO | null = null;
  antecedentes: AntecedentePatologicoDTO[] = [];
  antecedentePersonal: AntecedentePersonalDTO[] = [];
  examenesFisicos: ExamenFisicoDTO[] = [];

  // Guardar paciente (temporal o con ID real)
  guardarPaciente(paciente: PacienteRegistroDTO) {
    this.paciente = paciente;
  
    // Asignar pacienteId a todos los antecedentes existentes
    if (this.antecedentes.length > 0) {
      const pacienteIdSeguro = paciente.id ?? 0; // si no tiene id, usar 0 temporal
      this.antecedentes = this.antecedentes.map(a => ({
        ...a,
        pacienteId: pacienteIdSeguro
      }));
    }
  
    localStorage.setItem('tempPaciente', JSON.stringify(paciente));
  }
  

  // Obtener paciente temporal
  obtenerPaciente(): PacienteRegistroDTO | null {
    if (!this.paciente) {
      const data = localStorage.getItem('tempPaciente');
      if (data) this.paciente = JSON.parse(data);
    }
    return this.paciente;
  }

  // Guardar antecedente patológico y asignar pacienteId real si existe
  guardarAntecedente(antecedente: AntecedentePatologicoDTO) {
    // Asignar pacienteId seguro
    antecedente.pacienteId = this.paciente?.id ?? 0; // nunca será undefined, siempre number
  
    this.antecedentes.push(antecedente);
    localStorage.setItem('tempAntecedentes', JSON.stringify(this.antecedentes));
  }

  obtenerAntecedentes(): AntecedentePatologicoDTO[] {
    if (this.antecedentes.length === 0) {
      const data = localStorage.getItem('tempAntecedentes');
      if (data) this.antecedentes = JSON.parse(data);
    }
    return this.antecedentes;
  }

  guardarAntecedentePersonal(antecedente: AntecedentePersonalDTO) {
    if (this.paciente && this.paciente.id) {
      antecedente.pacienteId = this.paciente.id;
    }
    this.antecedentePersonal.push(antecedente);
    localStorage.setItem('tempAntecedentesPersonales', JSON.stringify(this.antecedentePersonal));
  }

  obtenerAntecedentesPersonales(): AntecedentePersonalDTO[] {
    if (this.antecedentePersonal.length === 0) {
      const data = localStorage.getItem('tempAntecedentesPersonales');
      if (data) this.antecedentePersonal = JSON.parse(data);
    }
    return this.antecedentePersonal;
  }

// -------------------------------
  // 💉 Examen Físico
  // -------------------------------
  guardarExamenFisico(examen: ExamenFisicoDTO) {
    examen.pacienteId = this.paciente?.id ?? 0;
    this.examenesFisicos.push(examen);
    localStorage.setItem('tempExamenesFisicos', JSON.stringify(this.examenesFisicos));
  }

  obtenerExamenesFisicos(): ExamenFisicoDTO[] {
    if (this.examenesFisicos.length === 0) {
      const data = localStorage.getItem('tempExamenesFisicos');
      if (data) this.examenesFisicos = JSON.parse(data);
    }
    return this.examenesFisicos;
  }

  // Limpiar datos temporales
  limpiarPaciente() {
    this.paciente = null;
    this.antecedentes = [];
    this.antecedentePersonal = [];
    localStorage.removeItem('tempPaciente');
    localStorage.removeItem('tempAntecedentes');
    localStorage.removeItem('tempAntecedentesPersonales');
    localStorage.removeItem('pacienteId');
  }
}
