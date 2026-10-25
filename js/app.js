// Telas e navegação. Lê/grava dados só pelo store.js e calcula tudo pelo regras.js.

import * as store from './store.js';
import { TIPOS, LISTA_TIPOS } from './tipos/index.js';
import {
  resolverEventos, resolverPlanos, criarContexto, montarAgenda, escolherProximo,
  fmtHora, fmtData, fmtDataLonga, chaveDia, rotuloDia, contagem, somarDias, deDataHoraSP,
  numero, fmtNumero
} from './regras.js';

const app = document.getElementById('app');
const folha = document.getElementById('folha');
const toastEl = document.getElementById('toast');

let estado = store.obterEstado();
let ctx = null;
let vista = 'inicio';
let filtroHistorico = '';
let urlDoConfig = '';

const ICONES = {
  inicio: '<svg viewBox="0 0 24 24"><path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19z"/></svg>',
  historico: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  ajustes: '<svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
  lapis: '<svg viewBox="0 0 24 24"><path d="M15.5 5.5l3 3L8 19l-4 1 1-4z"/></svg>',
  fechar: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  lua: '<svg viewBox="0 0 24 24"><path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/><path d="M16.5 3.5v3M15 5h3"/></svg>',
  alerta: '<svg viewBox="0 0 24 24"><path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.2v.1"/></svg>',
  compartilhar: '<svg viewBox="0 0 24 24"><path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5"/></svg>',
  sync: '<svg viewBox="0 0 24 24"><path d="M19.5 12a7.5 7.5 0 0 1-13.1 5M4.5 12a7.5 7.5 0 0 1 13.1-5"/><path d="M17.8 3.5v3.7h-3.7M6.2 20.5v-3.7h3.7"/></svg>'
};

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const maiuscula = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function contexto() {
  return criarContexto({
    eventos: resolverEventos(estado.eventos, TIPOS),
    planos: resolverPlanos(estado.planos),
    config: estado.config,
    agora: Date.now(),
    tipos: TIPOS
  });
}

/** "14:30", "Amanhã 09:00" ou "27/10 09:00". */
function quandoCurto(t, agora = Date.now()) {
  const dia = chaveDia(t);
  if (dia === chaveDia(agora)) return fmtHora(t);
  const rot = rotuloDia(dia, agora);
  return `${rot === 'Ontem' || rot === 'Amanhã' ? rot : fmtData(t)} ${fmtHora(t)}`;
}

let toastTimer = null;
function toast(texto, duracao = 2800) {
  toastEl.textContent = texto;
  toastEl.classList.add('toast--visivel');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('toast--visivel'), duracao);
}

// ---------------------------------------------------------------------------
// Início do app: link secreto, endereço do backend e apelido
// ---------------------------------------------------------------------------

function lerLink() {
  if (!location.hash) return;
  const p = new URLSearchParams(location.hash.slice(1));
  const k = p.get('k');
  const u = p.get('u');
  if (k) store.salvarChave(k.trim());
  if (u) store.salvarUrlBackend(u.trim());
  if (k || u) history.replaceState(null, '', location.pathname + location.search);
}

