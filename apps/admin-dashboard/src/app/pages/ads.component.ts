import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { AdminApiService } from '../core/admin-api.service';
import { Advertisement, AdsReport, Paginated } from '../core/models';
import { errorMessage, humanize } from '../core/util';

@Component({
  selector: 'app-ads',
  imports: [DatePipe],
  template: `
    <header class="page-head">
      <div>
        <h1>Advertising</h1>
        <p class="muted">Campaign placements and aggregate performance.</p>
      </div>
      <button type="button" class="btn btn-ghost" (click)="load()" [disabled]="loading()">Refresh</button>
    </header>

    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }

    @if (report(); as r) {
      <div class="stat-grid compact">
        <div class="stat-card gold">
          <div class="stat-label">Impressions</div>
          <div class="stat-value">{{ totalImpressions(r) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Clicks</div>
          <div class="stat-value">{{ totalClicks(r) }}</div>
        </div>
      </div>
    }

    <section class="panel">
      <div class="panel-head"><h2>Campaigns</h2></div>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr><th>Title</th><th>Advertiser</th><th>Placement</th><th>Active</th><th>Window</th></tr>
          </thead>
          <tbody>
            @for (a of items(); track a.id) {
              <tr>
                <td><strong>{{ a.title }}</strong></td>
                <td>{{ a.advertiser }}</td>
                <td>{{ label(a.placement) }}</td>
                <td>
                  <span [class]="'badge ' + (a.isActive ? 's-published' : 's-draft')">
                    {{ a.isActive ? 'Active' : 'Off' }}
                  </span>
                </td>
                <td class="muted small">
                  {{ a.startsAt ? (a.startsAt | date: 'mediumDate') : '—' }}
                  →
                  {{ a.endsAt ? (a.endsAt | date: 'mediumDate') : '—' }}
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="empty-cell">{{ loading() ? 'Loading…' : 'No advertisement campaigns yet.' }}</td></tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export class AdsComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  protected readonly items = signal<Advertisement[]>([]);
  protected readonly report = signal<AdsReport | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  protected label(v: string): string {
    return humanize(v);
  }

  protected totalImpressions(r: AdsReport): number {
    if (r.totals?.impressions != null) return r.totals.impressions;
    const items = (r as { items?: Array<{ impressions?: number }> }).items;
    return (items ?? []).reduce((sum, row) => sum + (row.impressions ?? 0), 0);
  }

  protected totalClicks(r: AdsReport): number {
    if (r.totals?.clicks != null) return r.totals.clicks;
    const items = (r as { items?: Array<{ clicks?: number }> }).items;
    return (items ?? []).reduce((sum, row) => sum + (row.clicks ?? 0), 0);
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.listAdvertisements().subscribe({
      next: (res) => {
        const list = Array.isArray(res) ? res : (res as Paginated<Advertisement>).items;
        this.items.set(list ?? []);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
    this.api.adsReport().subscribe({
      next: (r) => this.report.set(r),
      error: () => this.report.set(null),
    });
  }
}
