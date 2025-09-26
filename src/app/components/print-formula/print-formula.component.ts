import { Component, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormulaMedica, PrintService } from 'src/app/services/print-service';



@Component({
  selector: 'app-print-formula',
  templateUrl: './print-formula.component.html',
  styleUrls: ['./print-formula.component.css']
})
export class PrintFormulaComponent implements AfterViewInit {
  data: FormulaMedica | null = null;

  constructor(private printSvc: PrintService, private router: Router) {
    this.data = this.printSvc.consume();
    if (!this.data) this.router.navigate(['/']);
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      window.print();
    }, 0);
  }

  volverMenu(): void {
    this.router.navigate(['/menu-principal']); // 👈 ajusta la ruta real de tu menú
  }

  reimprimir(): void {
    window.print();
  }
}
