import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import { CodigoDiagnostico } from '../../models/codigo-diagnostico.model';
import { Diagnostico, DiagnosticoItem } from '../../models/diagnostico.model';
import { DiagnosticoMedicamento } from '../../models/diagnostico-medicamento.model';
import { PacienteService } from '../../services/paciente.service';
import { CodigoDiagnosticoService } from 'src/app/services/codigo-diagnostico.service';
import { PacienteRegistroDTO } from 'src/app/models/paciente.model';
import { RegistroTempService } from 'src/app/services/registro-temporal';

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
  diagnosticos: DiagnosticoFila[] = [ {} ];
  // controles por fila (para mostrar el texto tipeado)
  diagControls: FormControl[] = [ new FormControl('') ];
  // resultados filtrados por fila
  diagFiltrados: CodigoDiagnostico[][] = [ [] ];
  // dropdown abierto por fila
  diagMenuOpen: boolean[] = [ false ];

  // catálogo completo
  catalogoDiagnosticos: CodigoDiagnostico[] = [];

  // medicamentos
  medicamentos: DiagnosticoMedicamento[] = [ this.nuevoMedicamento() ];

  // cabeceras comunes
  tipoDiagnostico = 1;
  plan = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private pacienteService: PacienteService,
    private codigoService: CodigoDiagnosticoService,
    private registroTemp: RegistroTempService,  
  ) {}

  ngOnInit(): void {
    this.pacienteId = Number(this.route.snapshot.paramMap.get('id')) || 0;

    this.codigoService.getCodigosDiagnostico().subscribe({
      next: (data) => {
        this.catalogoDiagnosticos = data || [];
      },
      error: (err) => console.error('Error al cargar códigos', err)
    });
  }

  // Cierre global del dropdown al hacer click fuera
  @HostListener('document:click', ['$event'])
  closeMenusOnOutsideClick(ev: any) {
    if (!ev?.target?.closest?.('.autocomplete')) {
      this.diagMenuOpen = this.diagMenuOpen.map(() => false);
    }
  }

  // === util ===
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
    // lo mostramos en el input
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

  // === guardar ===
  guardarTodo() {
    const paciente = this.registroTemp.obtenerPaciente();
    if (!paciente) {
      alert('❌ No hay paciente en memoria. Regresa al primer paso.');
      return;
    }
  
    const antecedentesPatologicos = this.registroTemp.obtenerAntecedentes();
    const antecedentePersonal = this.registroTemp.obtenerAntecedentesPersonales();
  
    // ⬇️ tomar UN SOLO examen físico (el último del array)
    const examenFisicos = this.registroTemp.obtenerExamenesFisicos() || [];
    const examenFisicoUnico = examenFisicos.slice(-1)[0]; // undefined si no hay
  
    if (!examenFisicoUnico) {
      alert('❌ Falta el examen físico. Guarda ese panel antes de continuar.');
      return;
    }
  
    const nowISO = new Date().toISOString();
    const diagnosticoItems: DiagnosticoItem[] = this.diagnosticos
      .filter(d => d.codigoDiagnosticoId)
      .map(d => ({
        codigoDiagnosticoId: d.codigoDiagnosticoId!,
        plan: this.plan || '',
        tipoDiagnostico: this.tipoDiagnostico,
        fechaRegistro: nowISO,
        usuarioId: this.usuarioId ?? paciente.usuarioRegistroId ?? 0,
        medicamentos: this.medicamentos
      }));
  
    if (!diagnosticoItems.length) {
      alert('⚠️ Debes agregar al menos un diagnóstico antes de guardar todo.');
      return;
    }
  
    // ⬇️ usa el objeto, no el array
    const payload: PacienteRegistroDTO = {
      ...paciente,
      id: paciente.id,
      usuarioRegistroId: paciente.usuarioRegistroId,
      antecedentesPatologicos,
      antecedentePersonal,
      examenFisico: examenFisicoUnico,  // <<--- AQUÍ EL OBJETO
      diagnostico: diagnosticoItems
    };
  
    this.pacienteService.registrarConTodo(payload).subscribe({
      next: () => {
        alert('✅ Registro completo guardado correctamente.');
        this.registroTemp.limpiarPaciente?.();
        this.router.navigate(['/menu-principal']);
      },
      error: (err) => {
        console.error('❌ Error al guardar todo:', err);
        alert('❌ Ocurrió un error guardando el registro completo.');
      }
    });
  }
  
  
}
