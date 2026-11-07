import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

/**
 * Honest placeholder: invoice/billing models and APIs are not implemented in this codebase.
 * Keeps navigation complete without presenting a fake working financial module.
 */
@Component({
  selector: 'app-finance-invoices',
  imports: [RouterLink],
  template: `
    <header class="page-head">
      <div>
        <h1>Invoices</h1>
        <p class="muted">Financial Management — status of platform capability</p>
      </div>
    </header>

    <section class="panel pad">
      <div class="status-banner">
        <span class="badge s-draft">Not Implemented</span>
        <h2>Invoice generation is not available yet</h2>
        <p class="muted">
          THE GLOBAL ICON does not currently ship Prisma models, NestJS endpoints, or Angular forms
          for invoice generation, payment status, or billing records. Advertising campaigns and
          enquiries are available; financial documents are a planned capability.
        </p>
      </div>

      <h3>Related working modules</h3>
      <ul class="related-list">
        @if (auth.can('ads.manage')) {
          <li><a routerLink="/ads">Campaigns &amp; analytics</a> — placement performance</li>
        }
        @if (auth.can('enquiries.view') || auth.can('enquiries.manage')) {
          <li><a routerLink="/enquiries">Advertiser enquiries</a> — inbound commercial requests</li>
        }
        @if (auth.can('api_inbox.view')) {
          <li><a routerLink="/api-inbox">API Inbox</a> — operational failures (including future payment integrations)</li>
        }
      </ul>
    </section>
  `,
  styles: `
    .status-banner {
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 16px 18px;
      background: linear-gradient(180deg, #fafbfd, #fff);
      margin-bottom: 18px;
    }
    .status-banner h2 {
      margin: 10px 0 6px;
      font-size: 17px;
    }
    .related-list {
      margin: 0;
      padding-left: 1.1rem;
      line-height: 1.7;
    }
  `,
})
export class FinanceInvoicesComponent {
  protected readonly auth = inject(AuthService);
}
