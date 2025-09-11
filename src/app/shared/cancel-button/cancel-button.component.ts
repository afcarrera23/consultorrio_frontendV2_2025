import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-cancel-button',
  templateUrl: './cancel-button.component.html',
  styleUrls: ['./cancel-button.component.css']
})
export class CancelButtonComponent {
  /** Texto del botón (por defecto: "Cancelar") */
  @Input() label: string = 'Cancelar';

  /** Evento cuando el usuario hace clic */
  @Output() cancelClick = new EventEmitter<void>();

  onClick() {
    this.cancelClick.emit();
  }
}
