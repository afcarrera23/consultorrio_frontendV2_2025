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

  // medicamentos
  medicamentos: DiagnosticoMedicamento[] = [this.nuevoMedicamento()];

  // cabeceras comunes
  tipoDiagnostico = 1;
  plan = '';

  /** Estado del popup */
  isPopupOpen = false;
  isSubmitting = false; // ⬅️ NUEVO

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private pacienteService: PacienteService,
    private codigoService: CodigoDiagnosticoService,
    private registroTemp: RegistroTempService,
    private flow: HistoriaFlowService,
    private historiaApi: HistoriaMedicaService,
  ) {}

  ngOnInit(): void {
    // lee :pacienteId de la URL
    this.pacienteId = Number(this.route.snapshot.paramMap.get('pacienteId')) || 0;

    // 1) Cargar catálogo
    this.codigoService.getCodigosDiagnostico().subscribe({
      next: (data) => {
        this.catalogoDiagnosticos = data || [];
        this.hidratarFilasConCatalogo();
      },
      error: (err) => console.error('Error al cargar códigos', err)
    });

    // 2) Cargar paciente de memoria y validar
    const paciente = this.registroTemp.obtenerPaciente();
    if (!paciente || paciente.id !== this.pacienteId) {
      console.warn('⚠ Paciente no encontrado/discordante con la URL.');
    } else {
      this.usuarioId = paciente.usuarioRegistroId ?? this.usuarioId;
    }

    // 3) Precargar draft de diagnóstico (si lo hay)
    const draft = this.registroTemp.getDraftDiagnosticos();
    if (draft && draft.length) {
      this.plan = draft[0].plan ?? '';
      this.tipoDiagnostico = draft[0].tipoDiagnostico ?? 1;
      this.medicamentos = (draft[0].medicamentos && draft[0].medicamentos.length)
        ? [...draft[0].medicamentos]
        : [this.nuevoMedicamento()];

      this.diagnosticos = draft.map(d => ({ codigoDiagnosticoId: d.codigoDiagnosticoId }));
      this.diagControls = this.diagnosticos.map(() => new FormControl(''));
      this.diagFiltrados = this.diagnosticos.map(() => []);
      this.diagMenuOpen = this.diagnosticos.map(() => false);

      this.hidratarFilasConCatalogo();
    }
  }

  /** Rellena código/descripcion en inputs desde el catálogo */
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

  // === diagnósticos ===
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

  // === medicamentos ===
  addMedicamento() {
    this.medicamentos.push(this.nuevoMedicamento());
  }

  removeMedicamento(i: number) {
    this.medicamentos.splice(i, 1);
    if (this.medicamentos.length === 0) this.addMedicamento();
  }

  /** Convierte UI → draft para RegistroTempService */
  private construirDraftDesdeUI(): DiagnosticoItem[] {
    const nowISO = new Date().toISOString();
    const usuario = this.usuarioId || 0;

    return this.diagnosticos
      .filter(d => d.codigoDiagnosticoId)
      .map(d => ({
        codigoDiagnosticoId: d.codigoDiagnosticoId!,
        plan: this.plan || '',
        tipoDiagnostico: this.tipoDiagnostico,
        fechaRegistro: nowISO,
        usuarioId: usuario,
        medicamentos: this.medicamentos && this.medicamentos.length
          ? this.medicamentos
          : []
      }));
  }

  private guardarDraftActual() {
    const draft = this.construirDraftDesdeUI();
    this.registroTemp.setDraftDiagnosticos(draft);
  }

  // === guardar (finalizar) ===
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
      // 🔵 Caso A: Paciente nuevo
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
        next: () => this.finalizarOk(),
        error: (e) => this.finalizaError(e)
      });
  
    } else if (mode === 'EXISTING_PATIENT') {
      // 🟢 Caso B: Paciente existente
      const usuarioActualId = this.flow.usuarioId ?? this.usuarioId;
      const dto = {
        pacienteId: paciente.id!,
        usuarioId: usuarioActualId,   // ✅ ahora sí guarda al usuario logueado actual
        motivoConsulta: antPatUsar?.motivoConsulta,
        antecedentesPatologicos: antPatUsar ? [antPatUsar] : [],
        antecedentesPersonales:  antPerUsar ? [antPerUsar] : [],
        examenFisico: exUsar,
        diagnosticos: diagnosticoItems
      };
  
      this.historiaApi.crearHistoriaCompleta(dto).subscribe({
        next: () => this.finalizarOk(),
        error: (e) => this.finalizaError(e)
      });
  
    } else {
      alert('⚠️ Modo de flujo no definido.');
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

  /** ===== ATRÁS → vuelve a Examen Físico guardando el borrador ===== */
  atras() {
    this.guardarDraftActual();
    this.router.navigate([`/examen-fisico/${this.pacienteId}`]);
  }

  /** ==== Popup cancelar ==== */
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
}