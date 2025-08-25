import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { PacienteRegistroDTO } from 'src/app/models/paciente.model';
import { PacienteService } from 'src/app/services/paciente.service';
import { RegistroTempService } from 'src/app/services/registro-temporal';

@Component({
  selector: 'app-paciente',
  templateUrl: './paciente.component.html',
  styleUrls: ['./paciente.component.css']
})
export class PacienteComponent {
  @Input() paciente: PacienteRegistroDTO = {
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

  constructor(
    private pacienteService: PacienteService,
    private router: Router,
    private registroTemp: RegistroTempService
  ) {}

  ngOnInit(): void {
    const usuarioId = Number(localStorage.getItem('usuarioId'));
    if (usuarioId > 0) {
      this.paciente.usuarioRegistroId = usuarioId;
    } else {
      console.warn('⚠ No se encontró un usuarioId válido en localStorage');
    }
  }

  siguientePanelAntecedentes() {
    // Registrar paciente en backend
    this.pacienteService.registrar(this.paciente).subscribe({
      next: (respuesta) => {
        console.log('✅ Paciente registrado en backend:', respuesta);
  
        // Guardar paciente con ID real en el servicio temporal
        const pacienteConId = { ...this.paciente, id: respuesta.id };
        this.registroTemp.guardarPaciente(pacienteConId);
  
        // Redirigir al panel de antecedentes patológicos con el ID real
        this.router.navigate([`/antecedente-patologico/${respuesta.id}`]);
      },
      error: (err) => {
        console.error('❌ Error al registrar paciente:', err);
        alert('Error al registrar paciente');
      }
    });
  }
  
}
