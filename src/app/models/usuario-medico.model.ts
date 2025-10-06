// usuario-medico.model.ts
export interface UsuarioMedico {
    id: number;
    nombreMedico: string;
    apellidoMedico: string;
    registroMedico?: string | null;
    descripcionMedicaUno?: string | null;
    descripcionMedicaDos?: string | null;
    firmaBase64?: string | null;
  }
  