import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AdminApiService } from '../core/admin-api.service';
import { AdminLeader } from '../core/models';
import { ToastService } from '../core/toast.service';
import { errorMessage, mediaUrl } from '../core/util';

@Component({
  selector: 'app-leaders',
  imports: [ReactiveFormsModule, DatePipe],
  template: `
    <header class="page-head">
      <div>
        <h1>Leaders</h1>
        <p class="muted">Featured leader profiles linked to stories and magazines.</p>
      </div>
    </header>

    <form class="filters" (submit)="$event.preventDefault()">
      <input type="search" [formControl]="q" placeholder="Search leaders…" />
    </form>

    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }

    <section class="panel">
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr><th></th><th>Name</th><th>Role</th><th>Status</th><th>Date</th><th></th></tr>
          </thead>
          <tbody>
            @for (l of items(); track l.id) {
              <tr>
                <td class="cover-cell">
                  @if (img(l); as src) {
                    <img [src]="src" [alt]="l.name" loading="lazy" />
                  } @else {
                    <span class="cover-none">—</span>
                  }
                </td>
                <td>
                  <strong>{{ l.name }}</strong>
                  <div class="muted small">{{ l.organization || '—' }}</div>
                </td>
                <td>{{ l.designation || '—' }}</td>
                <td>
                  <span [class]="'badge ' + (l.isPublished ? 's-published' : 's-draft')">{{ l.isPublished ? 'Published' : 'Hidden' }}</span>
                  @if (l.isFeatured) { <span class="badge s-featured">Featured</span> }
                </td>
                <td>{{ l.publicationDate | date: 'mediumDate' }}</td>
                <td class="actions">
                  <button type="button" class="btn btn-sm" (click)="togglePublish(l)" [disabled]="busyId() === l.id">
                    {{ l.isPublished ? 'Unpublish' : 'Publish' }}
                  </button>
                  <button type="button" class="btn btn-sm btn-danger" (click)="remove(l)" [disabled]="busyId() === l.id">Delete</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="empty-cell">{{ loading() ? 'Loading…' : 'No leaders found.' }}</td></tr>
            }
          </tbody>
        </table>
      </div>
      <div class="pager">
        <span class="muted small">{{ total() }} total · page {{ page() }} of {{ totalPages() }}</span>
        <span class="spacer"></span>
        <button type="button" class="btn btn-sm" (click)="go(page() - 1)" [disabled]="page() <= 1 || loading()">← Prev</button>
        <button type="button" class="btn btn-sm" (click)="go(page() + 1)" [disabled]="page() >= totalPages() || loading()">Next →</button>
      </div>
    </section>
  `,
})
export class LeadersComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly q = new FormControl('', { nonNullable: true });
  protected readonly items = signal<AdminLeader[]>([]);
  protected readonly page = signal(1);
  protected readonly total = signal(0);
  protected readonly totalPages = signal(1);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly busyId = signal<string | null>(null);

  ngOnInit(): void {
    this.q.valueChanges.pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.page.set(1);
      this.load();
    });
    this.load();
  }

  protected img(l: AdminLeader): string | null {
    return mediaUrl(l.portraitUrl);
  }
  protected go(p: number): void {
    this.page.set(p);
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.listLeaders({ page: this.page(), limit: 20, q: this.q.value || undefined }).subscribe({
      next: (res) => {
        this.items.set(res.items as AdminLeader[]);
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

  protected togglePublish(l: AdminLeader): void {
    this.busyId.set(l.id);
    this.api.updateLeader(l.id, { isPublished: !l.isPublished }).subscribe({
      next: () => {
        this.toast.success(l.isPublished ? 'Unpublished' : 'Published');
        this.busyId.set(null);
        this.load();
      },
      error: (err: unknown) => {
        this.toast.error(errorMessage(err));
        this.busyId.set(null);
      },
    });
  }

  protected remove(l: AdminLeader): void {
    if (!confirm(`Delete leader “${l.name}”?`)) return;
    this.busyId.set(l.id);
    this.api.deleteLeader(l.id).subscribe({
      next: () => {
        this.toast.success('Deleted');
        this.busyId.set(null);
        this.load();
      },
      error: (err: unknown) => {
        this.toast.error(errorMessage(err));
        this.busyId.set(null);
      },
    });
  }
}
