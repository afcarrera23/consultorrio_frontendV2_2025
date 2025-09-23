// src/app/pages/paciente/paciente.component.ts
import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PacienteRegistroDTO } from 'src/app/models/paciente.model';
import { PacienteService } from 'src/app/services/paciente.service';
import { RegistroTempService } from 'src/app/services/registro-temporal';

@Component({
  selector: 'app-paciente',
  templateUrl: './paciente.component.html',
  styleUrls: ['./paciente.component.css']
})
export class PacienteComponent implements OnInit {
  paciente: PacienteRegistroDTO = {
    identificacion: '',
    tipoIdentificacion: '',
    // ⬇️ nuevo
    fechaNacimiento: '', // ISO (YYYY-MM-DD). Úsalo con <input type="date">
    // ⬇️ ahora opcional
    edad: undefined,

    nombreCompleto: '',
    apellidoCompleto: '',
    genero: '',
    profesion: '',
    numeroTelefono: '',
    nombreAcompanante: '',
    direccion: '',
    correo: '',
    usuarioRegistroId: 0,
    antecedentesPatologicos: [],
    antecedentePersonal: []
  };

  isPopupOpen = false;
  isSubmitting = false;

  // Para limitar el datepicker
  todayISO = '';

  constructor(
    private pacienteService: PacienteService,
    private router: Router,
    private registroTemp: RegistroTempService
  ) {}

  ngOnInit(): void {
    this.todayISO = new Date().toISOString().slice(0, 10);

    const guardado = this.registroTemp.obtenerPaciente();
    if (guardado) this.paciente = { ...this.paciente, ...guardado };

    if (!this.paciente.usuarioRegistroId) {
      const usuarioId = Number(localStorage.getItem('usuarioId'));
      if (usuarioId > 0) this.paciente.usuarioRegistroId = usuarioId;
      else console.warn('⚠ No se encontró un usuarioId válido en localStorage');
    }
  }

  /** Edad calculada para mostrar (no obligatoria para el back) */
  get edadCalculada(): number | null {
    const fn = this.paciente.fechaNacimiento;
    if (!fn) return null;
    // fn debe ser 'YYYY-MM-DD'
    const [y, m, d] = fn.split('-').map(Number);
    if (!y || !m || !d) return null;
    const hoy = new Date();
    let edad = hoy.getFullYear() - y;
    const cumpleEsteAño = new Date(hoy.getFullYear(), m - 1, d);
    if (hoy < cumpleEsteAño) edad -= 1;
    return edad < 0 ? null : edad;
  }

  onFechaChange() {
    // opcional: si quieres reflejar la edad calculada en el modelo
    // sin enviarla al backend:
    this.paciente.edad = this.edadCalculada ?? undefined;
  }

  /** Paso 1 → Paso 2 */
  siguientePanelAntecedentes(): void {
    // guarda draft
    this.registroTemp.guardarPaciente(this.paciente);

    const idExistente = (this.paciente as any).id;
    if (idExistente) {
      this.router.navigate([`/antecedente-patologico/${idExistente}`]);
      return;
    }

    // construir payload: si hay fechaNacimiento, NO mandar edad
    const payload: PacienteRegistroDTO = { ...this.paciente };
    if (payload.fechaNacimiento) {
      delete payload.edad; // el back la calculará
    }

    this.isSubmitting = true;
    this.pacienteService.registrar(payload).subscribe({
      next: (respuesta) => {
        const nuevoId = (respuesta as any).id;
        const pacienteConId = { ...this.paciente, id: nuevoId };
        this.registroTemp.guardarPaciente(pacienteConId);
        this.isSubmitting = false;
        this.router.navigate([`/antecedente-patologico/${nuevoId}`]);
      },
      error: (err) => {
        console.error('❌ Error al registrar paciente (crear id):', err);
        this.isSubmitting = false;
        alert('Error al registrar paciente');
      }
    });
  }

  /* ===== Popup cancelar ===== */
  abrirPopupCancelar() { this.isPopupOpen = true; }
  cerrarPopup() { this.isPopupOpen = false; }
  confirmarSalida() {
    this.isPopupOpen = false;
    this.router.navigate(['/menu-principal']);
    this.registroTemp.limpiarPaciente();
  }

  @HostListener('document:keydown.escape')
  onEsc() { if (this.isPopupOpen) this.cerrarPopup(); }
}
