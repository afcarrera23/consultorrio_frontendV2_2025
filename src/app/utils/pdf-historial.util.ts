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
    // Si luego quieres síntomas/revisión, aquí podrías añadir campos.
  }>;

  antecedentesPersonales?: Array<{
    antecedentesPersonales?: string;
    antecedentesFamiliares?: string;
    ginecoObstetricos?: string;
    gestas?: number; partos?: number; abortos?: number; cesareas?: number;
    vivos?: number; mortinatos?: number;
    fechaConsulta?: string | Date;      // ⬅ (ya no se imprimirá)
    usuarioId?: string | number;        // ⬅ (ya no se imprimirá)
  }>;

  examenFisico?: {
    tensionSistolica?: string|number; tensionDiastolica?: string|number;
    frecuenciaRespiratoria?: string|number; frecuenciaCardiaca?: string|number;
    saturacion?: string|number; temperatura?: string|number;
    peso?: string|number; talla?: string|number; imc?: string|number;
    perimetroCefalico?: string|number; // ⬅️ NUEVO (si tu DTO usa otro nombre, cámbialo)

    aspectoGeneral?: string; craneoDetalle?: string; ojosDetalle?: string; oidoDetalle?: string;
    cuelloDetalle?: string; cardioPulmonarDetalle?: string; senosDetalle?: string;
    abdomenDetalle?: string; genitalesDetalle?: string; examenRectalDetalle?: string;
    neurologicoDetalle?: string; extremidadesOsteoarticularDetalle?: string;
    otrosHallazgos?: string;

    fechaExamen?: string | Date;        // ⬅ (se usará h.fecha como “Fecha registro”)
    usuarioId?: string | number;        // ⬅ (se usará h.usuarioNombre)
  };

  diagnosticos?: Array<{
    // tipoDiagnostico?: string;       // ⬅ ya no se imprime
    codigo?: string;                   // ⬅ soportado para armar “Diagnóstico”
    codigoCIE?: string;
    codigoDiagnostico?: string;
    cie10?: string;
    cie?: string;
    descripcion?: string;
    diagnostico?: string;
    nombreDiagnostico?: string;
    descripcionDiagnostico?: string;
    cie10Descripcion?: string;

    plan?: string;                     // ⬅ se imprime con label nuevo
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
  id?: number|string;               // Reg. #
  nombreCompleto?: string;
  apellidoCompleto?: string;        // ⬅️ opcional por si lo pasas desde el componente
  identificacion?: string;
  fechaNacimiento?: string|Date;
  // sexo?: string;                  // ⬅️ eliminado del header
};

/** ===== Utiles de formato ===== */
const fmt = (v: any) => (v === null || v === undefined || v === "" ? "—" : String(v));

const fmtDate = (d?: string | Date) => {
  if (!d) return "—";
  const date = (d instanceof Date) ? d : new Date(d);
  if (isNaN(date.getTime())) return fmt(d);
  return date.toLocaleString(); // fecha + hora
};

const fmtDateOnly = (d?: string | Date) => {
  if (!d) return "—";
  const date = (d instanceof Date) ? d : new Date(d);
  if (isNaN(date.getTime())) return fmt(d);
  return date.toLocaleDateString(); // solo fecha
};

// Une nombre + apellido si existen
const nombreApellido = (p?: PacienteInfo) => {
  const nombre = (p?.nombreCompleto ?? '').toString().trim();

  // Probamos distintas claves comunes para el apellido
  const apellido =
    (p as any)?.apellidoCompleto ??
    (p as any)?.apellidos ??
    (p as any)?.apellido ??
    '';

  const apStr = (apellido ?? '').toString().trim();

  // Fallback: si no hay apellido explícito, intenta tomar la última palabra del nombre
  if (!apStr && nombre.includes(' ')) {
    const parts = nombre.split(/\s+/);
    const last = parts[parts.length - 1];
    return `${nombre} ${last}`.trim();
  }

  // Resultado normal
  return (nombre && apStr) ? `${nombre} ${apStr}`.trim()
       : (nombre || apStr || '—');
};

