import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HistoriaDetalleDTO, HistoriaResumenDTO } from 'src/app/models/historia-medica-lectura.model';
import { HistoriaLecturaApiService } from 'src/app/services/historia-lectura.service';

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

  // lista básica
  historias: HistoriaResumenDTO[] = [];

  // estado por historiaId (para lazy load del detalle)
  rows: Record<number, RowState> = {};

  loadingLista = false;
  errorLista: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private api: HistoriaLecturaApiService
  ) {}

  ngOnInit(): void {
    this.pacienteId = Number(this.route.snapshot.paramMap.get('pacienteId') || 0);
    if (!this.pacienteId) {
      this.errorLista = 'Paciente no válido';
      return;
    }
    this.cargarHistoriasResumen();
  }

  cargarHistoriasResumen(): void {
    this.loadingLista = true;
    this.errorLista = null;
    this.api.listarHistoriasResumen(this.pacienteId).subscribe({
      next: (res) => {
        // el back ya viene ordenado por fecha desc, pero por si acaso:
        this.historias = (res || []).sort(
          (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        );
        // inicializa estados
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

    if (r.open) {
      // cerrar
      r.open = false;
      return;
    }

    // abrir
    r.open = true;

    // si ya hay detalle, no recargues
    if (r.detalle) return;

    r.loading = true;
    r.error = null;

    this.api.obtenerDetalle(h.id).subscribe({
      next: (det) => {
        r.detalle = det;
        r.loading = false;
      },
      error: (e) => {
        console.error(e);
        r.error = 'No fue posible cargar el detalle.';
        r.loading = false;
      }
    });
  }

  trackById(_i: number, item: HistoriaResumenDTO) { return item.id; }

  safe(value: any): string {
    // Muestra “—” para null/undefined/'' y deja pasar 0 o cadenas con texto
    return (value === null || value === undefined || value === '') ? '—' : String(value);
  }
  
  hasGO(ap: any): boolean {
    return [ap?.gestas, ap?.partos, ap?.abortos, ap?.cesareas, ap?.vivos, ap?.mortinatos]
      .some(v => v !== null && v !== undefined);
  }
  
}
