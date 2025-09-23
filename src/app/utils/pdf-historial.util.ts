// src/app/utils/pdf-historial.util.ts
import jsPDF from "jspdf";
import autoTable, { RowInput } from "jspdf-autotable";

type HistoriaDet = {
  fecha?: string | Date;
  usuarioNombre?: string;
  motivoConsulta?: string;

  antecedentesPatologicos?: Array<{
    motivoConsulta?: string;
    enfermedadActual?: string;
    medicamentoActual?: string;
  }>;

  antecedentesPersonales?: Array<{
    antecedentesPersonales?: string;
    antecedentesFamiliares?: string;
    ginecoObstetricos?: string;
    gestas?: number; partos?: number; abortos?: number; cesareas?: number;
    vivos?: number; mortinatos?: number;
    fechaConsulta?: string | Date;
    usuarioId?: string | number;
  }>;

  examenFisico?: {
    tensionSistolica?: string|number; tensionDiastolica?: string|number;
    frecuenciaRespiratoria?: string|number; frecuenciaCardiaca?: string|number;
    saturacion?: string|number; temperatura?: string|number;
    peso?: string|number; talla?: string|number; imc?: string|number;
    aspectoGeneral?: string; craneoDetalle?: string; ojosDetalle?: string; oidoDetalle?: string;
    cuelloDetalle?: string; cardioPulmonarDetalle?: string; senosDetalle?: string;
    abdomenDetalle?: string; genitalesDetalle?: string; examenRectalDetalle?: string;
    neurologicoDetalle?: string; extremidadesOsteoarticularDetalle?: string;
    otrosHallazgos?: string;
    fechaExamen?: string | Date;
    usuarioId?: string | number;
  };

  diagnosticos?: Array<{
    tipoDiagnostico?: string;
    plan?: string;
    medicamentos?: Array<{
      nombreMedicamentoManual?: string;
      via?: string;
      dosisCantidad?: string|number;
      dosisDescripcion?: string;
      dosificacion?: string;
      frecuenciaHoras?: string|number;
      frecuenciaTiempo?: string;
      diasTratamiento?: string|number;
    }>;
  }>;
};

type PacienteInfo = {
  id?: number|string;
  nombreCompleto?: string;
  identificacion?: string;
  fechaNacimiento?: string|Date;
  sexo?: string;
};

/** ===== Utiles de formato ===== */
const fmt = (v: any) => (v === null || v === undefined || v === "" ? "—" : String(v));
const fmtDate = (d?: string | Date) => {
  if (!d) return "—";
  const date = (d instanceof Date) ? d : new Date(d);
  if (isNaN(date.getTime())) return fmt(d);
  return date.toLocaleString();
};

/** ===== Layout ===== */
const MARG = { left: 14, right: 14, top: 72, bottom: 56 };
const VALUE_X = 40; // indent donde empieza el valor respecto al label

const lineHeight = (doc: jsPDF) => doc.getFontSize() * 1.2;

function ensureSpace(doc: jsPDF, cursorY: number, needed: number, paciente?: PacienteInfo): number
 {
    const pageH = doc.internal.pageSize.getHeight();
    if (cursorY + needed > pageH - MARG.bottom) {
      doc.addPage();
      addHeader(doc, paciente);
      return MARG.top;
    }
    return cursorY;
  }

  function addHeader(doc: jsPDF, paciente?: PacienteInfo) {
    const w = doc.internal.pageSize.getWidth();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Historial clínico", MARG.left, 30);
  
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const p1 = `Paciente: ${fmt(paciente?.nombreCompleto)}  |  ID: ${fmt(paciente?.identificacion ?? paciente?.id)}`;
    doc.text(p1, MARG.left, 42);
    const p2 = `Nacimiento: ${fmtDate(paciente?.fechaNacimiento)}  |  Sexo: ${fmt(paciente?.sexo)}`;
    doc.text(p2, MARG.left, 54);
  
    doc.setDrawColor(200);
    doc.line(MARG.left, 60, w - MARG.right, 60);
  }