// Texto legible del diagnóstico (código + descripción si hay)
const dxTexto = (dx: any): string => {
  if (!dx) return "—";
  const codigo =
    dx.codigo ?? dx.codigoCIE ?? dx.codigoDiagnostico ?? dx.cie10 ?? dx.cie ?? null;
  const desc =
    dx.descripcion ?? dx.diagnostico ?? dx.nombreDiagnostico ?? dx.descripcionDiagnostico ?? dx.cie10Descripcion ?? null;
  if (codigo && desc) return `${codigo} — ${desc}`;
  return (desc || codigo || "—").toString();
};

/** ===== Layout ===== */
const MARG = { left: 14, right: 14, top: 72, bottom: 56 };

const lineHeight = (doc: jsPDF) => doc.getFontSize() * 1.2;

function ensureSpace(doc: jsPDF, cursorY: number, needed: number, paciente?: PacienteInfo): number {
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

  // Línea 1: Paciente + Identificación + Reg. #
  const p1 = `Paciente: ${nombreApellido(paciente)}  |  Identificación: ${fmt(paciente?.identificacion)}  |  Reg. #${fmt(paciente?.id)}`;
  doc.text(p1, MARG.left, 42);

  // Línea 2: Fecha de nacimiento (sin hora)
  const p2 = `Fecha de nacimiento: ${fmtDateOnly(paciente?.fechaNacimiento)}`;
  doc.text(p2, MARG.left, 54);

  doc.setDrawColor(200);
  doc.line(MARG.left, 60, w - MARG.right, 60);
}

/** ===== Footer con numeración y fecha de export ===== */
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
  cursorY += lineHeight(doc) + 2;
  return cursorY;
}

