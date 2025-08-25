import { AntecedentePatologicoDTO } from './antecedente-patologico.model';
import { AntecedentePersonalDTO } from './antecedente-personal.model';

export interface AntecedenteRegistroDTO {
  pacienteId?: number;
  usuarioId?: number;   // lo marcamos opcional
  nombreCompleto?: string;
  apellidoCompleto?: string;
  identificacion?: string;
  tipoIdentificacion?: string;
  edad?: number;
  usuarioRegistroId?: number;
  antecedentePatologico?: AntecedentePatologicoDTO;
  antecedentePersonal?: AntecedentePersonalDTO; // opcional
}

