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

const server = http.createServer((request, response) => {
  if (request.url.startsWith('/.well-known/')) {
    return handler(request, response, { public: BUILD_DIR });
  }
  return handler(request, response, {
    public: BUILD_DIR,
    rewrites: [{ source: '**', destination: '/index.html' }],
  });
});

server.listen(PORT, () => {
  console.log(`Serving ${BUILD_DIR} at http://localhost:${PORT}`);
});