async function iniciar() {
  lerLink();
  try {
    const { CONFIG } = await import('../config.js');
    const url = CONFIG?.webAppUrl || '';
    if (/^https?:\/\//.test(url)) urlDoConfig = url;
  } catch { /* sem config.js: o endereço pode vir no link */ }
  store.configurarBackend(urlDoConfig);

  if (!store.lerChave()) return telaAviso('Abra pelo link de acesso', 'Este aplicativo é aberto por um link próprio, enviado por quem cuida do bebê com você. Peça o link e abra-o neste celular.');
  if (!store.temBackend()) return telaAviso('Quase pronto', 'Falta ligar o aplicativo à planilha. Siga o passo “Preencher o config.js” do guia de instalação (SETUP.md).');
  if (!store.lerApelido()) return telaApelido(entrar);
  entrar();
}

function telaAviso(titulo, texto) {
  app.innerHTML = `
    <div class="entrada">
      <div class="entrada-cartao">
        <span class="entrada-marca">${ICONES.lua}</span>
        <h1>${esc(titulo)}</h1>
        <p>${esc(texto)}</p>
      </div>
      ${rodape()}
    </div>`;
}

function telaApelido(depois, atual = '') {
  app.innerHTML = `
    <div class="entrada">
      <form class="entrada-cartao" id="form-apelido">
        <span class="entrada-marca">${ICONES.lua}</span>
        <h1>Quem está usando este celular?</h1>
        <p>O apelido aparece junto de cada registro, para vocês saberem quem anotou.</p>
        <div class="opcoes-grandes">
          <button type="button" class="opcao-grande" data-apelido="Pai">Pai</button>
          <button type="button" class="opcao-grande" data-apelido="Mãe">Mãe</button>
        </div>
        <label class="campo">
          <span>Ou escreva outro</span>
          <input name="apelido" maxlength="20" autocomplete="off" value="${esc(atual)}" placeholder="Ex.: Vó Lu">
        </label>
        <button class="botao botao--cheio botao--grande" type="submit">Continuar</button>
      </form>
    </div>`;
  const form = document.getElementById('form-apelido');
  const concluir = (nome) => {
    const limpo = String(nome || '').trim().slice(0, 20);
    if (!limpo) return toast('Escolha ou escreva um apelido');
    store.salvarApelido(limpo);
    depois();
  };
  form.addEventListener('click', (e) => {
    const b = e.target.closest('[data-apelido]');
    if (b) concluir(b.dataset.apelido);
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    concluir(form.apelido.value);
  });
}

let entrou = false;
function entrar() {
  if (!entrou) {
    entrou = true;
    store.assinar((novo) => { estado = novo; aoMudarEstado(); });
    store.carregar();
    store.iniciarSincronizacaoAutomatica();
    setInterval(() => { if (vista === 'inicio' && document.visibilityState === 'visible') render(); }, 20 * 1000);
  }
  render();
}

function aoMudarEstado() {
  if (!entrou) return;
  if (vista === 'ajustes') {
    // Não redesenha a tela de ajustes para não apagar o que está sendo digitado.
    const pilula = document.getElementById('sync');
    if (pilula) pilula.outerHTML = pilulaSync();
    const status = document.getElementById('status-sync');
    if (status) status.textContent = textoSyncDetalhado();
    return;
  }
  render();
}

// ---------------------------------------------------------------------------
// Estrutura
// ---------------------------------------------------------------------------

function render() {
  ctx = contexto();
  const corpo = vista === 'historico' ? vistaHistorico() : vista === 'ajustes' ? vistaAjustes() : vistaInicio();
  const html = `
    ${cabecalho()}
    <main class="conteudo">${corpo}${rodape()}</main>
    ${navegacao()}`;
  // Só troca o DOM quando algo mudou, para não "engolir" um toque no meio do redesenho.
  if (html === ultimoHtml) return;
  ultimoHtml = html;
  app.innerHTML = html;
}
let ultimoHtml = '';

function cabecalho() {
  const nome = String(estado.config.nome_bebe || '').trim();
  return `
    <header class="topo">
      <div class="topo-texto">
        <p class="topo-data">${esc(maiuscula(fmtDataLonga(ctx.agora)))}</p>
        <h1 class="topo-nome">${nome ? esc(nome) : 'Rotina do bebê'}</h1>
      </div>
      ${pilulaSync()}
    </header>`;
}

function pilulaSync() {
  const s = estado.sync;
  let classe = '';
  let texto = 'Sincronizando…';
  if (s.estado === 'erro') { classe = 'erro'; texto = 'Erro'; }
  else if (s.pendentes > 0) { classe = 'pendente'; texto = `Pendente (${s.pendentes})`; }
  else if (s.ultima && s.estado !== 'sem_config') { classe = 'ok'; texto = `Sincronizado às ${fmtHora(s.ultima)}`; }
  return `<button class="sync sync--${classe}" id="sync" data-acao="sync" aria-label="${esc(texto)}. Toque para sincronizar"><span class="sync-ponto"></span>${esc(texto)}</button>`;
}

function textoSyncDetalhado() {
  const s = estado.sync;
  const partes = [];
  if (s.ultima) partes.push(`Última sincronização: ${quandoCurto(s.ultima)}`);
  if (s.pendentes) partes.push(`${s.pendentes} registro(s) esperando internet`);
  if (s.estado === 'erro' && s.mensagem) partes.push(s.mensagem);
  return partes.join(' · ') || 'Ainda não sincronizado';
}

function navegacao() {
  const item = (id, rotulo) => `
    <button class="nav-item ${vista === id ? 'nav-item--ativo' : ''}" data-acao="vista" data-vista="${id}" ${vista === id ? 'aria-current="page"' : ''}>
      ${ICONES[id]}<span>${rotulo}</span>
    </button>`;
  return `<nav class="nav">${item('inicio', 'Início')}${item('historico', 'Histórico')}${item('ajustes', 'Ajustes')}</nav>`;
}

function rodape() {
  return '<footer class="rodape">Ferramenta de organização. Não substitui orientação médica.</footer>';
}

const estiloCor = (tipo) => `style="--cor:${esc(tipo.cor)}"`;

// ---------------------------------------------------------------------------
// Início
// ---------------------------------------------------------------------------

function vistaInicio() {
  const agenda = montarAgenda(ctx, 24);
  const { principal, depois } = escolherProximo(agenda);
  return `
    ${cardProximo(principal, depois)}
    <section class="secao">
      <h2 class="secao-titulo">Registrar</h2>
      <div class="grade">${LISTA_TIPOS.map(tile).join('')}</div>
    </section>
    <section class="secao">
      <h2 class="secao-titulo">Próximas 24 horas</h2>
      ${linhaDoTempo(agenda)}
    </section>
    ${paineis()}`;
}

function cardProximo(item, depois) {
  if (!item) {
    return `
      <section class="proximo proximo--vazio">
        <span class="proximo-rotulo">Próximo</span>
        <p class="proximo-titulo">Nada programado</p>
        <p class="proximo-detalhe">Nenhum horário previsto nas próximas 24 horas.</p>
      </section>`;
  }
  const tipo = TIPOS[item.tipo];
  return `
    <section class="proximo ${item.alerta ? 'proximo--alerta' : ''}" ${estiloCor(tipo)}>
      <div class="proximo-topo">
        <span class="proximo-rotulo">${item.alerta ? `${ICONES.alerta} Atrasado` : 'Próximo'}</span>
        <span class="proximo-conta">${esc(contagem(item.t, ctx.agora))}</span>
      </div>
      <div class="proximo-corpo">
        <span class="icone icone--grande">${tipo.icone}</span>
        <div class="proximo-textos">
          <p class="proximo-titulo">${esc(item.titulo)}</p>
          <p class="proximo-detalhe">${esc(item.detalhe || '')}</p>
        </div>
        <p class="proximo-hora">${esc(quandoCurto(item.t, ctx.agora))}</p>
      </div>
      <button class="botao botao--cheio botao--grande" data-acao="registrar" data-tipo="${tipo.id}">Registrar ${esc(tipo.rotulo.toLowerCase())}</button>
      ${depois ? `<p class="proximo-depois">Depois: ${esc(depois.titulo)} · ${esc(quandoCurto(depois.t, ctx.agora))}</p>` : ''}
    </section>`;
}

function tile(tipo) {
  const st = tipo.regras?.status ? tipo.regras.status(ctx) : { linhas: [] };
  const [forte = '', ...resto] = st.linhas || [];
  const classe = st.alerta ? 'tile--alerta' : st.aviso ? 'tile--aviso' : st.ok ? 'tile--ok' : '';
  return `
    <button class="tile ${classe}" data-acao="registrar" data-tipo="${tipo.id}" ${estiloCor(tipo)}>
      <span class="tile-topo">
        <span class="icone">${tipo.icone}</span>
        <span class="tile-mais" aria-hidden="true">+</span>
      </span>
      <span class="tile-rotulo">${esc(tipo.rotulo)}</span>
      <span class="tile-forte">${esc(forte)}</span>
      ${resto.map((l) => `<span class="tile-linha">${esc(l)}</span>`).join('')}
    </button>`;
}

function linhaDoTempo(agenda) {
  if (!agenda.length) return '<p class="vazio">Nada previsto por enquanto.</p>';
  const hoje = chaveDia(ctx.agora);
  let diaAtual = hoje;
  let marcouAgora = false;
  const partes = [];
  for (const item of agenda) {
    const dia = chaveDia(item.t);
    if (!marcouAgora && item.t > ctx.agora) {
      partes.push(`<li class="tempo-agora"><span>Agora · ${fmtHora(ctx.agora)}</span></li>`);
      marcouAgora = true;
    }
    if (dia !== diaAtual) {
      partes.push(`<li class="tempo-dia">${esc(rotuloDia(dia, ctx.agora))}</li>`);
      diaAtual = dia;
    }
    const tipo = TIPOS[item.tipo];
    partes.push(`
      <li class="tempo-item ${item.alerta ? 'tempo-item--alerta' : ''} ${item.informativo ? 'tempo-item--info' : ''}" ${estiloCor(tipo)}>
        <time>${fmtHora(item.t)}</time>
        <span class="tempo-ponto"></span>
        <div class="tempo-textos">
          <p class="tempo-titulo">${esc(item.titulo)}${item.alerta ? ' <span class="selo selo--alerta">atrasado</span>' : ''}</p>
          <p class="tempo-detalhe">${esc(item.detalhe || '')}</p>
        </div>
      </li>`);
  }
  if (!marcouAgora) partes.push(`<li class="tempo-agora"><span>Agora · ${fmtHora(ctx.agora)}</span></li>`);
  return `<ol class="tempo">${partes.join('')}</ol>`;
}

function paineis() {
  return LISTA_TIPOS.map((tipo) => {
    const p = tipo.painel ? tipo.painel(ctx) : null;
    if (!p) return '';
    return `
      <section class="secao">
        <h2 class="secao-titulo">${esc(tipo.rotulo)} · ${esc(p.titulo)}</h2>
        <ul class="cartao lista-medicoes" ${estiloCor(tipo)}>
          ${p.itens.map((i) => `
            <li>
              <button class="medicao" data-acao="editar" data-id="${esc(i.evento.id)}">
                <span class="medicao-valor ${i.destaque ? 'medicao-valor--alto' : ''}">${esc(i.texto)}</span>
                <span class="medicao-quando">${esc(i.quando)}</span>
              </button>
            </li>`).join('')}
        </ul>
      </section>`;
  }).join('');
}

// ---------------------------------------------------------------------------
// Histórico
// ---------------------------------------------------------------------------

function vistaHistorico() {
  const eventos = ctx.eventos
    .filter((e) => TIPOS[e.tipo] && (!filtroHistorico || e.tipo === filtroHistorico))
    .sort((a, b) => b.t - a.t);
  const chips = [['', 'Todos'], ...LISTA_TIPOS.map((t) => [t.id, t.rotulo])]
    .map(([id, rotulo]) => `<button class="chip ${filtroHistorico === id ? 'chip--ativo' : ''}" data-acao="filtro" data-tipo="${id}">${esc(rotulo)}</button>`)
    .join('');
  if (!eventos.length) {
    return `<div class="chips">${chips}</div><p class="vazio vazio--grande">Nenhum registro ainda.</p>`;
  }
  const dias = new Map();
  for (const e of eventos) {
    const d = chaveDia(e.t);
    if (!dias.has(d)) dias.set(d, []);
    dias.get(d).push(e);
  }
  const blocos = [...dias.entries()].map(([dia, lista]) => `
    <section class="secao">
      <h2 class="secao-titulo">${esc(maiuscula(rotuloDia(dia, ctx.agora)))} <span class="secao-conta">${lista.length} ${lista.length === 1 ? 'registro' : 'registros'}</span></h2>
      <ul class="cartao lista">
        ${lista.map((e) => {
          const tipo = TIPOS[e.tipo];
          const r = tipo.resumo ? tipo.resumo(e.dados, ctx) : { texto: '' };
          return `
            <li>
              <button class="registro" data-acao="editar" data-id="${esc(e.id)}" ${estiloCor(tipo)} aria-label="Editar ${esc(tipo.rotulo)} das ${fmtHora(e.t)}">
                <time>${fmtHora(e.t)}</time>
                <span class="icone icone--pequeno">${tipo.icone}</span>
                <span class="registro-textos">
                  <span class="registro-tipo">${esc(tipo.rotulo)}</span>
                  <span class="registro-resumo ${r.destaque ? 'registro-resumo--alto' : ''}">${esc(r.texto)}</span>
                </span>
                <span class="registro-quem">${esc(e.quem || '')}</span>
                <span class="registro-editar">${ICONES.lapis}</span>
              </button>
            </li>`;
        }).join('')}
      </ul>
    </section>`).join('');
  return `<div class="chips">${chips}</div>${blocos}`;
}

// ---------------------------------------------------------------------------
// Ajustes
// ---------------------------------------------------------------------------

function vistaAjustes() {
  const c = estado.config;
  const chave = store.lerChave();
  const planos = LISTA_TIPOS.filter((t) => t.regras?.usaPlano).map((tipo) => {
    const plano = ctx.plano(tipo.id);
    const linhas = plano ? plano.horarios.map((t) => `${fmtData(t)}/${chaveDia(t).slice(0, 4)} ${fmtHora(t)}`).join('\n') : '';
    const resumo = plano && plano.horarios.length
      ? `${plano.horarios.length} horários · de ${quandoCurto(plano.horarios[0])} a ${quandoCurto(plano.horarios.at(-1))}`
      : 'Nenhum plano ativo';
    return `
      <form class="cartao form" data-form="plano" data-tipo="${tipo.id}" ${estiloCor(tipo)}>
        <div class="form-topo"><span class="icone icone--pequeno">${tipo.icone}</span><strong>${esc(tipo.rotulo)}</strong></div>
        <p class="ajuda">${esc(resumo)}</p>
        <label class="campo">
          <span>Um horário por linha (dia/mês/ano hora)</span>
          <textarea name="horarios" rows="8" spellcheck="false" placeholder="25/10/2026 08:00">${esc(linhas)}</textarea>
        </label>
        <p class="ajuda">Os horários ficam fixos: uma dose atrasada não muda as próximas.</p>
        <div class="botoes">
          <button class="botao botao--cheio" type="submit">Salvar plano</button>
          ${plano ? '<button class="botao botao--leve" type="button" data-acao="desativar-plano">Encerrar plano</button>' : ''}
        </div>
      </form>`;
  }).join('');

  return `
    <section class="secao">
      <h2 class="secao-titulo">Bebê e cuidados</h2>
      <form class="cartao form" data-form="config">
        <label class="campo">
          <span>Nome do bebê</span>
          <input name="nome_bebe" maxlength="40" autocomplete="off" value="${esc(c.nome_bebe || '')}" placeholder="Aparece no topo da tela">
        </label>
        <label class="campo">
          <span>Febre a partir de (°C)</span>
          <input name="febre_limite_c" inputmode="decimal" value="${esc(String(c.febre_limite_c ?? '').replace('.', ','))}" placeholder="37,8">
        </label>
        <label class="campo">
          <span>Tylenol: máximo de doses em 24 horas</span>
          <input name="tylenol_max_24h" inputmode="numeric" value="${esc(c.tylenol_max_24h || '')}" placeholder="Conforme a bula">
          <small>${c.tylenol_max_24h ? 'Confira sempre com a bula ou a orientação médica.' : 'Ainda não preenchido. Preencha conforme a bula ou a orientação médica.'}</small>
        </label>
        <button class="botao botao--cheio" type="submit">Salvar</button>
      </form>
    </section>

    <section class="secao">
      <h2 class="secao-titulo">Planos de horário</h2>
      ${planos}
    </section>

    <section class="secao">
      <h2 class="secao-titulo">Este celular</h2>
      <form class="cartao form" data-form="apelido">
        <label class="campo">
          <span>Seu apelido</span>
          <input name="apelido" maxlength="20" autocomplete="off" value="${esc(store.lerApelido())}">
        </label>
        <button class="botao botao--cheio" type="submit">Salvar apelido</button>
      </form>
      <div class="cartao form">
        <div class="linha-chave">
          <div>
            <span class="rotulo-pequeno">Chave de acesso</span>
            <code id="chave" data-chave="${esc(chave)}">${esc(mascarar(chave))}</code>
          </div>
          <button class="botao botao--leve" type="button" data-acao="mostrar-chave">Mostrar</button>
        </div>
        <button class="botao botao--cheio" type="button" data-acao="compartilhar">${ICONES.compartilhar} Compartilhar link de acesso</button>
        <p class="ajuda">Quem tiver o link consegue ver e registrar. Envie só para quem cuida do bebê.</p>
      </div>
      <div class="cartao form">
        <p class="ajuda" id="status-sync">${esc(textoSyncDetalhado())}</p>
        <button class="botao botao--leve" type="button" data-acao="sync">${ICONES.sync} Sincronizar agora</button>
      </div>
    </section>`;
}

const mascarar = (k) => (k ? `••••••••${k.slice(-4)}` : '—');

/** "25/10/2026 01:30" ou "25/10 01:30" → milissegundos. */
function lerLinhaHorario(linha, anoPadrao) {
  const m = linha.trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+(?:às\s+)?(\d{1,2})[:h](\d{2})$/i);
  if (!m) return NaN;
  let [, d, mes, ano, h, min] = m;
  ano = ano ? (ano.length === 2 ? `20${ano}` : ano) : anoPadrao;
  const dia = `${ano}-${mes.padStart(2, '0')}-${d.padStart(2, '0')}`;
  if (Number(h) > 23 || Number(min) > 59) return NaN;
  return deDataHoraSP(dia, `${h.padStart(2, '0')}:${min}`);
}

