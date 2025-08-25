import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-popup',
  templateUrl: './popup.component.html',
  styleUrls: ['./popup.component.css']
})
export class PopupComponent {

  // Inputs para personalizar el mensaje y los botones
  @Input() message: string = '¿Estás seguro de que quieres continuar?';
  @Input() confirmText: string = 'Confirmar';
  @Input() cancelText: string = 'Cancelar';

  // Outputs para emitir los eventos de confirmación y cancelación
  @Output() onConfirm = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();

  // Métodos para emitir los eventos
  confirmAction() {
    this.onConfirm.emit();
  }

  cancelAction() {
    this.onCancel.emit();
  }
}
