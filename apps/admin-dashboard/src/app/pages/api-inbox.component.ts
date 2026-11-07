import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AdminApiService,
  ApiInboxItem,
  ApiInboxQuery,
} from '../core/admin-api.service';
import { ApiInboxAlertsService } from '../core/api-inbox-alerts.service';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';
import { errorMessage, humanize } from '../core/util';

@Component({
  selector: 'app-api-inbox',
  imports: [FormsModule, DatePipe],
  template: `
    <header class="page-head">
      <div>
        <h1>API Inbox</h1>
        <p class="muted">Integration Monitoring &amp; Operations Error Management</p>
      </div>
      <div class="row-actions">
        @if (canManage()) {
          <button type="button" class="btn btn-ghost" (click)="simulate('storage')">Simulate storage</button>
        }
        <button type="button" class="btn btn-ghost" (click)="load()" [disabled]="loading()">Refresh</button>
      </div>
    </header>

    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }

    <div class="stat-grid inbox-stats">
      <div class="stat-card"><div class="stat-label">Open Issues</div><div class="stat-value">{{ summary().open }}</div></div>
      <div class="stat-card warn" [class.warn]="summary().critical > 0">
        <div class="stat-label">Critical</div><div class="stat-value">{{ summary().critical }}</div>
      </div>
      <div class="stat-card"><div class="stat-label">Warning</div><div class="stat-value">{{ summary().warning }}</div></div>
      <div class="stat-card"><div class="stat-label">Acknowledged</div><div class="stat-value">{{ summary().acked }}</div></div>
      <div class="stat-card"><div class="stat-label">Resolved (page)</div><div class="stat-value">{{ summary().resolved }}</div></div>
    </div>

    <section class="panel pad filters">
      <div class="filter-row">
        <label class="field"><span>Status</span>
          <select [(ngModel)]="filters.status" (ngModelChange)="load()">
            <option value="">All</option>
            <option value="OPEN">Open</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </label>
        <label class="field"><span>Severity</span>
          <select [(ngModel)]="filters.severity" (ngModelChange)="load()">
            <option value="">All</option>
            <option value="CRITICAL">Critical</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
          </select>
        </label>
        <label class="field"><span>Category</span>
          <input [(ngModel)]="filters.category" (keyup.enter)="load()" placeholder="e.g. rss" />
        </label>
        <label class="field"><span>Source</span>
          <input [(ngModel)]="filters.source" (keyup.enter)="load()" placeholder="service name" />
        </label>
        <label class="field grow"><span>Search</span>
          <input [(ngModel)]="filters.search" (keyup.enter)="load()" placeholder="Title, error, entity…" />
        </label>
        <button type="button" class="btn btn-primary" (click)="load()">Apply</button>
      </div>
    </section>

    <section class="panel">
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Source</th>
              <th>Category</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Occurrences</th>
              <th>First Seen</th>
              <th>Last Seen</th>
              <th>Linked Entity</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @if (loading() && items().length === 0) {
              <tr><td colspan="10" class="muted pad">Loading…</td></tr>
            } @else if (items().length === 0) {
              <tr><td colspan="10" class="muted pad">No incidents match these filters.</td></tr>
            } @else {
              @for (row of items(); track row.id) {
                <tr (click)="open(row)" class="clickable">
                  <td><strong>{{ row.title }}</strong></td>
                  <td class="small">{{ row.source }}</td>
                  <td><code>{{ row.category }}</code></td>
                  <td>
                    <span class="sev" [attr.data-sev]="row.severity">{{ row.severity }}</span>
                  </td>
                  <td>
                    <span class="badge" [attr.data-st]="row.status">{{ statusLabel(row.status) }}</span>
                  </td>
                  <td>{{ row.occurrenceCount }}</td>
                  <td class="small">{{ row.createdAt | date: 'medium' }}</td>
                  <td class="small">{{ row.lastSeenAt | date: 'medium' }}</td>
                  <td class="small">
                    @if (row.entityType) {
                      {{ row.entityType }}{{ row.entityId ? ': ' + row.entityId : '' }}
                    } @else {
                      —
                    }
                  </td>
                  <td><button type="button" class="btn btn-ghost btn-sm" (click)="open(row); $event.stopPropagation()">View</button></td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
      <div class="pager pad">
        <button type="button" class="btn btn-ghost btn-sm" [disabled]="page() <= 1" (click)="page.set(page() - 1); load()">Prev</button>
        <span class="muted small">Page {{ page() }} of {{ pageCount() }} · {{ total() }} total</span>
        <button type="button" class="btn btn-ghost btn-sm" [disabled]="page() >= pageCount()" (click)="page.set(page() + 1); load()">Next</button>
      </div>
    </section>

    @if (selected(); as item) {
      <div class="drawer-scrim" (click)="selected.set(null)"></div>
      <aside class="drawer" role="dialog" aria-label="Incident detail">
        <header class="drawer-head">
          <div>
            <h2>{{ item.title }}</h2>
            <p class="muted small">{{ item.source }} · {{ item.category }}</p>
          </div>
          <button type="button" class="icon-btn" (click)="selected.set(null)" aria-label="Close">×</button>
        </header>

        <div class="drawer-body">
          <div class="meta-grid">
            <div><span class="muted">Severity</span><div><span class="sev" [attr.data-sev]="item.severity">{{ item.severity }}</span></div></div>
            <div><span class="muted">Status</span><div>{{ statusLabel(item.status) }}</div></div>
            <div><span class="muted">Occurrences</span><div>{{ item.occurrenceCount }}</div></div>
            <div><span class="muted">First seen</span><div class="small">{{ item.createdAt | date: 'medium' }}</div></div>
            <div><span class="muted">Last seen</span><div class="small">{{ item.lastSeenAt | date: 'medium' }}</div></div>
            <div><span class="muted">Entity</span><div class="small">{{ item.entityType || '—' }} {{ item.entityId || '' }}</div></div>
          </div>

          <h3>Technical details</h3>
          <pre class="tech">{{ item.technicalError }}</pre>
          <button type="button" class="btn btn-ghost btn-sm" (click)="copy(item.technicalError)">Copy error</button>

          <h3>Customer message</h3>
          <p>{{ item.customerMessage }}</p>

          <h3>Metadata</h3>
          <pre class="tech">{{ metaJson(item) }}</pre>
          <button type="button" class="btn btn-ghost btn-sm" (click)="copy(metaJson(item))">Copy JSON</button>

          <h3>Operator notes</h3>
          <textarea rows="4" [(ngModel)]="notes" [disabled]="!canManage()"></textarea>
          <div class="muted small hist">
            @if (item.acknowledgedAt) {
              <div>Acknowledged {{ item.acknowledgedAt | date: 'medium' }}@if (item.acknowledgedById) { by {{ item.acknowledgedById }}}</div>
            }
            @if (item.resolvedAt) {
              <div>Resolved {{ item.resolvedAt | date: 'medium' }}@if (item.resolvedById) { by {{ item.resolvedById }}}</div>
            }
          </div>

          @if (canManage()) {
            <div class="drawer-actions">
              @if (item.status === 'OPEN') {
                <button type="button" class="btn btn-primary" (click)="ack()">Acknowledge</button>
              }
              @if (item.status !== 'RESOLVED') {
                <button type="button" class="btn btn-primary" (click)="resolve()">Resolve</button>
              }
              @if (item.status === 'RESOLVED') {
                <button type="button" class="btn btn-ghost" (click)="reopen()">Reopen</button>
              }
              <button type="button" class="btn btn-ghost" (click)="saveNotes()">Save notes</button>
            </div>
          }
        </div>
      </aside>
    }
  `,
  styles: `
    .inbox-stats { margin-bottom: 1rem; }
    .filters { margin-bottom: 1rem; }
    .filter-row { display: flex; flex-wrap: wrap; gap: 10px; align-items: end; }
    .field.grow { flex: 1; min-width: 180px; }
    .row-actions { display: flex; gap: 8px; }
    .clickable { cursor: pointer; }
    .clickable:hover { background: #f8f9fc; }
    .sev {
      display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 650; letter-spacing: 0.04em;
    }
    .sev[data-sev='CRITICAL'] { background: var(--danger-bg); color: var(--danger); }
    .sev[data-sev='WARNING'] { background: var(--warn-bg); color: var(--warn); }
    .sev[data-sev='INFO'] { background: #eef0f5; color: var(--muted); }
    .badge[data-st='OPEN'] { background: var(--danger-bg); color: var(--danger); }
    .badge[data-st='ACKNOWLEDGED'] { background: var(--warn-bg); color: var(--warn); }
    .badge[data-st='RESOLVED'] { background: var(--ok-bg); color: var(--ok); }
    .pager { display: flex; align-items: center; justify-content: space-between; }
    .drawer-scrim { position: fixed; inset: 0; background: rgba(20, 28, 46, 0.35); z-index: 40; }
    .drawer {
      position: fixed; top: 0; right: 0; width: min(480px, 100%); height: 100vh; background: var(--surface);
      z-index: 50; box-shadow: -8px 0 24px rgba(20, 28, 46, 0.12); display: flex; flex-direction: column;
    }
    .drawer-head { display: flex; justify-content: space-between; gap: 12px; padding: 16px 18px; border-bottom: 1px solid var(--line); }
    .drawer-body { padding: 16px 18px; overflow: auto; flex: 1; }
    .drawer-body h3 { margin: 18px 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .tech {
      background: #0f1522; color: #d7deee; padding: 12px; border-radius: 6px; font: 12px/1.45 ui-monospace, Menlo, Consolas, monospace;
      white-space: pre-wrap; word-break: break-word; max-height: 220px; overflow: auto;
    }
    textarea { width: 100%; border: 1px solid var(--line); border-radius: 6px; padding: 8px; font: inherit; }
    .drawer-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
    .hist { margin-top: 8px; }
  `,
})
export class ApiInboxComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly alerts = inject(ApiInboxAlertsService);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);

  protected readonly items = signal<ApiInboxItem[]>([]);
  protected readonly selected = signal<ApiInboxItem | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly page = signal(1);
  protected readonly pageCount = signal(1);
  protected readonly total = signal(0);
  protected readonly summary = signal({ open: 0, critical: 0, warning: 0, acked: 0, resolved: 0 });
  protected notes = '';

  protected filters: ApiInboxQuery = {
    status: '',
    severity: '',
    category: '',
    source: '',
    search: '',
  };

  protected readonly label = humanize;

  ngOnInit(): void {
    this.load();
    this.refreshSummaryCards();
  }

  protected canManage(): boolean {
    return this.auth.can('api_inbox.manage');
  }

  protected statusLabel(status: string): string {
    if (status === 'OPEN') return 'Needs attention';
    if (status === 'ACKNOWLEDGED') return 'Being investigated';
    if (status === 'RESOLVED') return 'Completed';
    return status;
  }

  protected metaJson(item: ApiInboxItem): string {
    try {
      return JSON.stringify(item.metadata ?? {}, null, 2);
    } catch {
      return '{}';
    }
  }

  protected copy(text: string): void {
    void navigator.clipboard.writeText(text).then(
      () => this.toast.success('Copied'),
      () => this.toast.error('Copy failed'),
    );
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    const query: ApiInboxQuery = {
      page: this.page(),
      limit: 25,
      status: this.filters.status || undefined,
      severity: this.filters.severity || undefined,
      category: this.filters.category || undefined,
      source: this.filters.source || undefined,
      search: this.filters.search || undefined,
    };
    this.api.listApiInbox(query).subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.total.set(res.total);
        this.pageCount.set(res.pageCount);
        this.loading.set(false);
        this.refreshSummaryCards();
      },
      error: (err: unknown) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  private refreshSummaryCards(): void {
    this.api.apiInboxAlerts().subscribe({
      next: (a) => {
        this.summary.update((s) => ({
          ...s,
          open: a.openCount,
          critical: a.criticalCount,
          warning: a.warningCount,
        }));
        this.alerts.refresh();
      },
      error: () => undefined,
    });
    // page-local ack/resolved counts from current list when unfiltered
    const rows = this.items();
    this.summary.update((s) => ({
      ...s,
      acked: rows.filter((r) => r.status === 'ACKNOWLEDGED').length,
      resolved: rows.filter((r) => r.status === 'RESOLVED').length,
    }));
  }

  open(row: ApiInboxItem): void {
    this.api.getApiInboxItem(row.id).subscribe({
      next: (item) => {
        this.selected.set(item);
        this.notes = item.adminNotes ?? '';
      },
      error: (err: unknown) => this.toast.error(errorMessage(err)),
    });
  }

  ack(): void {
    const item = this.selected();
    if (!item) return;
    this.api.patchApiInboxItem(item.id, { status: 'ACKNOWLEDGED', adminNotes: this.notes }).subscribe({
      next: (updated) => {
        this.selected.set(updated);
        this.toast.success('Acknowledged');
        this.load();
      },
      error: (err: unknown) => this.toast.error(errorMessage(err)),
    });
  }

  resolve(): void {
    const item = this.selected();
    if (!item) return;
    this.api.patchApiInboxItem(item.id, { status: 'RESOLVED', adminNotes: this.notes }).subscribe({
      next: (updated) => {
        this.selected.set(updated);
        this.toast.success('Resolved');
        this.load();
      },
      error: (err: unknown) => this.toast.error(errorMessage(err)),
    });
  }

  reopen(): void {
    const item = this.selected();
    if (!item) return;
    this.api.patchApiInboxItem(item.id, { status: 'OPEN', adminNotes: this.notes }).subscribe({
      next: (updated) => {
        this.selected.set(updated);
        this.toast.success('Reopened');
        this.load();
      },
      error: (err: unknown) => this.toast.error(errorMessage(err)),
    });
  }

  saveNotes(): void {
    const item = this.selected();
    if (!item) return;
    this.api.patchApiInboxItem(item.id, { adminNotes: this.notes }).subscribe({
      next: (updated) => {
        this.selected.set(updated);
        this.toast.success('Notes saved');
      },
      error: (err: unknown) => this.toast.error(errorMessage(err)),
    });
  }

  simulate(scenario: string): void {
    this.api.simulateApiInboxFailure({ scenario }).subscribe({
      next: () => {
        this.toast.success('Simulated failure reported');
        this.load();
      },
      error: (err: unknown) => this.toast.error(errorMessage(err)),
    });
  }
}
