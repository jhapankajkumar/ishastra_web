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
serve build