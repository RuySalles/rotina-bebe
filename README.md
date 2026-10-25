# Rotina do bebê

App web leve para pais registrarem e acompanharem a rotina do bebê: remédios em horário fixo,
remédio para febre com intervalo mínimo, alimentação e temperatura. Feito para usar no celular,
com uma mão só, em tema claro ou escuro.

> Ferramenta de organização. Não substitui orientação médica.

## O que faz

- **Próximo**: o próximo cuidado, com horário e contagem regressiva (atrasos em destaque).
- **Registro rápido** com um toque, usando a hora atual (dá para ajustar).
- **Próximas 24 horas** numa linha do tempo.
- **Histórico** por dia, com quem registrou, editar e apagar.
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
