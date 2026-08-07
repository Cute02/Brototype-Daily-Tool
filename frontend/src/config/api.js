/**
 * Configurable API Base URL for production / development deployments.
 * Reads VITE_API_BASE_URL from environment variables (.env.production / .env.development).
 */
const RAW_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
export const API_BASE_URL = RAW_BASE_URL.replace(/\/$/, '');

export function getApiUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${cleanPath}` : cleanPath;
}
