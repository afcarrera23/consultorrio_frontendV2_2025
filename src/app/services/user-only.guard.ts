import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class UserOnlyGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/iniciar-sesion']);
      return false;
    }
    // Si es admin (4), NO entra a rutas normales
    if (this.auth.isAdmin()) {
      this.router.navigate(['/admin/medicamento']);
      return false;
    }
    return true; // usuario normal
  }
}
