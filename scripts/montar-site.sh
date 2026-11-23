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
cp -r index.html manifest.webmanifest config.js sw.js css js img tests "$DESTINO/"
cp -r js css config.js "$DESTINO/v/$VERSAO/"

sed -i \
  -e "s#src=\"js/app.js\"#src=\"v/$VERSAO/js/app.js\"#" \
  -e "s#href=\"css/app.css\"#href=\"v/$VERSAO/css/app.css\"#" \
  -e "s#<meta name=\"versao\" content=\"dev\">#<meta name=\"versao\" content=\"$VERSAO\">#" \
  "$DESTINO/index.html"

for esperado in "v/$VERSAO/js/app.js" "v/$VERSAO/css/app.css" "content=\"$VERSAO\""; do
  grep -q "$esperado" "$DESTINO/index.html" || { echo "index.html sem: $esperado" >&2; exit 1; }
done

# Impressão digital de cada arquivo desta versão (fase 23): o service worker compara com a versão que o celular já
# tem e reaproveita os arquivos iguais em vez de baixar de novo. Formato: {"js/app.js":"<16 letras do sha1>", ...}
(
  cd "$DESTINO/v/$VERSAO"
  printf '{'
  sep=''
  while IFS= read -r f; do
    printf '%s"%s":"%s"' "$sep" "${f#./}" "$(sha1sum "$f" | cut -c1-16)"
    sep=','
  done < <(find . -type f ! -name arquivos.json | sort)
  printf '}\n'
) > "$DESTINO/v/$VERSAO/arquivos.json"
grep -q '"js/app.js":"[0-9a-f]\{16\}"' "$DESTINO/v/$VERSAO/arquivos.json" || { echo "arquivos.json sem js/app.js" >&2; exit 1; }

# Service worker (abrir sem internet): versão e lista dos arquivos desta versão para guardar no celular.
LISTA=$(cd "$DESTINO" && find "v/$VERSAO" -type f | sort | sed "s#.*#, '&'#" | tr -d '\n')
sed -i \
  -e "s#__VERSAO__#$VERSAO#" \
  -e "s#/\* __ARQUIVOS__ \*/#$LISTA#" \
  "$DESTINO/sw.js"
for esperado in "const VERSAO = '$VERSAO'" "'v/$VERSAO/js/app.js'" "'v/$VERSAO/css/app.css'"; do
  grep -qF "$esperado" "$DESTINO/sw.js" || { echo "sw.js sem: $esperado" >&2; exit 1; }
done

printf '{"versao":"%s"}\n' "$VERSAO" > "$DESTINO/versao.json"
echo "Site montado em $DESTINO (versão $VERSAO)"
