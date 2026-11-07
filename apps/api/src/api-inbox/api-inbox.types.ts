import type { ApiInboxCategory } from './api-inbox.enums';
import { ApiInboxSeverity } from './api-inbox.enums';

export type ApiInboxReportInput = {
  category: ApiInboxCategory;
  source: string;
  technicalError: string | Error;
  title?: string;
  severity?: ApiInboxSeverity;
  customerMessage?: string;
  userId?: string | null;
  entityId?: string | null;
  entityType?: string | null;
  metadata?: Record<string, unknown> | null;
  forceEmail?: boolean;
};

export type ApiInboxReportResult = {
  itemId: string;
  created: boolean;
  occurrenceCount: number;
  customerMessage: string;
  severity: ApiInboxSeverity;
  status: string;
};
