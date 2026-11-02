/**
 * Production build. Replace `apiUrl` with the deployed API origin (e.g. via CI)
 * before shipping. The API must list this dashboard's origin in CORS_ORIGINS.
 */
export const environment = {
  production: true,
  apiUrl: 'http://localhost:4000/api',
};
