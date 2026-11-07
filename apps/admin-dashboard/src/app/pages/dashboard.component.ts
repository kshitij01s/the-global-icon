import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminApiService } from '../core/admin-api.service';
import { ApiInboxAlertsService } from '../core/api-inbox-alerts.service';
import { AuthService } from '../core/auth.service';
import { DashboardStats } from '../core/models';
import { errorMessage, humanize } from '../core/util';

interface StatCard {
  label: string;
  value: number;
  hint?: string;
  link?: { path: string; perm: string };
  tone?: 'gold' | 'warn';
}

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, RouterLink],
  template: `
    <header class="page-head">
      <div>
        <h1>Dashboard</h1>
        <p class="muted">Welcome back, {{ auth.displayName() }}.</p>
      </div>
      <button type="button" class="btn btn-ghost" (click)="load()" [disabled]="loading()">Refresh</button>
    </header>

    @if (auth.allows(apiInboxAccess) && inbox.openCount() > 0) {
      <a class="ops-strip" routerLink="/api-inbox" [class.critical]="inbox.criticalCount() > 0">
        <strong>{{ inbox.openCount() }} API issue{{ inbox.openCount() === 1 ? '' : 's' }} require attention</strong>
        @if (inbox.criticalCount() > 0) {
          <span>{{ inbox.criticalCount() }} Critical integration failure{{ inbox.criticalCount() === 1 ? '' : 's' }}</span>
        }
      </a>
    }

    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }

    @if (loading() && !stats()) {
      <div class="stat-grid">
        @for (n of [1, 2, 3, 4, 5, 6, 7, 8]; track n) {
          <div class="stat-card skeleton"></div>
        }
      </div>
    }

    @if (stats(); as s) {
      <div class="stat-grid">
        @for (c of cards(); track c.label) {
          <div class="stat-card" [class.gold]="c.tone === 'gold'" [class.warn]="c.tone === 'warn' && c.value > 0">
            <div class="stat-label">{{ c.label }}</div>
            <div class="stat-value">{{ c.value }}</div>
            @if (c.hint) {
              <div class="stat-hint">{{ c.hint }}</div>
            }
            @if (c.link && auth.can(c.link.perm)) {
              <a class="stat-link" [routerLink]="c.link.path">View →</a>
            }
          </div>
        }
      </div>

      <section class="panel">
        <div class="panel-head">
          <h2>Recent enquiries</h2>
          <span class="muted small">Generated {{ s.generatedAt | date: 'medium' }}</span>
        </div>
        @if (s.recentEnquiries.length === 0) {
          <p class="muted pad">No enquiries have been submitted yet.</p>
        } @else {
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr><th>Reference</th><th>From</th><th>Type</th><th>Status</th><th>Submitted</th></tr>
              </thead>
              <tbody>
                @for (e of s.recentEnquiries; track e.reference) {
                  <tr>
                    <td><code>{{ e.reference }}</code></td>
                    <td>{{ e.fullName }}<div class="muted small">{{ e.company }}</div></td>
                    <td>{{ label(e.enquiryType) }}</td>
                    <td><span class="badge" [class]="'badge s-' + e.status.toLowerCase()">{{ label(e.status) }}</span></td>
                    <td>{{ e.submittedAt | date: 'medium' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    }
  `,
})
export class DashboardComponent {
  private readonly api = inject(AdminApiService);
  protected readonly auth = inject(AuthService);
  protected readonly inbox = inject(ApiInboxAlertsService);
  protected readonly apiInboxAccess = { anyPermissions: ['api_inbox.view', 'api_inbox.manage'] };

  protected readonly stats = signal<DashboardStats | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly label = humanize;

  protected readonly cards = computed<StatCard[]>(() => {
    const s = this.stats();
    if (!s) return [];
    return [
      { label: 'Magazines', value: s.magazines.total, hint: `${s.magazines.published} published · ${s.magazines.draft} draft`, link: { path: '/magazines', perm: 'magazines.read_admin' }, tone: 'gold' },
      { label: 'Magazines in review', value: s.magazines.inReview, tone: 'warn' },
      { label: 'Demo editions', value: s.magazines.demo, hint: 'Flagged as demo content' },
      { label: 'Stories', value: s.articles.total, hint: `${s.articles.published} published`, link: { path: '/articles', perm: 'articles.update' } },
      { label: 'Stories in review', value: s.articles.inReview, tone: 'warn' },
      { label: 'Leaders', value: s.leaders.total, hint: `${s.leaders.published} published`, link: { path: '/leaders', perm: 'leaders.manage' } },
      { label: 'Enquiries', value: s.enquiries.total, hint: `${s.enquiries.new} new`, link: { path: '/enquiries', perm: 'enquiries.view' } },
      { label: 'New enquiries', value: s.enquiries.new, tone: 'warn' },
      { label: 'Users', value: s.users.total, link: { path: '/users', perm: 'users.manage' } },
      { label: 'Newsletter subscribers', value: s.newsletter.activeSubscribers, hint: 'Active' },
      { label: 'Active advertisements', value: s.advertisements.active },
    ];
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.dashboard().subscribe({
      next: (s) => {
        this.stats.set(s);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }
}
