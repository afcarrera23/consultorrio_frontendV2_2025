import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { HistoriaLecturaApiService } from 'src/app/services/historia-lectura.service';
import { PacienteService } from 'src/app/services/paciente.service';

import { HistoriaDetalleDTO, HistoriaResumenDTO } from 'src/app/models/historia-medica-lectura.model';
import { PacienteDTO } from 'src/app/interfaces/PacienteDTO';
import { exportarHistorialPDF } from 'src/app/utils/pdf-historial.util';
import { esHistoriaVacia } from 'src/app/utils/historia-helpers'; // ⬅️ NUEVO
import { PrintService } from 'src/app/services/print-service';

type RowState = {
  open: boolean;
  loading: boolean;
  error?: string | null;
  detalle?: HistoriaDetalleDTO;
};

@Component({
  selector: 'app-historias-acordeon',
  templateUrl: './historial-medico.component.html',
  styleUrls: ['./historial-medico.component.css']
})
export class HistorialMedicoComponent implements OnInit {
  pacienteId!: number;
  paciente?: PacienteDTO;

  // lista básica
  historias: HistoriaResumenDTO[] = [];

  // estado por historiaId (para lazy load del detalle)
  rows: Record<number, RowState> = {};

  loadingLista = false;
  errorLista: string | null = null;

  // estado local para el botón
  exporting = false;

