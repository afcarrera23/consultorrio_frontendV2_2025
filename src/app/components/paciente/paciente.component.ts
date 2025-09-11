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
    edad: 0,
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

  constructor(
    private pacienteService: PacienteService,
    private router: Router,
    private registroTemp: RegistroTempService
  ) {}

  ngOnInit(): void {
    // Precarga si existe guardado/draft
    const guardado = this.registroTemp.obtenerPaciente();
    if (guardado) this.paciente = { ...this.paciente, ...guardado };

    // Asegura usuarioRegistroId
    if (!this.paciente.usuarioRegistroId) {
      const usuarioId = Number(localStorage.getItem('usuarioId'));
      if (usuarioId > 0) this.paciente.usuarioRegistroId = usuarioId;
      else console.warn('⚠ No se encontró un usuarioId válido en localStorage');
    }
  }

  /** Paso 1 → Paso 2 */
  siguientePanelAntecedentes(): void {
    // guarda siempre el estado actual
    this.registroTemp.guardarPaciente(this.paciente);

    // si ya se registró antes y tiene id, no re-posteamos
    const idExistente = (this.paciente as any).id;
    if (idExistente) {
      this.router.navigate([`/antecedente-patologico/${idExistente}`]);
      return;
    }

    // registrar contra /registrar-con-antecedentes
    this.isSubmitting = true;
    this.pacienteService.registrar(this.paciente).subscribe({
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
  }

  @HostListener('document:keydown.escape')
  onEsc() { if (this.isPopupOpen) this.cerrarPopup(); }
}
