import { Component, input } from '@angular/core';

/** Honest notice for capabilities the Nest API does not expose yet. */
@Component({
  selector: 'app-api-pending',
  template: `
    <div class="alert alert-pending" role="note">
      <strong>API pending</strong>
      <span>{{ text() }}</span>
    </div>
  `,
})
export class ApiPendingComponent {
  readonly text = input.required<string>();
}
