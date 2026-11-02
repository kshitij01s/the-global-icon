import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forbidden',
  imports: [RouterLink],
  template: `
    <div class="empty-state">
      <h1>No access</h1>
      <p class="muted">Your role does not include permission to view this page.</p>
      <a class="btn btn-primary" routerLink="/">Back to dashboard</a>
    </div>
  `,
})
export class ForbiddenComponent {}
