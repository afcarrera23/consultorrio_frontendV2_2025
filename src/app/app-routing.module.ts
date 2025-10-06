import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { IniciarSesionComponent } from './iniciar-sesion/iniciar-sesion.component';
import { MenuPrincipalComponent } from './menu-principal/menu-principal.component';

import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';


import { PacienteComponent } from './components/paciente/paciente.component';
import { AntecedentePatologicoComponent } from './components/antecedente-patologico/antecedente-patologico.component';
import { AntecedentePersonalComponent } from './components/antecedente-personal/antecedente-personal.component';
import { ExamenFisicoComponent } from './components/examen-fisico/examen-fisico.component';
import { DiagnosticoComponent } from './components/diagnostico/diagnostico.component';
import { HistorialMedicoComponent } from './components/historial-medico/historial-medico.component';
import { PrintFormulaComponent } from './components/print-formula/print-formula.component';
import { UserOnlyGuard } from './services/user-only.guard';
import { MedicamentoComponent } from './components/components-admin/medicamento/medicamento.component';
import { MedicoComponent } from './components/components-admin/medico/medico.component';
import { FormulaMedicaFastComponent } from './components/formula-medica-fast/formula-medica-fast.component';

// 👇 Ajusta estas rutas de import a tu estructura real


const routes: Routes = [
  { path: 'iniciar-sesion', component: IniciarSesionComponent },

  // 🔒 Paneles NORMALES (bloqueados para admin=4)
  { path: 'menu-principal', component: MenuPrincipalComponent, canActivate: [AuthGuard, UserOnlyGuard] },
  { path: 'registro-paciente', component: PacienteComponent, canActivate: [AuthGuard, UserOnlyGuard] },
  { path: 'antecedente-patologico/:pacienteId', component: AntecedentePatologicoComponent, canActivate: [AuthGuard, UserOnlyGuard] },
  { path: 'antecedente-personal/:pacienteId', component: AntecedentePersonalComponent, canActivate: [AuthGuard, UserOnlyGuard] },
  { path: 'examen-fisico/:pacienteId', component: ExamenFisicoComponent, canActivate: [AuthGuard, UserOnlyGuard] },
  { path: 'diagnostico/:pacienteId', component: DiagnosticoComponent, canActivate: [AuthGuard, UserOnlyGuard] },
  { path: 'historial-medico/:pacienteId', component: HistorialMedicoComponent, canActivate: [AuthGuard, UserOnlyGuard] },
  { path: 'formula-nueva', component: FormulaMedicaFastComponent, canActivate: [AuthGuard, UserOnlyGuard] },
  { path: 'print', component: PrintFormulaComponent, canActivate: [AuthGuard, UserOnlyGuard] },
  { path: 'print', component: PrintFormulaComponent, data: { noHeader: true }, canActivate: [AuthGuard, UserOnlyGuard] },

  // 👑 Paneles ADMIN (solo rol=4)
  { path: 'admin/medicamento', component: MedicamentoComponent, canActivate: [AuthGuard, AdminGuard] },
  { path: 'admin/medico', component: MedicoComponent, canActivate: [AuthGuard, AdminGuard] },

  { path: '', redirectTo: 'iniciar-sesion', pathMatch: 'full' },
  { path: '**', redirectTo: 'iniciar-sesion' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
