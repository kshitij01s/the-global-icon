import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../../environments/environment';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ACCESS } from '../core/access';
import { ApiInboxAlertsService } from '../core/api-inbox-alerts.service';
import { AuthService } from '../core/auth.service';
import { AccessRule } from '../core/models';
import { humanize } from '../core/util';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  access: AccessRule;
  exact?: boolean;
  badge?: 'apiInbox';
  external?: boolean;
}

interface NavGroup {
  id: string;
  title: string;
  items: NavItem[];
}

/** Logical console structure aligned to real Global Icon capabilities (no fake modules). */
const NAV: NavGroup[] = [
  {
    id: 'overview',
    title: 'Overview',
    items: [{ label: 'Dashboard', path: '/', icon: '▦', access: ACCESS.dashboard, exact: true }],
  },
  {
    id: 'content',
    title: 'Content Management',
    items: [
      { label: 'Magazines', path: '/magazines', icon: '❏', access: ACCESS.magazines },
      { label: 'Upload Magazine', path: '/magazines/new', icon: '＋', access: ACCESS.magazineCreate },
      { label: 'Editions / Year Archive', path: '/editions', icon: '☰', access: ACCESS.magazines },
      { label: 'Stories', path: '/articles', icon: '✎', access: ACCESS.articles },
      { label: 'Leaders', path: '/leaders', icon: '★', access: ACCESS.leaders },
    ],
  },
  {
    id: 'website',
    title: 'Website Management',
    items: [
      { label: 'CMS Page Editor', path: '/pages/home', icon: '◫', access: ACCESS.pages },
      { label: 'Announcements', path: '/announcements', icon: '⚑', access: ACCESS.announcements },
      { label: 'Website Settings', path: '/settings', icon: '⚙', access: ACCESS.settings },
    ],
  },
  {
    id: 'advertising',
    title: 'Advertising',
    items: [
      { label: 'Campaigns & Analytics', path: '/ads', icon: '◈', access: ACCESS.ads },
      { label: 'Advertiser Enquiries', path: '/enquiries', icon: '✉', access: ACCESS.enquiries },
    ],
  },
  {
    id: 'finance',
    title: 'Financial',
    items: [{ label: 'Invoices', path: '/finance/invoices', icon: '¤', access: ACCESS.dashboard }],
  },
  {
    id: 'operations',
    title: 'Operations',
    items: [
      { label: 'API Inbox', path: '/api-inbox', icon: '⌁', access: ACCESS.apiInbox, badge: 'apiInbox' },
    ],
  },
  {
    id: 'appearance',
    title: 'Appearance & Themes',
    items: [
      { label: 'Theme Overview', path: '/themes', icon: '◐', access: ACCESS.themes },
      { label: 'Festival Theme Studio', path: '/theme-studio', icon: '✦', access: ACCESS.themes },
    ],
  },
  {
    id: 'access',
    title: 'Access Management',
    items: [{ label: 'Users & Roles', path: '/users', icon: '☺', access: ACCESS.users }],
  },
];

