const CONTENT_TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  json: 'application/json; charset=utf-8',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  ico: 'image/x-icon',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  map: 'application/json; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  webmanifest: 'application/manifest+json',
};

export function contentTypeFor(path: string): string {
  const fileName = path.split('/').pop() || '';
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex === -1) return 'application/octet-stream';

  const extension = fileName.slice(dotIndex + 1).toLowerCase();
  return CONTENT_TYPES[extension] ?? 'application/octet-stream';
}

/**
 * Resolves a request path to the object key inside previews/<projectId>/.
 *
 * An empty path, or a path with no file extension, resolves to index.html so
 * that client-side routing in the generated app works on a deep link.
 */
export function resolvePreviewObjectPath(segments: string[] | undefined): string {
  const path = (segments ?? []).filter(Boolean).join('/');
  if (!path) return 'index.html';

  const fileName = path.split('/').pop() || '';
  const hasExtension = fileName.includes('.');

  return hasExtension ? path : 'index.html';
}

/**
 * Standalone page shown while a project has no published build yet.
 *
 * Without this the iframe would render the browser's own 404 page - the same
 * class of problem as E2B's "Sandbox Not Found" screen, just from a different
 * sender. The meta refresh makes the page pick up the build once it lands.
 */
export function buildingPlaceholderHtml(): string {
  return `<!DOCTYPE html>
<html lang="sv">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="refresh" content="5" />
    <title>Bygger din sida…</title>
    <style>
      html, body { height: 100%; margin: 0; }
      body {
        display: flex;
        align-items: center;
        justify-content: center;
        background: #111827;
        color: #e5e7eb;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      .label { font-size: 15px; letter-spacing: 0.01em; animation: pulse 1.6s ease-in-out infinite; }
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
    </style>
  </head>
  <body>
    <div class="label">Bygger din sida…</div>
  </body>
</html>`;
}
