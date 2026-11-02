import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../../environments/environment';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ACCESS } from '../core/access';
import { AuthService } from '../core/auth.service';
import { AccessRule } from '../core/models';
import { humanize } from '../core/util';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  access: AccessRule;
  exact?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    title: 'Dashboard',
    items: [{ label: 'Overview', path: '/', icon: '▦', access: ACCESS.dashboard, exact: true }],
  },
  {
    title: 'Magazine Management',
    items: [
      { label: 'All Magazines', path: '/magazines', icon: '❏', access: ACCESS.magazines },
      { label: 'Upload Magazine', path: '/magazines/new', icon: '＋', access: ACCESS.magazineCreate },
      { label: 'Year Archive', path: '/editions', icon: '☰', access: ACCESS.magazines },
    ],
  },
  {
    title: 'Stories Management',
    items: [
      { label: 'All Stories', path: '/articles', icon: '✎', access: ACCESS.articles },
      { label: 'Leaders', path: '/leaders', icon: '★', access: ACCESS.leaders },
    ],
  },
  {
    title: 'Advertising',
    items: [
      { label: 'Campaigns', path: '/ads', icon: '◈', access: ACCESS.ads },
      { label: 'Advertiser Enquiries', path: '/enquiries', icon: '✉', access: ACCESS.enquiries },
    ],
  },
  {
    title: 'Readers & Users',
    items: [{ label: 'Users', path: '/users', icon: '☺', access: ACCESS.users }],
  },
  {
    title: 'Website Content',
    items: [
      { label: 'Page Editor', path: '/pages/home', icon: '◫', access: ACCESS.pages },
      { label: 'Announcements', path: '/announcements', icon: '⚑', access: ACCESS.announcements },
    ],
  },
  {
    title: 'Appearance & Themes',
    items: [
      { label: 'Theme Overview', path: '/themes', icon: '◐', access: ACCESS.themes },
      { label: 'Festival Theme Studio', path: '/theme-studio', icon: '✦', access: ACCESS.themes },
      { label: 'Website Settings', path: '/settings', icon: '⚙', access: ACCESS.settings },
    ],
  },
];

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell" [class.nav-open]="navOpen()">
      <aside class="sidebar" aria-label="Primary">
        <a class="brand" routerLink="/">
          <span class="brand-mark">TGI</span>
          <span class="brand-text"><strong>THE GLOBAL ICON</strong><small>Admin console</small></span>
        </a>
        <nav>
          @for (group of groups(); track group.title) {
            <div class="nav-group">
              <div class="nav-title">{{ group.title }}</div>
              @for (item of group.items; track item.path) {
                <a
                  class="nav-link"
                  [routerLink]="item.path"
                  routerLinkActive="active"
                  [routerLinkActiveOptions]="{ exact: !!item.exact }"
                >
                  <span class="nav-icon" aria-hidden="true">{{ item.icon }}</span>{{ item.label }}
                </a>
              }
            </div>
          }
        </nav>
        <div class="sidebar-foot">API: {{ apiHost }}</div>
      </aside>
      <div class="scrim" (click)="navOpen.set(false)"></div>

      <div class="main">
        <header class="topbar">
          <button type="button" class="icon-btn menu-btn" (click)="navOpen.set(!navOpen())" aria-label="Toggle navigation">☰</button>
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
  protected readonly navOpen = signal(false);
  protected readonly apiHost = new URL(environment.apiUrl).host;

  protected readonly groups = computed(() =>
    NAV.map((g) => ({ ...g, items: g.items.filter((i) => this.auth.allows(i.access)) })).filter(
      (g) => g.items.length > 0,
    ),
  );
  protected readonly role = computed(() => humanize(this.auth.primaryRole()));

  constructor() {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.navOpen.set(false));
  }
}
