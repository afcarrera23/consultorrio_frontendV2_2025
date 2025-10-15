import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl } from '@angular/forms';

import { CodigoDiagnostico } from '../../models/codigo-diagnostico.model';
import { DiagnosticoItem } from '../../models/diagnostico.model';
import { DiagnosticoMedicamento } from '../../models/diagnostico-medicamento.model';
import { PacienteRegistroDTO } from 'src/app/models/paciente.model';

import { PacienteService } from '../../services/paciente.service';
import { CodigoDiagnosticoService } from 'src/app/services/codigo-diagnostico.service';
import { RegistroTempService } from 'src/app/services/registro-temporal';
import { HistoriaFlowService } from 'src/app/services/historia-flow.service';
import { HistoriaMedicaService } from 'src/app/services/historia-medica-service';

import { PrintService } from 'src/app/services/print-service';
import { MedicamentoDTO, MedicamentoService, Page } from 'src/app/services/medicamento-service';

type DiagnosticoFila = {
  codigoDiagnosticoId?: number;
  codigo?: string;
  descripcion?: string;
};

@Component({
  selector: 'app-diagnostico',
  templateUrl: './diagnostico.component.html',
  styleUrls: ['./diagnostico.component.css']
})
export class DiagnosticoComponent implements OnInit {
  pacienteId!: number;
  usuarioId = 2;

  // filas de diagnósticos
  diagnosticos: DiagnosticoFila[] = [{}];
  diagControls: FormControl[] = [new FormControl('')];
  diagFiltrados: CodigoDiagnostico[][] = [[]];
  diagMenuOpen: boolean[] = [false];

  catalogoDiagnosticos: CodigoDiagnostico[] = [];

  // Autocomplete de medicamentos (datalist + búsqueda remota opcional)
  medInp: FormControl[] = [new FormControl('')];
  medMenuOpen: boolean[] = [false];
  medOpciones: MedicamentoDTO[][] = [[]];
  medLoading: boolean[] = [false];

  medicamentosCatalogo: MedicamentoDTO[] = []; // para el datalist
  private catalogoLoading = false;             // guard anti-spam

  // medicamentos a enviar
  medicamentos: DiagnosticoMedicamento[] = [this.nuevoMedicamento()];

  // cabeceras comunes
  tipoDiagnostico = 1;
  plan = '';

