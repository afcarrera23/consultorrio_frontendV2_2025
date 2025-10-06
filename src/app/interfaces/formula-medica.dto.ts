export interface FormulaMedicaDTO {
    id?: number;
  
    // Paciente
    nombrePaciente: string;
    apellidoPaciente: string;
    numeroIdentificacion: string;
    fecha: string; // YYYY-MM-DD
  
    // Medicamento
    medicamentoId: number;
    medicamentoNombre?: string;
  
    cantidad: number;
    via: string;
    posologia: string;
    planTratamiento: string;
  
    // Médico (obligatorio para crear)
    usuarioId: number;
  
    // Datos del médico devueltos por el back
    nombreMedico?: string;
    apellidoMedico?: string;
    registroMedico?: string | null;
    descripcionMedicaUno?: string | null;
    descripcionMedicaDos?: string | null;
    firma?: string | null; // base64
  }
  