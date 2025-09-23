export interface PacienteDTO {
    id: number|string;
    nombreCompleto?: string;
    identificacion?: string;
    fechaNacimiento?: string|Date;
    sexo?: string;
  }