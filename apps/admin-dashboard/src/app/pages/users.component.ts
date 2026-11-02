import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AdminApiService } from '../core/admin-api.service';
import { AuthService } from '../core/auth.service';
import { AdminUser } from '../core/models';
import { ToastService } from '../core/toast.service';
import { errorMessage, humanize } from '../core/util';

@Component({
  selector: 'app-users',
  imports: [ReactiveFormsModule, DatePipe],
  template: `
    <header class="page-head">
      <div>
        <h1>Users</h1>
        <p class="muted">Registered accounts and staff access.</p>
      </div>
    </header>

    <form class="filters" (submit)="$event.preventDefault()">
      <input type="search" [formControl]="q" placeholder="Search email or username…" />
    </form>

    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }

    <section class="panel">
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr><th>User</th><th>Roles</th><th>Status</th><th>Joined</th><th></th></tr>
          </thead>
          <tbody>
            @for (u of items(); track u.id) {
              <tr>
                <td>
                  <strong>{{ display(u) }}</strong>
                  <div class="muted small">{{ u.email }} · <code>{{ u.username }}</code></div>
                </td>
                <td>
                  @for (r of u.roles; track r) {
                    <span class="badge s-featured">{{ label(r) }}</span>
                  }
                </td>
                <td>
                  <span [class]="'badge ' + (u.isActive ? 's-published' : 's-archived')">
                    {{ u.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td>{{ u.createdAt | date: 'mediumDate' }}</td>
                <td class="actions">
                  @if (u.id !== meId()) {
                    @if (u.isActive) {
                      <button type="button" class="btn btn-sm" (click)="deactivate(u)" [disabled]="busyId() === u.id">Deactivate</button>
                    } @else {
                      <button type="button" class="btn btn-sm" (click)="activate(u)" [disabled]="busyId() === u.id">Activate</button>
                    }
                  } @else {
                    <span class="muted small">You</span>
                  }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="empty-cell">{{ loading() ? 'Loading…' : 'No users found.' }}</td></tr>
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
export class UsersComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly q = new FormControl('', { nonNullable: true });
  protected readonly items = signal<AdminUser[]>([]);
  protected readonly page = signal(1);
  protected readonly total = signal(0);
  protected readonly totalPages = signal(1);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly busyId = signal<string | null>(null);
  protected readonly meId = signal<string | null>(this.auth.user()?.id ?? null);

  ngOnInit(): void {
    this.q.valueChanges.pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.page.set(1);
      this.load();
    });
    this.load();
  }

  protected label(v: string): string {
    return humanize(v);
  }
  protected display(u: AdminUser): string {
    return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username;
  }
  protected go(p: number): void {
    this.page.set(p);
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.listUsers({ page: this.page(), limit: 20, q: this.q.value || undefined }).subscribe({
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

  protected activate(u: AdminUser): void {
    this.busyId.set(u.id);
    this.api.activateUser(u.id).subscribe({
      next: () => {
        this.toast.success('User activated');
        this.busyId.set(null);
        this.load();
      },
      error: (err: unknown) => {
        this.toast.error(errorMessage(err));
        this.busyId.set(null);
      },
    });
  }

  protected deactivate(u: AdminUser): void {
    if (!confirm(`Deactivate ${u.email}?`)) return;
    this.busyId.set(u.id);
    this.api.deactivateUser(u.id).subscribe({
      next: () => {
        this.toast.success('User deactivated');
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
