import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AdminApiService } from '../core/admin-api.service';
import { AuthService } from '../core/auth.service';
import { AdminArticle, ARTICLE_STATUSES, ArticleStatus } from '../core/models';
import { ToastService } from '../core/toast.service';
import { errorMessage, humanize } from '../core/util';

@Component({
  selector: 'app-articles',
  imports: [ReactiveFormsModule, DatePipe],
  template: `
    <header class="page-head">
      <div>
        <h1>Stories</h1>
        <p class="muted">Editorial articles — draft through publish workflow.</p>
      </div>
    </header>

    <form class="filters" (submit)="$event.preventDefault()">
      <input type="search" [formControl]="q" placeholder="Search title…" />
      <select [formControl]="status">
        <option value="">All statuses</option>
        @for (s of statuses; track s) {
          <option [value]="s">{{ label(s) }}</option>
        }
      </select>
    </form>

    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }

    <section class="panel">
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr><th>Title</th><th>Status</th><th>Author</th><th>Category</th><th>Published</th><th></th></tr>
          </thead>
          <tbody>
            @for (a of items(); track a.id) {
              <tr>
                <td>
                  <strong>{{ a.title }}</strong>
                  <div class="muted small"><code>{{ a.slug }}</code></div>
                </td>
                <td><span [class]="'badge s-' + a.status.toLowerCase()">{{ label(a.status) }}</span></td>
                <td>{{ a.author?.name ?? '—' }}</td>
                <td>{{ a.category?.name ?? '—' }}</td>
                <td>{{ a.publishedAt ? (a.publishedAt | date: 'mediumDate') : '—' }}</td>
                <td class="actions">
                  @if (canPublish() && a.status !== 'PUBLISHED') {
                    <button type="button" class="btn btn-sm" (click)="publish(a)" [disabled]="busyId() === a.id">Publish</button>
                  }
                  @if (canPublish() && a.status === 'PUBLISHED') {
                    <button type="button" class="btn btn-sm" (click)="unpublish(a)" [disabled]="busyId() === a.id">Unpublish</button>
                  }
                  @if (canDelete()) {
                    <button type="button" class="btn btn-sm btn-danger" (click)="remove(a)" [disabled]="busyId() === a.id">Delete</button>
                  }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="empty-cell">{{ loading() ? 'Loading…' : 'No stories found.' }}</td></tr>
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
export class ArticlesComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly statuses = ARTICLE_STATUSES;
  protected readonly q = new FormControl('', { nonNullable: true });
  protected readonly status = new FormControl<ArticleStatus | ''>('', { nonNullable: true });
  protected readonly items = signal<AdminArticle[]>([]);
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
    this.status.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.page.set(1);
      this.load();
    });
    this.load();
  }

  protected label(v: string): string {
    return humanize(v);
  }
  protected canPublish(): boolean {
    return this.auth.can('articles.publish');
  }
  protected canDelete(): boolean {
    return this.auth.can('articles.delete');
  }
  protected go(p: number): void {
    this.page.set(p);
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .listArticles({ page: this.page(), limit: 20, q: this.q.value || undefined, status: this.status.value || undefined })
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

  protected publish(a: AdminArticle): void {
    this.busyId.set(a.id);
    this.api.publishArticle(a.id).subscribe({
      next: () => {
        this.toast.success('Published');
        this.busyId.set(null);
        this.load();
      },
      error: (err: unknown) => {
        this.toast.error(errorMessage(err));
        this.busyId.set(null);
      },
    });
  }

  protected unpublish(a: AdminArticle): void {
    this.busyId.set(a.id);
    this.api.unpublishArticle(a.id).subscribe({
      next: () => {
        this.toast.success('Unpublished');
        this.busyId.set(null);
        this.load();
      },
      error: (err: unknown) => {
        this.toast.error(errorMessage(err));
        this.busyId.set(null);
      },
    });
  }

  protected remove(a: AdminArticle): void {
    if (!confirm(`Delete “${a.title}”?`)) return;
    this.busyId.set(a.id);
    this.api.deleteArticle(a.id).subscribe({
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
