#!/bin/sh
# Passo 39: as capturas de referência saem do mesmo contêiner que o CI usa (mesmo
# Chromium, mesmas fontes), então dá para gerar aqui, sem esperar o CI.
# Zera o banco local, roda o seed e a build, e roda no contêiner os arquivos que têm
# capturas, regravando só as que mudaram. Confira as imagens no git diff antes do commit.
# Precisa do Supabase local de pé (npm run db:iniciar) e da porta 4173 livre.
set -e
IMAGEM=mcr.microsoft.com/playwright:v1.65.1-noble # a mesma versão do @playwright/test
npm run db:resetar
npm run seed
npm run build
ARQUIVOS=$(grep -l toHaveScreenshot tests/*.spec.ts)
docker run --rm --network host --ipc host --user "$(id -u):$(id -g)" -e HOME=/tmp -e CI=1 -e CAPTURAS=1 \
	-v "$PWD":/app -w /app "$IMAGEM" npx playwright test $ARQUIVOS --update-snapshots "$@"