function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Página ${i} de ${pageCount}`, w - MARG.right, h - 10, { align: "right" });
    doc.text(new Date().toLocaleString(), MARG.left, h - 10);
  }
}

/** ===== Título de sección con salto seguro ===== */
function sectionTitle(doc: jsPDF, text: string, cursorY: number, paciente?: PacienteInfo) {
    cursorY = ensureSpace(doc, cursorY, lineHeight(doc) * 2, paciente);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(44, 62, 80);
    doc.text(text, MARG.left, cursorY);
    cursorY += lineHeight(doc) + 2;   // ⬅️ pequeño extra
    return cursorY;
  }

/** ===== Par label: valor con wrapping y salto seguro (soporta label vacío) ===== */
function keyValue(
    doc: jsPDF,
    label: string,
    value: string,
    cursorY: number,
    paciente?: PacienteInfo
  ) {
    const pageW = doc.internal.pageSize.getWidth();
  
    // ¿hay etiqueta?
    const hasLabel = !!label;
    const labelText = hasLabel ? `${label}:` : "";
  
    // medir etiqueta solo si existe
    let valueX = MARG.left;
    if (hasLabel) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      const labelW = doc.getTextWidth(labelText);
  
      // desplazamiento mínimo/máximo para no empujar demasiado el valor
      const MIN_OFFSET = 26;   // ~ (40 - 14)
      const MAX_OFFSET = 180;  // tope para labels largas
      const offset = Math.max(MIN_OFFSET, Math.min(labelW + 8, MAX_OFFSET));
      valueX = MARG.left + offset;
    }
  
    // ancho disponible para el valor
    const maxW = Math.max(pageW - valueX - MARG.right, 20);
  
    // envolver valor con la fuente del valor
    doc.setFont("helvetica", "normal");
    const wrapped = doc.splitTextToSize(value || "—", maxW);
  
    // asegurar espacio
    const h = lineHeight(doc);
    const needed = h * Math.max(wrapped.length, 1) + 2;
    cursorY = ensureSpace(doc, cursorY, needed, paciente);
  
    // dibujar
    if (hasLabel) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(44, 62, 80);
      doc.text(labelText, MARG.left, cursorY);
    }
  
    doc.setFont("helvetica", "normal");
    doc.setTextColor(33);
    doc.text(wrapped, valueX, cursorY);
  
    // avanzar cursor según líneas
    cursorY += h * Math.max(wrapped.length, 1) + 2;
    return cursorY;
  }
  
  

export function exportarHistorialPDF(
  paciente: PacienteInfo | undefined,
  historias: Array<{ id: number|string; fecha: string|Date; usuarioNombre?: string; motivoConsulta?: string; detalle?: HistoriaDet }>
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  // Primera página
  addHeader(doc, paciente);
  let cursorY = MARG.top;

  if (!historias?.length) {
    cursorY = sectionTitle(doc, "No hay historias registradas", cursorY, paciente);
    addFooter(doc);
    doc.save(`Historial_${fmt(paciente?.identificacion ?? paciente?.id)}.pdf`);
    return;
  }

  historias.forEach((h, idx) => {
    if (idx > 0) {                 // ⬅️ NUEVO
      doc.addPage();
      addHeader(doc, paciente);
      cursorY = MARG.top;
    }
    
    cursorY = ensureSpace(doc, cursorY, lineHeight(doc) * 3, paciente);
  
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(44, 62, 80);
    doc.text(`Historia #${idx + 1}`, MARG.left, cursorY);
    cursorY += lineHeight(doc) * 0.9;
  
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(33);
    const resumen = `Fecha: ${fmtDate(h.fecha)}  •  Profesional: ${fmt(h.usuarioNombre)}`;
    cursorY = keyValue(doc, "", resumen, cursorY, paciente);
    if (h.motivoConsulta) {
      cursorY = keyValue(doc, "Motivo consulta", fmt(h.motivoConsulta), cursorY, paciente);
    }
  
    // ====== Antecedentes patológicos
    cursorY += 2;
    cursorY = sectionTitle(doc, "Antecedentes patológicos", cursorY, paciente);
    const aps = h.detalle?.antecedentesPatologicos ?? [];
    if (!aps.length) {
      doc.setFont("helvetica", "normal"); doc.setTextColor(120);
      cursorY = ensureSpace(doc, cursorY, lineHeight(doc), paciente);
      doc.text("Sin datos", MARG.left, cursorY);
      cursorY += lineHeight(doc);
    } else {
      aps.forEach(ap => {
        cursorY = keyValue(doc, "Motivo", fmt(ap.motivoConsulta), cursorY, paciente);
        cursorY = keyValue(doc, "Enfermedad actual", fmt(ap.enfermedadActual), cursorY, paciente);
        cursorY = keyValue(doc, "Medicamento actual", fmt(ap.medicamentoActual), cursorY, paciente);
        cursorY += 2;
      });
    }
  
    // ====== Antecedentes personales
    cursorY += 2;
    cursorY = sectionTitle(doc, "Antecedentes personales", cursorY, paciente);
    const apers = h.detalle?.antecedentesPersonales ?? [];
    if (!apers.length) {
      doc.setFont("helvetica", "normal"); doc.setTextColor(120);
      cursorY = ensureSpace(doc, cursorY, lineHeight(doc), paciente);
      doc.text("Sin datos", MARG.left, cursorY);
      cursorY += lineHeight(doc);
    } else {
      apers.forEach(ap => {
        cursorY = keyValue(doc, "Antecedentes personales", fmt(ap.antecedentesPersonales), cursorY, paciente);
        cursorY = keyValue(doc, "Antecedentes familiares", fmt(ap.antecedentesFamiliares), cursorY, paciente);
        if (ap.ginecoObstetricos) cursorY = keyValue(doc, "Gineco-obstétricos", fmt(ap.ginecoObstetricos), cursorY, paciente);
  
        const resumenGO = [
          ap.gestas!=null?`Gestas: ${ap.gestas}`:null,
          ap.partos!=null?`Partos: ${ap.partos}`:null,
          ap.abortos!=null?`Abortos: ${ap.abortos}`:null,
          ap.cesareas!=null?`Cesáreas: ${ap.cesareas}`:null,
          ap.vivos!=null?`Vivos: ${ap.vivos}`:null,
          ap.mortinatos!=null?`Mortinatos: ${ap.mortinatos}`:null,
        ].filter(Boolean).join("  •  ");
        if (resumenGO) cursorY = keyValue(doc, "Resumen GO", resumenGO, cursorY, paciente);
  
        cursorY = keyValue(doc, "Fecha consulta", fmtDate(ap.fechaConsulta), cursorY, paciente);
        cursorY = keyValue(doc, "Usuario", fmt(ap.usuarioId), cursorY, paciente);
        cursorY += 2;
      });
    }
  
    // ====== Examen físico
    cursorY += 2;
    cursorY = sectionTitle(doc, "Examen físico", cursorY, paciente);
    const ex = h.detalle?.examenFisico;
    if (!ex) {
      doc.setFont("helvetica", "normal"); doc.setTextColor(120);
      cursorY = ensureSpace(doc, cursorY, lineHeight(doc), paciente);
      doc.text("Sin datos", MARG.left, cursorY);
      cursorY += lineHeight(doc);
    } else {
      const vitales = [
        `TA: ${fmt(ex.tensionSistolica)}/${fmt(ex.tensionDiastolica)}`,
        `FR: ${fmt(ex.frecuenciaRespiratoria)}`,
        `FC: ${fmt(ex.frecuenciaCardiaca)}`,
        `SatO₂: ${fmt(ex.saturacion)}`,
        `Temp: ${fmt(ex.temperatura)}`,
        `Peso: ${fmt(ex.peso)}`,
        `Talla: ${fmt(ex.talla)}`,
        `IMC: ${fmt(ex.imc)}`
      ].join("  •  ");
      cursorY = keyValue(doc, "Signos vitales", vitales, cursorY, paciente);
  
      const hallazgos: [string, any][] = [
        ["Aspecto general", ex.aspectoGeneral],
        ["Cráneo", ex.craneoDetalle],
        ["Ojos", ex.ojosDetalle],
        ["Oído", ex.oidoDetalle],
        ["Cuello", ex.cuelloDetalle],
        ["Cardiopulmonar", ex.cardioPulmonarDetalle],
        ["Senos", ex.senosDetalle],
        ["Abdomen", ex.abdomenDetalle],
        ["Genitales", ex.genitalesDetalle],
        ["Rectal", ex.examenRectalDetalle],
        ["Neurológico", ex.neurologicoDetalle],
        ["Extremidades/osteoarticular", ex.extremidadesOsteoarticularDetalle],
        ["Otros", ex.otrosHallazgos],
      ];
      hallazgos.forEach(([k, v]) => {
        if (v) cursorY = keyValue(doc, k, fmt(v), cursorY, paciente);
      });
  
      cursorY = keyValue(doc, "Fecha examen", fmtDate(ex.fechaExamen), cursorY, paciente);
      cursorY = keyValue(doc, "Usuario", fmt(ex.usuarioId), cursorY, paciente);
    }
  
    // ====== Diagnósticos
    cursorY += 4;
    cursorY = sectionTitle(doc, "Diagnósticos", cursorY, paciente);
    const dxs = h.detalle?.diagnosticos ?? [];
    if (!dxs.length) {
      doc.setFont("helvetica", "normal"); doc.setTextColor(120);
      cursorY = ensureSpace(doc, cursorY, lineHeight(doc), paciente);
      doc.text("Sin datos", MARG.left, cursorY);
      cursorY += lineHeight(doc);
    } else {
      dxs.forEach((dx, iDx) => {
        cursorY = keyValue(doc, `Diagnóstico ${iDx + 1} - Tipo`, fmt(dx.tipoDiagnostico), cursorY, paciente);
        if (dx.plan) cursorY = keyValue(doc, "Plan", fmt(dx.plan), cursorY, paciente);
  
        const meds = dx.medicamentos ?? [];
        if (meds.length) {
          const pageH = doc.internal.pageSize.getHeight();
          if (cursorY > pageH - 160) { doc.addPage(); addHeader(doc, paciente); cursorY = MARG.top; }
  
          const head = [["Medicamento", "Vía administración", "Cantidad", "Posología y duración"]];
          const body: RowInput[] = meds.map(m => ([
            fmt(m.nombreMedicamentoManual),
            fmt(m.via),
            (m.dosisCantidad || m.dosisDescripcion) ? `${fmt(m.dosisCantidad)} ${fmt(m.dosisDescripcion)}`.trim() : "—",
            [
              m.dosificacion ? `${m.dosificacion}` : "",
              (m.frecuenciaHoras || m.frecuenciaTiempo) ? `c/ ${fmt(m.frecuenciaHoras)} ${fmt(m.frecuenciaTiempo)}` : "",
              m.diasTratamiento ? `${m.diasTratamiento} días` : ""
            ].filter(Boolean).join(" • ") || "—"
          ]));
  
          autoTable(doc, {
            startY: cursorY + 6,              // un poco más de separación antes de la tabla
            head,
            body,
            styles: { fontSize: 9, cellPadding: 4 },
            headStyles: { fillColor: [240,240,240], textColor: 30 },
            theme: "grid",
            margin: { left: MARG.left, right: MARG.right },
            didDrawPage: (data) => { if (data.pageNumber > 1) addHeader(doc, paciente); }
          });
  
          cursorY = (doc as any).lastAutoTable.finalY + 14;
          cursorY = ensureSpace(doc, cursorY, lineHeight(doc) * 1.5, paciente);
        }
      });
    }
  
    // Separador entre historias
    cursorY += 4;
    doc.setDrawColor(220);
    const w = doc.internal.pageSize.getWidth();
    doc.line(MARG.left, cursorY, w - MARG.right, cursorY);
    cursorY += 10;
  });
  

  addFooter(doc);
  const nombre = `Historial_${fmt(paciente?.identificacion ?? paciente?.id)}.pdf`;
  doc.save(nombre);
}
