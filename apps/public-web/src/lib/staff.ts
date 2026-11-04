import type { AuthUser } from './api'

/** Staff = backend-verified SUPER_ADMIN or anyone with dashboard.view. Never trust client-picked roles. */
export function isStaffUser(user: AuthUser | null | undefined): boolean {
  if (!user) return false
  return user.roles.includes('SUPER_ADMIN') || user.permissions.includes('dashboard.view')
}

export function adminConsoleUrl(): string {
  const fromEnv = (import.meta.env.VITE_ADMIN_URL as string | undefined)?.replace(/\/+$/, '')
  return fromEnv || 'http://localhost:4200'
}

/** Hard navigation so Angular can pick up the shared refresh cookie. */
export function goToAdminConsole(path = '/'): void {
  const base = adminConsoleUrl()
  window.location.assign(`${base}${path.startsWith('/') ? path : `/${path}`}`)
}
