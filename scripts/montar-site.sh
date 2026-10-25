#!/usr/bin/env bash
# Monta a pasta publicada no GitHub Pages (usado pelo workflow; também roda local no Git Bash).
#   scripts/montar-site.sh <versao> [pasta_destino]
#
# Atualização automática: o JS e o CSS vão para v/<versao>/, então cada versão tem endereços
# novos e o celular nunca mistura arquivo velho com novo. O index.html recebe a versão numa
# <meta name="versao"> e o versao.json diz qual é a mais recente; o app compara os dois.
set -euo pipefail

VERSAO="${1:?informe a versão}"
DESTINO="${2:-_site}"

[ -f config.js ] || { echo "config.js não encontrado" >&2; exit 1; }

rm -rf "$DESTINO"
mkdir -p "$DESTINO/v/$VERSAO"
cp -r index.html manifest.webmanifest config.js css js img tests "$DESTINO/"
cp -r js css config.js "$DESTINO/v/$VERSAO/"

sed -i \
  -e "s#src=\"js/app.js\"#src=\"v/$VERSAO/js/app.js\"#" \
  -e "s#href=\"css/app.css\"#href=\"v/$VERSAO/css/app.css\"#" \
  -e "s#<meta name=\"versao\" content=\"dev\">#<meta name=\"versao\" content=\"$VERSAO\">#" \
  "$DESTINO/index.html"

for esperado in "v/$VERSAO/js/app.js" "v/$VERSAO/css/app.css" "content=\"$VERSAO\""; do
  grep -q "$esperado" "$DESTINO/index.html" || { echo "index.html sem: $esperado" >&2; exit 1; }
done

printf '{"versao":"%s"}\n' "$VERSAO" > "$DESTINO/versao.json"
echo "Site montado em $DESTINO (versão $VERSAO)"
