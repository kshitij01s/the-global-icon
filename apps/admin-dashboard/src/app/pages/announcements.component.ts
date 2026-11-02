import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService } from '../core/admin-api.service';
import { ToastService } from '../core/toast.service';
import { errorMessage } from '../core/util';

@Component({
  selector: 'app-announcements',
  imports: [FormsModule, DatePipe],
  template: `
    <header class="page-head">
      <div>
        <h1>Announcements</h1>
        <p class="muted">Homepage banner messages shown to visitors.</p>
      </div>
    </header>

    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }

    <section class="panel pad mb">
      <h2>New announcement</h2>
      <div class="grid-2">
        <label class="field"><span>Title</span><input [(ngModel)]="form.title" /></label>
        <label class="field"><span>Link label</span><input [(ngModel)]="form.linkLabel" /></label>
        <label class="field full"><span>Message</span><textarea rows="2" [(ngModel)]="form.message"></textarea></label>
        <label class="field full"><span>Link URL</span><input [(ngModel)]="form.linkUrl" /></label>
        <label class="check"><input type="checkbox" [(ngModel)]="form.isActive" /> Active</label>
      </div>
      <button type="button" class="btn btn-primary" (click)="create()">Create</button>
    </section>

    <section class="panel pad">
      <table class="table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Status</th>
            <th>Updated</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (a of rows(); track a.id) {
            <tr>
              <td>
                <strong>{{ a.title }}</strong>
                <div class="muted small">{{ a.message }}</div>
              </td>
              <td><span class="badge">{{ a.isActive ? 'Active' : 'Off' }}</span></td>
              <td class="small">{{ a.updatedAt | date: 'medium' }}</td>
              <td>
                <button type="button" class="btn btn-ghost btn-sm" (click)="toggle(a)">
                  {{ a.isActive ? 'Deactivate' : 'Activate' }}
                </button>
                <button type="button" class="btn btn-ghost btn-sm" (click)="remove(a.id)">Delete</button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </section>
  `,
  styles: `
    .mb {
      margin-bottom: 1rem;
    }
    .full {
      grid-column: 1 / -1;
    }
  `,
})
export class AnnouncementsComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly toast = inject(ToastService);
  protected readonly rows = signal<any[]>([]);
  protected readonly error = signal<string | null>(null);
  protected form = { title: '', message: '', linkLabel: '', linkUrl: '', isActive: true };

  ngOnInit(): void {
    this.reload();
  }

  private reload(): void {
    this.api.listAnnouncements().subscribe({
      next: (rows) => this.rows.set(rows),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  protected create(): void {
    if (!this.form.title.trim()) return;
    this.api.createAnnouncement(this.form).subscribe({
      next: () => {
        this.toast.success('Announcement created.');
        this.form = { title: '', message: '', linkLabel: '', linkUrl: '', isActive: true };
        this.reload();
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  protected toggle(a: { id: string; isActive: boolean }): void {
    this.api.updateAnnouncement(a.id, { isActive: !a.isActive }).subscribe({
      next: () => this.reload(),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  protected remove(id: string): void {
    if (!confirm('Delete this announcement?')) return;
    this.api.deleteAnnouncement(id).subscribe({
      next: () => {
        this.toast.success('Deleted.');
        this.reload();
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
}