function salvarFormAjustes(form) {
  const tipoForm = form.dataset.form;
  if (tipoForm === 'config') {
    const valores = {
      nome_bebe: form.nome_bebe.value.trim(),
      febre_limite_c: form.febre_limite_c.value.trim(),
      tylenol_max_24h: form.tylenol_max_24h.value.trim()
    };
    if (valores.febre_limite_c && (numero(valores.febre_limite_c) === null || numero(valores.febre_limite_c) < 36 || numero(valores.febre_limite_c) > 40)) {
      return toast('Confira o limite de febre (ex.: 37,8)');
    }
    if (valores.tylenol_max_24h && !/^\d+$/.test(valores.tylenol_max_24h)) {
      return toast('O máximo de doses precisa ser um número inteiro');
    }
    valores.febre_limite_c = valores.febre_limite_c ? String(numero(valores.febre_limite_c)) : '';
    let mudou = 0;
    for (const [chave, valor] of Object.entries(valores)) {
      if (String(estado.config[chave] ?? '') !== valor) { store.salvarConfig(chave, valor); mudou++; }
    }
    toast(mudou ? 'Ajustes salvos' : 'Nada mudou');
    render();
  } else if (tipoForm === 'plano') {
    const ano = chaveDia(Date.now()).slice(0, 4);
    const linhas = form.horarios.value.split('\n').map((l) => l.trim()).filter(Boolean);
    const invalidas = [];
    const horarios = linhas.map((l) => {
      const t = lerLinhaHorario(l, ano);
      if (!Number.isFinite(t)) invalidas.push(l);
      return t;
    });
    if (invalidas.length) return toast(`Não entendi: “${invalidas[0]}”. Use 25/10/2026 08:00`, 4500);
    if (!horarios.length) return toast('Escreva pelo menos um horário');
    store.salvarPlano(form.dataset.tipo, [...new Set(horarios)].sort((a, b) => a - b));
    toast('Plano salvo');
    render();
  } else if (tipoForm === 'apelido') {
    const nome = form.apelido.value.trim().slice(0, 20);
    if (!nome) return toast('Escreva um apelido');
    store.salvarApelido(nome);
    toast('Apelido salvo');
  }
}

