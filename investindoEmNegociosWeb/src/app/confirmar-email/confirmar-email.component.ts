import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-confirmar-email',
  standalone: true,
  imports: [],
  templateUrl: './confirmar-email.component.html',
  styleUrls: ['./confirmar-email.component.scss']
})
export class ConfirmarEmailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  ngOnInit(): void {
    // Confirma SÓ no browser: evita a dupla execução do SSR (token é de uso único) e a página
    // em branco. Faz a confirmação nos bastidores e leva o usuário para o login com uma mensagem.
    if (!this.isBrowser) return;

    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.router.navigate(['/login'], { queryParams: { confirmError: '1' } });
      return;
    }
    this.auth.confirmEmail(token).subscribe({
      next: () => this.router.navigate(['/login'], { queryParams: { confirmed: '1' } }),
      error: () => this.router.navigate(['/login'], { queryParams: { confirmError: '1' } })
    });
  }
}
