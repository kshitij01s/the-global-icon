import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AdminApiService } from '../core/admin-api.service';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';
import { errorMessage } from '../core/util';

@Component({
  selector: 'app-pages-editor',
  imports: [FormsModule, RouterLink, DatePipe],
  template: `
    <div class="editor-shell">
      <aside class="editor-nav panel">
        <h2>Managed pages</h2>
        <p class="muted small">Edit public copy without changing source code.</p>
        <ul>
          @for (p of pages(); track p.slug) {
            <li>
              <a [routerLink]="['/pages', p.slug]" [class.active]="slug() === p.slug">
                {{ p.title }}
                <span class="badge">{{ p.status }}</span>
              </a>
            </li>
          }
        </ul>
        <hr />
        <h3>Also manage</h3>
        <a routerLink="/announcements">Announcements</a>
        <a routerLink="/settings">Website settings</a>
        <a routerLink="/themes">Appearance &amp; themes</a>
      </aside>

      <section class="editor-main panel pad">
        @if (error()) {
          <div class="alert alert-error">{{ error() }}</div>
        }
        @if (page(); as p) {
          <header class="page-head">
            <div>
              <h1>Edit: {{ p.title }}</h1>
              <p class="muted small">
                Status <span class="badge">{{ p.status }}</span>
                @if (p.publishedAt) {
                  · published {{ p.publishedAt | date: 'medium' }}
                }
              </p>
            </div>
          </header>

          <label class="field"><span>Title</span><input [(ngModel)]="draft.title" /></label>
          <label class="field"><span>Description</span><textarea rows="2" [(ngModel)]="draft.description"></textarea></label>
          <label class="field"><span>Page theme slug (optional override)</span><input [(ngModel)]="draft.pageThemeSlug" placeholder="e.g. classic-light" /></label>
          <label class="field">
            <span>Content JSON</span>
            <textarea rows="18" [(ngModel)]="draft.contentJson" class="code"></textarea>
          </label>

          <div class="form-actions">
            <button type="button" class="btn btn-ghost" (click)="reload()">Cancel</button>
            <button type="button" class="btn btn-primary" [disabled]="busy() || !canEdit()" (click)="saveDraft()">
              Save draft
            </button>
            @if (canPublish()) {
              <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="publish()">Publish</button>
            }
            <a class="btn btn-ghost" [href]="previewUrl()" target="_blank" rel="noopener">Preview</a>
          </div>

          @if (p.versions?.length) {
            <h2>Previous versions</h2>
            <ul class="versions">
              @for (v of p.versions; track v.id) {
                <li>
                  {{ v.createdAt | date: 'medium' }} — {{ v.note || 'snapshot' }}
                  <button type="button" class="btn btn-ghost btn-sm" (click)="restore(v.id)">Restore</button>
                </li>
              }
            </ul>
          }
        } @else if (!error()) {
          <p class="muted">Select a page to edit.</p>
        }
      </section>

      <aside class="editor-side panel pad">
        <h2>Appearance</h2>
        <p class="muted small">
          Page theme overrides apply when set. Global / festival themes still follow the Appearance console priority
          rules.
        </p>
        <h3>Publishing</h3>
        <p class="muted small">Save draft stores a version snapshot. Publish makes content live on the public site.</p>
        @if (!canPublish()) {
          <p class="muted small">Publishing requires Super Admin (pages.publish).</p>
        }
      </aside>
    </div>
  `,
  styles: `
    .editor-shell {
      display: grid;
      grid-template-columns: 220px 1fr 240px;
      gap: 1rem;
      align-items: start;
    }
    @media (max-width: 960px) {
      .editor-shell {
        grid-template-columns: 1fr;
      }
    }
    .editor-nav ul {
      list-style: none;
      padding: 0;
    }
    .editor-nav a {
      display: block;
      padding: 0.45rem 0;
      text-decoration: none;
      color: inherit;
    }
    .editor-nav a.active {
      color: #c5a572;
    }
    textarea.code {
      font-family: ui-monospace, monospace;
      font-size: 0.85rem;
    }
  `,
})
export class PagesEditorComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  protected readonly pages = signal<any[]>([]);
  protected readonly page = signal<any | null>(null);
  protected readonly slug = signal('home');
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected draft = { title: '', description: '', pageThemeSlug: '', contentJson: '{}' };

  protected canEdit = () => this.auth.can('pages.edit') || this.auth.can('pages.publish');
  protected canPublish = () => this.auth.can('pages.publish');

  ngOnInit(): void {
    this.api.listManagedPages().subscribe({
      next: (rows) => this.pages.set(rows),
      error: (e) => this.error.set(errorMessage(e)),
    });
    this.route.paramMap.subscribe((pm) => {
      const slug = pm.get('slug') || 'home';
      this.slug.set(slug);
      this.load(slug);
    });
  }

  private load(slug: string): void {
    this.api.getManagedPage(slug).subscribe({
      next: (p) => {
        this.page.set(p);
        this.draft = {
          title: p.title,
          description: p.description ?? '',
          pageThemeSlug: p.pageThemeSlug ?? '',
          contentJson: JSON.stringify(p.content ?? {}, null, 2),
        };
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  protected reload(): void {
    this.load(this.slug());
  }

  protected previewUrl(): string {
    const map: Record<string, string> = {
      home: '/',
      about: '/about',
      advertise: '/advertise',
      contact: '/contact',
    };
    const path = map[this.slug()] ?? '/';
    return `http://localhost:5173${path}`;
  }

  protected saveDraft(): void {
    let content: Record<string, unknown>;
    try {
      content = JSON.parse(this.draft.contentJson) as Record<string, unknown>;
    } catch {
      this.error.set('Content JSON is invalid.');
      return;
    }
    this.busy.set(true);
    this.api
      .saveManagedPage(this.slug(), {
        title: this.draft.title,
        description: this.draft.description,
        pageThemeSlug: this.draft.pageThemeSlug || null,
        content,
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.toast.success('Draft saved.');
          this.reload();
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(errorMessage(e));
        },
      });
  }

  protected publish(): void {
    this.busy.set(true);
    this.api.publishManagedPage(this.slug()).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success('Page published.');
        this.reload();
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(errorMessage(e));
      },
    });
  }

  protected restore(versionId: string): void {
    if (!confirm('Restore this version into a new draft?')) return;
    this.api.restoreManagedPage(this.slug(), versionId).subscribe({
      next: () => {
        this.toast.success('Version restored as draft.');
        this.reload();
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
}
