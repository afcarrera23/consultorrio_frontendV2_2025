// interfaces/formula-medica.dto.ts
export interface MedicamentoRecetaDTO {
  medicamentoId?: number | null;
  medicamentoNombre?: string | null;
  cantidad?: number | null;
  via?: string | null;
  posologia?: string | null;
}

export interface FormulaMedicaDTO {
  id?: number;
  nombrePaciente?: string;
  apellidoPaciente?: string;
  numeroIdentificacion?: string;
  fecha?: string; // o Date
  planTratamiento?: string;

  // campos "simples" que aún podrían venir en respuestas antiguas:
  medicamentoId?: number | null;
  medicamentoNombre?: string | null;
  cantidad?: number | null;
  via?: string | null;
  posologia?: string | null;

  usuarioId?: number;
  nombreMedico?: string;
  apellidoMedico?: string;
  registroMedico?: string;
  descripcionMedicaUno?: string;
  descripcionMedicaDos?: string;
  firma?: string | null;

  // 🔹 NUEVO: lista de medicamentos agrupados
  medicamentos?: MedicamentoRecetaDTO[];
}
