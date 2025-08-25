import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { IniciarSesionComponent } from './iniciar-sesion/iniciar-sesion.component';
import { MenuPrincipalComponent } from './menu-principal/menu-principal.component';

import { AuthGuard } from './guards/auth.guard';
import { PacienteComponent } from './components/paciente/paciente.component';
import { AntecedentePatologicoComponent } from './components/antecedente-patologico/antecedente-patologico.component';
import { AntecedentePersonalComponent } from './components/antecedente-personal/antecedente-personal.component';
import { ExamenFisicoComponent } from './components/examen-fisico/examen-fisico.component';

const routes: Routes = [
  { path: 'iniciar-sesion', component: IniciarSesionComponent },
  { path: 'menu-principal', component: MenuPrincipalComponent, canActivate: [AuthGuard] },
  { path: 'registro-paciente', component: PacienteComponent, canActivate: [AuthGuard] },
  { path: 'antecedente-patologico/:pacienteId', component: AntecedentePatologicoComponent, canActivate: [AuthGuard] },
  { path: 'antecedente-personal/:pacienteId', component: AntecedentePersonalComponent, canActivate: [AuthGuard] },
  { path: 'examen-fisico/:pacienteId', component: ExamenFisicoComponent, canActivate: [AuthGuard] },
  { path: '', redirectTo: 'iniciar-sesion', pathMatch: 'full' }, // redirección por defecto
  { path: '**', redirectTo: 'iniciar-sesion' } // ruta para errores
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
