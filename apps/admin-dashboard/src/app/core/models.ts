export type RoleName =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'EDITOR'
  | 'REVIEWER'
  | 'PUBLISHER'
  | 'AD_MANAGER'
  | 'ENQUIRY_MANAGER'
  | 'READER'
  | 'SUBSCRIBER';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  roles: RoleName[];
  permissions: string[];
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthUser;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type ReviewStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'ARCHIVED';

export const REVIEW_STATUSES: ReviewStatus[] = [
  'DRAFT',
  'IN_REVIEW',
  'CHANGES_REQUESTED',
  'APPROVED',
  'ARCHIVED',
];

export type MagazineAccess = 'PUBLIC' | 'MEMBERS';

export interface AdminMagazine {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  publisherName: string | null;
  issueNumber: string | null;
  issueLabel: string | null;
  publicationDate: string;
  language: string | null;
  category: { name: string; slug: string } | null;
  editionSeries: { name: string; slug: string; region: string | null } | null;
  coverUrl: string | null;
  coverAltText: string;
  pageCount: number | null;
  access: MagazineAccess;
  allowDownload: boolean;
  isFeatured: boolean;
  isDemo: boolean;
  hasPdf: boolean;
  pdfUrl: string | null;
  metaDescription: string | null;
  reviewStatus: ReviewStatus;
  isPublished: boolean;
  publishedAt: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  pdfKey: string | null;
  coverImageKey: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Body accepted by POST/PATCH /admin/magazines (mirrors the API DTOs; extra keys are rejected). */
export interface MagazinePayload {
  title?: string;
  subtitle?: string;
  description?: string;
  publisherName?: string;
  issueNumber?: string;
  categoryId?: string;
  editionSeriesId?: string;
  coverImage?: string;
  coverAltText?: string;
  pdfKey?: string;
  pageCount?: number;
  access?: MagazineAccess;
  allowDownload?: boolean;
  isFeatured?: boolean;
  publicationDate?: string;
  metaDescription?: string;
  reviewStatus?: ReviewStatus;
}

export interface RecentEnquiry {
  reference: string;
  fullName: string;
  company: string;
  enquiryType: string;
  status: string;
  submittedAt: string;
}

export interface DashboardStats {
  generatedAt: string;
  magazines: { total: number; published: number; draft: number; inReview: number; demo: number };
  articles: { total: number; published: number; inReview: number };
  leaders: { total: number; published: number };
  enquiries: { total: number; new: number };
  newsletter: { activeSubscribers: number };
  users: { total: number };
  advertisements: { active: number };
  recentEnquiries: RecentEnquiry[];
}

export type ArticleStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'ARCHIVED';

export const ARTICLE_STATUSES: ArticleStatus[] = [
  'DRAFT',
  'IN_REVIEW',
  'CHANGES_REQUESTED',
  'APPROVED',
  'SCHEDULED',
  'PUBLISHED',
  'ARCHIVED',
];

export interface ArticleSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  language: string | null;
  author: { name: string; slug: string } | null;
  category: { name: string; slug: string } | null;
  featuredImageUrl: string | null;
  isFeatured: boolean;
  isSponsored: boolean;
  memberOnly: boolean;
  publishedAt: string | null;
}

export interface AdminArticle extends ArticleSummary {
  status: ArticleStatus;
  body?: string;
  authorId?: string | null;
  categoryId?: string | null;
  metaDescription?: string | null;
  updatedAt?: string;
  createdAt?: string;
}

export interface ArticlePayload {
  title?: string;
  excerpt?: string | null;
  body?: string;
  language?: string;
  authorId?: string | null;
  categoryId?: string | null;
  featuredImage?: string | null;
  isFeatured?: boolean;
  isSponsored?: boolean;
  memberOnly?: boolean;
  metaDescription?: string | null;
  status?: Exclude<ArticleStatus, 'PUBLISHED' | 'SCHEDULED'>;
}