/** Label arriba y valor en la línea siguiente (bloque) */
function keyValue(
  doc: jsPDF,
  label: string,
  value: string,
  cursorY: number,
  paciente?: PacienteInfo
) {
  const pageW = doc.internal.pageSize.getWidth();
  const availW = pageW - MARG.left - MARG.right;
  const h = lineHeight(doc);

  // Prepara el valor envuelto
  doc.setFont("helvetica", "normal");
  const wrapped = doc.splitTextToSize(value || "—", availW);

  // Asegura espacio: una línea para label + n líneas de valor
  const needed = h * (1 + Math.max(wrapped.length, 1)) + 2;
  cursorY = ensureSpace(doc, cursorY, needed, paciente);

  // Label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(44, 62, 80);
  doc.text(`${label}:`, MARG.left, cursorY);

  // Valor en la siguiente línea
  cursorY += h;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(33);
  doc.text(wrapped, MARG.left, cursorY);

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
    if (idx > 0) {
      doc.addPage();
      addHeader(doc, paciente);
      cursorY = MARG.top;
    }

    cursorY = ensureSpace(doc, cursorY, lineHeight(doc) * 3, paciente);

    // Encabezado de cada historia
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(44, 62, 80);
    doc.text(`Historia #${idx + 1}`, MARG.left, cursorY);
    cursorY += lineHeight(doc) * 0.9;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(33);
    if (h.motivoConsulta) {
      cursorY = keyValue(doc, "Motivo consulta", fmt(h.motivoConsulta), cursorY, paciente);
    }

    // ===== Antecedentes patológicos
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

    // ===== Antecedentes personales
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

        // ⬅️ Se elimina “Fecha consulta” y “Usuario” aquí
        cursorY += 2;
      });
    }

    // ===== Examen físico
    cursorY += 2;
    cursorY = sectionTitle(doc, "Examen físico", cursorY, paciente);
    const ex = h.detalle?.examenFisico;
    if (!ex) {
      doc.setFont("helvetica", "normal"); doc.setTextColor(120);
      cursorY = ensureSpace(doc, cursorY, lineHeight(doc), paciente);
      doc.text("Sin datos", MARG.left, cursorY);
      cursorY += lineHeight(doc);
    } else {
      // ✅ Todos los campos individuales como en el historial
      cursorY = keyValue(doc, "Tensión Sistólica", fmt(ex.tensionSistolica), cursorY, paciente);
      cursorY = keyValue(doc, "Tensión Diastólica", fmt(ex.tensionDiastolica), cursorY, paciente);
      cursorY = keyValue(doc, "Frecuencia Respiratoria", fmt(ex.frecuenciaRespiratoria), cursorY, paciente);
      cursorY = keyValue(doc, "Frecuencia Cardíaca", fmt(ex.frecuenciaCardiaca), cursorY, paciente);
      cursorY = keyValue(doc, "Temperatura", fmt(ex.temperatura), cursorY, paciente);
      cursorY = keyValue(doc, "Saturación O₂", fmt(ex.saturacion), cursorY, paciente);
      cursorY = keyValue(doc, "Peso (kg)", fmt(ex.peso), cursorY, paciente);
      cursorY = keyValue(doc, "Talla (cm)", fmt(ex.talla), cursorY, paciente);
      cursorY = keyValue(doc, "IMC", fmt(ex.imc), cursorY, paciente);
      cursorY = keyValue(doc, "Perímetro Cefálico (cm)", fmt(ex.perimetroCefalico), cursorY, paciente);

      const hallazgos: [string, any][] = [
        ["Aspecto General", ex.aspectoGeneral],
        ["Cráneo", ex.craneoDetalle],
        ["Ojos", ex.ojosDetalle],
        ["Oído", ex.oidoDetalle],
        ["Cuello", ex.cuelloDetalle],
        ["Cardio-Pulmonar", ex.cardioPulmonarDetalle],
        ["Senos", ex.senosDetalle],
        ["Abdomen", ex.abdomenDetalle],
        ["Genitales", ex.genitalesDetalle],
        ["Examen Rectal", ex.examenRectalDetalle],
        ["Neurológico", ex.neurologicoDetalle],
        ["Extremidades Osteoarticulares", ex.extremidadesOsteoarticularDetalle],
        ["Otros Hallazgos", ex.otrosHallazgos],
      ];
      hallazgos.forEach(([k, v]) => {
        if (v) cursorY = keyValue(doc, k, fmt(v), cursorY, paciente);
      });

      // ⬅️ Se elimina “Fecha examen” y “Usuario” de esta sección
    }

    // ===== Diagnósticos
    cursorY += 4;
    cursorY = sectionTitle(doc, "Diagnósticos", cursorY, paciente);
    const dxs = h.detalle?.diagnosticos ?? [];
    if (!dxs.length) {
      doc.setFont("helvetica", "normal"); doc.setTextColor(120);
      cursorY = ensureSpace(doc, cursorY, lineHeight(doc), paciente);
      doc.text("Sin datos", MARG.left, cursorY);
      cursorY += lineHeight(doc);
    } else {
      dxs.forEach((_dx, iDx) => {
        // Diagnóstico (código + descripción si hay)
        cursorY = keyValue(doc, `Diagnóstico ${iDx + 1}`, dxTexto(_dx), cursorY, paciente);

        // Recomendaciones, plan de tratamiento
        if (_dx.plan) {
          cursorY = keyValue(doc, "Recomendaciones, plan de tratamiento", fmt(_dx.plan), cursorY, paciente);
        }

        // Tabla de medicamentos
        const meds = _dx.medicamentos ?? [];
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
            startY: cursorY + 6,
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

    // ===== Meta final de la historia: Fecha registro + Usuario (nombre y apellido)
    cursorY += 4;
    cursorY = keyValue(doc, "Fecha registro", fmtDate(h.fecha), cursorY, paciente);
    cursorY = keyValue(doc, "Usuario", fmt(h.usuarioNombre), cursorY, paciente);

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
