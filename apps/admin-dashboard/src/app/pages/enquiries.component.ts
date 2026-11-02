import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AdminApiService } from '../core/admin-api.service';
import { AdminEnquiry, ENQUIRY_STATUSES, EnquiryStatus } from '../core/models';
import { ToastService } from '../core/toast.service';
import { errorMessage, humanize } from '../core/util';

@Component({
  selector: 'app-enquiries',
  imports: [ReactiveFormsModule, DatePipe],
  template: `
    <header class="page-head">
      <div>
        <h1>Enquiries</h1>
        <p class="muted">Contact and commercial enquiries from the public site.</p>
      </div>
      <button type="button" class="btn btn-ghost" (click)="load()" [disabled]="loading()">Refresh</button>
    </header>

    <form class="filters" (submit)="$event.preventDefault()">
      <input type="search" [formControl]="q" placeholder="Search reference, name, company…" />
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
            <tr><th>Reference</th><th>From</th><th>Type</th><th>Subject</th><th>Status</th><th>Submitted</th><th></th></tr>
          </thead>
          <tbody>
            @for (e of items(); track e.id) {
              <tr>
                <td><code>{{ e.reference }}</code></td>
                <td>{{ e.fullName }}<div class="muted small">{{ e.company }} · {{ e.email }}</div></td>
                <td>{{ label(e.enquiryType) }}</td>
                <td>{{ e.subject }}</td>
                <td>
                  <select
                    [value]="e.status"
                    (change)="setStatus(e, $any($event.target).value)"
                    [disabled]="busyId() === e.id"
                  >
                    @for (s of statuses; track s) {
                      <option [value]="s">{{ label(s) }}</option>
                    }
                  </select>
                </td>
                <td>{{ e.submittedAt | date: 'medium' }}</td>
                <td class="actions">
                  <button type="button" class="btn btn-sm" (click)="openNotes(e)">Notes</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="empty-cell">{{ loading() ? 'Loading…' : 'No enquiries found.' }}</td></tr>
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

    @if (selected(); as sel) {
      <section class="panel pad">
        <h2>Internal notes · {{ sel.reference }}</h2>
        <textarea rows="5" [formControl]="notes" style="width:100%"></textarea>
        <div class="actions" style="margin-top:0.75rem">
          <button type="button" class="btn btn-primary" (click)="saveNotes()" [disabled]="busyId() === sel.id">Save notes</button>
          <button type="button" class="btn btn-ghost" (click)="selected.set(null)">Close</button>
        </div>
      </section>
    }
  `,
})
export class EnquiriesComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly statuses = ENQUIRY_STATUSES;
  protected readonly q = new FormControl('', { nonNullable: true });
  protected readonly status = new FormControl<EnquiryStatus | ''>('', { nonNullable: true });
  protected readonly notes = new FormControl('', { nonNullable: true });
  protected readonly items = signal<AdminEnquiry[]>([]);
  protected readonly selected = signal<AdminEnquiry | null>(null);
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
  protected go(p: number): void {
    this.page.set(p);
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .listEnquiries({ page: this.page(), limit: 20, q: this.q.value || undefined, status: this.status.value || undefined })
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

  protected setStatus(e: AdminEnquiry, status: EnquiryStatus): void {
    if (status === e.status) return;
    this.busyId.set(e.id);
    this.api.updateEnquiryStatus(e.id, status).subscribe({
      next: () => {
        this.toast.success('Status updated');
        this.busyId.set(null);
        this.load();
      },
      error: (err: unknown) => {
        this.toast.error(errorMessage(err));
        this.busyId.set(null);
        this.load();
      },
    });
  }

  protected openNotes(e: AdminEnquiry): void {
    this.selected.set(e);
    this.notes.setValue(e.internalNotes ?? '');
    this.api.getEnquiry(e.id).subscribe({
      next: (full) => {
        this.selected.set(full);
        this.notes.setValue(full.internalNotes ?? '');
      },
    });
  }

  protected saveNotes(): void {
    const sel = this.selected();
    if (!sel) return;
    this.busyId.set(sel.id);
    this.api.updateEnquiryNotes(sel.id, this.notes.value).subscribe({
      next: (updated) => {
        this.toast.success('Notes saved');
        this.selected.set(updated);
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
