export interface PacienteBasicosUpdateRequestDTO {
    fechaNacimiento: string;   // formato dd/mm/aaaa
    edad?: number;
    nombreCompleto: string;
    apellidoCompleto: string;
    genero: string;
    profesion?: string;
    numeroTelefono: string;
    direccion?: string;
    acompananteNombre?: string;
    correo?: string;
  }
