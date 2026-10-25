# Rotina do bebê

App web leve para pais registrarem e acompanharem a rotina do bebê: remédios em horário fixo,
remédio para febre com intervalo mínimo, alimentação, temperatura, sono, fraldas, banho e vacinas. Feito para usar no celular,
com uma mão só, em tema claro ou escuro.

> Ferramenta de organização. Não substitui orientação médica.

## O que faz

- **Próximo**: o próximo cuidado, com horário e contagem regressiva (atrasos em destaque).
- **Registro rápido** com um toque, usando a hora atual (dá para ajustar).
- **Sono**: um toque quando dorme, outro quando acorda; mostra há quanto tempo está dormindo ou acordado.
- **Resumo** de hoje ou de ontem: horas de sono, trocas de fralda, mamadas, doses, maior temperatura.
- **Próximas 24 horas** numa linha do tempo.
- **Histórico** por dia, com filtro por tipo, quem registrou, editar e apagar.
- **Vacinas** com dose e local; dá para lançar as antigas da caderneta em "Outro dia".
- **Compartilhado** entre os celulares da família, sem login (link secreto), funcionando sem internet.

## Como funciona

- HTML, CSS e JavaScript puros (ES modules), sem build e sem dependências.
- Dados numa Google Planilha, por meio de um Google Apps Script publicado como Web App.
- Cada tipo de evento é um módulo em `js/tipos/`. Para criar um tipo novo, basta um arquivo novo e uma
  linha em `js/tipos/index.js`.

## Instalação

Veja o passo a passo em [SETUP.md](SETUP.md). Regras para mudanças futuras em [CLAUDE.md](CLAUDE.md).

## Desenvolvimento

```bash
node tests/rodar.mjs
```

```bash
node tests/servidor.mjs
```

O segundo comando serve o app em http://localhost:8080 (crie um `config.js` a partir de `config.example.js`).
Os testes também abrem no navegador em `/tests/regras.test.html`.
