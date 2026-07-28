import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';

type ConfirmState = 'loading' | 'success' | 'error';

@Component({
  selector: 'app-confirmar-email',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './confirmar-email.component.html',
  styleUrls: ['./confirmar-email.component.scss']
})
export class ConfirmarEmailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  state: ConfirmState = 'loading';

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.state = 'error';
      return;
    }
    this.auth.confirmEmail(token).subscribe({
      next: () => {
        this.state = 'success';
      },
      error: () => {
        this.state = 'error';
      }
    });
  }
}
