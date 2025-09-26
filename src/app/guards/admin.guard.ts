import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/iniciar-sesion']);
      return false;
    }
    if (this.auth.isAdmin()) {
      return true; // rol=4
    }
    // Si no es admin, redirige al panel normal
    this.router.navigate(['/menu-principal']);
    return false;
  }
}
