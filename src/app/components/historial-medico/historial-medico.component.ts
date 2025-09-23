import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { HistoriaLecturaApiService } from 'src/app/services/historia-lectura.service';
import { PacienteService } from 'src/app/services/paciente.service';

import { HistoriaDetalleDTO, HistoriaResumenDTO } from 'src/app/models/historia-medica-lectura.model';
import { PacienteDTO } from 'src/app/interfaces/PacienteDTO';
import { exportarHistorialPDF } from 'src/app/utils/pdf-historial.util';

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
    private route: ActivatedRoute,
    private api: HistoriaLecturaApiService,
    private pacientes: PacienteService
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
        this.historias = (res || []).sort(
          (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        );
        // inicializa filas
        this.rows = {};
        this.historias.forEach(h => {
          this.rows[h.id] = { open: false, loading: false, error: null, detalle: undefined };
        });
        this.loadingLista = false;
      },
      error: (e) => {
        console.error(e);
        this.errorLista = 'No fue posible cargar las historias.';
        this.loadingLista = false;
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

    // Ajusta a lo que realmente trae tu backend:
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
        identificacion: this.paciente?.identificacion,
        fechaNacimiento: this.paciente?.fechaNacimiento,
      };

      exportarHistorialPDF(pacienteInfo, payload);
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
}
