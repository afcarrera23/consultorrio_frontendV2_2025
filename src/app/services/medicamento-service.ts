import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MedicamentoDTO {
  id?: number;
  nombreMedicamento: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // página actual (0-based)
  size: number;
}

@Injectable({ providedIn: 'root' })
export class MedicamentoService {
  // Admin CRUD (si lo tienes)
  private readonly adminBase = 'http://localhost:8080/api/admin/medicamentos';
  // Público para autocompletar
  private readonly publicBase = 'http://localhost:8080/api/medicamentos';

  constructor(private http: HttpClient) {}

  // ===== Admin CRUD =====
  listar(q = '', page = 0, size = 10): Observable<Page<MedicamentoDTO>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (q && q.trim().length) params = params.set('q', q.trim());
    return this.http.get<Page<MedicamentoDTO>>(this.adminBase, { params });
  }

  obtener(id: number): Observable<MedicamentoDTO> {
    return this.http.get<MedicamentoDTO>(`${this.adminBase}/${id}`);
  }

  crear(nombreMedicamento: string): Observable<MedicamentoDTO> {
    const body: MedicamentoDTO = { nombreMedicamento: nombreMedicamento.trim() };
    return this.http.post<MedicamentoDTO>(this.adminBase, body);
  }

  actualizar(id: number, nombreMedicamento: string): Observable<MedicamentoDTO> {
    const body: MedicamentoDTO = { id, nombreMedicamento: nombreMedicamento.trim() };
    return this.http.put<MedicamentoDTO>(`${this.adminBase}/${id}`, body);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.adminBase}/${id}`);
  }

  // ===== Público (autocomplete) =====
  suggest(q: string, page = 0, size = 10): Observable<Page<MedicamentoDTO>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (q && q.trim()) params = params.set('q', q.trim());
    // Importante: endpoint público
    return this.http.get<Page<MedicamentoDTO>>(`${this.publicBase}/suggest`, { params });
  }
}
