import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (this.authService.isLoggedIn()) {
      return true;
    } else {
      // Opcional: mostrar una alerta si quieres
      alert('Tu sesión ha expirado. Por favor, inicia sesión.');
      this.router.navigate(['/iniciar-sesion']);
      return false;
    }
  }
}
