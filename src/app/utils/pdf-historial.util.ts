// src/app/utils/pdf-historial.util.ts
import jsPDF from "jspdf";
import autoTable, { RowInput } from "jspdf-autotable";

type HistoriaDet = {
  fecha?: string | Date;
  usuarioNombre?: string;
  motivoConsulta?: string;

  profesional?: {
    nombre?: string;
    registro?: string;              // (legacy del back)
    numeroRegistroMedico?: string;  // (nuevo, preferido)
    especialidad?: string;
  };

  antecedentesPatologicos?: Array<{
    motivoConsulta?: string;
    enfermedadActual?: string;
    medicamentoActual?: string;
    // Si luego quieres síntomas/revisión, aquí podrías añadir campos.
    // === Booleans mapeados a los 6 labels de riesgos/violencias ===
    victimaViolencia?: boolean;          // ¿Ha sufrido algún tipo de violencia en su casa?
    dolorToraxico?: boolean;             // Físico
    disgeusia?: boolean;                 // Sexual
    cefalea?: boolean;                   // Emocional
    sintomaticoRespiratorio?: boolean;   // ¿Usted se siente en riesgo?
    sintomaticoPiel?: boolean;           // ¿Quiere hablar del tema?
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
      medicamentoNombre?: string;          // 🔹 nombre desde catálogo
      nombreMedicamentoManual?: string;    // 🔹 nombre digitado manualmente
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

/** ===== helper para si o no  ===== */
const yesNo = (v: any) =>
  v === true ? "Sí" : v === false ? "No" : "—";

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
const MARG = { left: 34, right: 34, top: 106, bottom: 34 };
const COLOR = {
  wine: [157, 17, 26] as [number, number, number],
  wineDark: [112, 12, 19] as [number, number, number],
  wineSoft: [253, 241, 242] as [number, number, number],
  ink: [38, 40, 45] as [number, number, number],
  muted: [105, 108, 116] as [number, number, number],
  line: [226, 226, 229] as [number, number, number],
  soft: [248, 248, 249] as [number, number, number],
};
let activeLogoDataUrl: string | null = null;

async function loadLogoDataUrl(): Promise<string | null> {
  if (activeLogoDataUrl) return activeLogoDataUrl;
  try {
    const response = await fetch("assets/imagenes/logo_drogueria.png");
    if (!response.ok) return null;
    const blob = await response.blob();
    activeLogoDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    return activeLogoDataUrl;
  } catch {
    return null;
  }
}

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
  doc.setFillColor(...COLOR.wine);
  doc.rect(0, 0, w, 5, "F");

  if (activeLogoDataUrl) {
    doc.addImage(activeLogoDataUrl, "PNG", MARG.left, 15, 41, 43, undefined, "FAST");
  }
  const textX = activeLogoDataUrl ? MARG.left + 50 : MARG.left;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...COLOR.wine);
  doc.text("CONSULTORIO MÉDICO LAS LUNAS", textX, 28);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR.muted);
  doc.text("Droguería Las Lunas · Pasto", textX, 41);

  doc.setFillColor(...COLOR.soft);
  doc.roundedRect(MARG.left, 65, w - MARG.left - MARG.right, 30, 5, 5, "F");
  const col = (w - MARG.left - MARG.right) / 3;
  const patientFields = [
    ["PACIENTE", nombreApellido(paciente)],
    ["IDENTIFICACIÓN", fmt(paciente?.identificacion)],
    ["NACIMIENTO", `${fmtDateOnly(paciente?.fechaNacimiento)}  ·  Reg. #${fmt(paciente?.id)}`]
  ];
  patientFields.forEach(([label, value], index) => {
    const x = MARG.left + 10 + (col * index);
    doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); doc.setTextColor(...COLOR.wine);
    doc.text(label, x, 77);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...COLOR.ink);
    doc.text(doc.splitTextToSize(value, col - 15)[0], x, 88);
  });
}

/** ===== Footer con numeración y fecha de export ===== */
function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...COLOR.line);
    doc.line(MARG.left, h - 25, w - MARG.right, h - 25);
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR.muted);
    doc.text("Documento clínico confidencial", MARG.left, h - 12);
    doc.text(`Generado: ${new Date().toLocaleString("es-CO")}`, w / 2, h - 12, { align: "center" });
    doc.text(`Página ${i} de ${pageCount}`, w - MARG.right, h - 12, { align: "right" });
  }
}

/** ===== Título de sección con salto seguro ===== */
function sectionTitle(doc: jsPDF, text: string, cursorY: number, paciente?: PacienteInfo) {
  cursorY = ensureSpace(doc, cursorY, 25, paciente);
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...COLOR.wineSoft);
  doc.roundedRect(MARG.left, cursorY - 10, pageW - MARG.left - MARG.right, 20, 4, 4, "F");
  doc.setFillColor(...COLOR.wine);
  doc.roundedRect(MARG.left, cursorY - 10, 4, 20, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLOR.wineDark);
  doc.text(text.toUpperCase(), MARG.left + 11, cursorY + 3);
  cursorY += 17;
  return cursorY;
}

