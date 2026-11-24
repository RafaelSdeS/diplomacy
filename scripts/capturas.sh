#!/bin/sh
# Passo 39: as capturas de referência saem do mesmo contêiner que o CI usa (mesmo
# Chromium, mesmas fontes), então dá para gerar aqui, sem esperar o CI.
# Zera o banco local, roda o seed e a build, e roda no contêiner os arquivos que têm
# capturas, regravando só as que mudaram. Confira as imagens no git diff antes do commit.
# Precisa do Supabase local de pé (npm run db:iniciar) e da porta 4173 livre.
# Passo 52: `npm run capturas -- tests/06-sessao.spec.ts` regrava só as daquele arquivo, e
# SEM_RESET=1 pula zerar o banco (quando o seed é recente e a tela não depende do histórico).
set -e
IMAGEM=mcr.microsoft.com/playwright:v1.65.1-noble # a mesma versão do @playwright/test
ARQUIVOS=""
RESTO=""
for a in "$@"; do
	case "$a" in
	*.spec.ts) ARQUIVOS="$ARQUIVOS $a" ;;
	*) RESTO="$RESTO $a" ;;
	esac
done
[ -n "$ARQUIVOS" ] || ARQUIVOS=$(grep -l toHaveScreenshot tests/*.spec.ts)
if [ -z "$SEM_RESET" ]; then
	npm run db:resetar
	npm run seed
fi
node scripts/build-se-preciso.ts
# shellcheck disable=SC2086 # as listas se separam por espaço de propósito
docker run --rm --network host --ipc host --user "$(id -u):$(id -g)" -e HOME=/tmp -e CI=1 -e CAPTURAS=1 \
	-v "$PWD":/app -w /app "$IMAGEM" npx playwright test $ARQUIVOS --update-snapshots $RESTO