  /** ✅ Mapa opcional de idUsuario → nombre (lo alimentamos cuando llega detalle) */
  usuariosById: Record<string | number, string> = {};

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private api: HistoriaLecturaApiService,
    private pacientes: PacienteService,
    private printSvc: PrintService
  ) {}

  ngOnInit(): void {
    this.pacienteId = Number(this.route.snapshot.paramMap.get('pacienteId') || 0);
    if (!this.pacienteId) { this.errorLista = 'Paciente no válido'; return; }

    // Carga datos del paciente (para pintar header y exportar PDF)
    this.pacientes.getById(this.pacienteId).subscribe(p => this.paciente = p);

    this.cargarHistoriasResumen();
  }

  cargarHistoriasResumen(): void {
    this.loadingLista = true;
    this.errorLista = null;
    this.api.listarHistoriasResumen(this.pacienteId).subscribe({
      next: (res) => {
        // Ordena desc por fecha
        this.historias = (res || []).sort(
          (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        );

        // Inicializa filas
        this.rows = {};
        this.historias.forEach(h => {
          this.rows[h.id] = { open: false, loading: false, error: null, detalle: undefined };
        });

        this.loadingLista = false;

        // ⬇️ Prefetch de detalles + filtro de historias vacías (solo UI)
        this.prefetchYFiltraVacias();
      },
      error: (e) => {
        console.error(e);
        this.errorLista = 'No fue posible cargar las historias.';
        this.loadingLista = false;
      }
    });
  }

  /**
   * Carga en paralelo el DETALLE de cada historia para:
   *  - eliminar en la UI las historias vacías (esHistoriaVacia)
   *  - cachear el detalle de las no vacías y evitar recargas al abrir
   */
  private prefetchYFiltraVacias(): void {
    const ids = this.historias.map(h => h.id);
    if (!ids.length) return;

    const requests = ids.map(id =>
      this.api.obtenerDetalle(id).pipe(
        map(det => ({ id, det })),
        catchError(err => {
          console.warn('Detalle falló para historia', id, err);
          // Si falla, no la marcamos como vacía por precaución
          return of({ id, det: undefined as unknown as HistoriaDetalleDTO });
        })
      )
    );

    forkJoin(requests).subscribe({
      next: (results) => {
        const vacias = new Set<number>();

        results.forEach(({ id, det }) => {
          if (det) {
            // Guarda el detalle para no recargar al abrir
            const r = this.rows[id] || { open: false, loading: false };
            this.rows[id] = { ...r, detalle: det, loading: false, error: null };
            this.indexUserNames(det);

            // Marca como vacía si corresponde
            if (esHistoriaVacia(det as any)) {
              vacias.add(id);
            }
          }
        });

        if (vacias.size) {
          // Filtra lista visible
          this.historias = this.historias.filter(h => !vacias.has(h.id));
          // Limpia filas de las eliminadas
          for (const idStr of Object.keys(this.rows)) {
            const idNum = Number(idStr);
            if (vacias.has(idNum)) delete this.rows[idNum];
          }
        }
      },
      error: (e) => {
        console.error('Prefetch de detalles falló:', e);
        // No interrumpimos la UI; el acordeón seguirá cargando on-demand
      }
    });
  }

  toggleFila(h: HistoriaResumenDTO): void {
    const r = this.rows[h.id];
    if (!r) return;

    if (r.open) { r.open = false; return; }
    r.open = true;

    // si ya hay detalle, no recargues
    if (r.detalle) return;

    r.loading = true; r.error = null;

    this.api.obtenerDetalle(h.id).subscribe({
      next: (det) => {
        r.detalle = det;
        this.indexUserNames(det); // ✅ alimentar diccionario id→nombre
        r.loading = false;
      },
      error: (e) => {
        console.error(e);
        r.error = 'No fue posible cargar el detalle.';
        r.loading = false;
      }
    });
  }

  /** Indexa posibles nombres/ids que vengan en el detalle para resolver luego */
  private indexUserNames(det: HistoriaDetalleDTO) {
    const put = (id?: string | number | null, name?: string | null) => {
      if (id == null) return;
      const key = id;
      if (name && String(name).trim() && !this.usuariosById[key]) {
        this.usuariosById[key] = String(name).trim();
      }
    };

    // Si tu backend envía estos, descomenta:
    // put(det.usuarioId, det.usuarioNombre);

    det.antecedentesPatologicos?.forEach(ap => {
      // put(ap.usuarioId, ap.usuarioNombre);
      put(ap.usuarioId, undefined);
    });

    det.antecedentesPersonales?.forEach(ap => {
      // put(ap.usuarioId, ap.usuarioNombre);
      put(ap.usuarioId, undefined);
    });

    if (det.examenFisico) {
      // put(det.examenFisico.usuarioId, det.examenFisico.usuarioNombre);
      put(det.examenFisico.usuarioId, undefined);
    }

    det.diagnosticos?.forEach(dx => {
      // put(dx.usuarioId, dx.usuarioNombre);
      put(dx.usuarioId, undefined);
    });
  }

  /** Toma el primer profesional válido que aparezca en los detalles cargados */
/** Toma el primer profesional válido disponible (PrintService → detalles) */
private pickProfesionalParaPDF():
  { nombre?: string; numeroRegistroMedico?: string } | undefined {

  // 1) Prioriza lo que dejó la pantalla de Fórmula (si ya se imprimió ahí)
  const fromPrint = (this.printSvc as any)?.getProfesional?.();
  if (fromPrint && (fromPrint.numeroRegistroMedico || fromPrint.registro || fromPrint.nombre)) {
    return {
      nombre: fromPrint.nombre,
      numeroRegistroMedico: fromPrint.numeroRegistroMedico ?? fromPrint.registro
    };
  }

  // 2) Busca en el detalle de cada historia (varias rutas comunes)
  for (const h of this.historias) {
    const det: any = this.rows[h.id]?.detalle;
    if (!det) continue;

    // Ruta directa (la ideal)
    const p1 = det?.profesional;
    const num1 = p1?.numeroRegistroMedico ?? p1?.registro;

    if (p1 && (p1?.nombre || num1)) {
      return {
        nombre: p1?.nombre ?? h?.usuarioNombre ?? undefined,
        numeroRegistroMedico: (num1 ?? det?.numeroRegistroMedico ?? det?.registroMedico) || undefined,
      };
    }

    // Algunas APIs lo embeben en el primer diagnóstico
    const p2 = det?.diagnosticos?.[0]?.profesional;
    const num2 = p2?.numeroRegistroMedico ?? p2?.registro;
    if (p2 && (p2?.nombre || num2)) {
      return {
        nombre: p2?.nombre ?? h?.usuarioNombre ?? undefined,
        numeroRegistroMedico: num2 || undefined,
      };
    }

    // Fallbacks sueltos en el detalle
    const num3 = det?.numeroRegistroMedico ?? det?.registroMedico;
    if (num3) {
      return {
        nombre: h?.usuarioNombre ?? undefined,
        numeroRegistroMedico: num3,
      };
    }
  }

  // 3) Último recurso: al menos el nombre del registrador
  const first = this.historias[0];
  if (first?.usuarioNombre) return { nombre: first.usuarioNombre };
  return undefined;
}



  /** Devuelve un nombre amigable para un id de usuario */
  userNameById(id?: string | number | null): string {
    if (id === null || id === undefined) return '—';
    return this.usuariosById[id] || `Usuario ${id}`;
  }

  /**
   * Nombre final del registrador para una historia:
   * - Prioriza h.usuarioNombre (del resumen)
   * - Si no hay, intenta con algún id presente en el detalle
   */
  registradorNombre(h: HistoriaResumenDTO, det?: HistoriaDetalleDTO): string {
    if (h?.usuarioNombre && h.usuarioNombre.trim()) return h.usuarioNombre.trim();

    // Elegimos el primer id "razonable" del detalle (ajústalo a tus DTO si tienes un id “principal”):
    const candidateId =
      det?.examenFisico?.usuarioId
      ?? det?.antecedentesPersonales?.[0]?.usuarioId
      ?? det?.antecedentesPatologicos?.[0]?.usuarioId
      ?? det?.diagnosticos?.[0]?.['usuarioId'];

    return this.userNameById(candidateId);
  }

  trackById(_i: number, item: HistoriaResumenDTO) { return item.id; }

  safe(value: any): string {
    return (value === null || value === undefined || value === '') ? '—' : String(value);
  }

  hasGO(ap: any): boolean {
    return [ap?.gestas, ap?.partos, ap?.abortos, ap?.cesareas, ap?.vivos, ap?.mortinatos]
      .some(v => v !== null && v !== undefined);
  }

  /** ===== Helpers de exportación ===== */
  private nz(v: string | null | undefined): string | undefined { return v ?? undefined; }
  private toHistoriaDet(det: HistoriaDetalleDTO | undefined): any { return det as unknown as any; }

  /** ====== EXPORTAR PDF ====== */
  exportarPDF(): void {
    if (!this.historias.length) return;
    this.exporting = true;

    const requests = this.historias
      .filter(h => !this.rows[h.id]?.detalle)
      .map(h =>
        this.api.obtenerDetalle(h.id).pipe(
          map(det => ({ id: h.id, det })),
          catchError(err => {
            console.error('Error cargando detalle', h.id, err);
            return of({ id: h.id, det: undefined as unknown as HistoriaDetalleDTO });
          })
        )
      );

      const done = () => {
        const payload = this.historias.map(h => ({
          id: h.id,
          fecha: h.fecha,
          usuarioNombre: this.nz(h.usuarioNombre),
          motivoConsulta: this.nz(h.motivoConsulta),
          detalle: this.toHistoriaDet(this.rows[h.id]?.detalle)
        }));
      
        const pacienteInfo = {
          id: this.pacienteId,
          nombreCompleto: this.paciente?.nombreCompleto,
          apellidoCompleto: this.paciente?.apellidoCompleto,
          identificacion: this.paciente?.identificacion,
          fechaNacimiento: this.paciente?.fechaNacimiento,
        };
      
        // 👇 NUEVO: profesional para el PDF
        const medicoParam = this.pickProfesionalParaPDF();
        // (opcional) log para verificar
        console.log('Historial — medicoParam enviado al PDF:', medicoParam);
      
        // 👇 PÁSALO como 3er argumento
        exportarHistorialPDF(pacienteInfo, payload, medicoParam);
      
        this.exporting = false;
      };
      

    if (!requests.length) { done(); return; }

    forkJoin(requests).subscribe({
      next: (results) => {
        results.forEach(r => {
          if (r.det) {
            this.rows[r.id] = {
              ...(this.rows[r.id] || { open: false, loading: false }),
              detalle: r.det,
              loading: false,
              error: null
            };
            this.indexUserNames(r.det);
          }
        });
        done();
      },
      error: (e) => {
        console.error('Error en carga masiva de detalles', e);
        done();
      }
    });
  }

  /* ========= NUEVO: helper usado por el template para calcular edad ========= */
  edad(fecha?: string | Date | null): number | null {
    if (!fecha) return null;
    const f = new Date(fecha);
    if (isNaN(f.getTime())) return null;
    const hoy = new Date();
    let e = hoy.getFullYear() - f.getFullYear();
    const m = hoy.getMonth() - f.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < f.getDate())) e--;
    return e;
  }

  nombreApellido(p?: { nombreCompleto?: string | null; apellidoCompleto?: string | null }): string {
    if (!p) return '—';
    const nombre = (p.nombreCompleto ?? '').trim();
    const apellido = (p.apellidoCompleto ?? '').trim();
    if (nombre && apellido) return `${nombre} ${apellido}`;
    if (nombre) return nombre;
    if (apellido) return apellido;
    return '—';
  }

  /* ✅ Lista de síntomas (booleans verdaderos → etiquetas) */
