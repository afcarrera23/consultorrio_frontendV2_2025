import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, tap } from 'rxjs';
import { LoginRequest } from '../interfaces/login-request';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/api';
  private medicoLogueado: any = null;
  private readonly STORAGE_KEY = 'medico'; // constante para evitar errores de escritura

  constructor(private http: HttpClient) {}

  // ✅ Login y almacenamiento en localStorage
  login(data: LoginRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, data).pipe(
      tap((response: any) => {
        if (response?.nombreMedico && response?.apellidoMedico && response?.id) {
          this.medicoLogueado = {
            id: response.id,
            nombre: response.nombreMedico,
            apellido: response.apellidoMedico,
            nombreUsuario: response.nombreUsuario || '',
            rol: response.rol || 0
          };
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.medicoLogueado));
        } else {
          console.warn('⚠️ La respuesta del login no contiene datos válidos del médico');
        }
      }),
      catchError((error) => {
        console.error('❌ Error en el inicio de sesión:', error);
        throw error;
      })
    );
  }

  // ✅ Devuelve true si hay médico en localStorage
  isLoggedIn(): boolean {
    return localStorage.getItem(this.STORAGE_KEY) !== null;
  }

  // ✅ Obtiene los datos del médico logueado
  getMedicoLogueado(): any {
    if (!this.medicoLogueado) {
      const medicoData = localStorage.getItem(this.STORAGE_KEY);
      if (medicoData) {
        this.medicoLogueado = JSON.parse(medicoData);
      }
    }
    return this.medicoLogueado;
  }

  // ✅ Cierra la sesión y limpia todo
  logout(): void {
    this.medicoLogueado = null;
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
