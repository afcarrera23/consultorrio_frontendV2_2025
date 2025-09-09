import { DiagnosticoMedicamento } from "./diagnostico-medicamento.model";

export interface Diagnostico {
    id?: number;
    pacienteId: number;
    codigoDiagnosticoId: number; // nuevo, en vez de codigo/descripcion
    tipoDiagnostico: number;
    plan: string;
    fechaRegistro: string;
    usuarioId: number;
    medicamentos: DiagnosticoMedicamento[];
    descripcion: string;
  }
  

  export interface DiagnosticoItem {
    codigoDiagnosticoId: number;
    plan: string;
    tipoDiagnostico: number;
    fechaRegistro: string;   // ISO
    usuarioId: number;
    medicamentos: DiagnosticoMedicamento[];
  }