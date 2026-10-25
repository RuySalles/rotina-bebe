# RotinaBebe — regras permanentes

App web leve para registrar a rotina do bebê (remédios, alimentação, febre e, no futuro, sono, fralda, banho, vacinas…).
HTML/CSS/JS puros com ES modules nativos. Sem build, sem framework, sem dependências externas.
Publicado no GitHub Pages (`.github/workflows/pages.yml`). Backend: Google Apps Script + Google Planilha.

## Mapa

- `index.html`, `css/app.css`, `manifest.webmanifest`
- `img/` → imagem de prévia do link (`compartilhar.png`, 1200x630) e ícones; as fontes HTML ficam em `img/fontes/`
  (gerar de novo com o Edge headless, instruções no topo de cada fonte).
- `scripts/montar-site.sh` → monta o site publicado. Arquivos novos na raiz ou pastas novas precisam entrar nele.
  **Atualização automática:** o JS/CSS vai para `v/<sha>/`, o `index.html` recebe `<meta name="versao">` e o
  `versao.json` diz a versão mais recente; o `app.js` compara e recarrega sozinho. Por isso, no `index.html`,
  mantenha exatamente `src="js/app.js"`, `href="css/app.css"` e `<meta name="versao" content="dev">` (o script
  falha se não encontrar). Imports entre módulos devem ser sempre relativos.
- `js/app.js` → telas e navegação (só fala com `store.js` e `regras.js`)
- `js/store.js` → ÚNICO módulo que conversa com o backend (fila offline no localStorage)
- `js/regras.js` → cálculos puros: tempo (fuso America/Sao_Paulo, 24h), leitura das linhas, `substitui_id`, planos, janelas, agenda
- `js/tipos/index.js` → registro central; `js/tipos/<id>.js` → um arquivo por tipo de evento
- `apps-script/Code.gs` → backend; `apps-script/Seed.example.gs` → modelo do seed (o `Seed.gs` real é local)
- `tests/regras.casos.js` → casos; `tests/regras.test.html` (navegador) e `tests/rodar.mjs` (terminal)
- `.claude/launch.json` → abre o app pelo `tests/servidor.mjs` (porta 8080) no navegador do Claude.
  Para testar telas sem tocar na planilha real: no `localStorage`, grave `rb_chave` (qualquer texto com 16+ letras),
  `rb_url` = `http://127.0.0.1:9/exec` (endereço falso) e `rb_apelido`. Os registros ficam só na fila local.
  Ao terminar, rode `localStorage.clear()`.

## Regras (não negociáveis)

1. **O contrato de persistência é imutável**: nunca renomear, remover ou reordenar colunas ou abas existentes.
   Só adicionar colunas novas no final, com valor padrão seguro.
2. **A aba "eventos" é somente adicionar.** Nunca sobrescrever nem deletar linhas.
   Editar = nova linha com `substitui_id`. Apagar = nova linha com `apagado=true` e `substitui_id`.
3. **Tipos novos de evento entram só via `js/tipos/` + registro no `js/tipos/index.js`.**
   Campos específicos vão dentro de `dados` (JSON), nunca em colunas novas.
   Não é preciso (nem permitido) mexer em `store.js`, `Code.gs` ou na planilha para criar um tipo.
4. **A API do `store.js` é estável**: pode ganhar funções novas, mas as existentes não mudam de assinatura:
   `carregar()`, `adicionarEvento(tipo, horario, dados)`, `editarEvento(id, mudancas)`, `apagarEvento(id)`,
   `salvarPlano(tipo, horarios)`, `salvarConfig(chave, valor)`, `assinar(callback)`.
5. **Mudanças no `Code.gs` precisam ser retrocompatíveis.** Se mudar, avise que é preciso republicar o Web App
   (Implantar → Gerenciar implantações → editar → Nova versão) e atualize o `SETUP.md`.
6. **Se o formato de `dados` mudar, incremente `SCHEMA_VERSION`** (em `js/regras.js`) e mantenha a leitura das versões
   antigas (função `migrar(dados, versao)` do tipo + um teste em `tests/regras.casos.js`).
7. **Nenhum nome real, dado de saúde, chave ou URL do Web App no repositório.**
   `config.js` e `apps-script/Seed.gs` ficam no `.gitignore`. Testes usam dados fictícios.
8. **Commits apenas com o autor configurado no git. Nunca adicionar "Co-Authored-By" nem atribuição ao Claude**
   em commits ou PRs.
9. **Antes de qualquer commit, rodar os testes de regras**: `node tests/rodar.mjs` (ou abrir
   `tests/regras.test.html` por um servidor: `node tests/servidor.mjs`). Todos precisam passar.
   O workflow do Pages também roda os testes e não publica se falharem.

## Convenções

- Interface em português do Brasil, sem termos técnicos. Horários sempre 24h no fuso America/Sao_Paulo
  (use `fmtHora`, `isoSP`, `deDataHoraSP` de `regras.js`; nunca `toLocaleTimeString` sem fuso).
- Tylenol nunca é sugerido sem febre: itens dele na agenda são `informativo` e não entram no card PRÓXIMO.
- O rodapé "Ferramenta de organização. Não substitui orientação médica." aparece em todas as telas.
- Tema claro/escuro automático via tokens CSS em `:root`. Cores de cada tipo vêm de `tipo.cor` (`--cor`).
