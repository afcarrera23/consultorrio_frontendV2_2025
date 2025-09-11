import { Component, HostListener, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { PacienteRegistroDTO } from 'src/app/models/paciente.model';
import { AntecedentePatologicoDTO } from 'src/app/models/antecedente-patologico.model';
import { RegistroTempService } from 'src/app/services/registro-temporal';

@Component({
  selector: 'app-antecedente-patologico',
  templateUrl: './antecedente-patologico.component.html',
  styleUrls: ['./antecedente-patologico.component.css']
})
export class AntecedentePatologicoComponent implements OnInit {

  paciente: PacienteRegistroDTO | null = null;
  antecedente: AntecedentePatologicoDTO = {
    pacienteId: 0,
    motivoConsulta: '',
    enfermedadActual: '',
    medicamentoActual: '',
    covid: false,
    cefalea: false,
    tos: false,
    rinorrea: false,
    mialgia: false,
    dolorToraxico: false,
    nausea: false,
    vomito: false,
    fiebre: false,
    odinofagia: false,
    disnea: false,
    anosmia: false,
    conjuntivitis: false,
    diarrea: false,
    disgeusia: false,
    sintomaticoRespiratorio: false,
    sintomaticoPiel: false,
    victimaViolencia: false,
    fechaConsulta: new Date().toISOString().slice(0,16),
    usuarioId: 0,
    revisionSintoma: ''
  };

   /** Estado del popup */
   isPopupOpen = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private registroTemp: RegistroTempService
  ) {}

  ngOnInit(): void {
    const pacienteId = Number(this.route.snapshot.paramMap.get('pacienteId'));
    this.paciente = this.registroTemp.obtenerPaciente();

    if (!this.paciente || this.paciente.id !== pacienteId) {
      console.error('⚠ Paciente no coincide. Redirigiendo a registro...');
      this.router.navigate(['/registro-paciente']);
      return;
    }

    // Asignar IDs al antecedente
    this.antecedente.pacienteId = this.paciente.id!;
    this.antecedente.usuarioId = this.paciente.usuarioRegistroId;

    console.log("Paciente temporal cargado:", this.paciente);
    console.log("Antecedente inicial:", this.antecedente);
  }

  guardarYContinuar(): void {
    console.log("Guardando antecedente temporal:", this.antecedente);
    this.registroTemp.guardarAntecedente(this.antecedente);
    this.router.navigate([`/antecedente-personal/${this.paciente?.id}`]);
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
