import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, NoAdminAccessError } from '../core/auth.service';
import { errorMessage } from '../core/util';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  template: `
    <div class="login-page">
      <form class="login-card" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="login-brand">
          <span class="brand-mark">TGI</span>
          <div><strong>THE GLOBAL ICON</strong><small>Admin console</small></div>
        </div>
        <h1>Sign in</h1>
        <p class="muted">Staff accounts only. Use the email or username issued to you.</p>

        @if (reason() === 'expired') {
          <div class="alert alert-info">Your session has ended. Please sign in again.</div>
        }
        @if (error()) {
          <div class="alert alert-error" role="alert">{{ error() }}</div>
        }

        <label class="field">
          <span>Email or username</span>
          <input type="text" formControlName="identifier" autocomplete="username" autofocus />
          @if (showError('identifier')) {
            <small class="field-error">Required</small>
          }
        </label>
        <label class="field">
          <span>Password</span>
          <input type="password" formControlName="password" autocomplete="current-password" />
          @if (showError('password')) {
            <small class="field-error">Required</small>
          }
        </label>

        <button class="btn btn-primary btn-block" type="submit" [disabled]="busy()">
          {{ busy() ? 'Signing in…' : 'Sign in' }}
        </button>

        <p class="login-note">
          Staff accounts are provisioned by the API. Local development credentials are written to
          <code>apps/api/.superadmin-local.txt</code> (gitignored) after running the staff reset/seed scripts.
        </p>
      </form>
    </div>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly returnUrl = input<string>();
  readonly reason = input<string>();

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    identifier: ['', [Validators.required, Validators.maxLength(254)]],
    password: ['', [Validators.required, Validators.maxLength(72)]],
  });

  protected showError(name: 'identifier' | 'password'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    const { identifier, password } = this.form.getRawValue();
    this.auth.login(identifier, password).subscribe({
      next: () => {
        const target = this.returnUrl();
        // Only follow in-app relative paths.
        const safe = target && target.startsWith('/') && !target.startsWith('//') ? target : '/';
        void this.router.navigateByUrl(safe);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        if (err instanceof NoAdminAccessError) this.error.set(err.message);
        else if (err instanceof HttpErrorResponse && err.status === 401) this.error.set('Invalid email/username or password.');
        else this.error.set(errorMessage(err));
        this.form.controls.password.reset('');
      },
    });
  }
}
