// src/app/models/examen-fisico.model.ts

export interface ExamenFisicoDTO {
  id?: number;              // ID autogenerado (opcional)
  pacienteId?: number;       // Relación con paciente

  // Signos vitales
  tensionSistolica: string;
  tensionDiastolica: string;
  frecuenciaRespiratoria: string;
  temperatura: string;
  saturacion: string;
  frecuenciaCardiaca: string;

  // Datos antropométricos
  peso: number;
  talla: number;
  imc: number;
  perimetroCefalico: number;

  // Exploración física por sistemas
  aspectoGeneral: string;
  craneoDetalle: string;
  ojosDetalle: string;
  oidoDetalle: string;
  cuelloDetalle: string;
  cardioPulmonarDetalle: string;
  senosDetalle: string;
  abdomenDetalle: string;
  genitalesDetalle: string;
  examenRectalDetalle: string;
  neurologicoDetalle: string;
  extremidadesOsteoarticularDetalle: string;
  otrosHallazgos: string;

  // Auditoría
  fechaExamen?: string;     // Manejar como string (ISO-8601) en Angular
  usuarioId: number;        // ID del usuario que lo registró
}
