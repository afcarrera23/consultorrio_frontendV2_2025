import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface Page<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number; // página actual (0-based)
}

export interface UsuarioDTO {
  id?: number;
  nombreUsuario: string;
  contrasena: string;
  nombreMedico: string;
  apellidoMedico: string;
  rol: number;                 // admin = 4 en tu sistema
  fechaRegistro?: string;      // opcional

  // 👉 nuevos campos de la tabla
  descripcionMedicaUno?: string;
  descripcionMedicaDos?: string;
  registroMedico?: string;

  // 👉 firma como base64 para lectura o URL de backend
  firmaBase64?: string;
}

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private base = 'http://localhost:8080/api/usuarios';

  constructor(private http: HttpClient) {}

  listar(q: string, page: number, size: number): Observable<Page<UsuarioDTO>> {
    const params = new HttpParams()
      .set('q', q || '')
      .set('page', page)
      .set('size', size);
    return this.http.get<Page<UsuarioDTO>>(this.base, { params });
  }

  crear(dto: Omit<UsuarioDTO, 'id' | 'fechaRegistro' | 'firmaBase64'>): Observable<UsuarioDTO> {
    return this.http.post<UsuarioDTO>(this.base, dto);
  }

  actualizar(id: number, dto: Partial<UsuarioDTO>): Observable<UsuarioDTO> {
    return this.http.put<UsuarioDTO>(`${this.base}/${id}`, dto);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  get(id: number): Observable<UsuarioDTO> {
    return this.http.get<UsuarioDTO>(`${this.base}/${id}`);
  }

  // 👉 subir firma (multipart/form-data)
  subirFirma(id: number, file: File): Observable<void> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<void>(`${this.base}/${id}/firma`, form);
  }

  // 👉 obtener la URL de la firma (para usar en <img src>)
  getFirmaUrl(id: number): string {
    return `${this.base}/${id}/firma`;
  }
}