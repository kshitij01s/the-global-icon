import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AdminArticle,
  AdminEnquiry,
  AdminLeader,
  AdminMagazine,
  AdminUser,
  Advertisement,
  AdsReport,
  ArticlePayload,
  ArticleStatus,
  DashboardStats,
  EnquiryStatus,
  LeaderPayload,
  LookupItem,
  MagazinePayload,
  Paginated,
  ReviewStatus,
  RoleName,
  SiteSettingsAdmin,
  UserProfile,
} from './models';
import { toParams } from './util';

export interface MagazineQuery {
  page?: number;
  limit?: number;
  q?: string;
  reviewStatus?: ReviewStatus | '';
}

export interface ArticleQuery {
  page?: number;
  limit?: number;
  q?: string;
  status?: ArticleStatus | '';
}

export interface ListQuery {
  page?: number;
  limit?: number;
  q?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  dashboard(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.base}/admin/dashboard`);
  }

  // Magazines
  listMagazines(query: MagazineQuery): Observable<Paginated<AdminMagazine>> {
    return this.http.get<Paginated<AdminMagazine>>(`${this.base}/admin/magazines`, {
      params: toParams({ ...query }),
    });
  }
  getMagazine(id: string): Observable<AdminMagazine> {
    return this.http.get<AdminMagazine>(`${this.base}/admin/magazines/${encodeURIComponent(id)}`);
  }
  createMagazine(body: MagazinePayload): Observable<AdminMagazine> {
    return this.http.post<AdminMagazine>(`${this.base}/admin/magazines`, body);
  }
  updateMagazine(id: string, body: MagazinePayload): Observable<AdminMagazine> {
    return this.http.patch<AdminMagazine>(`${this.base}/admin/magazines/${encodeURIComponent(id)}`, body);
  }
  publishMagazine(id: string): Observable<AdminMagazine> {
    return this.http.post<AdminMagazine>(`${this.base}/admin/magazines/${encodeURIComponent(id)}/publish`, {});
  }
  unpublishMagazine(id: string): Observable<AdminMagazine> {
    return this.http.post<AdminMagazine>(`${this.base}/admin/magazines/${encodeURIComponent(id)}/unpublish`, {});
  }
  deleteMagazine(id: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.base}/admin/magazines/${encodeURIComponent(id)}`);
  }

  // Articles
  listArticles(query: ArticleQuery): Observable<Paginated<AdminArticle>> {
    return this.http.get<Paginated<AdminArticle>>(`${this.base}/admin/articles`, {
      params: toParams({ ...query }),
    });
  }
  getArticle(id: string): Observable<AdminArticle> {
    return this.http.get<AdminArticle>(`${this.base}/admin/articles/${encodeURIComponent(id)}`);
  }
  createArticle(body: ArticlePayload): Observable<AdminArticle> {
    return this.http.post<AdminArticle>(`${this.base}/admin/articles`, body);
  }
  updateArticle(id: string, body: ArticlePayload): Observable<AdminArticle> {
    return this.http.patch<AdminArticle>(`${this.base}/admin/articles/${encodeURIComponent(id)}`, body);
  }
  publishArticle(id: string): Observable<AdminArticle> {
    return this.http.post<AdminArticle>(`${this.base}/admin/articles/${encodeURIComponent(id)}/publish`, {});
  }
  unpublishArticle(id: string): Observable<AdminArticle> {
    return this.http.post<AdminArticle>(`${this.base}/admin/articles/${encodeURIComponent(id)}/unpublish`, {});
  }
  deleteArticle(id: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.base}/admin/articles/${encodeURIComponent(id)}`);
  }

  // Leaders
  listLeaders(query: ListQuery): Observable<Paginated<AdminLeader>> {
    return this.http.get<Paginated<AdminLeader>>(`${this.base}/admin/leaders`, {
      params: toParams({ ...query }),
    });
  }
  createLeader(body: LeaderPayload): Observable<AdminLeader> {
    return this.http.post<AdminLeader>(`${this.base}/admin/leaders`, body);
  }
  updateLeader(id: string, body: LeaderPayload): Observable<AdminLeader> {
    return this.http.patch<AdminLeader>(`${this.base}/admin/leaders/${encodeURIComponent(id)}`, body);
  }
  deleteLeader(id: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.base}/admin/leaders/${encodeURIComponent(id)}`);
  }

  // Enquiries
  listEnquiries(query: ListQuery & { status?: EnquiryStatus | '' }): Observable<Paginated<AdminEnquiry>> {
    return this.http.get<Paginated<AdminEnquiry>>(`${this.base}/admin/enquiries`, {
      params: toParams({ ...query }),
    });
  }
  getEnquiry(id: string): Observable<AdminEnquiry> {
    return this.http.get<AdminEnquiry>(`${this.base}/admin/enquiries/${encodeURIComponent(id)}`);
  }
  updateEnquiryStatus(id: string, status: EnquiryStatus): Observable<AdminEnquiry> {
    return this.http.patch<AdminEnquiry>(`${this.base}/admin/enquiries/${encodeURIComponent(id)}/status`, { status });
  }
  updateEnquiryNotes(id: string, internalNotes: string, followUpAt?: string | null): Observable<AdminEnquiry> {
    return this.http.patch<AdminEnquiry>(`${this.base}/admin/enquiries/${encodeURIComponent(id)}/notes`, {
      internalNotes,
      followUpAt,
    });
  }

  // Users
  listUsers(query: ListQuery & { isActive?: boolean; role?: RoleName | '' }): Observable<Paginated<AdminUser>> {
    return this.http.get<Paginated<AdminUser>>(`${this.base}/admin/users`, {
      params: toParams({ ...query }),
    });
  }
  activateUser(id: string): Observable<AdminUser> {
    return this.http.post<AdminUser>(`${this.base}/admin/users/${encodeURIComponent(id)}/activate`, {});
  }
  deactivateUser(id: string): Observable<AdminUser> {
    return this.http.post<AdminUser>(`${this.base}/admin/users/${encodeURIComponent(id)}/deactivate`, {});
  }
  setUserRoles(id: string, roles: RoleName[]): Observable<AdminUser> {
    return this.http.put<AdminUser>(`${this.base}/admin/users/${encodeURIComponent(id)}/roles`, { roles });
  }

  // Settings / lookups / ads
  getAdminSettings(): Observable<SiteSettingsAdmin> {
    return this.http.get<SiteSettingsAdmin>(`${this.base}/admin/settings`);
  }
  updateAdminSettings(body: Partial<SiteSettingsAdmin>): Observable<SiteSettingsAdmin> {
    return this.http.patch<SiteSettingsAdmin>(`${this.base}/admin/settings`, body);
  }
  categories(): Observable<LookupItem[]> {
    return this.http.get<LookupItem[]>(`${this.base}/admin/categories`);
  }
  editionSeries(): Observable<LookupItem[]> {
    return this.http.get<LookupItem[]>(`${this.base}/admin/edition-series`);
  }
  authors(): Observable<LookupItem[]> {
    return this.http.get<LookupItem[]>(`${this.base}/admin/authors`);
  }
  listAdvertisements(): Observable<Advertisement[] | Paginated<Advertisement>> {
    return this.http.get<Advertisement[] | Paginated<Advertisement>>(`${this.base}/admin/advertisements`);
  }
  adsReport(): Observable<AdsReport> {
    return this.http.get<AdsReport>(`${this.base}/admin/advertisements/report`);
  }

  myProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.base}/users/me`);
  }

  uploadMagazinePdf(file: File): Observable<{ key: string; size: number; contentType: string }> {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<{ key: string; size: number; contentType: string }>(
      `${this.base}/admin/uploads/magazine-pdf`,
      body,
    );
  }

  uploadMagazineCover(file: File): Observable<{ key: string; size: number; contentType: string }> {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<{ key: string; size: number; contentType: string }>(
      `${this.base}/admin/uploads/magazine-cover`,
      body,
    );
  }

  // Appearance / themes
  themesOverview(): Observable<any> {
    return this.http.get(`${this.base}/admin/themes/overview`);
  }
  themesLibrary(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/admin/themes/library`);
  }
  setGlobalTheme(slug: string): Observable<any> {
    return this.http.post(`${this.base}/admin/themes/global`, { slug });
  }
  setGlobalThemeAsAdmin(slug: string): Observable<any> {
    return this.http.post(`${this.base}/admin/themes/global-as-admin`, { slug });
  }
  setThemeOverride(slug: string | null, until?: string | null): Observable<any> {
    return this.http.post(`${this.base}/admin/themes/override`, { slug, until });
  }
  updateThemeSettings(body: Record<string, unknown>): Observable<any> {
    return this.http.patch(`${this.base}/admin/themes/settings`, body);
  }
  upsertThemeSchedule(body: Record<string, unknown>): Observable<any> {
    return this.http.post(`${this.base}/admin/themes/schedules`, body);
  }
  deleteThemeSchedule(id: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.base}/admin/themes/schedules/${encodeURIComponent(id)}`);
  }
  rollbackTheme(historyId: string): Observable<any> {
    return this.http.post(`${this.base}/admin/themes/history/${encodeURIComponent(historyId)}/rollback`, {});
  }

  // Managed pages / announcements
  listManagedPages(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/admin/pages`);
  }
  getManagedPage(slug: string): Observable<any> {
    return this.http.get(`${this.base}/admin/pages/${encodeURIComponent(slug)}`);
  }
  saveManagedPage(slug: string, body: Record<string, unknown>): Observable<any> {
    return this.http.patch(`${this.base}/admin/pages/${encodeURIComponent(slug)}`, body);
  }
  publishManagedPage(slug: string): Observable<any> {
    return this.http.post(`${this.base}/admin/pages/${encodeURIComponent(slug)}/publish`, {});
  }
  restoreManagedPage(slug: string, versionId: string): Observable<any> {
    return this.http.post(
      `${this.base}/admin/pages/${encodeURIComponent(slug)}/restore/${encodeURIComponent(versionId)}`,
      {},
    );
  }
  listAnnouncements(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/admin/announcements`);
  }
  createAnnouncement(body: Record<string, unknown>): Observable<any> {
    return this.http.post(`${this.base}/admin/announcements`, body);
  }
  updateAnnouncement(id: string, body: Record<string, unknown>): Observable<any> {
    return this.http.patch(`${this.base}/admin/announcements/${encodeURIComponent(id)}`, body);
  }
  deleteAnnouncement(id: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.base}/admin/announcements/${encodeURIComponent(id)}`);
  }
}
