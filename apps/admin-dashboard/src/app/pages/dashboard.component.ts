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

interface WorkflowLink {
  title: string;
  blurb: string;
  path: string;
  perm: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, RouterLink],
  template: `
    <header class="page-head">
      <div>
        <h1>{{ heading() }}</h1>
        <p class="muted">{{ subtitle() }}</p>
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

      <section class="panel pad mb">
        <h2>Operational workflows</h2>
        <p class="muted small mb-sm">Jump into the connected publishing and business paths available on this console.</p>
        <div class="workflow-grid">
          @for (w of workflows(); track w.path) {
            <a class="workflow-card" [routerLink]="w.path">
              <strong>{{ w.title }}</strong>
              <span class="muted small">{{ w.blurb }}</span>
            </a>
          }
        </div>
      </section>

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
          @if (auth.can('enquiries.view') || auth.can('enquiries.manage')) {
            <div class="pad"><a routerLink="/enquiries">Open all enquiries →</a></div>
          }
        }
      </section>
    }
  `,
  styles: `
    .mb { margin-bottom: 1rem; }
    .mb-sm { margin-bottom: 12px; }
    .workflow-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 10px;
    }
    .workflow-card {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 12px 14px;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: linear-gradient(180deg, #fbfbfd, #fff);
      color: inherit;
      text-decoration: none;
    }
    .workflow-card:hover {
      border-color: #c9b48a;
      text-decoration: none;
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

  protected readonly heading = computed(() =>
    this.auth.hasRole('SUPER_ADMIN') ? 'Global Overview' : 'Dashboard',
  );
  protected readonly subtitle = computed(() =>
    this.auth.hasRole('SUPER_ADMIN')
      ? `Platform overview for ${this.auth.displayName()}. Live counts from PostgreSQL.`
      : `Welcome back, ${this.auth.displayName()}. Live counts from the shared API.`,
  );

  protected readonly cards = computed<StatCard[]>(() => {
    const s = this.stats();
    if (!s) return [];
    return [
      {
        label: 'Magazines',
        value: s.magazines.total,
        hint: `${s.magazines.published} published · ${s.magazines.draft} draft`,
        link: { path: '/magazines', perm: 'magazines.read_admin' },
        tone: 'gold',
      },
      { label: 'Magazines in review', value: s.magazines.inReview, tone: 'warn', link: { path: '/magazines', perm: 'magazines.read_admin' } },
      { label: 'Demo editions', value: s.magazines.demo, hint: 'Flagged as demo content', link: { path: '/editions', perm: 'magazines.read_admin' } },
      {
        label: 'Stories',
        value: s.articles.total,
        hint: `${s.articles.published} published`,
        link: { path: '/articles', perm: 'articles.read_admin' },
      },
      { label: 'Stories in review', value: s.articles.inReview, tone: 'warn', link: { path: '/articles', perm: 'articles.read_admin' } },
      {
        label: 'Leaders',
        value: s.leaders.total,
        hint: `${s.leaders.published} published`,
        link: { path: '/leaders', perm: 'leaders.manage' },
      },
      {
        label: 'Enquiries',
        value: s.enquiries.total,
        hint: `${s.enquiries.new} new`,
        link: { path: '/enquiries', perm: 'enquiries.view' },
      },
      { label: 'New enquiries', value: s.enquiries.new, tone: 'warn', link: { path: '/enquiries', perm: 'enquiries.view' } },
      { label: 'Users', value: s.users.total, link: { path: '/users', perm: 'users.manage' } },
      { label: 'Newsletter subscribers', value: s.newsletter.activeSubscribers, hint: 'Active' },
      {
        label: 'Active advertisements',
        value: s.advertisements.active,
        link: { path: '/ads', perm: 'ads.manage' },
      },
      {
        label: 'Open API issues',
        value: this.inbox.openCount(),
        hint: this.inbox.criticalCount() > 0 ? `${this.inbox.criticalCount()} critical` : 'Operational inbox',
        link: { path: '/api-inbox', perm: 'api_inbox.view' },
        tone: this.inbox.criticalCount() > 0 ? 'warn' : undefined,
      },
    ];
  });

  protected readonly workflows = computed<WorkflowLink[]>(() => {
    const all: WorkflowLink[] = [
      {
        title: 'Publish a magazine',
        blurb: 'Create → upload PDF → review → publish to the public site',
        path: '/magazines/new',
        perm: 'magazines.create',
      },
      {
        title: 'Edit website pages',
        blurb: 'CMS draft → publish → React site updates',
        path: '/pages/home',
        perm: 'pages.view',
      },
      {
        title: 'Manage stories',
        blurb: 'Draft, review, and publish editorial stories',
        path: '/articles',
        perm: 'articles.read_admin',
      },
      {
        title: 'Advertising pipeline',
        blurb: 'Enquiries → campaigns → performance report',
        path: '/enquiries',
        perm: 'enquiries.view',
      },
      {
        title: 'Festival themes',
        blurb: 'Studio → schedule → public activation',
        path: '/theme-studio',
        perm: 'themes.view',
      },
      {
        title: 'API Inbox',
        blurb: 'Acknowledge and resolve integration failures',
        path: '/api-inbox',
        perm: 'api_inbox.view',
      },
    ];
    return all.filter((w) => this.auth.can(w.perm));
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
    this.inbox.refresh();
  }
}
