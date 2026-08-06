source ~/.bash_profile
git pull
npm run build
# NOTE: no -s/--single flag here. -s unconditionally rewrites EVERY request
# (including real static files) to index.html, which swallows
# apple-app-site-association and .well-known/apple-app-site-association.
# public/serve.json already defines scoped SPA-fallback rewrites for every
# real app route, so plain `serve` gives correct behavior: known routes
# fall back to index.html, real files (AASA, manifest.json, etc.) serve
# as-is, and genuinely unknown paths get a real 404.
#
# Run under pm2 (not a bare foreground `serve build`) so the process
# survives this script's shell exiting. `pm2 delete` only removes the
# ishastra_web process, leaving ishastra_backend untouched.
pm2 delete ishastra_web 2>/dev/null || true

# `pm2 delete` sends SIGINT, but the OS can hold port 3000 in TIME_WAIT for
# a moment after that. If `serve` starts before the port frees up, it
# silently falls back to a random port instead of 3000 -- which the
# Cloudflare tunnel forwards to -- and the site starts 502ing with no
# obvious error anywhere. Wait for the port to actually free, then pin it
# explicitly with -l so a future port conflict fails loudly instead of
# silently relocating.
for i in $(seq 1 10); do
  lsof -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1 || break
  sleep 1
done
pm2 start npx --name ishastra_web -- serve build -l 3000
pm2 save