  // popup/estado
  isPopupOpen = false;
  isSubmitting = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private pacienteService: PacienteService,
    private codigoService: CodigoDiagnosticoService,
    private registroTemp: RegistroTempService,
    private flow: HistoriaFlowService,
    private historiaApi: HistoriaMedicaService,
    private medsApi: MedicamentoService,
    private printSvc: PrintService
  ) {}

  ngOnInit(): void {
    // 1) pacienteId desde la ruta
    this.pacienteId = Number(this.route.snapshot.paramMap.get('pacienteId')) || 0;

    // 2) catálogo de diagnósticos
    this.codigoService.getCodigosDiagnostico().subscribe({
      next: (data) => {
        this.catalogoDiagnosticos = data || [];
        this.hidratarFilasConCatalogo();
      },
      error: (err) => console.error('Error al cargar códigos', err)
    });

    // 3) usuario desde paciente en memoria
    const paciente = this.registroTemp.obtenerPaciente();
    if (!paciente || paciente.id !== this.pacienteId) {
      console.warn('⚠ Paciente no encontrado/discordante con la URL.');
    } else {
      this.usuarioId = paciente.usuarioRegistroId ?? this.usuarioId;
    }

    // 4) cargar catálogo de medicamentos (datalist) y, al terminar, hidratar draft si existe
    this.cargarCatalogoMedicamentos(() => {
      const draft = this.registroTemp.getDraftDiagnosticos();
      if (draft && draft.length) {
        // cabeceras
        this.plan = draft[0].plan ?? '';
        this.tipoDiagnostico = draft[0].tipoDiagnostico ?? 1;

        // medicamentos
        this.medicamentos = draft[0].medicamentos?.length
          ? [...draft[0].medicamentos]
          : [this.nuevoMedicamento()];
        this.rellenarInputsMedicamentosDesdeModelo();

        // diagnósticos
        this.diagnosticos = draft.map(d => ({ codigoDiagnosticoId: d.codigoDiagnosticoId }));
        this.diagControls = this.diagnosticos.map(() => new FormControl(''));
        this.diagFiltrados = this.diagnosticos.map(() => []);
        this.diagMenuOpen = this.diagnosticos.map(() => false);

        this.hidratarFilasConCatalogo();
      }
    });
  }

  // ---------- Catálogo de medicamentos ----------
  private cargarCatalogoMedicamentos(done?: () => void) {
    if (this.catalogoLoading) { done && done(); return; }
    this.catalogoLoading = true;

    // Pide bastante tamaño para incluir recién creados (si el backend no soporta orden, al menos estarán)
    this.medsApi.listar('', 0, 10000).subscribe({
      next: (page) => {
        this.medicamentosCatalogo = page?.content || [];
        this.catalogoLoading = false;
        done && done();
      },
      error: () => {
        this.medicamentosCatalogo = [];
        this.catalogoLoading = false;
        done && done();
      }
    });
  }

  /** Completa el input visible del medicamento con nombre de catálogo (si hay id) o manual */
  private rellenarInputsMedicamentosDesdeModelo() {
    // asegurar arrays paralelos
    this.medInp = []; this.medMenuOpen = []; this.medOpciones = []; this.medLoading = [];

    this.medicamentos.forEach((m, i) => {
      const ctrl = new FormControl('');
      let display = '';

      if (m.medicamentoId != null) {
        const found = this.medicamentosCatalogo.find(x => x.id === m.medicamentoId);
        display = found?.nombreMedicamento || m.medicamentoNombre || '';
      } else {
        display = m.nombreMedicamentoManual || m.medicamentoNombre || '';
      }

      ctrl.setValue(display, { emitEvent: false });
      this.medInp[i] = ctrl;
      this.medMenuOpen[i] = false;
      this.medOpciones[i] = [];
      this.medLoading[i] = false;
    });

    if (this.medicamentos.length === 0) {
      this.addMedicamento();
    }
  }

  // ---------- Diagnósticos ----------
  private hidratarFilasConCatalogo() {
    if (!this.catalogoDiagnosticos?.length || !this.diagnosticos?.length) return;
    this.diagnosticos.forEach((f, i) => {
      if (!f?.codigoDiagnosticoId) return;
      const found = this.catalogoDiagnosticos.find(c => c.id === f.codigoDiagnosticoId);
      if (found) {
        f.codigo = found.codigo;
        f.descripcion = found.descripcion;
        if (!this.diagControls[i]) this.diagControls[i] = new FormControl('');
        this.diagControls[i].setValue(`${found.codigo} - ${found.descripcion}`, { emitEvent: false });
      }
    });
  }

  @HostListener('document:click', ['$event'])
  closeMenusOnOutsideClick(ev: any) {
    if (!ev?.target?.closest?.('.autocomplete')) {
      this.diagMenuOpen = this.diagMenuOpen.map(() => false);
    }
  }

  private nuevoMedicamento(): DiagnosticoMedicamento {
    return {
      medicamentoId: null,
      medicamentoNombre: null,
      nombreMedicamentoManual: '',
      dosificacion: '',
      dosisCantidad: '',
      dosisDescripcion: '',
      frecuenciaHoras: '',
      frecuenciaTiempo: '',
      via: '',
      diasTratamiento: ''
    };
  }

  private filtrarCatalogo(txt: string): CodigoDiagnostico[] {
    const q = (txt || '').toLowerCase().trim();
    if (!q) return this.catalogoDiagnosticos.slice(0, 50);
    return this.catalogoDiagnosticos
      .filter(d =>
        (d.codigo || '').toLowerCase().includes(q) ||
        (d.descripcion || '').toLowerCase().includes(q)
      )
      .slice(0, 50);
  }

  openDiagMenu(i: number) {
    this.diagMenuOpen[i] = true;
    const txt = String(this.diagControls[i].value || '');
    this.diagFiltrados[i] = this.filtrarCatalogo(txt);
  }

  onDiagInput(i: number, raw: string) {
    this.diagControls[i].setValue(raw, { emitEvent: false });
    this.diagFiltrados[i] = this.filtrarCatalogo(raw);
    this.diagMenuOpen[i] = true;
  }

  onSelectDiagnostico(i: number, sel: CodigoDiagnostico) {
    this.diagnosticos[i] = {
      codigoDiagnosticoId: sel.id,
      codigo: sel.codigo,
      descripcion: sel.descripcion
    };
    this.diagControls[i].setValue(`${sel.codigo} - ${sel.descripcion}`, { emitEvent: false });
    this.diagMenuOpen[i] = false;
  }

  addDiagnostico() {
    this.diagnosticos.push({});
    this.diagControls.push(new FormControl(''));
    this.diagFiltrados.push([]);
    this.diagMenuOpen.push(false);
  }

  removeDiagnostico(i: number) {
    this.diagnosticos.splice(i, 1);
    this.diagControls.splice(i, 1);
    this.diagFiltrados.splice(i, 1);
    this.diagMenuOpen.splice(i, 1);
    if (this.diagnosticos.length === 0) this.addDiagnostico();
  }

  // ---------- Medicamentos (UI) ----------
  addMedicamento() {
    this.medicamentos.push(this.nuevoMedicamento());
    this.medInp.push(new FormControl(''));
    this.medMenuOpen.push(false);
    this.medOpciones.push([]);
    this.medLoading.push(false);
  }

  removeMedicamento(i: number) {
    this.medicamentos.splice(i, 1);
    this.medInp.splice(i, 1);
    this.medMenuOpen.splice(i, 1);
    this.medOpciones.splice(i, 1);
    this.medLoading.splice(i, 1);
    if (this.medicamentos.length === 0) this.addMedicamento();
  }

  // Convierte UI → draft
  private construirDraftDesdeUI(): DiagnosticoItem[] {
    const nowISO = new Date().toISOString();
    const usuario = this.usuarioId || 0;

    return this.diagnosticos
      .filter(d => d.codigoDiagnosticoId)
      .map(d => ({
        codigoDiagnosticoId: d.codigoDiagnosticoId!,
        plan: this.plan || '',
        tipoDiagnostico: this.tipoDiagnostico,
        fechaDiagnostico: nowISO, // requerido por tu interfaz
        fechaRegistro: nowISO,    // compat opcional
        usuarioId: usuario,
        medicamentos: (this.medicamentos && this.medicamentos.length) ? this.medicamentos : []
      }));
  }

  private guardarDraftActual() {
    const draft = this.construirDraftDesdeUI();
    this.registroTemp.setDraftDiagnosticos(draft);
  }

  // ---------- Guardar (finalizar) ----------
  guardarTodo() {
    const paciente: PacienteRegistroDTO | null = this.registroTemp.obtenerPaciente();
    if (!paciente) { alert('❌ No hay paciente en memoria.'); return; }

    const antPatUsar = this.registroTemp.getDraftAntecedentePatologico() ?? this.registroTemp.obtenerAntecedentes().slice(-1)[0];
    const antPerUsar = this.registroTemp.getDraftAntecedentePersonal() ?? this.registroTemp.obtenerAntecedentesPersonales().slice(-1)[0];
    const exUsar     = this.registroTemp.getDraftExamenFisico() ?? this.registroTemp.obtenerExamenesFisicos().slice(-1)[0];
    const diagnosticoItems = this.construirDraftDesdeUI();

    if (!exUsar) { alert('❌ Falta examen físico.'); return; }
    if (!diagnosticoItems.length) { alert('⚠️ Agrega al menos un diagnóstico.'); return; }

    const mode = this.flow.mode;

    if (mode === 'NEW_PATIENT') {
      const payload = {
        ...paciente,
        id: paciente.id,
        usuarioRegistroId: paciente.usuarioRegistroId,
        antecedentesPatologicos: antPatUsar ? [antPatUsar] : [],
        antecedentePersonal:     antPerUsar ? [antPerUsar] : [],
        examenFisico: exUsar,
        diagnostico: diagnosticoItems
      };

      this.pacienteService.registrarConTodo(payload).subscribe({
        next: (resp: any) => {
          const nuevoId = Number(resp?.id || resp?.pacienteId);
          if (nuevoId && !Number.isNaN(nuevoId)) this.pacienteId = nuevoId;
          this.finalizarOkConImpresion();
        },
        error: (e) => this.finalizaError(e)
      });

    } else if (mode === 'EXISTING_PATIENT') {
      const usuarioActualId = this.flow.usuarioId ?? this.usuarioId;
      const dto = {
        pacienteId: paciente.id!,
        usuarioId: usuarioActualId,
        motivoConsulta: antPatUsar?.motivoConsulta,
        antecedentesPatologicos: antPatUsar ? [antPatUsar] : [],
        antecedentesPersonales:  antPerUsar ? [antPerUsar] : [],
        examenFisico: exUsar,
        diagnosticos: diagnosticoItems
      };

      this.historiaApi.crearHistoriaCompleta(dto).subscribe({
        next: () => this.finalizarOkConImpresion(),
        error: (e) => this.finalizaError(e)
      });

    } else {
      alert('⚠️ Modo de flujo no definido.');
    }
  }

  private async finalizarOkConImpresion() {
    try {
      alert('✅ Registro guardado correctamente.\nSe abrirá la impresión de la fórmula médica.');

      const draft = (this.registroTemp.obtenerPaciente?.() ?? null) as Partial<PacienteRegistroDTO> | null;
      const fallback = {
        nombre:   draft?.nombreCompleto ?? '',
        apellido: draft?.apellidoCompleto ?? '',
        doc:      draft?.identificacion ?? ''
      };

      await this.printSvc.printFromEndpoint(this.pacienteId, fallback);

      // refrescar catálogo para que nuevos meds creados se vean al volver
      this.cargarCatalogoMedicamentos(() => this.rellenarInputsMedicamentosDesdeModelo());

      this.registroTemp.limpiarPaciente?.();
      this.flow.clear();
    } finally {
      this.isSubmitting = false;
    }
  }

  private finalizarOk() {
    alert('✅ Registro guardado correctamente.');
    this.registroTemp.limpiarPaciente?.();
    this.flow.clear();
    this.router.navigate(['/menu-principal']);
  }

  private finalizaError(e: any) {
    console.error('❌ Error al guardar:', e);
    alert('❌ Error al guardar.');
  }

  // navegación
  atras() {
    this.guardarDraftActual();
    this.router.navigate([`/examen-fisico/${this.pacienteId}`]);
  }

  abrirPopupCancelar() { this.isPopupOpen = true; }
  cerrarPopup() { this.isPopupOpen = false; }

  confirmarSalida() {
    this.isPopupOpen = false;

    const id = this.registroTemp.obtenerIdPaciente();
    const fueCreado = this.registroTemp.tienePacienteCreadoEnEsteFlujo();

    if (fueCreado && id) {
      this.isSubmitting = true;
      this.pacienteService.eliminarPaciente(id).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.registroTemp.limpiarPaciente();
          this.router.navigate(['/menu-principal']);
        },
        error: (err) => {
          console.error('❌ No se pudo eliminar el paciente creado al cancelar:', err);
          this.isSubmitting = false;
          this.registroTemp.limpiarPaciente();
          this.router.navigate(['/menu-principal']);
        }
      });
    } else {
      this.registroTemp.limpiarPaciente();
      this.router.navigate(['/menu-principal']);
    }
  }

  cancelar() { this.abrirPopupCancelar(); }

  @HostListener('document:keydown.escape')
  onEsc() { if (this.isPopupOpen) this.cerrarPopup(); }

  // Validaciones
  get tipoDiagnosticoValido(): boolean {
    return [1, 2, 3].includes(Number(this.tipoDiagnostico));
  }

  get tieneDiagnosticoValido(): boolean {
    return Array.isArray(this.diagnosticos) &&
           this.diagnosticos.some(d => !!d.codigoDiagnosticoId);
  }

  get medicamentosValidos(): boolean {
    if (!Array.isArray(this.medicamentos) || this.medicamentos.length === 0) return false;
    return this.medicamentos.every(m => {
      const tieneNombre = (m.medicamentoId != null) || ((m.nombreMedicamentoManual || '').trim().length > 0);
      const viaOk = (m.via || '').trim().length > 0;
      const cantOk = Number(m.dosisCantidad) > 0;
      const posoOk = (m.dosificacion || '').trim().length > 0;
      return tieneNombre && viaOk && cantOk && posoOk;
    });
  }

  get planValido(): boolean {
    return (this.plan || '').trim().length > 0;
  }

  esFormularioValido(): boolean {
    return this.tipoDiagnosticoValido &&
           this.tieneDiagnosticoValido &&
           this.medicamentosValidos &&
           this.planValido;
  }

  // --------- Input medicamento: datalist + sugerencias remotas opcionales ----------
  openMedMenu(i: number) {
    this.medMenuOpen[i] = true;
    const txt = String(this.medInp[i]?.value || '').trim();
    this.buscarMedicamentos(i, txt);
  }

  onMedInput(i: number, value: string) {
    // texto visible
    this.medInp[i].setValue(value || '', { emitEvent: false });

    // Coincidencia EXACTA por nombre en catálogo (datalist)
    const v = (value || '').trim().toLowerCase();
    const match = this.medicamentosCatalogo.find(
      m => (m.nombreMedicamento || '').trim().toLowerCase() === v
    );

    if (match) {
      this.medicamentos[i].medicamentoId = match.id!;
      this.medicamentos[i].medicamentoNombre = match.nombreMedicamento;
      this.medicamentos[i].nombreMedicamentoManual = '';
    } else {
      this.medicamentos[i].medicamentoId = null;
      this.medicamentos[i].medicamentoNombre = null;
      this.medicamentos[i].nombreMedicamentoManual = (value || '').trim();
    }
  }

  private buscarMedicamentos(i: number, q: string) {
    this.medLoading[i] = true;
    this.medsApi.suggest(q || '', 0, 10).subscribe({
      next: (page: Page<MedicamentoDTO>) => {
        this.medOpciones[i] = page?.content || [];
        this.medLoading[i] = false;
      },
      error: () => {
        this.medOpciones[i] = [];
        this.medLoading[i] = false;
      }
    });
  }

  onSelectMedicamento(i: number, m: MedicamentoDTO) {
    this.medicamentos[i].medicamentoId = m.id;
    this.medicamentos[i].medicamentoNombre = m.nombreMedicamento;
    this.medicamentos[i].nombreMedicamentoManual = '';

    this.medInp[i].setValue(m.nombreMedicamento, { emitEvent: false });
    this.medMenuOpen[i] = false;
  }

  /** 👇 refresca el catálogo cuando el usuario enfoca el input */
  onMedFocus(i: number) {
    this.cargarCatalogoMedicamentos(() => {
      this.rellenarInputsMedicamentosDesdeModelo();
    });
  }
}
