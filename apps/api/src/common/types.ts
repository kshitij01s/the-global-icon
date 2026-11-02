import type { RoleName } from '@prisma/client';

/** Authenticated principal attached to `req.user` by the JWT strategy. */
export interface AuthUser {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  roles: RoleName[];
  permissions: string[];
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
