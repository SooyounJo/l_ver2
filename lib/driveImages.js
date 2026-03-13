/**
 * Drive image URL list from env.
 * - Server: DRIVE_IMAGE_URLS or NEXT_PUBLIC_DRIVE_IMAGE_URLS (comma-separated)
 * - Client: NEXT_PUBLIC_DRIVE_IMAGE_URLS only
 */

function parseDriveUrls(value) {
  if (typeof value !== 'string' || !value.trim()) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * @returns {string[]} URLs from env (server or client)
 */
export function getDriveImageUrls() {
  const raw =
    typeof process !== 'undefined' && process.env
      ? process.env.NEXT_PUBLIC_DRIVE_IMAGE_URLS || process.env.DRIVE_IMAGE_URLS || ''
      : '';
  return parseDriveUrls(raw);
}

/**
 * First URL from drive list (for fallbacks). Safe to use on client.
 * @returns {string}
 */
export function getFirstDriveImageUrl() {
  const urls = getDriveImageUrls();
  return urls.length > 0 ? urls[0] : '';
}
