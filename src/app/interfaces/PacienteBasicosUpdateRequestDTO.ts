export interface PacienteBasicosUpdateRequestDTO {
    fechaNacimiento: string;   // formato dd/mm/aaaa
    identificacion?: string;
    tipoIdentificacion?: string;
    usuarioModificoId?: number;
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
