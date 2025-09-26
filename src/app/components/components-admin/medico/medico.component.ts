import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Page, UsuarioDTO, UsuarioService } from 'src/app/services/usuario-service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-medico',
  templateUrl: './medico.component.html',
  styleUrls: ['./medico.component.css']
})
export class MedicoComponent implements OnInit {
  form!: FormGroup;
  editId: number | null = null;

  // listado / búsqueda / paginación
  q = '';
  page = 0;
  size = 10;
  data: Page<UsuarioDTO> | null = null;

  // UI
  loading = false;
  errorMsg = '';
  successMsg = '';
  showPasswords = false;

  // firma
  firmaPreview: string | null = null; // dataURL para preview local o url del backend
  firmaToUpload: File | null = null;

  constructor(private fb: FormBuilder, 
              public service: UsuarioService,
              private router: Router) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      nombreUsuario: ['', [Validators.required, Validators.maxLength(255)]],
      contrasena: ['', [Validators.required, Validators.maxLength(255)]],
      nombreMedico: ['', [Validators.required, Validators.maxLength(255)]],
      apellidoMedico: ['', [Validators.required, Validators.maxLength(255)]],
      rol: [1, [Validators.required, Validators.min(1)]], // admin = 4
      descripcionMedicaUno: ['', [Validators.maxLength(255)]],
      descripcionMedicaDos: ['', [Validators.maxLength(255)]],
      registroMedico: ['', [Validators.maxLength(255)]],
      // firmaFile no viaja al backend en JSON, solo para (change) del input file
      firmaFile: [null],
    });

    this.cargar();
  }

  // --- CRUD ---
  submit(): void {
    this.clearMessages();
    if (this.form.invalid) {
      this.errorMsg = 'Por favor completa correctamente el formulario.';
      return;
    }

    const payload = {
      nombreUsuario: this.form.value.nombreUsuario,
      contrasena: this.form.value.contrasena,
      nombreMedico: this.form.value.nombreMedico,
      apellidoMedico: this.form.value.apellidoMedico,
      rol: this.form.value.rol,
      descripcionMedicaUno: this.form.value.descripcionMedicaUno || null,
      descripcionMedicaDos: this.form.value.descripcionMedicaDos || null,
      registroMedico: this.form.value.registroMedico || null,
    } as Omit<UsuarioDTO, 'id' | 'fechaRegistro' | 'firmaBase64'>;

    this.loading = true;

    if (this.editId == null) {
      this.service.crear(payload).subscribe({
        next: (created) => {
          this.successMsg = 'Usuario creado correctamente.';
          // Subir firma si se eligió un archivo
          this.afterSaveUploadFirmaIfNeeded(created.id!);
          this.form.reset({ rol: 1 });
          this.firmaPreview = null;
          this.firmaToUpload = null;
          this.cargar();
        },
        error: (err) => this.handleError(err, 'No se pudo crear el usuario.'),
        complete: () => (this.loading = false),
      });
    } else {
      this.service.actualizar(this.editId, payload).subscribe({
        next: (updated) => {
          this.successMsg = 'Usuario actualizado.';
          this.afterSaveUploadFirmaIfNeeded(updated.id!);
          this.cancelarEdicion();
          this.cargar();
        },
        error: (err) => this.handleError(err, 'No se pudo actualizar el usuario.'),
        complete: () => (this.loading = false),
      });
    }
  }

  editar(item: UsuarioDTO): void {
    this.clearMessages();
    this.editId = item.id ?? null;
    this.form.patchValue({
      nombreUsuario: item.nombreUsuario,
      contrasena: item.contrasena,
      nombreMedico: item.nombreMedico,
      apellidoMedico: item.apellidoMedico,
      rol: item.rol,
      descripcionMedicaUno: item.descripcionMedicaUno || '',
      descripcionMedicaDos: item.descripcionMedicaDos || '',
      registroMedico: item.registroMedico || '',
    });
  
    this.firmaPreview = null;
    this.firmaToUpload = null;
  
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  

  eliminar(item: UsuarioDTO): void {
    this.clearMessages();
    if (!item.id) return;
    const ok = confirm(`¿Eliminar al usuario "${item.nombreUsuario}"?`);
    if (!ok) return;

    this.loading = true;
    this.service.eliminar(item.id).subscribe({
      next: () => {
        this.successMsg = 'Usuario eliminado.';
        if (this.data && this.data.content.length === 1 && this.page > 0) {
          this.page -= 1;
        }
        this.cargar();
      },
      error: (err) => this.handleError(err, 'No se pudo eliminar el usuario.'),
      complete: () => (this.loading = false),
    });
  }

  cancelarEdicion(): void {
    this.editId = null;
    this.form.reset({ rol: 1 });
    this.firmaPreview = null;
    this.firmaToUpload = null;
  }

  // --- Firma ---
  onFirmaChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) { this.firmaToUpload = null; this.firmaPreview = null; return; }
    this.firmaToUpload = file;

    // preview local
    const reader = new FileReader();
    reader.onload = () => this.firmaPreview = reader.result as string;
    reader.readAsDataURL(file);
  }

  private afterSaveUploadFirmaIfNeeded(id: number) {
    if (!this.firmaToUpload) return;
    this.loading = true;
    this.service.subirFirma(id, this.firmaToUpload).subscribe({
      next: () => {
        this.successMsg = (this.successMsg ? this.successMsg + ' ' : '') + 'Firma actualizada.';
      },
      error: (err) => this.handleError(err, 'No se pudo subir la firma.'),
      complete: () => { this.loading = false; this.firmaToUpload = null; }
    });
  }

  // --- listado / búsqueda / paginación ---
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

  // --- utilidades ---
  togglePasswords() { this.showPasswords = !this.showPasswords; }

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

  irAMedicamentos(): void {
    this.router.navigate(['/admin/medicamento']); // o ['/medicamentos'] según tu ruta
  }
}