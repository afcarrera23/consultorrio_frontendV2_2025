import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { FormulaMedicaApiService } from '../../services/formula-medica.api.service';
import { AuthService } from '../../services/auth.service';
import { PrintService, FormulaMedica as FormulaImpresion } from '../../services/print-service';

import { Medicamento } from '../../models/medicamento';
import { UsuarioMedico } from '../../models/usuario-medico.model';
import { FormulaMedicaDTO } from '../../interfaces/formula-medica.dto';

// Ahora cada fila soporta ID (catálogo) o nombre libre en la misma caja
type MedFila = { 
  medicamentoId: number | null;     // si coincide con catálogo
  medicamentoNombre?: string;       // nombre libre cuando NO hay id
  medInput: string;                 // lo que escribe/selecciona el usuario en el <input list>
  via: string; 
  cantidad: number; 
  posologia: string; 
};

@Component({
  selector: 'app-formula-medica-fast',
  templateUrl: './formula-medica-fast.component.html',
  styleUrls: ['./formula-medica-fast.component.css']
})
export class FormulaMedicaFastComponent implements OnInit {

  // Catálogo de medicamentos
  medicamentosCatalogo: Medicamento[] = [];
  cargandoCatalogo = false;

  // Médico básico desde sesión
  medicoSesionMin: { id: number; nombre: string; apellido: string } | null = null;

  // Detalle del médico (registro, firma, etc.)
  medicoDetalle?: UsuarioMedico;

  // Form base
  form: {
    nombrePaciente: string;
    apellidoPaciente: string;
    numeroIdentificacion: string;
    fecha: string;
    planTratamiento: string;
    usuarioId: number | null;
  } = {
    nombrePaciente: '',
    apellidoPaciente: '',
    numeroIdentificacion: '',
    fecha: this.hoyISO(),
    planTratamiento: '',
    usuarioId: null
  };

  // Filas dinámicas de medicamentos (para registrar)
  meds: MedFila[] = [this.nuevaFilaMed()];

  // ======================== LISTADO POR IDENTIFICACIÓN ========================
  formulas: FormulaMedicaDTO[] = [];
  loadingFormulas = false;
  printingId: number | null = null;
  deletingId: number | null = null;

  // UI state
  isPopupOpen = false;
  guardando = false;
  error?: string;
  listError?: string;

  // ======================== LISTA GLOBAL ========================
  formulasGlobal: FormulaMedicaDTO[] = [];
  cargandoLista = false;
  errorLista?: string;

  constructor(
    private router: Router,
    private api: FormulaMedicaApiService,
    private auth: AuthService,
    private printSvc: PrintService
  ) {}

  // ======================== INIT ========================
  ngOnInit(): void {
    // 0) Verifica sesión
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    // 1) Toma médico desde AuthService/localStorage
    const m = this.auth.getMedicoLogueado(); // { id, nombre, apellido, ... }
    if (!m?.id) {
      this.router.navigate(['/login']);
      return;
    }
    this.medicoSesionMin = { id: m.id, nombre: m.nombre, apellido: m.apellido };
    this.form.usuarioId = m.id;

    // 2) Carga catálogo de medicamentos
    this.cargarMedicamentos();

    // 3) Enriquecer datos del médico desde backend (para registro/firma/descripciones)
    this.api.obtenerMedico(m.id).subscribe({
      next: (det: any) => {
        this.medicoDetalle = {
          ...det,
          firmaBase64: det?.firmaBase64 ?? det?.firma ?? null
        } as UsuarioMedico;
      },
      error: () => {}
    });

    // 4) Cargar la lista GLOBAL (todas las fórmulas) para la tabla mínima
    this.cargarLista();
  }

