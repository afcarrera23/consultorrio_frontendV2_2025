export interface AntecedentePatologicoDTO {
  pacienteId?: number;
  motivoConsulta: string;
  enfermedadActual: string;
  medicamentoActual: string;

  covid: boolean;
  cefalea: boolean;
  tos: boolean;
  rinorrea: boolean;
  mialgia: boolean;
  dolorToraxico: boolean;
  nausea: boolean;
  vomito: boolean;
  fiebre: boolean;
  odinofagia: boolean;
  disnea: boolean;
  anosmia: boolean;
  conjuntivitis: boolean;
  diarrea: boolean;
  disgeusia: boolean;
  sintomaticoRespiratorio: boolean;
  sintomaticoPiel: boolean;
  victimaViolencia: boolean;

  // Para <input type="datetime-local"> en Angular, usa string (ej: "2025-08-14T15:30")
  fechaConsulta: string;

  usuarioId: number;
  revisionSintoma: string;
}
