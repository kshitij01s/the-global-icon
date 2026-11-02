import { Routes } from '@angular/router';
import { ACCESS } from './core/access';
import { accessGuard, authGuard, guestGuard } from './core/guards';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Sign in · TGI Admin',
    loadComponent: () => import('./pages/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Dashboard · TGI Admin',
        canActivate: [accessGuard],
        data: { access: ACCESS.dashboard },
        loadComponent: () => import('./pages/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'magazines',
        title: 'Magazines · TGI Admin',
        canActivate: [accessGuard],
        data: { access: ACCESS.magazines, mode: 'magazines' },
        loadComponent: () => import('./pages/magazines-list.component').then((m) => m.MagazinesListComponent),
      },
      {
        path: 'magazines/new',
        title: 'New magazine · TGI Admin',
        canActivate: [accessGuard],
        data: { access: ACCESS.magazineCreate },
        loadComponent: () => import('./pages/magazine-form.component').then((m) => m.MagazineFormComponent),
      },
      {
        path: 'magazines/:id/edit',
        title: 'Edit magazine · TGI Admin',
        canActivate: [accessGuard],
        data: { access: ACCESS.magazineEdit },
        loadComponent: () => import('./pages/magazine-form.component').then((m) => m.MagazineFormComponent),
      },
      {
        path: 'editions',
        title: 'Editions · TGI Admin',
        canActivate: [accessGuard],
        data: { access: ACCESS.magazines, mode: 'editions' },
        loadComponent: () => import('./pages/magazines-list.component').then((m) => m.MagazinesListComponent),
      },
      {
        path: 'articles',
        title: 'Stories · TGI Admin',
        canActivate: [accessGuard],
        data: { access: ACCESS.articles },
        loadComponent: () => import('./pages/articles.component').then((m) => m.ArticlesComponent),
      },
      {
        path: 'leaders',
        title: 'Leaders · TGI Admin',
        canActivate: [accessGuard],
        data: { access: ACCESS.leaders },
        loadComponent: () => import('./pages/leaders.component').then((m) => m.LeadersComponent),
      },
      {
        path: 'enquiries',
        title: 'Enquiries · TGI Admin',
        canActivate: [accessGuard],
        data: { access: ACCESS.enquiries },
        loadComponent: () => import('./pages/enquiries.component').then((m) => m.EnquiriesComponent),
      },
      {
        path: 'users',
        title: 'Users · TGI Admin',
        canActivate: [accessGuard],
        data: { access: ACCESS.users },
        loadComponent: () => import('./pages/users.component').then((m) => m.UsersComponent),
      },
      {
        path: 'settings',
        title: 'Settings · TGI Admin',
        canActivate: [accessGuard],
        data: { access: ACCESS.settings },
        loadComponent: () => import('./pages/settings.component').then((m) => m.SettingsComponent),
      },
      {
        path: 'ads',
        title: 'Advertising · TGI Admin',
        canActivate: [accessGuard],
        data: { access: ACCESS.ads },
        loadComponent: () => import('./pages/ads.component').then((m) => m.AdsComponent),
      },
      {
        path: 'themes',
        title: 'Appearance & Themes · TGI Admin',
        canActivate: [accessGuard],
        data: { access: ACCESS.themes },
        loadComponent: () => import('./pages/themes.component').then((m) => m.ThemesComponent),
      },
      {
        path: 'theme-studio',
        title: 'Festival Theme Studio · TGI Admin',
        canActivate: [accessGuard],
        data: { access: ACCESS.themes },
        loadComponent: () =>
          import('./pages/theme-studio.component').then((m) => m.ThemeStudioComponent),
      },
      {
        path: 'pages',
        pathMatch: 'full',
        redirectTo: 'pages/home',
      },
      {
        path: 'pages/:slug',
        title: 'Page Editor · TGI Admin',
        canActivate: [accessGuard],
        data: { access: ACCESS.pages },
        loadComponent: () => import('./pages/pages-editor.component').then((m) => m.PagesEditorComponent),
      },
      {
        path: 'announcements',
        title: 'Announcements · TGI Admin',
        canActivate: [accessGuard],
        data: { access: ACCESS.announcements },
        loadComponent: () => import('./pages/announcements.component').then((m) => m.AnnouncementsComponent),
      },
      {
        path: 'forbidden',
        title: 'No access · TGI Admin',
        loadComponent: () => import('./pages/forbidden.component').then((m) => m.ForbiddenComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
