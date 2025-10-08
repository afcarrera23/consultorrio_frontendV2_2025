import { DiagnosticoMedicamento } from "./diagnostico-medicamento.model";

export interface Diagnostico {
  id?: number;
  pacienteId: number;
  codigoDiagnosticoId: number;
  tipoDiagnostico: number;
  plan: string;
  // 🔄 Migramos a fechaDiagnostico
  fechaDiagnostico: string;
  // (compat opcional, si algún endpoint legado lo usa)
  fechaRegistro?: string;
  usuarioId: number;
  medicamentos: DiagnosticoMedicamento[];
  descripcion?: string;
}

export interface DiagnosticoItem {
  codigoDiagnosticoId: number;
  plan: string;
  tipoDiagnostico: number;
  // 🔄 Migramos a fechaDiagnostico
  fechaDiagnostico: string;   // ISO
  // (compat opcional)
  fechaRegistro?: string;     // ISO
  usuarioId: number;
  medicamentos: DiagnosticoMedicamento[];
}
