import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { IniciarSesionComponent } from './iniciar-sesion/iniciar-sesion.component';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MenuPrincipalComponent } from './menu-principal/menu-principal.component';
import { HeaderComponent } from './header/header.component';
import { CerrarSesionComponent } from './cerrar-sesion/cerrar-sesion.component';
import { PopupComponent } from './popup/popup.component';
import { PacienteComponent } from './components/paciente/paciente.component';
import { AntecedentePatologicoComponent } from './components/antecedente-patologico/antecedente-patologico.component';
import { AntecedentePersonalComponent } from './components/antecedente-personal/antecedente-personal.component';
import { ExamenFisicoComponent } from './components/examen-fisico/examen-fisico.component';

@NgModule({
  declarations: [
    AppComponent,
    IniciarSesionComponent,
    MenuPrincipalComponent,
    HeaderComponent,
    CerrarSesionComponent,
    PopupComponent,
    PacienteComponent,
    AntecedentePatologicoComponent,
    AntecedentePersonalComponent,
    ExamenFisicoComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
