import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PacienteRegistroDTO } from 'src/app/models/paciente.model';
import { AntecedentePersonalDTO } from 'src/app/models/antecedente-personal.model';
import { PacienteService } from 'src/app/services/paciente.service';
import { RegistroTempService } from 'src/app/services/registro-temporal';
import { AuthService } from 'src/app/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-antecedente-personal',
  templateUrl: './antecedente-personal.component.html',
  styleUrls: ['./antecedente-personal.component.css']
})
export class AntecedentePersonalComponent implements OnInit {

  paciente: PacienteRegistroDTO | null = null;

  antecedentePersonal: AntecedentePersonalDTO = {
    pacienteId: 0,
    antecedentesPersonales: '',
    antecedentesFamiliares: '',
    ginecoObstetricos: '',
    gestas: 0,
    partos: 0,
    abortos: 0,
    cesareas: 0,
    vivos: 0,
    mortinatos: 0,
    fechaConsulta: new Date().toISOString().slice(0,16),
    usuarioId: 0
  };

  /** Estado del popup */
  isPopupOpen = false;

  constructor(
    private router: Router,
    private registroTemp: RegistroTempService,
    private pacienteService: PacienteService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const medico = this.authService.getMedicoLogueado();
    if (!medico) {
      this.router.navigate(['/iniciar-sesion']);
      return;
    }
  
    this.paciente = this.registroTemp.obtenerPaciente();
    if (!this.paciente) {
      this.router.navigate(['/registro-paciente']);
      return;
    }
  
    this.antecedentePersonal.pacienteId = this.paciente.id || 0; // ✅ ID real
    this.antecedentePersonal.usuarioId = medico.id;
  
    console.log("Paciente cargado en AntecedentePersonal:", this.paciente);
  }  

  guardarYContinuar(): void {
    if (!this.paciente) {
      alert("❌ Error: No se encontró el paciente.");
      return;
    }
  
    console.log("Guardando antecedente personal temporal:", this.antecedentePersonal);
    this.registroTemp.guardarAntecedentePersonal(this.antecedentePersonal);
  
    // Redirigir al examen físico
    this.router.navigate([`/examen-fisico/${this.paciente.id}`]);
  }

    /** Antes navegabas directo; ahora solo abre el popup */
    abrirPopupCancelar() {
      this.isPopupOpen = true;
    }
  
    /** Cierra el popup sin salir */
    cerrarPopup() {
      this.isPopupOpen = false;
    }
  
    /** Si el usuario confirma, navega fuera (abandonar) */
    confirmarSalida() {
      this.isPopupOpen = false;
      this.router.navigate(['/menu-principal']);
    }
  
    /** Si en algún lugar aún llamas a cancelar(), redirige a abrir el popup */
    cancelar() {
      this.abrirPopupCancelar();
    }
  
    /** UX extra: tecla ESC cierra el popup */
    @HostListener('document:keydown.escape')
    onEsc() {
      if (this.isPopupOpen) this.cerrarPopup();
    }
  
}
