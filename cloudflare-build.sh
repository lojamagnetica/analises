#!/bin/sh
# Monta a pasta que o Cloudflare publica: o portal no mesmo caminho do GitHub Pages e a raiz levando ao login.
set -e
rm -rf dist
mkdir -p dist/analises
cp -r portal dist/analises/portal
cp portal/404.html dist/404.html 2>/dev/null || true
printf '/ /analises/portal/login/ 302\n/analises /analises/portal/ 302\n/b/:loja /analises/portal/bio/?l=:loja 302\n' > dist/_redirects
