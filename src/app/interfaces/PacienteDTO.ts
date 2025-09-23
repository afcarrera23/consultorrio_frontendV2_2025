export interface PacienteDTO {
    id: number|string;
    nombreCompleto?: string;
    apellidoCompleto?: string;
    identificacion?: string;
    fechaNacimiento?: string|Date;
    sexo?: string;
  }