async function compartilharLink() {
  const chave = store.lerChave();
  let hash = `k=${encodeURIComponent(chave)}`;
  if (!urlDoConfig && store.urlBackendDoLink()) hash += `&u=${encodeURIComponent(store.urlBackendDoLink())}`;
  const link = `${location.origin}${location.pathname}#${hash}`;
  const nome = String(estado.config.nome_bebe || '').trim();
  const texto = nome ? `Rotina de ${nome}` : 'Rotina do bebê';
  try {
    if (navigator.share) {
      await navigator.share({ title: texto, text: `${texto} — abra este link no celular:`, url: link });
      return;
    }
  } catch (e) {
    if (e.name === 'AbortError') return;
  }
  try {
    await navigator.clipboard.writeText(link);
    toast('Link copiado. Cole na conversa com quem vai usar.');
  } catch {
    prompt('Copie o link:', link);
  }
}

// ---------------------------------------------------------------------------
// Folha de registro / edição
// ---------------------------------------------------------------------------

/** <option> de 00 até n-1 (horas e minutos sempre em 24h, independente do idioma do celular). */
function opcoesNumero(n, selecionado) {
  return Array.from({ length: n }, (_, i) => {
    const v = String(i).padStart(2, '0');
    return `<option value="${v}" ${v === selecionado ? 'selected' : ''}>${v}</option>`;
  }).join('');
}

