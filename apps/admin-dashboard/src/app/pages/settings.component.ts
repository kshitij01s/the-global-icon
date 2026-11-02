import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminApiService } from '../core/admin-api.service';
import { AuthService } from '../core/auth.service';
import { SiteSettingsAdmin } from '../core/models';
import { ToastService } from '../core/toast.service';
import { errorMessage } from '../core/util';

@Component({
  selector: 'app-settings',
  imports: [ReactiveFormsModule],
  template: `
    <header class="page-head">
      <div>
        <h1>Settings</h1>
        <p class="muted">Site branding and contact details.</p>
      </div>
    </header>

    @if (!canEdit()) {
      <div class="alert alert-info">View only. Super Admin can edit global settings.</div>
    }
    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }

    <form class="panel pad" [formGroup]="form" (ngSubmit)="save()">
      <h2>Brand &amp; homepage</h2>
      <div class="form-grid">
        <label class="field"><span>Site name</span><input formControlName="siteName" /></label>
        <label class="field"><span>Tagline</span><input formControlName="tagline" /></label>
        <label class="field"><span>Hero title</span><input formControlName="heroTitle" /></label>
        <label class="field full"><span>Hero copy</span><textarea rows="3" formControlName="heroCopy"></textarea></label>
        <label class="field"><span>Newsletter heading</span><input formControlName="newsletterHeading" /></label>
        <label class="field full"><span>Newsletter copy</span><textarea rows="2" formControlName="newsletterCopy"></textarea></label>
      </div>

      <h2>Contact &amp; social</h2>
      <div class="form-grid">
        <label class="field"><span>Contact email</span><input formControlName="contactEmail" /></label>
        <label class="field"><span>Phone</span><input formControlName="contactPhone" /></label>
        <label class="field full"><span>Office address</span><input formControlName="officeAddress" /></label>
        <label class="field"><span>Response time</span><input formControlName="contactResponseTime" /></label>
        <label class="field"><span>LinkedIn URL</span><input formControlName="linkedinUrl" /></label>
        <label class="field"><span>Instagram URL</span><input formControlName="instagramUrl" /></label>
        <label class="field"><span>Twitter / X URL</span><input formControlName="twitterUrl" /></label>
        <label class="field"><span>YouTube URL</span><input formControlName="youtubeUrl" /></label>
      </div>

      @if (canEdit()) {
        <button class="btn btn-primary" type="submit" [disabled]="busy() || form.invalid">
          {{ busy() ? 'Saving…' : 'Save settings' }}
        </button>
      }
    </form>
  `,
})
export class SettingsComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    siteName: ['', [Validators.required, Validators.maxLength(100)]],
    tagline: ['', Validators.maxLength(180)],
    heroTitle: ['', Validators.maxLength(180)],
    heroCopy: ['', Validators.maxLength(320)],
    newsletterHeading: ['', Validators.maxLength(140)],
    newsletterCopy: ['', Validators.maxLength(240)],
    contactEmail: [''],
    contactPhone: [''],
    officeAddress: [''],
    contactResponseTime: [''],
    linkedinUrl: [''],
    instagramUrl: [''],
    twitterUrl: [''],
    youtubeUrl: [''],
  });

  ngOnInit(): void {
    this.api.getAdminSettings().subscribe({
      next: (s) => this.patch(s),
      error: (err: unknown) => this.error.set(errorMessage(err)),
    });
    if (!this.canEdit()) this.form.disable({ emitEvent: false });
  }

  protected canEdit(): boolean {
    return this.auth.can('site.settings_update');
  }

  protected save(): void {
    if (!this.canEdit() || this.form.invalid || this.busy()) return;
    this.busy.set(true);
    this.api.updateAdminSettings(this.form.getRawValue()).subscribe({
      next: (s) => {
        this.patch(s);
        this.toast.success('Settings saved');
        this.busy.set(false);
      },
      error: (err: unknown) => {
        this.toast.error(errorMessage(err));
        this.busy.set(false);
      },
    });
  }

  private patch(s: SiteSettingsAdmin): void {
    this.form.patchValue({
      siteName: s.siteName ?? '',
      tagline: s.tagline ?? '',
      heroTitle: s.heroTitle ?? '',
      heroCopy: s.heroCopy ?? '',
      newsletterHeading: s.newsletterHeading ?? '',
      newsletterCopy: s.newsletterCopy ?? '',
      contactEmail: s.contactEmail ?? '',
      contactPhone: s.contactPhone ?? '',
      officeAddress: s.officeAddress ?? '',
      contactResponseTime: s.contactResponseTime ?? '',
      linkedinUrl: s.linkedinUrl ?? '',
      instagramUrl: s.instagramUrl ?? '',
      twitterUrl: s.twitterUrl ?? '',
      youtubeUrl: s.youtubeUrl ?? '',
    });
  }
}