const CRUMBS: Record<string, string> = {
  '': 'Dashboard',
  magazines: 'Magazines',
  editions: 'Editions',
  articles: 'Stories',
  leaders: 'Leaders',
  enquiries: 'Enquiries',
  users: 'Users',
  settings: 'Website Settings',
  ads: 'Advertising',
  themes: 'Themes',
  'theme-studio': 'Festival Theme Studio',
  pages: 'CMS Page Editor',
  announcements: 'Announcements',
  'api-inbox': 'API Inbox',
  finance: 'Financial',
  invoices: 'Invoices',
  new: 'New',
  edit: 'Edit',
  login: 'Sign in',
  forbidden: 'No access',
};

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell" [class.nav-open]="navOpen()">
      <aside class="sidebar" aria-label="Primary">
        <a class="brand" routerLink="/">
          <span class="brand-mark">TGI</span>
          <span class="brand-text">
            <strong>THE GLOBAL ICON</strong>
            <small>{{ consoleLabel() }}</small>
          </span>
        </a>
        <nav>
          @for (group of groups(); track group.id) {
            <div class="nav-group" [class.collapsed]="isCollapsed(group.id)">
              <button
                type="button"
                class="nav-title"
                (click)="toggleGroup(group.id)"
                [attr.aria-expanded]="!isCollapsed(group.id)"
              >
                <span>{{ group.title }}</span>
                <span class="nav-caret" aria-hidden="true">{{ isCollapsed(group.id) ? '▸' : '▾' }}</span>
              </button>
              @if (!isCollapsed(group.id)) {
                @for (item of group.items; track item.path) {
                  <a
                    class="nav-link"
                    [routerLink]="item.path"
                    routerLinkActive="active"
                    [routerLinkActiveOptions]="{ exact: !!item.exact }"
                  >
                    <span class="nav-icon" aria-hidden="true">{{ item.icon }}</span>{{ item.label }}
                    @if (item.badge === 'apiInbox' && inboxOpen() > 0) {
                      <span
                        class="nav-badge"
                        [class.critical]="inboxCritical() > 0"
                        [attr.aria-label]="inboxOpen() + ' open API issues'"
                      >{{ inboxOpen() }}</span>
                    }
                  </a>
                }
              }
            </div>
          }
        </nav>
        <div class="sidebar-account">
          <div class="sidebar-account-meta">
            <strong>{{ auth.displayName() }}</strong>
            <span>{{ role() }}</span>
          </div>
          <button type="button" class="btn btn-ghost btn-sm" (click)="auth.logout()">Sign out</button>
        </div>
        <div class="sidebar-foot">API: {{ apiHost }}</div>
      </aside>
      <div class="scrim" (click)="navOpen.set(false)"></div>

      <div class="main">
        <header class="topbar">
          <button type="button" class="icon-btn menu-btn" (click)="navOpen.set(!navOpen())" aria-label="Toggle navigation">☰</button>
          <nav class="breadcrumbs" aria-label="Breadcrumb">
            <a routerLink="/">Admin</a>
            @for (c of crumbs(); track c.label; let last = $last) {
              <span class="bc-sep" aria-hidden="true">/</span>
              @if (!last && c.path) {
                <a [routerLink]="c.path">{{ c.label }}</a>
              } @else {
                <span aria-current="page">{{ c.label }}</span>
              }
            }
          </nav>
          <div class="topbar-spacer"></div>
          <div class="user">
            <div class="user-meta">
              <strong>{{ auth.displayName() }}</strong>
              <span class="role-chip">{{ role() }}</span>
            </div>
            <button type="button" class="btn btn-ghost btn-sm" (click)="auth.logout()">Sign out</button>
          </div>
        </header>
        <main class="content"><router-outlet /></main>
      </div>
    </div>
  `,
})
export class ShellComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly inboxAlerts = inject(ApiInboxAlertsService);
  protected readonly navOpen = signal(false);
  protected readonly apiHost = new URL(environment.apiUrl).host;
  protected readonly inboxOpen = this.inboxAlerts.openCount;
  protected readonly inboxCritical = this.inboxAlerts.criticalCount;
  private readonly collapsed = signal<Record<string, boolean>>({});
  private readonly urlPath = signal(this.router.url.split('?')[0] || '/');

  protected readonly groups = computed(() =>
    NAV.map((g) => ({ ...g, items: g.items.filter((i) => this.auth.allows(i.access)) })).filter(
      (g) => g.items.length > 0,
    ),
  );
  protected readonly role = computed(() => humanize(this.auth.primaryRole()));
  protected readonly consoleLabel = computed(() =>
    this.auth.hasRole('SUPER_ADMIN') ? 'Super Admin console' : 'Admin console',
  );

  protected readonly crumbs = computed(() => {
    const parts = this.urlPath().split('/').filter(Boolean);
    const out: { label: string; path: string | null }[] = [];
    let acc = '';
    for (const part of parts) {
      acc += `/${part}`;
      out.push({
        label: CRUMBS[part] ?? humanize(part),
        path: acc,
      });
    }
    if (out.length) out[out.length - 1] = { ...out[out.length - 1], path: null };
    return out;
  });

  constructor() {
    this.inboxAlerts.start();
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((e) => {
        this.navOpen.set(false);
        this.urlPath.set((e as NavigationEnd).urlAfterRedirects.split('?')[0] || '/');
      });
  }

  protected isCollapsed(id: string): boolean {
    return !!this.collapsed()[id];
  }

  protected toggleGroup(id: string): void {
    this.collapsed.update((m) => ({ ...m, [id]: !m[id] }));
  }
}
