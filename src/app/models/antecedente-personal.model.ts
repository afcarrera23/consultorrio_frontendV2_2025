export interface AntecedentePersonalDTO {
  pacienteId?: number; // opcional si lo manejas desde el backend, pero recomendable
  antecedentesPersonales: string;
  antecedentesFamiliares: string;
  ginecoObstetricos: string;
  gestas: number;
  partos: number;
  abortos: number;
  cesareas: number;
  vivos: number;
  mortinatos: number;
  fechaConsulta: string; // formato ISO: "YYYY-MM-DDTHH:mm:ss"
  usuarioId: number;
}
