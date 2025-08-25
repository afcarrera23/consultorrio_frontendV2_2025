import { AntecedentePatologicoDTO } from "./antecedente-patologico.model";
import { AntecedentePersonalDTO } from "./antecedente-personal.model";
import { ExamenFisicoDTO } from "./examen-fisico.model";

export interface PacienteListadoDTO {
    id: number;
    identificacion: string;
    nombreCompleto: string;
    apellidoCompleto: string;
    nombreMedicoCreador?: string; 
  }
  
  export interface PacienteRegistroDTO {
    id?: number;
    identificacion: string;
    tipoIdentificacion: string;
    edad: number;
    nombreCompleto: string;
    apellidoCompleto: string;
    genero: string;
    profesion?: string;
    numeroTelefono: string;
    direccion?: string;
    nombreAcompanante?: string;
    correo?: string;
    usuarioRegistroId: number;
    antecedentesPatologicos: AntecedentePatologicoDTO[];
    antecedentePersonal: AntecedentePersonalDTO[];
    examenFisico?: ExamenFisicoDTO;
  }