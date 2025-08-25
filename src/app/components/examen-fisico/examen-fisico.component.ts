import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { PacienteRegistroDTO } from 'src/app/models/paciente.model';
import { ExamenFisicoDTO } from 'src/app/models/examen-fisico.model';
import { PacienteService } from 'src/app/services/paciente.service';
import { RegistroTempService } from 'src/app/services/registro-temporal';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-examen-fisico',
  templateUrl: './examen-fisico.component.html',
  styleUrls: ['./examen-fisico.component.css']
})
export class ExamenFisicoComponent implements OnInit {

  paciente: PacienteRegistroDTO | null = null;

  examenFisico: ExamenFisicoDTO = {
    pacienteId: 0,
    tensionSistolica: '',
    tensionDiastolica: '',
    frecuenciaRespiratoria: '',
    temperatura: '',
    peso: 0,
    talla: 0,
    imc: 0,
    aspectoGeneral: '',
    craneoDetalle: '',
    ojosDetalle: '',
    oidoDetalle: '',
    cuelloDetalle: '',
    cardioPulmonarDetalle: '',
    senosDetalle: '',
    abdomenDetalle: '',
    genitalesDetalle: '',
    examenRectalDetalle: '',
    neurologicoDetalle: '',
    extremidadesOsteoarticularDetalle: '',
    otrosHallazgos: '',
    usuarioId: 0, 
    saturacion: '',
    perimetroCefalico: 0,
    frecuenciaCardiaca: ''
  };

  isSaving = false;
  
  constructor(
    private pacienteService: PacienteService,
    private registroTemp: RegistroTempService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.paciente = this.registroTemp.obtenerPaciente();
    if (!this.paciente) {
      alert('❌ Error: No hay paciente cargado.');
      this.router.navigate(['/registro-paciente']);
      return;
    }

    // ✅ Asignamos IDs al examen físico
    this.examenFisico.pacienteId = this.paciente.id || 0;
    this.examenFisico.usuarioId = this.paciente.usuarioRegistroId;
  }

  guardarTodo(): void {
    if (this.isSaving) return; // evita doble clic
    this.isSaving = true;
  
    // 1) Validaciones mínimas
    if (!this.paciente || !this.paciente.id) {
      this.isSaving = false;
      alert('❌ No hay paciente cargado. Primero registra el paciente en el paso anterior.');
      return;
    }
  
    const pacienteId = this.paciente.id;
    // Usa tu fuente real de usuario (ej. AuthService) si aplica:
    const usuarioId = this.paciente.usuarioRegistroId;

  
    // 2) Completa/calcula datos del examen (ej. IMC)
    if (this.examenFisico?.peso > 0 && this.examenFisico?.talla > 0) {
      const tallaM = this.examenFisico.talla / 100;
      this.examenFisico.imc = Number((this.examenFisico.peso / (tallaM * tallaM)).toFixed(2));
    }
  
    // 3) Armar las llamadas SOLO de agregado (no crear paciente otra vez)
    const calls = [];
  
    // Antecedentes patológicos (si tienes un servicio/estado temporal, úsalo aquí)
    const antPatologicos = this.registroTemp.obtenerAntecedentes() || [];
    for (const ant of antPatologicos) {
      calls.push(
        this.pacienteService.agregarAntecedentePatologico({
          ...ant,
          pacienteId,
          usuarioId
        })
      );
    }
  
    // Antecedentes personales
    // Antecedentes personales
const antPersonalesRaw = this.registroTemp.obtenerAntecedentesPersonales() || [];

console.log('🟦 antPersonales length:', antPersonalesRaw.length);
console.log('🟦 antPersonales sample[0]:', antPersonalesRaw[0]);

// Normaliza campos clave antes de enviar
const antPersonales = antPersonalesRaw.map(p => ({
  ...p,
  pacienteId,                 // fuerza el id real del paciente
  usuarioId,                  // unifica el usuario con el que estás usando en el resto
  // Fecha ISO completa con segundos y Z (evita el slice(0,16))
  fechaConsulta: p.fechaConsulta 
    ? new Date(p.fechaConsulta).toISOString()
    : new Date().toISOString()
}));

console.log('🟩 antPersonales normalizados:', antPersonales);

for (const antp of antPersonales) {
  calls.push(this.pacienteService.agregarAntecedentePersonal(antp));
}

  
    // Examen físico
    calls.push(
      this.pacienteService.registrarExamenFisico({
        ...this.examenFisico,
        pacienteId,
        usuarioId
      })
    );
  
    // 4) Ejecutar en paralelo y finalizar
    forkJoin(calls).subscribe({
      next: () => {
        this.isSaving = false;
        alert('✅ Información guardada correctamente.');
        // Limpia temporales si corresponde:
        this.registroTemp.limpiarPaciente?.();
        // Navega donde necesites:
        this.router.navigate(['/menu-principal']);
      },
      error: (err) => {
        console.error('❌ Error guardando datos:', err);
        this.isSaving = false;
        alert('❌ Ocurrió un error guardando los datos. Revisa la consola.');
      }
    });
  }
  

  calcularIMC(): void {
    const peso = this.examenFisico.peso || 0;
    let talla = this.examenFisico.talla || 0;
  
    if (peso > 0 && talla > 0) {
      talla = talla / 100; // convertir cm a m
      this.examenFisico.imc = +(peso / (talla * talla)).toFixed(2); // IMC con 2 decimales
    } else {
      this.examenFisico.imc = 0;
    }
  }
  
}