syms(ap: any): string[] {
  if (!ap) return [];
  const map: [keyof any, string][] = [
    ['covid', 'COVID-19'],
    ['cefalea', 'Cefalea'],
    ['tos', 'Tos'],
    ['rinorrea', 'Rinorrea'],
    ['mialgia', 'Mialgia'],
    ['dolorToraxico', 'Dolor torácico'],
    ['nausea', 'Náusea'],
    ['vomito', 'Vómito'],
    ['fiebre', 'Fiebre'],
    ['odinofagia', 'Odinofagia'],
    ['disnea', 'Disnea'],
    ['anosmia', 'Anosmia'],
    ['conjuntivitis', 'Conjuntivitis'],
    ['diarrea', 'Diarrea'],
    ['disgeusia', 'Disgeusia'],
  ];
  return map.filter(([k]) => ap?.[k] === true).map(([, label]) => label);
}

/* ✅ Flags extra (si aplica) */
flags(ap: any): string[] {
  if (!ap) return [];
  const out: string[] = [];
  if (ap.sintomaticoRespiratorio) out.push('Sintomático respiratorio');
  if (ap.sintomaticoPiel) out.push('Sintomático de piel');
  if (ap.victimaViolencia) out.push('Víctima de violencia');
  return out;
}

/* ✅ Texto de revisión/observaciones (soporta nombre alterno si cambiara en el backend) */
revisionTexto(ap: any): string {
  return String(ap?.revisionSintoma ?? ap?.revisionPorSistemas ?? ap?.observaciones ?? '')
    .trim();
}

/** Texto legible para el diagnóstico (combina código + descripción si existen) */
diagnosticoTexto(dx: any): string {
  if (!dx) return '—';
  const codigo =
    dx.codigo ??
    dx.codigoCIE ??
    dx.codigoDiagnostico ??
    dx.cie10 ??
    dx.cie ??
    null;

  const desc =
    dx.descripcion ??
    dx.diagnostico ??
    dx.nombreDiagnostico ??
    dx.descripcionDiagnostico ??
    dx.cie10Descripcion ??
    null;

  if (codigo && desc) return `${codigo} — ${desc}`;
  return (desc || codigo || '—').toString();
}

volverAlMenu(): void {
  this.router.navigate(['/menu-principal']);
}


}
