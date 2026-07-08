/**
 * Reads the Quetext API configuration (key + base URL) from localStorage.
 * Shared helper so every page/utility doesn't re-implement the same logic.
 */
export function getApiConfig(): { apiKey: string; baseUrl: string } | null {
  try {
    const raw = localStorage.getItem("pg_api_config");
    if (raw) return JSON.parse(raw) as { apiKey: string; baseUrl: string };
  } catch {}
  return null;
}

/**
 * Builds request headers from the stored API configuration.
 * Returns an empty object when no config is saved.
 */
export function getApiHeaders(): Record<string, string> {
  const config = getApiConfig();
  const headers: Record<string, string> = {};
  if (config?.apiKey) headers["x-quetext-key"] = config.apiKey;
  if (config?.baseUrl) headers["x-quetext-base-url"] = config.baseUrl;
  return headers;
}
