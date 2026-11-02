import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, map, skip, startWith } from 'rxjs';
import { AdminApiService } from '../core/admin-api.service';
import { AuthService } from '../core/auth.service';
import { AdminMagazine, REVIEW_STATUSES, ReviewStatus } from '../core/models';
import { ToastService } from '../core/toast.service';
import { errorMessage, humanize, mediaUrl } from '../core/util';

type Tri = '' | 'yes' | 'no';

/**
 * Shared by /magazines (metadata & lifecycle) and /editions (issue-oriented columns).
 * Route `data.mode` selects the variant. Server-side filters: search + review status.
 * Published / demo / year / series filters are applied to the loaded page.
 */
@Component({
  selector: 'app-magazines-list',
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  template: `
    <header class="page-head">
      <div>
        <h1>{{ editions() ? 'Editions' : 'Magazines' }}</h1>
        <p class="muted">
          {{ editions()
            ? 'Issue-level view of every edition: series, issue number, release date and visibility.'
            : 'Manage magazine metadata and publishing state.' }}
        </p>
      </div>
      @if (auth.can('magazines.create')) {
        <a class="btn btn-primary" routerLink="/magazines/new">+ New magazine</a>
      }
    </header>

    <form class="filters" [formGroup]="filters" (submit)="$event.preventDefault()">
      <input type="search" formControlName="q" placeholder="Search title or issue number…" />
      <select formControlName="reviewStatus" aria-label="Review status">
        <option value="">All review statuses</option>
        @for (s of statuses; track s) {
          <option [value]="s">{{ label(s) }}</option>
        }
      </select>
      <select formControlName="published" aria-label="Published">
        <option value="">Published or not</option>
        <option value="yes">Published</option>
        <option value="no">Unpublished</option>
      </select>
      <select formControlName="demo" aria-label="Demo">
        <option value="">Demo or real</option>
        <option value="yes">Demo only</option>
        <option value="no">Hide demo</option>
      </select>
      @if (editions()) {
        <select formControlName="year" aria-label="Year">
          <option value="">All years</option>
          @for (y of years(); track y) {
            <option [value]="y">{{ y }}</option>
          }
        </select>
        <select formControlName="series" aria-label="Series">
          <option value="">All series</option>
          @for (s of seriesNames(); track s) {
            <option [value]="s">{{ s }}</option>
          }
        </select>
      }
      <button type="button" class="btn btn-ghost" (click)="reset()">Reset</button>
    </form>

    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }

    <section class="panel">
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Cover</th>
              <th>Title</th>
              @if (editions()) {
                <th>Series</th>
                <th>Issue</th>
              } @else {
                <th>Issue</th>
              }
              <th>Release</th>
              @if (editions()) {
                <th>Pages</th>
              }
              <th>Review</th>
              <th>Visibility</th>
              <th>Access</th>
              <th class="right">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (m of visible(); track m.id) {
              <tr>
                <td class="cover-cell">
                  @if (cover(m); as src) {
                    <a [href]="src" target="_blank" rel="noopener" title="Open cover image">
                      <img [src]="src" [alt]="m.coverAltText" loading="lazy" />
                    </a>
                  } @else {
                    <span class="cover-none" title="No cover set">—</span>
                  }
                </td>
                <td>
                  <a class="row-title" [routerLink]="['/magazines', m.id, 'edit']">{{ m.title }}</a>
                  @if (m.isDemo) {
                    <span class="badge s-demo">Demo</span>
                  }
                  @if (m.isFeatured) {
                    <span class="badge s-featured">Featured</span>
                  }
                  @if (m.subtitle) {
                    <div class="muted small">{{ m.subtitle }}</div>
                  }
                </td>
                @if (editions()) {
                  <td>{{ m.editionSeries?.name ?? '—' }}<div class="muted small">{{ m.editionSeries?.region }}</div></td>
                }
                <td>{{ m.issueLabel ?? '—' }}</td>
                <td>{{ m.publicationDate | date: 'mediumDate' }}</td>
                @if (editions()) {
                  <td>{{ m.pageCount ?? '—' }}</td>
                }
                <td><span [class]="'badge s-' + m.reviewStatus.toLowerCase()">{{ label(m.reviewStatus) }}</span></td>
                <td>
                  <span [class]="'badge ' + (m.isPublished ? 's-published' : 's-unpublished')">
                    {{ m.isPublished ? 'Published' : 'Unpublished' }}
                  </span>
                  @if (!m.hasPdf) {
                    <div class="muted small">No PDF</div>
                  }
                </td>
                <td>{{ label(m.access) }}</td>
                <td class="right actions">
                  @if (auth.can('magazines.update')) {
                    <a class="btn btn-sm btn-ghost" [routerLink]="['/magazines', m.id, 'edit']">Edit</a>
                  }
                  @if (auth.can('magazines.publish')) {
                    @if (m.isPublished) {
                      <button type="button" class="btn btn-sm" (click)="unpublish(m)" [disabled]="busyId() === m.id">Unpublish</button>
                    } @else {
                      <button
                        type="button"
                        class="btn btn-sm btn-primary"
                        (click)="publish(m)"
                        [disabled]="busyId() === m.id || !m.hasPdf"
                        [title]="m.hasPdf ? 'Publish this edition' : 'A PDF is required before publishing'"
                      >Publish</button>
                    }
                  }
                  @if (auth.can('magazines.update')) {
                    @if (m.reviewStatus === 'ARCHIVED') {
                      <button type="button" class="btn btn-sm" (click)="setStatus(m, 'DRAFT')" [disabled]="busyId() === m.id">Restore</button>
                    } @else {
                      <button type="button" class="btn btn-sm" (click)="archive(m)" [disabled]="busyId() === m.id">Archive</button>
                    }
                  }
                  @if (auth.can('magazines.delete')) {
                    <button type="button" class="btn btn-sm btn-danger" (click)="remove(m)" [disabled]="busyId() === m.id">Delete</button>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td [attr.colspan]="editions() ? 10 : 8" class="empty-cell">
                  {{ loading() ? 'Loading…' : 'No magazines match these filters.' }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <div class="pager">
        <span class="muted small">
          {{ total() }} total · page {{ page() }} of {{ totalPages() }}
          @if (visible().length !== items().length) {
            · showing {{ visible().length }} of {{ items().length }} on this page
          }
        </span>
        <span class="spacer"></span>
        <button type="button" class="btn btn-sm" (click)="go(page() - 1)" [disabled]="page() <= 1 || loading()">← Prev</button>
        <button type="button" class="btn btn-sm" (click)="go(page() + 1)" [disabled]="page() >= totalPages() || loading()">Next →</button>
      </div>
    </section>
  `,
})
export class MagazinesListComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly auth = inject(AuthService);

  /** Bound from route data via withComponentInputBinding. */
  readonly mode = input<'magazines' | 'editions'>('magazines');
  protected readonly editions = computed(() => this.mode() === 'editions');

  protected readonly statuses = REVIEW_STATUSES;
  protected readonly label = humanize;

  protected readonly filters = new FormGroup({
    q: new FormControl('', { nonNullable: true }),
    reviewStatus: new FormControl<ReviewStatus | ''>('', { nonNullable: true }),
    published: new FormControl<Tri>('', { nonNullable: true }),
    demo: new FormControl<Tri>('', { nonNullable: true }),
    year: new FormControl('', { nonNullable: true }),
    series: new FormControl('', { nonNullable: true }),
  });
  private readonly filterValue = toSignal(
    this.filters.valueChanges.pipe(startWith(this.filters.getRawValue()), map(() => this.filters.getRawValue())),
    { requireSync: true },
  );

  protected readonly items = signal<AdminMagazine[]>([]);
  protected readonly page = signal(1);
  protected readonly total = signal(0);
  protected readonly totalPages = signal(1);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly busyId = signal<string | null>(null);

  protected readonly years = computed(() =>
    [...new Set(this.items().map((m) => m.publicationDate.slice(0, 4)))].sort().reverse(),
  );
  protected readonly seriesNames = computed(() =>
    [...new Set(this.items().map((m) => m.editionSeries?.name).filter((n): n is string => !!n))].sort(),
  );

  protected readonly visible = computed(() => {
    const f = this.filterValue();
    return this.items().filter(
      (m) =>
        (f.published === '' || (f.published === 'yes') === m.isPublished) &&
        (f.demo === '' || (f.demo === 'yes') === m.isDemo) &&
        (!f.year || m.publicationDate.startsWith(f.year)) &&
        (!f.series || m.editionSeries?.name === f.series),
    );
  });

  constructor() {
    this.filters.valueChanges
      .pipe(
        debounceTime(300),
        map(() => ({ q: this.filters.controls.q.value.trim(), status: this.filters.controls.reviewStatus.value })),
        startWith({ q: '', status: '' as ReviewStatus | '' }),
        distinctUntilChanged((a, b) => a.q === b.q && a.status === b.status),
        skip(1),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.page.set(1);
        this.load();
      });
  }

  ngOnInit(): void {
    // Route inputs (mode) are only available after construction.
    this.load();
  }

  protected cover(m: AdminMagazine): string | null {
    return mediaUrl(m.coverUrl);
  }

  protected reset(): void {
    this.filters.reset();
  }

  protected go(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.page.set(page);
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .listMagazines({
        page: this.page(),
        limit: this.editions() ? 50 : 20,
        q: this.filters.controls.q.value.trim(),
        reviewStatus: this.filters.controls.reviewStatus.value,
      })
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.total.set(res.total);
          this.totalPages.set(res.totalPages);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.error.set(errorMessage(err));
          this.loading.set(false);
        },
      });
  }

  protected publish(m: AdminMagazine): void {
    this.run(m, this.api.publishMagazine(m.id), `“${m.title}” published.`);
  }

  protected unpublish(m: AdminMagazine): void {
    this.run(m, this.api.unpublishMagazine(m.id), `“${m.title}” unpublished.`);
  }

  protected archive(m: AdminMagazine): void {
    if (!confirm(`Archive “${m.title}”? It will be hidden from the public site.`)) return;
    this.setStatus(m, 'ARCHIVED');
  }

  protected setStatus(m: AdminMagazine, status: ReviewStatus): void {
    this.run(m, this.api.updateMagazine(m.id, { reviewStatus: status }), `“${m.title}” set to ${humanize(status)}.`);
  }

  protected remove(m: AdminMagazine): void {
    if (!confirm(`Permanently delete “${m.title}”? This cannot be undone.`)) return;
    this.busyId.set(m.id);
    this.api.deleteMagazine(m.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.toast.success(`“${m.title}” deleted.`);
        this.load();
      },
      error: (err: unknown) => {
        this.busyId.set(null);
        this.toast.error(errorMessage(err));
      },
    });
  }

  private run(m: AdminMagazine, call: ReturnType<AdminApiService['publishMagazine']>, success: string): void {
    this.busyId.set(m.id);
    call.subscribe({
      next: (updated) => {
        this.items.update((list) => list.map((x) => (x.id === updated.id ? updated : x)));
        this.busyId.set(null);
        this.toast.success(success);
      },
      error: (err: unknown) => {
        this.busyId.set(null);
        this.toast.error(errorMessage(err));
      },
    });
  }
}