export interface Leader {
  id: string;
  slug: string;
  name: string;
  designation: string | null;
  organization: string | null;
  introduction: string | null;
  portraitUrl: string | null;
  category: { name: string; slug: string } | null;
  publicationDate: string;
  isFeatured: boolean;
  magazine: { slug: string; title: string } | null;
  article: { slug: string; title: string } | null;
}

export interface AdminLeader extends Leader {
  isPublished: boolean;
  displayOrder?: number;
  categoryId?: string | null;
  articleId?: string | null;
  magazineId?: string | null;
}

export interface LeaderPayload {
  name?: string;
  designation?: string | null;
  organization?: string | null;
  introduction?: string | null;
  portrait?: string | null;
  categoryId?: string | null;
  articleId?: string | null;
  magazineId?: string | null;
  publicationDate?: string;
  isPublished?: boolean;
  isFeatured?: boolean;
  displayOrder?: number;
}

export type EnquiryStatus =
  | 'NEW'
  | 'UNDER_REVIEW'
  | 'CONTACTED'
  | 'AWAITING_CLIENT'
  | 'QUALIFIED'
  | 'CONVERTED'
  | 'CLOSED'
  | 'SPAM';

export const ENQUIRY_STATUSES: EnquiryStatus[] = [
  'NEW',
  'UNDER_REVIEW',
  'CONTACTED',
  'AWAITING_CLIENT',
  'QUALIFIED',
  'CONVERTED',
  'CLOSED',
  'SPAM',
];

export interface AdminEnquiry {
  id: string;
  reference: string;
  fullName: string;
  company: string;
  email: string;
  phone?: string | null;
  enquiryType: string;
  subject: string;
  message?: string;
  status: EnquiryStatus;
  internalNotes?: string | null;
  followUpAt?: string | null;
  assignedTo?: { id: string; email: string; firstName: string | null; lastName: string | null } | null;
  submittedAt: string;
  updatedAt?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  createdAt: string;
  roles: RoleName[];
}

export interface LookupItem {
  id: string;
  name: string;
  slug?: string;
  region?: string | null;
}

export interface SiteSettings {
  siteName: string;
  tagline: string;
  heroTitle: string;
  heroCopy: string;
  newsletterHeading: string;
  newsletterCopy: string;
  contactEmail: string | null;
  contactPhone: string | null;
  officeAddress: string | null;
  contactResponseTime: string | null;
  social: {
    linkedin: string | null;
    instagram: string | null;
    twitter: string | null;
    youtube: string | null;
  };
}

/** Admin settings payload (flat social fields). */
export interface SiteSettingsAdmin {
  id?: number;
  siteName: string;
  tagline: string;
  heroTitle: string;
  heroCopy: string;
  newsletterHeading: string;
  newsletterCopy: string;
  contactEmail: string | null;
  contactPhone: string | null;
  officeAddress: string | null;
  contactResponseTime: string | null;
  linkedinUrl?: string | null;
  instagramUrl?: string | null;
  twitterUrl?: string | null;
  youtubeUrl?: string | null;
  featuredArticleId?: string | null;
  featuredMagazineId?: string | null;
}

export interface Advertisement {
  id: string;
  title: string;
  advertiser: string;
  placement: string;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  destinationUrl: string;
  campaignIdentifier?: string | null;
  isDemo?: boolean;
}

export interface AdsReport {
  totals?: { impressions: number; clicks: number };
  byPlacement?: Array<{ placement: string; impressions: number; clicks: number }>;
  [key: string]: unknown;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  roles: RoleName[];
  permissions: string[];
}

/** Route / nav access rule. Purely a UX gate — the API enforces RBAC. */
export interface AccessRule {
  /** Any one of these permissions grants access. */
  anyPermissions?: string[];
  /** Any one of these roles grants access (SUPER_ADMIN always passes). */
  roles?: RoleName[];
}
