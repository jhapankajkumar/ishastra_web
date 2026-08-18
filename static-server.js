// Static file server for the production build. Serves real files under
// /.well-known/ (e.g. apple-app-site-association) as-is, and falls back to
// index.html for everything else so client-side routes (e.g. /login) work.
// Not using the `serve` CLI's rewrites config here — its rule precedence
// (first vs. last match) proved unpredictable for excluding a path from the
// SPA catch-all, so this is a small handler with explicit, ordered logic.
const http = require('http');
const path = require('path');
const handler = require('serve-handler');

const PORT = process.env.PORT || 3000;
const BUILD_DIR = path.join(__dirname, 'build');

// Without this, browsers apply heuristic caching to index.html (no
// Cache-Control from serve-handler by default), so after a deploy some
// visitors keep loading a stale index.html that references JS/CSS chunk
// filenames from the previous build — those old chunks are gone once
// overwritten by the new build, causing a blank/broken app until a hard
// reload. Hashed filenames under /static/ are safe to cache forever since
// their content never changes without the hash changing too.
const headersConfig = [
  { source: 'index.html', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
  { source: '/', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
  { source: 'static/**', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
];

const server = http.createServer((request, response) => {
  if (request.url.startsWith('/.well-known/')) {
    return handler(request, response, { public: BUILD_DIR, headers: headersConfig });
  }
  return handler(request, response, {
    public: BUILD_DIR,
    rewrites: [{ source: '**', destination: '/index.html' }],
    headers: headersConfig,
  });
});

server.listen(PORT, () => {
  console.log(`Serving ${BUILD_DIR} at http://localhost:${PORT}`);
});