function campoHtml(campo, dados) {
  const valor = dados ? dados[campo.id] : '';
  const nome = `c_${campo.id}`;
  if (campo.tipo === 'opcoes') {
    return `
      <div class="campo">
        <span>${esc(campo.rotulo)}</span>
        <div class="seg">
          ${campo.opcoes.map((o) => `<label><input type="radio" name="${nome}" value="${esc(o)}" ${valor === o ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('')}
        </div>
      </div>`;
  }
  const v = campo.tipo === 'numero' ? (numero(valor) === null ? '' : fmtNumero(numero(valor), 1)) : valor ?? '';
  return `
    <label class="campo">
      <span>${esc(campo.rotulo)}</span>
      <input name="${nome}" type="text" ${campo.tipo === 'numero' ? 'inputmode="decimal" class="input-numero"' : ''} autocomplete="off" value="${esc(v)}" placeholder="${esc(campo.placeholder || '')}">
    </label>`;
}

function lerCampos(form, tipo) {
  const dados = {};
  for (const campo of tipo.campos || []) {
    const el = form.elements[`c_${campo.id}`];
    if (!el) continue;
    const bruto = el.value ?? '';
    dados[campo.id] = campo.tipo === 'numero' ? numero(bruto) : String(bruto).trim();
  }
  return dados;
}

function abrirFolha(tipoId, eventoId = null) {
  ctx = contexto();
  const tipo = TIPOS[tipoId];
  if (!tipo) return;
  const evento = eventoId ? ctx.eventos.find((e) => e.id === eventoId) : null;
  const inicial = evento ? evento.t : Date.now();
  const hoje = chaveDia(Date.now());
  const dias = [hoje, somarDias(hoje, -1)];
  const diaInicial = chaveDia(inicial);
  if (!dias.includes(diaInicial)) dias.push(diaInicial);
  const [horaInicial, minutoInicial] = fmtHora(inicial).split(':');
  const rotDia = (d) => (d === hoje ? 'Hoje' : d === somarDias(hoje, -1) ? 'Ontem' : fmtData(Date.parse(`${d}T12:00:00-03:00`)));

  folha.innerHTML = `
    <form class="folha-corpo" id="form-registro" ${estiloCor(tipo)} novalidate>
      <div class="folha-alca" aria-hidden="true"></div>
      <header class="folha-topo">
        <span class="icone">${tipo.icone}</span>
        <div class="folha-titulos">
          <h2>${evento ? 'Editar' : 'Registrar'} ${esc(tipo.rotulo.toLowerCase())}</h2>
          <p class="folha-info" id="folha-info"></p>
        </div>
        <button type="button" class="fechar" data-acao="fechar" aria-label="Fechar">${ICONES.fechar}</button>
      </header>
      ${tipo.lembrete ? `<p class="lembrete">${esc(tipo.lembrete)}</p>` : ''}
      <div class="campo">
        <span>Horário</span>
        <div class="quando">
          <div class="seg">
            ${dias.map((d) => `<label><input type="radio" name="dia" value="${d}" ${d === diaInicial ? 'checked' : ''}><span>${esc(rotDia(d))}</span></label>`).join('')}
          </div>
          <button type="button" class="botao botao--leve botao--pequeno" data-acao="agora">Agora</button>
        </div>
        <div class="hora">
          <select name="h" aria-label="Hora">${opcoesNumero(24, horaInicial)}</select>
          <span aria-hidden="true">:</span>
          <select name="m" aria-label="Minuto">${opcoesNumero(60, minutoInicial)}</select>
        </div>
      </div>
      ${(tipo.campos || []).map((c) => campoHtml(c, evento?.dados)).join('')}
      <div class="avisos" id="avisos" aria-live="polite"></div>
      <label class="confirmar" id="confirmar" hidden>
        <input type="checkbox" name="confirmo">
        <span>Li o aviso e quero registrar mesmo assim</span>
      </label>
      <button class="botao botao--cheio botao--grande" type="submit" id="salvar">${evento ? 'Salvar alteração' : 'Registrar'}</button>
      ${evento ? `
        <button type="button" class="botao botao--perigo" data-acao="apagar" data-id="${esc(evento.id)}">Apagar registro</button>
        <p class="folha-quem">${evento.quem ? `Registrado por ${esc(evento.quem)}` : ''}</p>` : ''}
    </form>`;

  const form = folha.querySelector('form');
  const horario = () => {
    const dia = form.elements.dia.value || hoje;
    return deDataHoraSP(dia, `${form.elements.h.value}:${form.elements.m.value}`);
  };

  const atualizar = () => {
    const h = horario();
    const dados = lerCampos(form, tipo);
    const info = tipo.regras?.infoRegistro ? tipo.regras.infoRegistro(ctx, h, evento?.id || '') : '';
    form.querySelector('#folha-info').textContent = info || (evento ? quandoCurto(evento.t) : '');
    const avisos = [...(tipo.regras?.avisos ? tipo.regras.avisos(ctx, h, dados, evento?.id || '') : [])];
    if (h > Date.now() + 5 * 60 * 1000) avisos.unshift({ texto: 'Esse horário está no futuro. Confira o dia e a hora.', confirmar: true });
    for (const campo of tipo.campos || []) {
      const v = dados[campo.id];
      if (campo.tipo === 'numero' && v !== null && ((campo.min !== undefined && v < campo.min) || (campo.max !== undefined && v > campo.max))) {
        avisos.push({ texto: `Confira ${campo.rotulo.toLowerCase()}: ${fmtNumero(v)} parece fora do normal.`, confirmar: true });
      }
    }
    form.querySelector('#avisos').innerHTML = avisos.map((a) => `
      <p class="aviso ${a.confirmar ? 'aviso--forte' : ''}">${ICONES.alerta}<span>${esc(a.texto)}</span></p>`).join('');
    const precisa = avisos.some((a) => a.confirmar);
    const confirmar = form.querySelector('#confirmar');
    confirmar.hidden = !precisa;
    if (!precisa) form.elements.confirmo.checked = false;
    form.querySelector('#salvar').disabled = precisa && !form.elements.confirmo.checked;
  };

  form.addEventListener('input', atualizar);
  form.addEventListener('change', atualizar);
  form.addEventListener('click', (e) => {
    const b = e.target.closest('[data-acao]');
    if (!b) return;
    if (b.dataset.acao === 'agora') {
      [form.elements.h.value, form.elements.m.value] = fmtHora(Date.now()).split(':');
      form.querySelector(`input[name="dia"][value="${hoje}"]`).checked = true;
      atualizar();
    } else if (b.dataset.acao === 'fechar') {
      folha.close();
    } else if (b.dataset.acao === 'apagar') {
      if (b.dataset.armado !== '1') {
        b.dataset.armado = '1';
        b.textContent = 'Toque de novo para apagar';
        setTimeout(() => { if (b.isConnected) { b.dataset.armado = ''; b.textContent = 'Apagar registro'; } }, 4000);
        return;
      }
      store.apagarEvento(b.dataset.id);
      folha.close();
      toast('Registro apagado');
    }
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (form.querySelector('#salvar').disabled) return;
    const h = horario();
    const dados = lerCampos(form, tipo);
    if (evento) {
      store.editarEvento(evento.id, { horario: h, dados });
      folha.close();
      toast('Alteração salva');
      return;
    }
    store.adicionarEvento(tipo.id, h, dados);
    folha.close();
    const depois = tipo.regras?.aposRegistrar ? tipo.regras.aposRegistrar(ctx, h, dados) : '';
    toast(depois ? `Registrado. ${depois}` : 'Registrado', depois ? 7000 : 2500);
  });

  atualizar();
  folha.showModal();
  folha.scrollTop = 0;
}

folha.addEventListener('click', (e) => {
  // Toque fora da folha fecha.
  if (e.target === folha) folha.close();
});

// ---------------------------------------------------------------------------
// Ações (delegação de eventos)
// ---------------------------------------------------------------------------

app.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-acao]');
  if (!b) return;
  const acao = b.dataset.acao;
  if (acao === 'vista') {
    vista = b.dataset.vista;
    render();
    window.scrollTo({ top: 0 });
  } else if (acao === 'registrar') {
    abrirFolha(b.dataset.tipo);
  } else if (acao === 'editar') {
    const ev = ctx.eventos.find((x) => x.id === b.dataset.id);
    if (ev) abrirFolha(ev.tipo, ev.id);
  } else if (acao === 'filtro') {
    filtroHistorico = b.dataset.tipo;
    render();
  } else if (acao === 'sync') {
    const r = await store.sincronizar();
    if (r.sync.estado === 'erro') toast(r.sync.mensagem || 'Não foi possível sincronizar');
    else if (r.sync.pendentes) toast(`${r.sync.pendentes} registro(s) esperando internet`);
    else toast('Tudo sincronizado');
  } else if (acao === 'mostrar-chave') {
    const el = document.getElementById('chave');
    const mostrando = el.textContent === el.dataset.chave;
    el.textContent = mostrando ? mascarar(el.dataset.chave) : el.dataset.chave;
    b.textContent = mostrando ? 'Mostrar' : 'Ocultar';
  } else if (acao === 'compartilhar') {
    compartilharLink();
  } else if (acao === 'desativar-plano') {
    const form = b.closest('form');
    if (b.dataset.armado !== '1') {
      b.dataset.armado = '1';
      b.textContent = 'Toque de novo para encerrar';
      return;
    }
    store.salvarPlano(form.dataset.tipo, []);
    toast('Plano encerrado');
    render();
  }
});

app.addEventListener('submit', (e) => {
  const form = e.target.closest('form[data-form]');
  if (!form) return;
  e.preventDefault();
  salvarFormAjustes(form);
});

iniciar();