/** Label y valor en la misma línea para aprovechar mejor el espacio vertical. */
function keyValue(
  doc: jsPDF,
  label: string,
  value: string,
  cursorY: number,
  paciente?: PacienteInfo
) {
  const pageW = doc.internal.pageSize.getWidth();
  const availW = pageW - MARG.left - MARG.right;
  doc.setFontSize(8);
  const h = 10;
  doc.setFont("helvetica", "bold");
  const labelText = `${label}:`;
  const labelW = Math.min(Math.max(doc.getTextWidth(labelText) + 7, 112), availW * 0.40);
  const valueX = MARG.left + labelW;
  const valueW = availW - labelW;

  doc.setFont("helvetica", "normal");
  const wrapped = doc.splitTextToSize(value || "—", valueW);

  const needed = h * Math.max(wrapped.length, 1) + 1;
  cursorY = ensureSpace(doc, cursorY, needed, paciente);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLOR.ink);
  doc.text(labelText, MARG.left, cursorY);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(70, 72, 78);
  doc.text(wrapped, valueX, cursorY);

  cursorY += h * Math.max(wrapped.length, 1) + 1;
  return cursorY;
}

export async function exportarHistorialPDF(
  paciente: PacienteInfo | undefined,
  historias: Array<{ id: number|string; fecha: string|Date; usuarioNombre?: string; motivoConsulta?: string; detalle?: HistoriaDet }>,
  medico?: { nombre?: string; numeroRegistroMedico?: string; registro?: string } // 👈
) {
  await loadLogoDataUrl();
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

    cursorY = ensureSpace(doc, cursorY, 54, paciente);

    // Encabezado visual de cada consulta
    const contentW = doc.internal.pageSize.getWidth() - MARG.left - MARG.right;
    doc.setFillColor(...COLOR.wine);
    doc.roundedRect(MARG.left, cursorY, contentW, 34, 6, 6, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
    doc.text(`CONSULTA ${String(idx + 1).padStart(2, "0")}`, MARG.left + 12, cursorY + 14);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text(fmtDate(h.fecha), MARG.left + 12, cursorY + 26);
    doc.setFont("helvetica", "bold");
    doc.text(`Profesional: ${fmt(h.usuarioNombre)}`, MARG.left + contentW - 12, cursorY + 20, { align: "right" });
    cursorY += 45;

    if (h.motivoConsulta) {
      cursorY = keyValue(doc, "Motivo consulta", fmt(h.motivoConsulta), cursorY, paciente);
    }

    // === ANTECEDENTES PATOLÓGICOS ===
cursorY += 2;
cursorY = sectionTitle(doc, "Antecedentes patológicos", cursorY, paciente);

const aps = h.detalle?.antecedentesPatologicos ?? [];
if (!aps.length) {
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  cursorY = ensureSpace(doc, cursorY, lineHeight(doc), paciente);
  doc.text("Sin datos", MARG.left, cursorY);
  cursorY += lineHeight(doc);
} else {
  aps.forEach(ap => {
    // Campos base
    cursorY = keyValue(doc, "Motivo",               fmt(ap.motivoConsulta),     cursorY, paciente);
    cursorY = keyValue(doc, "Enfermedad actual",    fmt(ap.enfermedadActual),   cursorY, paciente);
    cursorY = keyValue(doc, "Medicamento actual",   fmt(ap.medicamentoActual),  cursorY, paciente);

    cursorY = ensureSpace(doc, cursorY, 68, paciente);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...COLOR.ink);
    doc.text("Detección de riesgos y violencias", MARG.left, cursorY + 8);
    autoTable(doc, {
      startY: cursorY + 14,
      body: [
        ["Violencia en casa", yesNo(ap.victimaViolencia), "Riesgo actual", yesNo(ap.sintomaticoRespiratorio)],
        ["Violencia física", yesNo(ap.dolorToraxico), "Desea hablar del tema", yesNo(ap.sintomaticoPiel)],
        ["Violencia sexual", yesNo(ap.disgeusia), "Violencia emocional", yesNo(ap.cefalea)]
      ],
      theme: "grid",
      styles: { fontSize: 7.5, cellPadding: 3, lineColor: COLOR.line, lineWidth: .4, textColor: COLOR.ink },
      columnStyles: {
        0: { fillColor: COLOR.soft, fontStyle: "bold", cellWidth: 125 },
        1: { halign: "center", textColor: COLOR.wine, fontStyle: "bold", cellWidth: 35 },
        2: { fillColor: COLOR.soft, fontStyle: "bold", cellWidth: 125 },
        3: { halign: "center", textColor: COLOR.wine, fontStyle: "bold" }
      },
      margin: { left: MARG.left, right: MARG.right }
    });
    cursorY = (doc as any).lastAutoTable.finalY + 4;

    // respiración entre items
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
      cursorY = ensureSpace(doc, cursorY, 58, paciente);
      autoTable(doc, {
        startY: cursorY,
        head: [["Tensión", "F. respiratoria", "F. cardíaca", "Temperatura", "Saturación O₂"]],
        body: [[
          `${fmt(ex.tensionSistolica)}/${fmt(ex.tensionDiastolica)} mmHg`,
          `${fmt(ex.frecuenciaRespiratoria)} rpm`, `${fmt(ex.frecuenciaCardiaca)} lpm`,
          `${fmt(ex.temperatura)} °C`, `${fmt(ex.saturacion)} %`
        ], ["Peso", "Talla", "IMC", "Perím. cefálico", ""], [
          `${fmt(ex.peso)} kg`, `${fmt(ex.talla)} cm`, fmt(ex.imc), `${fmt(ex.perimetroCefalico)} cm`, ""
        ]],
        theme: "grid",
        styles: { fontSize: 7.5, cellPadding: 3, halign: "center", lineColor: COLOR.line, lineWidth: .4, textColor: COLOR.ink },
        headStyles: { fillColor: COLOR.wineSoft, textColor: COLOR.wineDark, fontStyle: "bold" },
        didParseCell: data => {
          if (data.section === "body" && data.row.index === 1) {
            data.cell.styles.fillColor = COLOR.soft; data.cell.styles.fontStyle = "bold"; data.cell.styles.textColor = COLOR.muted;
          }
        },
        margin: { left: MARG.left, right: MARG.right }
      });
      cursorY = (doc as any).lastAutoTable.finalY + 7;

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
        const meds = (_dx.medicamentos ?? []) as Array<{
          medicamentoNombre?: string;
          nombreMedicamentoManual?: string;
          via?: string;
          dosisCantidad?: string | number;
          dosisDescripcion?: string;
          dosificacion?: string;
          frecuenciaHoras?: string | number;
          frecuenciaTiempo?: string;
          diasTratamiento?: string | number;
        }>;

        if (meds.length) {
          const pageH = doc.internal.pageSize.getHeight();
          if (cursorY > pageH - 160) { doc.addPage(); addHeader(doc, paciente); cursorY = MARG.top; }

          const head = [["Medicamento", "Vía administración", "Cantidad", "Posología y duración"]];

          const body: RowInput[] = meds.map(m => {
            const nombre = fmt(m.medicamentoNombre ?? m.nombreMedicamentoManual ?? "");
            const via    = fmt(m.via ?? "");
            
            // 🔹 Ahora no muestra “—” cuando está vacío
            const cantidad = (m.dosisCantidad || m.dosisDescripcion)
              ? `${fmt(m.dosisCantidad)} ${fmt(m.dosisDescripcion)}`.trim()
              : "";

            const posologia = [
              m.dosificacion ? `${m.dosificacion}` : "",
              (m.frecuenciaHoras || m.frecuenciaTiempo)
                ? `c/ ${fmt(m.frecuenciaHoras)} ${fmt(m.frecuenciaTiempo)}`
                : "",
              m.diasTratamiento ? `${m.diasTratamiento} días` : ""
            ].filter(Boolean).join(" • ");

            return [nombre, via, cantidad, posologia];
          });

          autoTable(doc, {
            startY: cursorY + 6,
            head,
            body,
            styles: { fontSize: 8, cellPadding: 2.5 },
            headStyles: { fillColor: [248,232,233], textColor: 70 },
            theme: "grid",
            margin: { left: MARG.left, right: MARG.right },
            didDrawPage: (data) => { if (data.pageNumber > 1) addHeader(doc, paciente); }
          });

          cursorY = (doc as any).lastAutoTable.finalY + 7;
          cursorY = ensureSpace(doc, cursorY, lineHeight(doc) * 1.5, paciente);
        }
      });
    }

    cursorY += 4;
cursorY = keyValue(doc, "Fecha registro", fmtDate(h.fecha), cursorY, paciente);

// Nombre del médico
const medicoNombre =
  medico?.nombre
  ?? h.detalle?.profesional?.nombre
  ?? h.usuarioNombre
  ?? "";
cursorY = keyValue(doc, "Médico", (medicoNombre?.toString().trim() || "—"), cursorY, paciente);

// Número de registro médico (nuevo nombre + fallbacks)
const medicoRegistroRaw =
  (medico as any)?.numeroRegistroMedico
  ?? (h.detalle?.profesional as any)?.numeroRegistroMedico
  ?? (h as any)?.numeroRegistroMedico
  ?? (h.detalle as any)?.numeroRegistroMedico
  ?? (medico as any)?.registro
  ?? (h.detalle?.profesional as any)?.registro;

if (medicoRegistroRaw) {
  cursorY = keyValue(doc, "Registro médico", fmt(medicoRegistroRaw), cursorY, paciente);
}

  });

  addFooter(doc);
  const nombre = `Historial_${fmt(paciente?.identificacion ?? paciente?.id)}.pdf`;
  doc.save(nombre);
}
