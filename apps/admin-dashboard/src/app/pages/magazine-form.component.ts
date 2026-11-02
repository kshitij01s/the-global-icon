import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminApiService } from '../core/admin-api.service';
import { AuthService } from '../core/auth.service';
import { AdminMagazine, LookupItem, MagazinePayload, REVIEW_STATUSES } from '../core/models';
import { ToastService } from '../core/toast.service';
import { errorMessage, humanize, mediaUrl } from '../core/util';

/** Same patterns the API enforces (apps/api/src/admin/dto.ts). */
const PDF_KEY = /^magazines\/pdfs\/(?!.*\.\.)[\w\-. /]+\.pdf$/i;
const COVER_KEY = /^(?:demo-pdf-covers|magazines\/covers)\/(?!.*\.\.)[\w\-. /]+\.(?:png|jpe?g|webp)$/i;

@Component({
  selector: 'app-magazine-form',
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  template: `
    <header class="page-head">
      <div>
        <a class="back-link" routerLink="/magazines">← Magazines</a>
        <h1>{{ isEdit() ? 'Edit magazine' : 'New magazine' }}</h1>
        @if (magazine(); as m) {
          <p class="muted">
            <span [class]="'badge s-' + m.reviewStatus.toLowerCase()">{{ label(m.reviewStatus) }}</span>
            <span [class]="'badge ' + (m.isPublished ? 's-published' : 's-unpublished')">{{ m.isPublished ? 'Published' : 'Unpublished' }}</span>
            @if (m.isDemo) {
              <span class="badge s-demo" title="Demo content seeded for development">Demo</span>
            }
            <span class="small">Slug <code>{{ m.slug }}</code> · updated {{ m.updatedAt | date: 'medium' }}</span>
          </p>
        }
      </div>
    </header>

    @if (loadError()) {
      <div class="alert alert-error">{{ loadError() }}</div>
    }
    @if (submitError()) {
      <div class="alert alert-error" role="alert">{{ submitError() }}</div>
    }

    @if (!isEdit() || magazine()) {
      <form class="form-grid" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <section class="panel pad span-2">
          <h2>Metadata</h2>
          <div class="grid-2">
            <label class="field span-2">
              <span>Title *</span>
              <input type="text" formControlName="title" maxlength="200" />
              @if (invalid('title')) { <small class="field-error">Title is required (max 200 characters).</small> }
            </label>
            <label class="field span-2">
              <span>Subtitle</span>
              <input type="text" formControlName="subtitle" maxlength="240" />
            </label>
            <label class="field">
              <span>Issue number / label</span>
              <input type="text" formControlName="issueNumber" maxlength="40" placeholder="e.g. 12 or Special Edition" />
            </label>
            <label class="field">
              <span>Publication date *</span>
              <input type="date" formControlName="publicationDate" />
              @if (invalid('publicationDate')) { <small class="field-error">A publication date is required.</small> }
            </label>
            <label class="field">
              <span>Publisher name</span>
              <input type="text" formControlName="publisherName" maxlength="160" />
            </label>
            <label class="field">
              <span>Page count</span>
              <input type="number" formControlName="pageCount" min="1" max="5000" />
              @if (invalid('pageCount')) { <small class="field-error">Between 1 and 5000.</small> }
            </label>
            <label class="field span-2">
              <span>Description</span>
              <textarea rows="4" formControlName="description" maxlength="5000"></textarea>
            </label>
            <label class="field span-2">
              <span>SEO meta description</span>
              <input type="text" formControlName="metaDescription" maxlength="160" />
            </label>
          </div>
        </section>

        <section class="panel pad">
          <h2>Files</h2>
          <label class="field">
            <span>Upload cover image</span>
            <input type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" (change)="onCoverSelected($event)" />
            @if (coverUploading()) {
              <small class="muted">Uploading cover…</small>
            }
            @if (uploadError()) {
              <small class="field-error">{{ uploadError() }}</small>
            }
          </label>
          <label class="field">
            <span>Cover image storage key</span>
            <input type="text" formControlName="coverImage" placeholder="magazines/covers/uploads/….jpg" />
            @if (invalid('coverImage')) {
              <small class="field-error">Must be under <code>magazines/covers/</code> or <code>demo-pdf-covers/</code> and end in png, jpg or webp.</small>
            }
          </label>
          @if (coverPreview(); as src) {
            <a [href]="src" target="_blank" rel="noopener" class="cover-preview">
              <img [src]="src" [alt]="form.controls.coverAltText.value || 'Cover'" />
              <span>Open cover ↗</span>
            </a>
          }
          <label class="field">
            <span>Cover alt text</span>
            <input type="text" formControlName="coverAltText" maxlength="180" />
          </label>
          <label class="field">
            <span>Upload magazine PDF</span>
            <input type="file" accept=".pdf,application/pdf" (change)="onPdfSelected($event)" />
            @if (pdfUploading()) {
              <small class="muted">Uploading PDF…</small>
            }
          </label>
          <label class="field">
            <span>PDF storage key</span>
            <input type="text" formControlName="pdfKey" placeholder="magazines/pdfs/uploads/….pdf" />
            @if (invalid('pdfKey')) {
              <small class="field-error">Must be under <code>magazines/pdfs/</code> and end in .pdf.</small>
            }
          </label>
          <p class="muted small">
            Prefer Upload buttons — the API validates MIME/magic bytes and returns a storage key. Keys can’t be cleared once set.
          </p>
        </section>

        <section class="panel pad">
          <h2>Access &amp; placement</h2>
          <label class="field">
            <span>Access</span>
            <select formControlName="access">
              <option value="PUBLIC">Public</option>
              <option value="MEMBERS">Members only</option>
            </select>
          </label>
          <label class="check"><input type="checkbox" formControlName="allowDownload" /> Allow PDF download</label>
          <label class="check"><input type="checkbox" formControlName="isFeatured" /> Featured</label>

          <label class="field">
            <span>Category</span>
            <select formControlName="categoryId">
              <option value="">— None —</option>
              @for (c of categories(); track c.id) {
                <option [value]="c.id">{{ c.name }}</option>
              }
            </select>
          </label>
          <label class="field">
            <span>Edition series</span>
            <select formControlName="editionSeriesId">
              <option value="">— None —</option>
              @for (s of series(); track s.id) {
                <option [value]="s.id">{{ s.name }}{{ s.region ? ' (' + s.region + ')' : '' }}</option>
              }
            </select>
          </label>

          @if (isEdit()) {
            <label class="field">
              <span>Review status</span>
              <select formControlName="reviewStatus">
                @for (s of statuses; track s) {
                  <option [value]="s">{{ label(s) }}</option>
                }
              </select>
            </label>
            <p class="muted small">Publishing / unpublishing is done from the Magazines list (requires publish permission and a PDF).</p>
          }
        </section>

        <div class="form-actions span-2">
          <a class="btn btn-ghost" routerLink="/magazines">Cancel</a>
          <button type="submit" class="btn btn-primary" [disabled]="saving()">
            {{ saving() ? 'Saving…' : isEdit() ? 'Save changes' : 'Create draft' }}
          </button>
        </div>
      </form>
    } @else if (!loadError()) {
      <p class="muted">Loading…</p>
    }
  `,
})
export class MagazineFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AdminApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);

  /** Route param `:id` (present only when editing). */
  readonly id = input<string>();
  protected readonly isEdit = computed(() => !!this.id());

  protected readonly magazine = signal<AdminMagazine | null>(null);
  protected readonly categories = signal<LookupItem[]>([]);
  protected readonly series = signal<LookupItem[]>([]);
  protected readonly loadError = signal<string | null>(null);
  protected readonly submitError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly statuses = REVIEW_STATUSES;
  protected readonly label = humanize;

  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    subtitle: ['', Validators.maxLength(240)],
    description: ['', Validators.maxLength(5000)],
    publisherName: ['', Validators.maxLength(160)],
    issueNumber: ['', Validators.maxLength(40)],
    publicationDate: ['', Validators.required],
    pageCount: this.fb.control<number | null>(null, [Validators.min(1), Validators.max(5000)]),
    metaDescription: ['', Validators.maxLength(160)],
    coverImage: ['', Validators.pattern(COVER_KEY)],
    coverAltText: ['', Validators.maxLength(180)],
    pdfKey: ['', Validators.pattern(PDF_KEY)],
    access: ['PUBLIC' as 'PUBLIC' | 'MEMBERS'],
    allowDownload: [false],
    isFeatured: [false],
    categoryId: [''],
    editionSeriesId: [''],
    reviewStatus: ['DRAFT' as AdminMagazine['reviewStatus']],
  });

  protected readonly coverPreview = signal<string | null>(null);
  protected readonly coverUploading = signal(false);
  protected readonly pdfUploading = signal(false);
  protected readonly uploadError = signal<string | null>(null);

  ngOnInit(): void {
    this.api.categories().subscribe({ next: (rows) => this.categories.set(rows), error: () => undefined });
    this.api.editionSeries().subscribe({ next: (rows) => this.series.set(rows), error: () => undefined });
    const id = this.id();
    if (!id) return;
    this.api.getMagazine(id).subscribe({
      next: (m) => {
        this.magazine.set(m);
        this.coverPreview.set(mediaUrl(m.coverUrl));
        this.form.patchValue({
          title: m.title,
          subtitle: m.subtitle ?? '',
          description: m.description ?? '',
          publisherName: m.publisherName ?? '',
          issueNumber: m.issueNumber ?? '',
          publicationDate: m.publicationDate.slice(0, 10),
          pageCount: m.pageCount,
          metaDescription: m.metaDescription ?? '',
          coverImage: m.coverImageKey ?? '',
          // The API substitutes "Cover of <title>" when unset; don't persist that fallback.
          coverAltText: m.coverAltText === `Cover of ${m.title}` ? '' : (m.coverAltText ?? ''),
          pdfKey: m.pdfKey ?? '',
          access: m.access,
          allowDownload: m.allowDownload,
          isFeatured: m.isFeatured,
          reviewStatus: m.reviewStatus,
          categoryId: (m as AdminMagazine & { categoryId?: string | null }).categoryId ?? '',
          editionSeriesId: (m as AdminMagazine & { editionSeriesId?: string | null }).editionSeriesId ?? '',
        });
        this.form.markAsPristine();
      },
      error: (err: unknown) => this.loadError.set(errorMessage(err)),
    });
  }

  protected invalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  protected onCoverSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadError.set(null);
    this.coverUploading.set(true);
    this.api.uploadMagazineCover(file).subscribe({
      next: (res) => {
        this.coverUploading.set(false);
        this.form.patchValue({ coverImage: res.key });
        this.form.controls.coverImage.markAsDirty();
        this.coverPreview.set(URL.createObjectURL(file));
        this.toast.success('Cover uploaded.');
        input.value = '';
      },
      error: (err: unknown) => {
        this.coverUploading.set(false);
        this.uploadError.set(errorMessage(err));
      },
    });
  }

  protected onPdfSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadError.set(null);
    this.pdfUploading.set(true);
    this.api.uploadMagazinePdf(file).subscribe({
      next: (res) => {
        this.pdfUploading.set(false);
        this.form.patchValue({ pdfKey: res.key });
        this.form.controls.pdfKey.markAsDirty();
        this.toast.success('PDF uploaded.');
        input.value = '';
      },
      error: (err: unknown) => {
        this.pdfUploading.set(false);
        this.uploadError.set(errorMessage(err));
      },
    });
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.submitError.set(null);
    const payload = this.buildPayload();
    const id = this.id();
    const call = id ? this.api.updateMagazine(id, payload) : this.api.createMagazine(payload);
    call.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.toast.success(id ? 'Changes saved.' : `“${saved.title}” created as draft.`);
        void this.router.navigate(['/magazines']);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.submitError.set(errorMessage(err));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    });
  }

  /**
   * The API rejects unknown keys and key patterns, so: keys that can't be cleared (cover/pdf/ids)
   * are omitted when empty; plain text fields are sent as '' on edit to allow clearing.
   */
  private buildPayload(): MagazinePayload {
    const v = this.form.getRawValue();
    const edit = this.isEdit();
    const text = (value: string): string | undefined => {
      const t = value.trim();
      return t || edit ? t : undefined;
    };
    const opt = (value: string): string | undefined => value.trim() || undefined;

    const payload: MagazinePayload = {
      title: v.title.trim(),
      subtitle: text(v.subtitle),
      description: text(v.description),
      publisherName: text(v.publisherName),
      issueNumber: text(v.issueNumber),
      metaDescription: text(v.metaDescription),
      coverAltText: text(v.coverAltText),
      coverImage: opt(v.coverImage),
      pdfKey: opt(v.pdfKey),
      categoryId: opt(v.categoryId),
      editionSeriesId: opt(v.editionSeriesId),
      pageCount: v.pageCount ?? undefined,
      access: v.access,
      allowDownload: v.allowDownload,
      isFeatured: v.isFeatured,
      publicationDate: v.publicationDate,
    };
    if (edit && v.reviewStatus !== this.magazine()?.reviewStatus) payload.reviewStatus = v.reviewStatus;
    // Drop undefined so JSON bodies stay minimal.
    return Object.fromEntries(Object.entries(payload).filter(([, val]) => val !== undefined)) as MagazinePayload;
  }
}
