import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminApiService } from '../core/admin-api.service';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';
import { errorMessage } from '../core/util';

@Component({
  selector: 'app-themes',
  imports: [FormsModule, DatePipe, RouterLink],
  template: `
    <header class="page-head">
      <div>
        <h1>Appearance &amp; Themes</h1>
        <p class="muted">
          Priority: manual override → regional festival → global festival → global default → reader preference.
        </p>
      </div>
      <a class="btn" routerLink="/theme-studio">Open Festival Theme Studio</a>
    </header>

    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }

    @if (overview(); as o) {
      <section class="panel pad mb">
        <h2>Theme overview</h2>
        <div class="grid-2">
          <div>
            <p class="muted small">Active theme</p>
            <strong>{{ o.active.name }}</strong>
            <span class="badge">{{ o.active.slug }}</span>
            <p class="muted">Source: {{ o.active.source }}</p>
            @if (o.active.schedule; as s) {
              <p class="muted small">Festival: {{ s.name }} until {{ s.endsAt | date: 'medium' }}</p>
            }
          </div>
          <div>
            <p class="muted small">Server time</p>
            <code>{{ o.active.serverTime }}</code>
            <p class="muted small mt">Flags</p>
            <ul class="muted small">
              <li>Festival auto: {{ o.settings.festivalAutoEnabled }}</li>
              <li>Effects: {{ o.settings.effectsEnabled }}</li>
              <li>Admin may change global: {{ o.settings.allowAdminGlobalChange }}</li>
              <li>Reader preference: {{ o.settings.allowReaderPreference }}</li>
            </ul>
          </div>
        </div>
      </section>

      <section class="panel pad mb">
        <h2>Theme library</h2>
        <div class="theme-grid">
          @for (t of library(); track t.slug) {
            <button type="button" class="theme-card" [class.active]="selectedSlug() === t.slug" (click)="selectedSlug.set(t.slug)">
              <strong>{{ t.name }}</strong>
              <span class="badge">{{ t.kind }}</span>
              <p class="muted small">{{ t.description }}</p>
            </button>
          }
        </div>
        <div class="form-actions">
          @if (canManage()) {
            <button type="button" class="btn btn-primary" [disabled]="!selectedSlug() || busy()" (click)="applyGlobal()">
              Save as global theme
            </button>
            <button type="button" class="btn btn-ghost" [disabled]="!selectedSlug() || busy()" (click)="applyOverride()">
              Manual override now
            </button>
            <button type="button" class="btn btn-ghost" [disabled]="busy()" (click)="clearOverride()">Clear override</button>
          } @else if (o.settings.allowAdminGlobalChange) {
            <button type="button" class="btn btn-primary" [disabled]="!selectedSlug() || busy()" (click)="applyAsAdmin()">
              Apply global theme
            </button>
          } @else {
            <p class="muted">Preview only — Super Admin must enable Admin global theme changes.</p>
          }
        </div>
      </section>

      @if (canManage()) {
        <section class="panel pad mb">
          <h2>Animation &amp; permissions</h2>
          <label class="check"><input type="checkbox" [(ngModel)]="flags.festivalAutoEnabled" /> Automatic festival scheduling</label>
          <label class="check"><input type="checkbox" [(ngModel)]="flags.effectsEnabled" /> Decorative festival effects</label>
          <label class="check"><input type="checkbox" [(ngModel)]="flags.allowAdminGlobalChange" /> Allow Admin to change global theme</label>
          <label class="check"><input type="checkbox" [(ngModel)]="flags.allowReaderPreference" /> Allow reader light/dark preference</label>
          <button type="button" class="btn btn-primary mt" [disabled]="busy()" (click)="saveFlags()">Save theme settings</button>
        </section>
      }

      @if (canSchedule()) {
        <section class="panel pad mb">
          <h2>Event scheduler</h2>
          <div class="grid-2">
            <label class="field"><span>Event key</span><input [(ngModel)]="scheduleForm.eventKey" /></label>
            <label class="field"><span>Name</span><input [(ngModel)]="scheduleForm.name" /></label>
            <label class="field"><span>Theme slug</span><input [(ngModel)]="scheduleForm.themeSlug" /></label>
            <label class="field"><span>Timezone</span><input [(ngModel)]="scheduleForm.timezone" /></label>
            <label class="field"><span>Starts (ISO)</span><input [(ngModel)]="scheduleForm.startsAt" placeholder="2026-12-20T00:00:00.000Z" /></label>
            <label class="field"><span>Ends (ISO)</span><input [(ngModel)]="scheduleForm.endsAt" placeholder="2026-12-27T23:59:59.000Z" /></label>
            <label class="field"><span>Priority</span><input type="number" [(ngModel)]="scheduleForm.priority" /></label>
            <label class="check"><input type="checkbox" [(ngModel)]="scheduleForm.enabled" /> Enabled</label>
          </div>
          <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="saveSchedule()">Schedule theme</button>

          <table class="table mt">
            <thead>
              <tr>
                <th>Event</th>
                <th>Theme</th>
                <th>Window</th>
                <th>Priority</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (s of o.schedules; track s.id) {
                <tr>
                  <td>{{ s.name }} <span class="badge">{{ s.enabled ? 'on' : 'off' }}</span></td>
                  <td><code>{{ s.themeSlug }}</code></td>
                  <td class="small">{{ s.startsAt | date: 'mediumDate' }} → {{ s.endsAt | date: 'mediumDate' }}</td>
                  <td>{{ s.priority }}</td>
                  <td><button type="button" class="btn btn-ghost btn-sm" (click)="removeSchedule(s.id)">Delete</button></td>
                </tr>
              }
            </tbody>
          </table>
        </section>
      }

      <section class="panel pad">
        <h2>Theme history</h2>
        <table class="table">
          <thead>
            <tr>
              <th>When</th>
              <th>Change</th>
              <th>From → To</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (h of o.history; track h.id) {
              <tr>
                <td class="small">{{ h.createdAt | date: 'medium' }}</td>
                <td>{{ h.changeType }}</td>
                <td><code>{{ h.previousSlug || '—' }}</code> → <code>{{ h.newSlug }}</code></td>
                <td>
                  @if (canManage() && h.previousSlug) {
                    <button type="button" class="btn btn-ghost btn-sm" (click)="rollback(h.id)">Rollback</button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </section>
    } @else if (!error()) {
      <p class="muted">Loading theme console…</p>
    }
  `,
  styles: `
    .theme-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .theme-card {
      text-align: left;
      border: 1px solid var(--border, #333);
      background: transparent;
      color: inherit;
      padding: 0.85rem;
      cursor: pointer;
      border-radius: 0;
    }
    .theme-card.active {
      border-color: #c5a572;
    }
    .mb {
      margin-bottom: 1.25rem;
    }
    .mt {
      margin-top: 0.75rem;
    }
  `,
})
export class ThemesComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly overview = signal<any | null>(null);
  protected readonly library = signal<any[]>([]);
  protected readonly selectedSlug = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected flags = {
    festivalAutoEnabled: true,
    effectsEnabled: true,
    allowAdminGlobalChange: false,
    allowReaderPreference: true,
  };

  protected scheduleForm = {
    eventKey: 'christmas',
    name: 'Christmas',
    themeSlug: 'festival-christmas',
    startsAt: '',
    endsAt: '',
    timezone: 'UTC',
    priority: 100,
    enabled: true,
  };

  protected canManage = () => this.auth.can('themes.manage') || this.auth.hasRole('SUPER_ADMIN');
  protected canSchedule = () => this.auth.can('themes.schedule') || this.auth.hasRole('SUPER_ADMIN');

  ngOnInit(): void {
    this.reload();
  }

  private reload(): void {
    this.api.themesOverview().subscribe({
      next: (o) => {
        this.overview.set(o);
        this.flags = {
          festivalAutoEnabled: o.settings.festivalAutoEnabled,
          effectsEnabled: o.settings.effectsEnabled,
          allowAdminGlobalChange: o.settings.allowAdminGlobalChange,
          allowReaderPreference: o.settings.allowReaderPreference,
        };
        this.selectedSlug.set(o.active.slug);
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
    this.api.themesLibrary().subscribe({
      next: (rows) => this.library.set(rows),
      error: () => undefined,
    });
  }

  protected applyGlobal(): void {
    const slug = this.selectedSlug();
    if (!slug) return;
    this.busy.set(true);
    this.api.setGlobalTheme(slug).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success('Global theme saved.');
        this.reload();
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(errorMessage(e));
      },
    });
  }

  protected applyAsAdmin(): void {
    const slug = this.selectedSlug();
    if (!slug) return;
    this.busy.set(true);
    this.api.setGlobalThemeAsAdmin(slug).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success('Global theme applied.');
        this.reload();
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(errorMessage(e));
      },
    });
  }

  protected applyOverride(): void {
    const slug = this.selectedSlug();
    if (!slug) return;
    this.busy.set(true);
    this.api.setThemeOverride(slug).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success('Manual override active.');
        this.reload();
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(errorMessage(e));
      },
    });
  }

  protected clearOverride(): void {
    this.busy.set(true);
    this.api.setThemeOverride(null).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success('Override cleared.');
        this.reload();
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(errorMessage(e));
      },
    });
  }

  protected saveFlags(): void {
    this.busy.set(true);
    this.api.updateThemeSettings(this.flags).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success('Theme settings saved.');
        this.reload();
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(errorMessage(e));
      },
    });
  }

  protected saveSchedule(): void {
    this.busy.set(true);
    this.api.upsertThemeSchedule(this.scheduleForm).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success('Schedule saved.');
        this.reload();
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(errorMessage(e));
      },
    });
  }

  protected removeSchedule(id: string): void {
    if (!confirm('Delete this festival schedule?')) return;
    this.api.deleteThemeSchedule(id).subscribe({
      next: () => {
        this.toast.success('Schedule deleted.');
        this.reload();
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  protected rollback(id: string): void {
    if (!confirm('Roll back to the previous theme from this history entry?')) return;
    this.api.rollbackTheme(id).subscribe({
      next: () => {
        this.toast.success('Theme rolled back.');
        this.reload();
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
}
