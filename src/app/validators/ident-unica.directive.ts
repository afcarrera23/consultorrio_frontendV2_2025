import { Directive, Input } from '@angular/core';
import {
  AbstractControl,
  AsyncValidator,
  NG_ASYNC_VALIDATORS,
  ValidationErrors
} from '@angular/forms';
import { Observable, of, timer } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { PacienteService } from 'src/app/services/paciente.service';

@Directive({
  selector: '[identUnica][ngModel],[identUnica][formControlName],[identUnica][formControl]',
  providers: [
    { provide: NG_ASYNC_VALIDATORS, useExisting: IdentUnicaDirective, multi: true }
  ]
})
export class IdentUnicaDirective implements AsyncValidator {

  /** Permite desactivar validación cuando estás editando un paciente existente */
  @Input('identUnicaDisabled') identUnicaDisabled = false;

  constructor(private pacienteService: PacienteService) {}

  validate(control: AbstractControl): Observable<ValidationErrors | null> {
    if (this.identUnicaDisabled) return of(null);

    const raw = (control.value ?? '').toString().trim();
    if (!raw || raw.length < 3) return of(null); // evita llamadas triviales

    // debounce simple para no saturar el backend
    return timer(300).pipe(
      switchMap(() => this.pacienteService.existeIdentificacion(raw)),
      map(resp => (resp?.exists ? { duplicado: true } : null)),
      catchError(() => of(null)) // en error de red, no bloquear al usuario
    );
  }
}