  // ======================== HELPERS UI ========================
  private hoyISO(): string {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  // Formateo seguro de fecha para el template (evita que el pipe "date" rompa el render)
  fechaSegura(fecha: string | Date | undefined | null): string {
    if (!fecha) return '—';
    try {
      if (fecha instanceof Date && !isNaN(fecha.getTime())) {
        return fecha.toISOString().slice(0, 10);
      }
      const t = typeof fecha === 'string' ? Date.parse(fecha) : NaN;
      if (!isNaN(t)) return new Date(t).toISOString().slice(0, 10);
      return String(fecha);
    } catch {
      return String(fecha);
    }
  }

  trackByIndex = (_: number, __: any) => _;
  trackByFormulaId = (i: number, f: FormulaMedicaDTO) => (f && (f as any).id != null ? (f as any).id : i);

  onIdentificacionChange(value: string) {
    this.form.numeroIdentificacion = value;
    if (value && value.trim().length > 0) {
      this.cargarFormulas(); // mantiene tu listado por identificación
    } else {
      this.formulas = [];
    }
  }

  // ======================== FILAS ========================
  nuevaFilaMed(): MedFila {
    return { medicamentoId: null, medicamentoNombre: '', medInput: '', via: '', cantidad: 1, posologia: '' };
  }

  addMed(): void {
    this.meds.push(this.nuevaFilaMed());
  }

  removeMed(i: number): void {
    this.meds.splice(i, 1);
    if (this.meds.length === 0) this.addMed();
  }

  // Handler del <input list> (ngModelChange)
  onMedInput(i: number, value: string): void {
    const row = this.meds[i];
    if (!row) return;

    row.medInput = value ?? '';
    const v = (value || '').trim().toLowerCase();

    // Coincidencia exacta por nombre en el catálogo
    const match = this.medicamentosCatalogo.find(
      m => (m.nombreMedicamento || '').trim().toLowerCase() === v
    );

    if (match) {
      row.medicamentoId = match.id;
      row.medicamentoNombre = ''; // lo tomaremos del catálogo por id
    } else {
      row.medicamentoId = null;
      row.medicamentoNombre = (value || '').trim();
    }
  }

  // ======================== CATÁLOGOS ========================
  cargarMedicamentos(): void {
    this.cargandoCatalogo = true;
    this.api.listarMedicamentos('', 0, 500).subscribe({
      next: (meds) => { this.medicamentosCatalogo = meds || []; this.cargandoCatalogo = false; },
      error: (e) => { console.error(e); this.error = 'No fue posible cargar medicamentos.'; this.cargandoCatalogo = false; }
    });
  }

  // ======================== VALIDACIÓN ========================
  private medsValidas(): boolean {
    return this.meds.length > 0 && this.meds.every(m =>
      (
        (!!m.medicamentoId) ||
        (!!m.medicamentoNombre && m.medicamentoNombre.trim().length > 0)
      ) &&
      !!m.via?.trim() &&
      (m.cantidad ?? 0) > 0 &&
      !!m.posologia?.trim()
    );
  }

  esValido(): boolean {
    return !!(
      this.form.nombrePaciente?.trim() &&
      this.form.apellidoPaciente?.trim() &&
      this.form.numeroIdentificacion?.trim() &&
      this.form.fecha &&
      this.medsValidas() &&
      this.form.planTratamiento?.trim() &&
      this.form.usuarioId
    );
  }

  // ======================== GUARDAR + IMPRIMIR ========================
  registrar(): void {
    if (!this.esValido()) return;

    this.guardando = true; this.error = undefined;

    const base: Omit<FormulaMedicaDTO,
      'id'|'medicamentoId'|'cantidad'|'via'|'posologia'|'medicamentoNombre'> = {
      nombrePaciente: this.form.nombrePaciente,
      apellidoPaciente: this.form.apellidoPaciente,
      numeroIdentificacion: this.form.numeroIdentificacion,
      fecha: this.form.fecha,
      planTratamiento: this.form.planTratamiento,
      usuarioId: this.form.usuarioId!, // viene de la sesión
    };

    // Si hay id => enviamos id; si no hay id => enviamos medicamentoNombre
    const medsPayload = this.meds
    .filter(m => (m.medicamentoId != null) || (m.medicamentoNombre?.trim().length)) // evita filas vacías
    .map(m => {
      const base = { cantidad: m.cantidad, via: m.via, posologia: m.posologia };
      if (m.medicamentoId != null) {
        return { ...base, medicamentoId: m.medicamentoId };          // ItemConId
      } else {
        return { ...base, medicamentoNombre: (m.medicamentoNombre || '').trim() }; // ItemLibre
      }
    });
  
  this.api.crearFormulasMultiples(base, medsPayload).subscribe({
      next: () => {
        this.guardando = false;

        const profesionalNombre = (
          (this.medicoDetalle?.nombreMedico || this.medicoSesionMin?.nombre || '') + ' ' +
          (this.medicoDetalle?.apellidoMedico || this.medicoSesionMin?.apellido || '')
        ).trim();

        const data: FormulaImpresion = {
          pacienteNombre: this.form.nombrePaciente,
          pacienteApellido: this.form.apellidoPaciente,
          pacienteDocumento: this.form.numeroIdentificacion,
          fecha: this.form.fecha,
          diagnosticos: [],
          medicamentos: this.meds.map(m => ({
            nombre: this.resolveNombreParaImpresion(m),
            dosis: m.posologia,
            via: m.via,
          })),
          planObservaciones: this.form.planTratamiento,
          profesional: {
            nombre: profesionalNombre,
            numeroRegistroMedico: this.medicoDetalle?.registroMedico ?? undefined,
            especialidad: this.medicoDetalle?.descripcionMedicaUno ?? undefined,
            firmaBase64: this.medicoDetalle?.firmaBase64 ?? undefined,
          }
        };

        this.printSvc.printFormula(data);
        // refresca ambos listados
        this.cargarFormulas(); // por identificación (si hay)
        this.cargarLista();    // global minimal

        // Limpieza suave del form de captura
        this.meds = [this.nuevaFilaMed()];
      },
      error: (err) => {
        console.error(err);
        this.error = err?.error?.message || 'Ocurrió un error al guardar.';
        this.guardando = false;
      }
    });
  }

  // Resuelve nombre desde catálogo por id; si no, usa el libre
  private resolveNombreCatalogo(id: number | null): string {
    if (!id) return '';
    return this.medicamentosCatalogo.find(x => x.id === id)?.nombreMedicamento || '';
  }

  private resolveNombreParaImpresion(m: MedFila): string {
    if (m.medicamentoId) {
      const n = this.resolveNombreCatalogo(m.medicamentoId);
      if (n) return n;
    }
    return (m.medicamentoNombre || m.medInput || '').trim();
  }

  // ======================== LISTADO POR IDENTIFICACIÓN ========================
  cargarFormulas(): void {
    const ident = this.form.numeroIdentificacion?.trim();
    this.listError = undefined;

    if (!ident) {
      this.formulas = [];
      return;
    }

    this.loadingFormulas = true;
    this.api.listarFormulasPorIdentificacion(ident).subscribe({
      next: (rows) => {
        this.formulas = (rows || []).slice().sort((a, b) =>
          new Date(b.fecha as any).getTime() - new Date(a.fecha as any).getTime()
        );
        this.loadingFormulas = false;
      },
      error: (e) => {
        console.error('❌ Error listando fórmulas:', e);
        this.listError = e?.error?.message || 'No fue posible cargar las fórmulas.';
        this.formulas = [];
        this.loadingFormulas = false;
      }
    });
  }

  imprimirFormula(f: FormulaMedicaDTO): void {
    if (!f) return;
    this.printingId = f.id ?? null;

    const profesionalNombre = (
      (this.medicoDetalle?.nombreMedico || this.medicoSesionMin?.nombre || '') + ' ' +
      (this.medicoDetalle?.apellidoMedico || this.medicoSesionMin?.apellido || '')
    ).trim();

    // Intento de resolver nombre por id desde el catálogo si viene en el DTO
    const nombreResuelto =
      (f.medicamentoNombre && f.medicamentoNombre.trim().length > 0)
        ? f.medicamentoNombre
        : this.resolveNombreCatalogo((f as any).medicamentoId ?? null);

    const data: FormulaImpresion = {
      pacienteNombre: f.nombrePaciente || this.form.nombrePaciente,
      pacienteApellido: f.apellidoPaciente || this.form.apellidoPaciente,
      pacienteDocumento: f.numeroIdentificacion || this.form.numeroIdentificacion,
      fecha: f.fecha || this.form.fecha,
      diagnosticos: [],
      medicamentos: [{
        nombre: nombreResuelto || '—',
        dosis: f.posologia || '',
        via: f.via || '—'
      }],
      planObservaciones: f.planTratamiento || '—',
      profesional: {
        nombre: profesionalNombre,
        numeroRegistroMedico: this.medicoDetalle?.registroMedico ?? undefined,
        especialidad: this.medicoDetalle?.descripcionMedicaUno ?? undefined,
        firmaBase64: this.medicoDetalle?.firmaBase64 ?? undefined,
      }
    };

    try {
      this.printSvc.printFormula(data);
    } finally {
      this.printingId = null;
    }
  }

  eliminarFormula(f: FormulaMedicaDTO): void {
    if (!f?.id) return;
    const ok = window.confirm('¿Eliminar esta fórmula? Esta acción no se puede deshacer.');
    if (!ok) return;

    this.deletingId = f.id;
    this.api.eliminarFormula(f.id).subscribe({
      next: () => {
        // Si estabas en la lista por identificación:
        this.formulas = this.formulas.filter(x => x.id !== f.id);
        // También refresca la global
        this.cargarLista();
        this.deletingId = null;
      },
      error: (e) => {
        console.error(e);
        this.deletingId = null;
        alert('No fue posible eliminar la fórmula.');
      }
    });
  }

  // ======================== LISTA GLOBAL ========================
  cargarLista(): void {
    this.cargandoLista = true;
    this.errorLista = undefined;

    this.api.listarFormulas().subscribe({
      next: (rows) => {
        this.formulasGlobal = rows || [];
        this.cargandoLista = false;
      },
      error: (e) => {
        console.error(e);
        this.errorLista = e?.error?.message ?? 'No se pudo obtener la lista global';
        this.formulasGlobal = [];
        this.cargandoLista = false;
      }
    });
  }

  onImprimirSimple(f: FormulaMedicaDTO): void {
    this.imprimirFormula(f);
  }

  onEliminarSimple(f: FormulaMedicaDTO): void {
    this.eliminarFormula(f);
  }

  // ======================== NAVEGACIÓN / POPUP ========================
  atras(): void { this.router.navigate(['/menu-principal']); }

  abrirPopupCancelar(): void { this.isPopupOpen = true; }

  cerrarPopup(): void { this.isPopupOpen = false; }

  confirmarSalida(): void {
    this.isPopupOpen = false;
    this.router.navigate(['/menu-principal']);
  }

  // ======================== IMG HELPER ========================
  firmaSrc(b64?: string | null): string | null {
    if (!b64) return null;
    const s = String(b64).trim();
    if (!s) return null;
    return s.startsWith('data:') ? s : `data:image/png;base64,${s}`;
  }

  // dentro de la clase
  hasIdent(): boolean {
    return ((this.form?.numeroIdentificacion ?? '').trim().length) > 0;
  }

  get identFilled(): boolean {
    return ((this.form?.numeroIdentificacion ?? '').trim().length) > 0;
  }
}
