import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MedicamentoDTO, MedicamentoService, Page } from 'src/app/services/medicamento-service';

@Component({
  selector: 'app-medicamento',
  templateUrl: './medicamento.component.html',
  styleUrls: ['./medicamento.component.css'],
})
export class MedicamentoComponent implements OnInit {
  form!: FormGroup;
  editId: number | null = null;

  // listado y paginación
  q = '';
  page = 0;
  size = 10;
  data: Page<MedicamentoDTO> | null = null;
  loading = false;
  errorMsg = '';
  successMsg = '';

  constructor(private fb: FormBuilder, private service: MedicamentoService) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      nombreMedicamento: ['', [Validators.required, Validators.maxLength(255)]],
    });
    this.cargar();
  }

  // ---- CRUD ----
  submit(): void {
    this.clearMessages();
    if (this.form.invalid) {
      this.errorMsg = 'Por favor completa correctamente el formulario.';
      return;
    }
    const nombre = this.form.value.nombreMedicamento.trim();

    this.loading = true;
    if (this.editId == null) {
      // crear
      this.service.crear(nombre).subscribe({
        next: () => {
          this.successMsg = 'Medicamento creado correctamente.';
          this.form.reset();
          this.cargar();
        },
        error: (err) => {
          this.handleError(err, 'No se pudo crear el medicamento.');
        },
        complete: () => (this.loading = false),
      });
    } else {
      // actualizar
      this.service.actualizar(this.editId, nombre).subscribe({
        next: () => {
          this.successMsg = 'Medicamento actualizado.';
          this.cancelarEdicion();
          this.cargar();
        },
        error: (err) => {
          this.handleError(err, 'No se pudo actualizar el medicamento.');
        },
        complete: () => (this.loading = false),
      });
    }
  }

  editar(item: MedicamentoDTO): void {
    this.clearMessages();
    this.editId = item.id ?? null;
    this.form.patchValue({ nombreMedicamento: item.nombreMedicamento });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  eliminar(item: MedicamentoDTO): void {
    this.clearMessages();
    if (!item.id) return;
    const ok = confirm(`¿Eliminar "${item.nombreMedicamento}"?`);
    if (!ok) return;

    this.loading = true;
    this.service.eliminar(item.id).subscribe({
      next: () => {
        this.successMsg = 'Medicamento eliminado.';
        // si la página queda vacía, retrocede una página si es posible
        if (this.data && this.data.content.length === 1 && this.page > 0) {
          this.page -= 1;
        }
        this.cargar();
      },
      error: (err) => this.handleError(err, 'No se pudo eliminar el medicamento.'),
      complete: () => (this.loading = false),
    });
  }

  cancelarEdicion(): void {
    this.editId = null;
    this.form.reset();
  }

  // ---- Listado / búsqueda / paginación ----
  cargar(): void {
    this.loading = true;
    this.service.listar(this.q, this.page, this.size).subscribe({
      next: (res) => (this.data = res),
      error: (err) => this.handleError(err, 'Error al cargar la lista.'),
      complete: () => (this.loading = false),
    });
  }

  buscar(): void {
    this.page = 0;
    this.cargar();
  }

  siguiente(): void {
    if (this.data && this.page < this.data.totalPages - 1) {
      this.page += 1;
      this.cargar();
    }
  }

  anterior(): void {
    if (this.page > 0) {
      this.page -= 1;
      this.cargar();
    }
  }

  // ---- utils ----
  clearMessages(): void {
    this.errorMsg = '';
    this.successMsg = '';
  }

  handleError(err: any, fallback: string): void {
    const msg =
      err?.error?.message ||
      err?.error?.error ||
      err?.message ||
      err?.statusText ||
      fallback;
    this.errorMsg = msg;
    console.error(err);
  }

  get isEditing(): boolean {
    return this.editId != null;
  }
}
