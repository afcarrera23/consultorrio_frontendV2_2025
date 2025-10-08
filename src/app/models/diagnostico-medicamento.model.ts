export interface DiagnosticoMedicamento {
  id?: number;

  // ⬇️ NUEVO: si selecciona del catálogo
  medicamentoId?: number | null;
  medicamentoNombre?: string | null;

  // ⬇️ Manual (si NO selecciona del catálogo)
  nombreMedicamentoManual: string;

  dosificacion: string;
  dosisCantidad: string;
  dosisDescripcion: string;
  frecuenciaHoras: string;
  frecuenciaTiempo: string;
  via: string;
  diasTratamiento: string;
}
