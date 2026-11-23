// Telas e navegação. Lê/grava dados só pelo store.js e calcula tudo pelo regras.js.

import * as store from './store.js';
import { montarTipos } from './tipos/index.js';
import { lerRemedios, corPara, MODOS, HORA_REF_PADRAO, horaValida } from './tipos/remedio.js';
import { descreverAjuste } from './tipos/ajuste.js';
import { ritmoDoSono } from './tipos/sono.js';
import { ritmoDoLeite } from './tipos/alimentacao.js';
import { montarRelatorio, htmlRelatorio, textoPeriodo, resolverPeriodo, PERIODO_PADRAO } from './relatorio.js';
import { imagensRelatorio } from './imagem-relatorio.js';
import { montarPlacar, htmlPlacar, tituloPlacar, GRUPOS, PERIODO_FAMILIA, PERIODOS_FAMILIA } from './familia.js';
import { imagemFamilia, imagemRetrospectiva, imagemLinhaDoTempo } from './imagem-familia.js';
import { metaSemana, conquistasPorPessoa, medalhasNovas, CONQUISTAS, mesesHoje, textoMeses, linhaDoTempo, retrospectiva, mesAnterior, quandoMarco } from './conquistas.js';
import { graficoEvolucao } from './grafico.js';
import {
  resolverEventos, resolverPlanos, criarContexto, montarAgenda, escolherProximo,
  fmtHora, fmtData, fmtDataLonga, chaveDia, rotuloDia, contagem, somarDias, deDataHoraSP,
  numero, fmtNumero, ms, isoSP, horaDepois, fmtDuracao, textoHoraDecimal, RITMO_DIAS, minutos5,
  lerBotoesInicio, aplicarBotoesInicio, textoBotoesInicio, idadeTexto, organizarFaixa
} from './regras.js';

const app = document.getElementById('app');
const folha = document.getElementById('folha');
const toastEl = document.getElementById('toast');

let estado = store.obterEstado();
let ctx = null;
let vista = 'inicio';
let filtroHistorico = '';
let urlDoConfig = '';
let limiteAjustes = 10; // itens visíveis no Histórico de ajustes
let imprimindo = false;
let detalhesAbertos = false; // "Detalhes" do relatório continuam abertos quando a tela se redesenha
let diasRelatorio = PERIODO_PADRAO; // período do Relatório: 'consulta' (desde a última consulta) ou dias até hoje
let diasFamilia = PERIODO_FAMILIA; // período do placar da família

// Tipos fixos + remédios cadastrados em Ajustes; recalculados a cada contexto().
let TIPOS = {};
let LISTA_TIPOS = []; // com botão na tela inicial
let TODOS_TIPOS = []; // inclui remédios encerrados (histórico e resumo)

const ICONES = {
  inicio: '<svg viewBox="0 0 24 24"><path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19z"/></svg>',
  historico: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  marcos: '<svg viewBox="0 0 24 24"><path d="M12 3.5l2.5 5.2 5.6.8-4 3.9.9 5.6-5-2.7-5 2.7.9-5.6-4-3.9 5.6-.8z"/></svg>',
  resumo: '<svg viewBox="0 0 24 24"><path d="M4.5 19.5h15"/><path d="M7 16v-4M12 16V7.5M17 16v-6.5"/></svg>',
  ajustes: '<svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
  lapis: '<svg viewBox="0 0 24 24"><path d="M15.5 5.5l3 3L8 19l-4 1 1-4z"/></svg>',
  fechar: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  lua: '<svg viewBox="0 0 24 24"><path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/><path d="M16.5 3.5v3M15 5h3"/></svg>',
  alerta: '<svg viewBox="0 0 24 24"><path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.2v.1"/></svg>',
  compartilhar: '<svg viewBox="0 0 24 24"><path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5"/></svg>',
  sync: '<svg viewBox="0 0 24 24"><path d="M19.5 12a7.5 7.5 0 0 1-13.1 5M4.5 12a7.5 7.5 0 0 1 13.1-5"/><path d="M17.8 3.5v3.7h-3.7M6.2 20.5v-3.7h3.7"/></svg>',
  subir: '<svg viewBox="0 0 24 24"><path d="M6.5 14.5 12 9l5.5 5.5"/></svg>',
  familia: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9.5" r="2.3"/><path d="M3.5 19.5c.6-3.3 2.8-5.2 5.5-5.2s4.9 1.9 5.5 5.2M14.5 15.2c.8-.6 1.6-.9 2.5-.9 2 0 3.4 1.6 3.8 4.2"/></svg>',
  relatorio: '<svg viewBox="0 0 24 24"><path d="M7 3.5h7.5L19 8v11a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 19V5a1.5 1.5 0 0 1 1-1.5z"/><path d="M14 3.5V8h4.5M9 13.5l2 2 4-4.5"/></svg>',
  descer: '<svg viewBox="0 0 24 24"><path d="M6.5 9.5 12 15l5.5-5.5"/></svg>'
};

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const maiuscula = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function contexto() {
  ({ mapa: TIPOS, visiveis: LISTA_TIPOS, todos: TODOS_TIPOS } = montarTipos(estado.config));
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
let toastAcao = null;
/** acao: { rotulo, fn } mostra um botão no aviso (ex. Desfazer). */
function toast(texto, duracao = 2800, acao = null) {
  const span = document.createElement('span');
  span.textContent = texto;
  toastEl.replaceChildren(span);
  toastAcao = acao;
  if (acao) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'toast-acao';
    b.textContent = acao.rotulo;
    toastEl.append(b);
  }
  toastEl.classList.toggle('toast--acao', !!acao);
  toastEl.classList.add('toast--visivel');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.classList.remove('toast--visivel'); toastAcao = null; }, duracao);
}

toastEl.addEventListener('click', (e) => {
  if (!e.target.closest('.toast-acao') || !toastAcao) return;
  const { fn } = toastAcao;
  toastAcao = null;
  toastEl.classList.remove('toast--visivel');
  fn();
});

const DESFAZER_MS = 8000;
// Antes de abrir o Sono (que depende do outro celular), sincroniza se a última vez foi há mais que isso.
const CONFERIR_ANTES_MS = 15 * 1000;
const ESPERA_CONFERIR_MS = 4000;

/** Aviso com "Desfazer" por alguns segundos. desfazer() grava uma linha nova (a aba eventos só recebe linhas). */
function oferecerDesfazer(texto, desfazer, duracao = DESFAZER_MS) {
  toast(texto, Math.max(duracao, DESFAZER_MS), {
    rotulo: 'Desfazer',
    fn: () => {
      try { desfazer(); toast('Desfeito'); } catch { toast('Não foi possível desfazer. Corrija pelo Histórico.', 4000); }
    }
  });
}

/** Dados para voltar à versão anterior: campos que a edição criou ficam vazios (editarEvento mescla). */
const dadosParaVoltar = (antes, depois) => ({
  ...Object.fromEntries(Object.keys(depois || {}).map((k) => [k, ''])),
  ...(antes || {})
});

// ---------------------------------------------------------------------------
// Início do app: link secreto, endereço do backend e apelido
// ---------------------------------------------------------------------------

function lerLink() {
  const p = new URLSearchParams(location.hash.slice(1));
  const k = p.get('k');
  const u = p.get('u');
  if (k) store.salvarChave(k.trim());
  if (u) store.salvarUrlBackend(u.trim());
  // Limpa a chave, o ?v= (prévia do WhatsApp) e o ?atualizar= da barra de endereço.
  const busca = new URLSearchParams(location.search);
  busca.delete('v');
  busca.delete('atualizar');
  const resto = busca.toString();
  if (k || u || location.search !== (resto ? `?${resto}` : '')) {
    history.replaceState(null, '', location.pathname + (resto ? `?${resto}` : ''));
  }
}

// ---------------------------------------------------------------------------
// Atualização automática (versão vem da <meta name="versao">, gravada na publicação)
// ---------------------------------------------------------------------------

const VERSAO = document.querySelector('meta[name="versao"]')?.content || 'dev';
const CHECAR_VERSAO_MS = 5 * 60 * 1000;
let avisoAtualizacao = null;

const ssLer = (k) => { try { return sessionStorage.getItem(k); } catch { return null; } };
const ssGravar = (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* sem armazenamento */ } };

async function versaoPublicada() {
  try {
    const r = await fetch(`versao.json?t=${Date.now()}`, { cache: 'no-store' });
    return r.ok ? (await r.json()).versao || null : null;
  } catch { return null; }
}

/** Recarrega por um endereço novo, para o celular não reaproveitar a página guardada. */
function recarregarPara(versao, forcar = false) {
  if (!forcar && ssLer('rb_atualizando') === versao) return false; // já tentou: evita repetir sem parar
  ssGravar('rb_atualizando', versao);
  location.replace(`${location.pathname}?atualizar=${encodeURIComponent(versao)}`);
  return true;
}

const ocupado = () => folha.open || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');

/** silencioso: ao abrir ou voltar para o app, recarrega direto se ninguém estiver digitando. */
async function verificarAtualizacao(silencioso) {
  if (VERSAO === 'dev') return;
  const nova = await versaoPublicada();
  if (!nova || nova === VERSAO) return;
  if (silencioso && !ocupado() && recarregarPara(nova)) return;
  mostrarAvisoAtualizacao(nova);
}

function mostrarAvisoAtualizacao(versao) {
  if (!avisoAtualizacao) {
    avisoAtualizacao = document.createElement('button');
    avisoAtualizacao.className = 'atualizacao';
    avisoAtualizacao.innerHTML = `${ICONES.sync}<span>Nova versão disponível · <strong>Atualizar</strong></span>`;
    document.body.append(avisoAtualizacao);
  }
  avisoAtualizacao.onclick = () => recarregarPara(versao, true);
}

function ligarAtualizacaoAutomatica() {
  if (VERSAO === 'dev') return;
  verificarAtualizacao(true);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') verificarAtualizacao(true);
  });
  setInterval(() => { if (document.visibilityState === 'visible') verificarAtualizacao(false); }, CHECAR_VERSAO_MS);
}

/** Guarda o app no celular para abrir sem internet (sw.js; só na versão publicada). */
function ligarModoSemInternet() {
  if (VERSAO === 'dev' || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Sem modo offline:', e));
}

async function iniciar() {
  ssGravar('rb_falhas', '0');
  lerLink();
  ligarModoSemInternet();
  ligarAtualizacaoAutomatica();
  try {
    const { CONFIG } = await import('../config.js');
    const url = CONFIG?.webAppUrl || '';
    if (/^https?:\/\//.test(url)) urlDoConfig = url;
  } catch { /* sem config.js: o endereço pode vir no link */ }
  store.configurarBackend(urlDoConfig);
  seguir();
}

function seguir() {
  if (!store.lerChave()) return telaChave(seguir);
  if (!store.temBackend()) return telaAviso('Quase pronto', 'Falta ligar o aplicativo à planilha. Siga o passo “Preencher o config.js” do guia de instalação (SETUP.md).');
  if (!store.lerApelido()) return telaApelido(entrar);
  entrar();
}

const instalado = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;

/** Aceita o link inteiro (…#k=CHAVE) ou só a chave. Devolve true se achou uma chave. */
function lerChaveColada(texto) {
  const s = String(texto || '').trim();
  const i = s.indexOf('#');
  if (i >= 0) {
    const p = new URLSearchParams(s.slice(i + 1));
    if (p.get('u')) store.salvarUrlBackend(p.get('u').trim());
    if (p.get('k')) { store.salvarChave(p.get('k').trim()); return true; }
    return false;
  }
  if (/^[A-Za-z0-9_-]{16,}$/.test(s)) { store.salvarChave(s); return true; }
  return false;
}

/**
 * Sem chave. Acontece no primeiro acesso sem o link e no iPhone ao abrir pelo ícone da tela de início,
 * que guarda os dados separado do Safari: por isso dá para colar o link aqui.
 */
function telaChave(depois) {
  app.innerHTML = `
    <div class="entrada">
      <form class="entrada-cartao" id="form-chave">
        <span class="entrada-marca">${ICONES.lua}</span>
        <h1>Abra pelo link de acesso</h1>
        <p>${instalado()
          ? 'Falta só um passo: copie o link de acesso que você recebeu (na conversa ou em Ajustes no navegador) e cole aqui.'
          : 'Este aplicativo é aberto por um link próprio, enviado por quem cuida do bebê com você. Toque nele ou cole aqui.'}</p>
        <label class="campo">
          <span>Link de acesso</span>
          <input name="link" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Cole aqui o link">
        </label>
        <button class="botao botao--cheio botao--grande" type="submit">Entrar</button>
      </form>
      ${rodape()}
    </div>`;
  const form = document.getElementById('form-chave');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!lerChaveColada(form.link.value)) return toast('Não reconheci o link. Copie a mensagem inteira com o link e cole de novo.', 4000);
    store.configurarBackend(urlDoConfig);
    depois();
  });
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
    window.addEventListener('offline', aoMudarEstado);
    window.addEventListener('online', aoMudarEstado);
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
    const versaoBackend = document.getElementById('versao-backend');
    if (versaoBackend) versaoBackend.textContent = textoVersaoBackend();
    const agenda = document.getElementById('agenda-google');
    if (agenda) agenda.textContent = textoAgenda();
    return;
  }
  render();
}

// ---------------------------------------------------------------------------
// Estrutura
// ---------------------------------------------------------------------------

function render() {
  ctx = contexto();
  const corpo = vista === 'historico' ? vistaHistorico() : vista === 'resumo' ? vistaResumo() : vista === 'marcos' ? vistaMarcos() : vista === 'relatorio' ? vistaRelatorio()
    : vista === 'familia' ? vistaFamilia()
    : vista === 'ajustes' ? vistaAjustes() : vistaInicio();
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
  // Só o primeiro nome no topo (o completo continua em Ajustes), para não empurrar o card PRÓXIMO para baixo.
  const nome = String(estado.config.nome_bebe || '').trim().split(/\s+/)[0];
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
  const semInternet = s.mensagem === 'Sem internet' || navigator.onLine === false;
  if (s.pendentes > 0) { classe = 'pendente'; texto = semInternet ? `Sem internet · ${s.pendentes} pendente${s.pendentes > 1 ? 's' : ''}` : `Pendente (${s.pendentes})`; }
  else if (s.estado === 'erro' && semInternet) { classe = 'pendente'; texto = 'Sem internet'; }
  else if (s.estado === 'erro') { classe = 'erro'; texto = 'Erro'; }
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

/** Versão do Web App (Code.gs) publicada, para conferir se uma republicação pegou. */
function textoVersaoBackend() {
  const v = estado.sync.backend;
  if (v === null || v === undefined) return 'Web App: versão ainda não conferida';
  const nome = v > 0 ? `versão ${v}` : 'versão anterior à 4';
  return v < store.VERSAO_BACKEND_ESPERADA
    ? `Web App: ${nome} · republique para a versão ${store.VERSAO_BACKEND_ESPERADA} (veja o SETUP.md)`
    : `Web App: ${nome}`;
}

/** Lembretes dos planos no Google Agenda (fase 10): quantos há e o próximo, ou o problema. */
function textoAgenda() {
  const a = estado.sync.agenda;
  if (!a) return (estado.sync.backend ?? 0) >= 5 ? 'Google Agenda: ainda sem lembretes (salve um plano de horários, anote a próxima dose de uma vacina ou marque uma consulta)' : '';
  if (a.ok === false) return 'Google Agenda: não foi possível atualizar os lembretes (veja o SETUP.md)';
  if (!a.lembretes) return 'Google Agenda: nenhum lembrete pela frente';
  const t = Date.parse(a.proximo);
  // Lembrete de vacina é de dia inteiro (começa à meia-noite): mostra só o dia.
  const prox = Number.isFinite(t) ? ` · próximo ${fmtHora(t) === '00:00' ? fmtData(t) : quandoCurto(t)}` : '';
  return `Google Agenda: ${a.lembretes} ${a.lembretes === 1 ? 'lembrete' : 'lembretes'}${prox}`;
}

function navegacao() {
  const aba = ['relatorio', 'familia', 'marcos'].includes(vista) ? 'resumo' : vista; // abrem de dentro do Resumo
  const item = (id, rotulo) => `
    <button class="nav-item ${aba === id ? 'nav-item--ativo' : ''}" data-acao="vista" data-vista="${id}" ${aba === id ? 'aria-current="page"' : ''}>
      ${ICONES[id]}<span>${rotulo}</span>
    </button>`;
  return `<nav class="nav">${item('inicio', 'Início')}${item('historico', 'Histórico')}${item('resumo', 'Resumo')}${item('ajustes', 'Ajustes')}</nav>`;
}

function rodape() {
  return '<footer class="rodape">Ferramenta de organização. Não substitui orientação médica.</footer>';
}

/** Nome do tipo no meio da frase: tipos fixos em minúscula, remédios cadastrados como foram escritos. */
const nomeNaFrase = (tipo) => (tipo.remedio ? tipo.rotulo : tipo.rotulo.toLowerCase());

const estiloCor = (tipo) => `style="--cor:${esc(tipo.cor)}"`;

// ---------------------------------------------------------------------------
// Início
// ---------------------------------------------------------------------------

function vistaInicio() {
  const agenda = montarAgenda(ctx, 24);
  const { principal } = escolherProximo(agenda);
  // Os próximos horários (no máximo 3) entram no próprio card, como "Depois". Destaques (ex. vacina hoje) primeiro.
  // Algo em andamento (ex. dormindo) toma o card, a não ser que haja um atraso (ex. remédio de horário fixo):
  // aí a previsão principal desce para as linhas de baixo.
  const emCurso = principal?.alerta ? null : LISTA_TIPOS.map((t) => ({ tipo: t, estado: t.regras?.emCurso?.(ctx) })).find((x) => x.estado);
  const resto = agenda.filter((i) => emCurso || i !== principal);
  const depois = [...resto.filter((i) => i.destaque), ...resto.filter((i) => !i.destaque)].slice(0, 3);
  // Celular: PRÓXIMO, botões, faixa (uma coluna). Tela larga: PRÓXIMO e faixa à esquerda, botões à direita.
  return `
    <div class="inicio">
      <div class="inicio-proximo">${faixaFesta()}${emCurso ? cardEmCurso(emCurso, depois) : cardProximo(principal, depois)}</div>
      <section class="inicio-registrar" aria-label="Registrar">
        <div class="grade">${aplicarBotoesInicio(botoesPadrao().grandes, lerBotoesInicio(estado.config)).map(tile).join('')}</div>
      </section>
      <div class="inicio-faixa">${faixaCompacta()}</div>
      <div class="inicio-paineis">${paineis()}</div>
    </div>`;
}

/** Linhas "Depois" do card PRÓXIMO. */
function listaDepois(itens) {
  if (!itens.length) return '';
  return `
    <ul class="proximo-depois">
      ${itens.map((i) => `
        <li class="${i.destaque ? 'proximo-depois--destaque' : i.informativo ? 'proximo-depois--info' : ''}" ${estiloCor(TIPOS[i.tipo])}>
          <time>${i.diaInteiro ? 'Hoje' : `${i.previsao ? '~' : ''}${esc(quandoCurto(i.t, ctx.agora))}`}</time>
          <span class="proximo-depois-ponto"></span>
          <span>${esc(i.titulo)}</span>
        </li>`).join('')}
    </ul>`;
}

/** Fase 21: no dia em que o bebê faz meses, uma faixa de festa no topo (toque abre a linha do tempo). */
function faixaFesta() {
  const n = mesesHoje(estado.config.nascimento, ctx.agora);
  if (!n) return '';
  return `<button class="festa" data-acao="vista" data-vista="marcos">🎂 <strong>${esc(textoMeses(n))}</strong> <span>Ver a linha do tempo</span></button>`;
}

/** Card PRÓXIMO com o que está acontecendo agora (ex. "Dormindo há 35 min" e o botão Acordou). */
function cardEmCurso({ tipo, estado }, depois = []) {
  return `
    <section class="proximo proximo--agora" ${estiloCor(tipo)}>
      <div class="proximo-topo">
        <span class="proximo-rotulo">Agora</span>
      </div>
      <div class="proximo-corpo">
        <span class="icone icone--grande">${tipo.icone}</span>
        <div class="proximo-textos">
          <p class="proximo-titulo">${esc(estado.titulo)}</p>
          <p class="proximo-detalhe">${esc(estado.detalhe || '')}</p>
        </div>
      </div>
      <button class="botao botao--cheio botao--grande" data-acao="registrar" data-tipo="${tipo.id}">${esc(estado.botao)}</button>
      ${listaDepois(depois)}
    </section>`;
}

function cardProximo(item, depois = []) {
  if (!item) {
    return `
      <section class="proximo proximo--vazio">
        <span class="proximo-rotulo">Próximo</span>
        <p class="proximo-titulo">Nada programado</p>
        <p class="proximo-detalhe">Nenhum horário previsto nas próximas 24 horas.</p>
        ${listaDepois(depois)}
      </section>`;
  }
  const tipo = TIPOS[item.tipo];
  return `
    <section class="proximo ${item.alerta ? 'proximo--alerta' : ''}" ${estiloCor(tipo)}>
      <div class="proximo-topo">
        <span class="proximo-rotulo">${item.alerta ? `${ICONES.alerta} Atrasado` : item.previsao ? (item.t < ctx.agora ? 'Já passou do costume' : 'Próximo · por volta de') : 'Próximo'}</span>
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
      <button class="botao botao--cheio botao--grande" data-acao="registrar" data-tipo="${tipo.id}">Registrar ${esc(nomeNaFrase(tipo))}</button>
      ${listaDepois(depois)}
    </section>`;
}

function tile(tipo) {
  const st = tipo.regras?.status ? tipo.regras.status(ctx) : { linhas: [] };
  const [forte = '', ...resto] = st.linhas || [];
  const classe = st.alerta ? 'tile--alerta' : st.aviso ? 'tile--aviso' : st.ativo ? 'tile--ativo' : st.ok ? 'tile--ok' : '';
  return `
    <button class="tile ${classe}" data-acao="registrar" data-tipo="${tipo.id}" ${estiloCor(tipo)}>
      <span class="tile-topo">
        <span class="icone">${tipo.icone}</span>
        <span class="tile-rotulo">${esc(tipo.rotulo)}</span>
        <span class="tile-mais" aria-hidden="true">+</span>
      </span>
      <span class="tile-forte">${esc(forte)}</span>
      ${resto.map((l) => `<span class="tile-linha">${esc(l)}</span>`).join('')}
    </button>`;
}

/**
 * Remédios, febre e vacinas: uma linha cada, abaixo da rotina. Ordem: tratamentos em andamento, febre,
 * "só se precisar", vacinas. Tratamento concluído (naInicio = false) sai daqui e continua no Histórico.
 */
function faixaCompacta() {
  const naTela = botoesPadrao().faixa.filter((t) => !t.naInicio || t.naInicio(ctx));
  const tipos = aplicarBotoesInicio(naTela, lerBotoesInicio(estado.config));
  if (!tipos.length) return '';
  // Fase 20: o que tem alerta ou aviso sobe (vacina perto, remédio na hora, febre recente), mantendo a ordem escolhida
  // em Ajustes entre iguais. Febre e remédios "só se precisar" sem uso nos últimos dias ficam juntos numa linha só.
  const { linhas: ativos, quietos } = organizarFaixa(tipos.map((tipo) => ({
    tipo,
    st: tipo.regras?.status ? tipo.regras.status(ctx) : { linhas: [] },
    quietoPossivel: soSePrecisar(tipo),
    recente: usadoHaPouco(tipo)
  })));
  const linhas = ativos.map((x) => linhaFaixa(x.tipo, x.st));
  if (quietos.length) linhas.push(linhaSePrecisar(quietos.map((x) => x.tipo)));
  return `<ul class="cartao lista faixa" aria-label="Remédios e saúde">${linhas.join('')}</ul>`;
}

const DIAS_QUIETO = 3;
/** Só se usa quando precisa: febre e remédios "só se precisar" (Tylenol e os cadastrados assim). */
const soSePrecisar = (t) => t.id === 'febre' || t.id === 'tylenol' || t.remedio?.modo === 'se_precisar';
const usadoHaPouco = (t) => ctx.doTipo(t.id).some((e) => e.t <= ctx.agora && ctx.agora - e.t <= DIAS_QUIETO * 24 * 3600000);

/** Uma linha com os botões de quem está quieto: "Se precisar  [Febre +] [Tylenol +]". */
function linhaSePrecisar(tipos) {
  return `
    <li class="faixa-se-precisar">
      <span class="faixa-se-rotulo">Se precisar</span>
      <span class="faixa-se-botoes">
        ${tipos.map((t) => `
          <button class="faixa-se-botao" data-acao="registrar" data-tipo="${t.id}" ${estiloCor(t)}>
            <span class="icone icone--mini">${t.icone}</span>${esc(t.rotulo)}<span class="faixa-se-mais" aria-hidden="true">+</span>
          </button>`).join('')}
      </span>
    </li>`;
}

function linhaFaixa(tipo, stPronto = null) {
  const st = stPronto || (tipo.regras?.status ? tipo.regras.status(ctx) : { linhas: [] });
  const [forte = '', segunda = ''] = st.linhas || [];
  const classe = st.alerta ? 'faixa-item--alerta' : st.aviso ? 'faixa-item--aviso' : st.ativo ? 'faixa-item--ativo' : st.ok ? 'faixa-item--ok' : '';
  return `
    <li>
      <button class="faixa-item ${classe}" data-acao="registrar" data-tipo="${tipo.id}" ${estiloCor(tipo)}>
        <span class="icone icone--pequeno">${tipo.icone}</span>
        <span class="faixa-textos">
          <span class="faixa-rotulo">${esc(tipo.rotulo)}</span>
          <span class="faixa-status faixa-forte">${esc(forte)}</span>
          ${segunda ? `<span class="faixa-status faixa-segunda">${esc(segunda)}</span>` : ''}
        </span>
        <span class="faixa-mais" aria-hidden="true">+</span>
      </button>
    </li>`;
}

/**
 * Ordem dos tipos nas listas (faixa, filtros): rotina, tratamentos em andamento, febre, "só se precisar", vacinas,
 * consultas, medidas, anotações.
 * Encerrados (remédio encerrado ou tratamento concluído) por último.
 */
function pesoTipo(t) {
  if (t.rotina) return 0;
  if (t.remedio ? !t.remedio.ativo : t.naInicio && !t.naInicio(ctx)) return 5;
  if (t.id === 'febre') return 2;
  if (t.id === 'vacina' || t.id === 'consulta' || t.id === 'medidas' || t.id === 'anotacao') return 4;
  if (t.id === 'tylenol' || t.remedio?.modo === 'se_precisar') return 3;
  return 1;
}
const ordenarTipos = (lista) => lista.map((t, i) => ({ t, i })).sort((a, b) => pesoTipo(a.t) - pesoTipo(b.t) || a.i - b.i).map(({ t }) => t);

/**
 * Botões da tela inicial na ordem padrão, antes da escolha de Ajustes → Tela inicial (config.inicio_botoes).
 * grandes: rotina; faixa: remédios, febre e vacinas (inclui tratamento concluído, que a faixa filtra na hora).
 */
function botoesPadrao() {
  return {
    grandes: LISTA_TIPOS.filter((t) => t.rotina),
    faixa: ordenarTipos(LISTA_TIPOS.filter((t) => !t.rotina))
  };
}
const idsPadraoInicio = () => { const p = botoesPadrao(); return [...p.grandes, ...p.faixa].map((t) => t.id); };

/** Totais do dia (cada tipo diz o seu em resumoDia), no topo de cada dia do Histórico. Tocar filtra. */
function totaisDoDia(dia) {
  const itens = ordenarTipos(TODOS_TIPOS)
    .map((tipo) => ({ tipo, r: tipo.resumoDia ? tipo.resumoDia(ctx, dia) : null }))
    .filter((i) => i.r);
  if (!itens.length) return '';
  return `
    <div class="totais">
      ${itens.map(({ tipo, r }) => `
        <button class="total ${r.destaque ? 'total--alto' : ''}" data-acao="filtro" data-tipo="${tipo.id}" ${estiloCor(tipo)} aria-label="${esc(tipo.rotulo)}: ${esc(r.valor)}. Toque para ver só ${esc(nomeNaFrase(tipo))}">
          <span class="icone icone--mini">${tipo.icone}</span>
          <span class="total-valor">${esc(r.valor)}</span>
        </button>`).join('')}
    </div>`;
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
  // Agendáveis (consulta) só entram no Histórico depois da hora; as marcadas ficam no cartão "Marcadas" do filtro.
  const eventos = ctx.eventos
    .filter((e) => TIPOS[e.tipo] && !TIPOS[e.tipo].interno && (!filtroHistorico || e.tipo === filtroHistorico))
    .filter((e) => !(TIPOS[e.tipo].agendavel && e.t > ctx.agora))
    .sort((a, b) => b.t - a.t);
  const comChip = ordenarTipos(TODOS_TIPOS.filter((t) => (LISTA_TIPOS.includes(t) && (!t.naInicio || t.naInicio(ctx))) || ctx.doTipo(t.id).length));
  const chips = [['', 'Todos'], ...comChip.map((t) => [t.id, t.rotulo])]
    .map(([id, rotulo]) => `<button class="chip ${filtroHistorico === id ? 'chip--ativo' : ''}" data-acao="filtro" data-tipo="${id}">${esc(rotulo)}</button>`)
    .join('');
  if (!eventos.length) {
    return `<div class="chips">${chips}</div>${cartaoMarcadas(TIPOS[filtroHistorico])}<p class="vazio vazio--grande">Nenhum registro ainda.</p>`;
  }
  const dias = new Map();
  for (const e of eventos) {
    const d = chaveDia(e.t);
    if (!dias.has(d)) dias.set(d, []);
    dias.get(d).push(e);
  }
  const filtrado = TIPOS[filtroHistorico];
  const conta = (dia, lista) => {
    const r = filtrado?.resumoDia ? filtrado.resumoDia(ctx, dia) : null;
    return r ? [r.valor, r.detalhe].filter(Boolean).join(' · ') : `${lista.length} ${lista.length === 1 ? 'registro' : 'registros'}`;
  };
  const blocos = [...dias.entries()].map(([dia, lista]) => `
    <section class="secao">
      <h2 class="secao-titulo">${esc(maiuscula(rotuloDia(dia, ctx.agora)))} <span class="secao-conta">${esc(conta(dia, lista))}</span></h2>
      ${filtrado ? '' : totaisDoDia(dia)}
      <ul class="cartao lista">
        ${lista.map((e) => {
          const tipo = TIPOS[e.tipo];
          const r = tipo.resumo ? tipo.resumo(e.dados, ctx, e) : { texto: '' };
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
  return `<div class="chips">${chips}</div>${filtroHistorico ? cartaoMarcadas(filtrado) + cartaoEvolucao(filtrado) : ''}<div class="dias">${blocos}</div>`;
}

// ---------------------------------------------------------------------------
// Resumo (fase 19): como está indo. Ritmo, Relatório para a consulta, Família e Medidas, cada um abre a sua tela.
// ---------------------------------------------------------------------------

function vistaResumo() {
  const medidas = TIPOS.medidas;
  const stMedidas = medidas?.regras?.status ? medidas.regras.status(ctx).linhas : [];
  const temMedida = ctx.doTipo('medidas').length > 0;
  return `
    <div class="resumo-aba">
      ${cartaoRitmo() || '<p class="ajuda">O "Ritmo dele" aparece depois de alguns dias de registros de sono e de leite.</p>'}
      ${botaoRelatorio()}
      ${botaoFamilia()}
      <button class="cartao rel-abrir" data-acao="vista" data-vista="marcos" style="--cor:#D4A72C">
        <span class="icone icone--pequeno">${ICONES.marcos}</span>
        <span class="bloco-textos">
          <span class="bloco-titulo">Marcos</span>
          <span class="bloco-detalhe">${esc(textoCartaoMarcos())}</span>
        </span>
        <span class="bloco-seta" aria-hidden="true"></span>
      </button>
      ${medidas ? `
        <button class="cartao rel-abrir" data-acao="ver-historico" data-tipo="medidas" ${estiloCor(medidas)}>
          <span class="icone icone--pequeno">${medidas.icone}</span>
          <span class="bloco-textos">
            <span class="bloco-titulo">Crescimento</span>
            <span class="bloco-detalhe">${esc(temMedida ? stMedidas.join(' · ') : 'Peso, altura e cabeça: registre em Medidas, na tela inicial')}</span>
          </span>
          <span class="bloco-seta" aria-hidden="true"></span>
        </button>` : ''}
    </div>`;
}

/** Linha de baixo do cartão Marcos: o último marco ou como começar. */
function textoCartaoMarcos() {
  const ultimo = linhaDoTempo(ctx, estado.config.nascimento).find((i) => i.tipo === 'marco');
  if (ultimo) return `Último: ${ultimo.texto} · linha do tempo e imagem para o grupo`;
  return 'Aniversários de mês e "primeira vez que…" (anotação do tipo Marco)';
}

/** Linha do tempo (fase 21): nascimento, meses completados e marcos, com a idade em cada um. */
function vistaMarcos() {
  const itens = linhaDoTempo(ctx, estado.config.nascimento);
  const nome = String(estado.config.nome_bebe || '').trim();
  const idade = idadeTexto(estado.config.nascimento, ctx.agora);
  const semNascimento = !/^\d{4}-\d{2}-\d{2}$/.test(String(estado.config.nascimento || ''));
  return `
    <div class="relatorio marcos">
      <div class="rel-barra">
        <button class="botao botao--leve rel-voltar" data-acao="vista" data-vista="resumo">‹ Resumo</button>
        ${itens.length ? '<span class="rel-acoes"><button class="botao botao--cheio rel-imagem" data-acao="compartilhar-marcos">Enviar para a família</button></span>' : ''}
      </div>
      <header class="rel-cabeca">
        <p class="rel-sobre">Linha do tempo</p>
        <h2 class="rel-titulo">${esc(nome || 'Rotina do bebê')}</h2>
        ${idade ? `<p class="rel-idade">${esc(idade)}</p>` : ''}
      </header>
      ${semNascimento ? '<p class="ajuda">Preencha a data de nascimento em Ajustes → Bebê para ver os aniversários de mês e a idade em cada marco.</p>' : ''}
      ${itens.length ? `
        <ol class="cartao linha-tempo">${itens.map((it) => `
          <li class="lt-${it.tipo}">
            <span class="lt-ponto" aria-hidden="true"></span>
            <p class="lt-texto">${esc(it.texto)}</p>
            <p class="lt-quando">${esc(quandoMarco(it))}</p>
          </li>`).join('')}</ol>` : '<p class="vazio vazio--grande">Nenhum marco ainda.</p>'}
      <p class="ajuda rel-nota">Para guardar uma "primeira vez", use Anotações na tela inicial e escolha o tipo Marco.</p>
    </div>`;
}

/** Imagem da linha do tempo para o grupo da família. */
function compartilharMarcos(botao) {
  const nomeBebe = String(estado.config.nome_bebe || '').trim();
  const itens = linhaDoTempo(ctx, estado.config.nascimento);
  return compartilharImagens(botao, {
    chave: `marcos|${itens.length}`,
    titulo: `Linha do tempo ${nomeBebe.split(/\s+/)[0]}`,
    gerar: () => imagemLinhaDoTempo(itens, { nome: nomeBebe, idade: idadeTexto(estado.config.nascimento, ctx.agora) })
  });
}

/** Registros marcados para a frente do tipo filtrado (agendavel, ex. consultas), antes da lista do Histórico. */
function cartaoMarcadas(tipo) {
  if (!tipo?.agendavel) return '';
  const marcadas = ctx.doTipo(tipo.id).filter((e) => e.t > ctx.agora).sort((a, b) => a.t - b.t);
  if (!marcadas.length) return '';
  return `
    <section class="secao">
      <h2 class="secao-titulo">Marcadas</h2>
      <ul class="cartao lista-medicoes" ${estiloCor(tipo)}>
        ${marcadas.map((e) => `
          <li>
            <button class="medicao" data-acao="editar" data-id="${esc(e.id)}">
              <span class="medicao-valor">${esc(tipo.resumo(e.dados, ctx, e).texto)}</span>
              <span class="medicao-quando">${esc(quandoCurto(e.t, ctx.agora))}</span>
            </button>
          </li>`).join('')}
      </ul>
    </section>`;
}

/** Gráficos de evolução do tipo filtrado (tipo.evolucao, ex. Medidas), antes da lista do Histórico. */
function cartaoEvolucao(tipo) {
  const series = tipo?.evolucao ? tipo.evolucao(ctx) : [];
  if (!series.length) return '';
  return `
    <section class="cartao evolucao" ${estiloCor(tipo)}>
      <h2 class="evolucao-titulo">Evolução</h2>
      <div class="evolucao-graficos">
        ${series.map((s) => graficoEvolucao(s.pontos, { rotulo: s.rotulo, fmt: s.fmt, cor: tipo.cor })).join('')}
      </div>
      ${series.some((s) => s.pontos.length === 1) ? '<p class="ajuda">Com duas medidas ou mais, aparece a linha da evolução.</p>' : ''}
    </section>`;
}

const botaoRelatorio = () => `
  <button class="cartao rel-abrir" data-acao="vista" data-vista="relatorio">
    <span class="icone icone--pequeno">${ICONES.relatorio}</span>
    <span class="bloco-textos">
      <span class="bloco-titulo">Relatório para a consulta</span>
      <span class="bloco-detalhe">Resumo desde a última consulta, gráficos e dúvidas · PDF ou imagem</span>
    </span>
    <span class="bloco-seta" aria-hidden="true"></span>
  </button>`;

const botaoFamilia = () => `
  <button class="cartao rel-abrir" data-acao="vista" data-vista="familia" style="--cor:${GRUPOS[2].cor}">
    <span class="icone icone--pequeno">${ICONES.familia}</span>
    <span class="bloco-textos">
      <span class="bloco-titulo">Família participando</span>
      <span class="bloco-detalhe">Quem registrou a rotina · ranking da família · imagem para o grupo</span>
    </span>
    <span class="bloco-seta" aria-hidden="true"></span>
  </button>`;

/** Família participando (js/familia.js): quanto da rotina cada um registrou; só tipos de rotina contam. */
const placarAtual = () => montarPlacar(ctx, Object.values(TIPOS), diasFamilia);
function vistaFamilia() {
  const p = placarAtual();
  return htmlPlacar(p, {
    nome: String(estado.config.nome_bebe || '').trim(),
    nDias: diasFamilia,
    periodos: PERIODOS_FAMILIA,
    periodo: textoPeriodo(p),
    meta: metaSemana(ctx),
    pessoas: conquistasPorPessoa(ctx),
    totalConquistas: CONQUISTAS.length,
    meses: mesesRetrospectiva()
  });
}

/** Retrospectiva: o mês passado e o mês atual (AAAA-MM). */
const mesesRetrospectiva = () => { const atual = chaveDia(ctx.agora).slice(0, 7); return { anterior: mesAnterior(atual), atual }; };

/** Imagem da retrospectiva do mês para o grupo da família (js/imagem-familia.js). */
function compartilharRetrospectiva(botao, mes) {
  const r = retrospectiva(ctx, Object.values(TIPOS), mes);
  const nomeBebe = String(estado.config.nome_bebe || '').trim();
  return compartilharImagens(botao, {
    chave: `retro|${mes}`,
    titulo: `Retrospectiva de ${r.nome} ${nomeBebe.split(/\s+/)[0]}`,
    gerar: () => imagemRetrospectiva(r, { nome: nomeBebe })
  });
}

/** Imagem para o grupo da família (js/imagem-familia.js): sem temperatura nem remédios. */
function compartilharFamilia(botao) {
  const p = placarAtual();
  const nomeBebe = String(estado.config.nome_bebe || '').trim();
  return compartilharImagens(botao, {
    chave: `familia|${diasFamilia}`,
    titulo: `${tituloPlacar(diasFamilia)} ${nomeBebe.split(/\s+/)[0]} ${textoPeriodo(p)}`,
    gerar: () => imagemFamilia(p, { nome: nomeBebe, nDias: diasFamilia, periodo: textoPeriodo(p), medalhas: medalhasNovas(conquistasPorPessoa(ctx), p.inicio, p.fim) })
  });
}

/** Relatório para a consulta (js/relatorio.js): período à escolha, para mostrar no celular ou salvar em PDF. */
/** Relatório do período escolhido e as opções de desenho (as mesmas para a tela, o PDF e a imagem). */
function relatorioAtual() {
  const periodo = resolverPeriodo(ctx, diasRelatorio);
  const rel = montarRelatorio(ctx, ordenarTipos(TODOS_TIPOS), periodo.nDias);
  const opcoes = {
    nome: String(estado.config.nome_bebe || '').trim(),
    idade: idadeTexto(estado.config.nascimento, ctx.agora),
    escolha: diasRelatorio,
    nDias: periodo.nDias,
    consulta: periodo.consulta,
    agora: ctx.agora,
    tipoFebre: TIPOS.febre,
    tipoAntitermico: TIPOS.tylenol,
    cores: { leite: TIPOS.alimentacao.cor, sono: TIPOS.sono.cor, cocos: TIPOS.fralda.cor, peso: TIPOS.medidas.cor },
    detalhesAbertos
  };
  return { rel, opcoes };
}

function vistaRelatorio() {
  const { rel, opcoes } = relatorioAtual();
  return htmlRelatorio(rel, opcoes);
}

/** Abre a impressão do navegador (onde dá para "Salvar como PDF"), com um nome de arquivo que diz o período. */
function imprimirRelatorio() {
  const { rel } = relatorioAtual();
  // O PDF leva tudo: abre os "Detalhes" só durante a impressão (sem mudar a escolha de quem está vendo).
  const fechados = [...document.querySelectorAll('[data-detalhes]:not([open])')];
  imprimindo = true;
  fechados.forEach((d) => { d.open = true; });
  window.addEventListener('afterprint', () => { fechados.forEach((d) => { d.open = false; }); setTimeout(() => { imprimindo = false; }, 0); }, { once: true });
  const nome = String(estado.config.nome_bebe || '').trim().split(/\s+/)[0];
  const antes = document.title;
  document.title = `Relatório ${nome} ${textoPeriodo(rel)}`.replace(/\//g, '-').replace(/\s+/g, ' ').trim();
  window.addEventListener('afterprint', () => { document.title = antes; }, { once: true });
  try {
    window.print();
  } catch {
    document.title = antes;
    toast('Este navegador não abriu a impressão. Abra o app no navegador (Chrome ou Safari) e tente de novo.', 5000);
  }
}

/** Relatório como imagem (js/imagem-relatorio.js): 1 a 3 imagens, para o médico ou quem cuida junto. */
function compartilharRelatorio(botao) {
  const { rel, opcoes } = relatorioAtual();
  const nomeBebe = String(estado.config.nome_bebe || '').trim();
  return compartilharImagens(botao, {
    chave: `relatorio|${diasRelatorio}`,
    titulo: `Relatório ${nomeBebe.split(/\s+/)[0]} ${textoPeriodo(rel)}`,
    planoB: 'Use "Salvar em PDF".',
    gerar: () => imagensRelatorio(rel, opcoes)
  });
}

/**
 * Imagens pelo compartilhar do celular (WhatsApp). gerar() → [Blob png]. Sem compartilhar de arquivos (computador),
 * as imagens são baixadas. Se o celular recusar porque a imagem demorou a ficar pronta, ela fica guardada e o próximo
 * toque compartilha na hora.
 */
let imagensProntas = null; // { chave, arquivos }
async function compartilharImagens(botao, { chave: chaveBase, titulo: tituloBruto, planoB, gerar }) {
  if (botao.disabled) return;
  const titulo = tituloBruto.replace(/\s+/g, ' ').trim();
  const chave = `${chaveBase}|${ctx.eventos.length}|${Math.floor(ctx.agora / 60000)}`;
  const rotulo = botao.textContent.trim();
  let arquivos = imagensProntas?.chave === chave ? imagensProntas.arquivos : null;
  if (!arquivos) {
    botao.disabled = true;
    botao.textContent = 'Preparando…';
    try {
      const blobs = [].concat(await gerar());
      const base = titulo.replace(/\//g, '-');
      arquivos = blobs.map((b, i) => new File([b], `${base}${blobs.length > 1 ? ` (${i + 1})` : ''}.png`, { type: 'image/png' }));
      imagensProntas = { chave, arquivos };
    } catch {
      toast(`Não deu para gerar a imagem.${planoB ? ` ${planoB}` : ''}`, 5000);
      return;
    } finally {
      botao.disabled = false;
      botao.textContent = rotulo;
    }
  }
  if (navigator.canShare?.({ files: arquivos })) {
    try {
      await navigator.share({ files: arquivos, title: titulo });
      imagensProntas = null;
    } catch (e) {
      if (e.name === 'NotAllowedError') toast(`Imagem pronta. Toque de novo em "${rotulo}".`, 5000);
      else if (e.name !== 'AbortError') toast(`Não deu para compartilhar.${planoB ? ` ${planoB}` : ''}`, 5000);
    }
    return;
  }
  for (const arq of arquivos) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(arq);
    a.download = arq.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  }
  toast(arquivos.length > 1 ? `${arquivos.length} imagens salvas em Downloads` : 'Imagem salva em Downloads');
}

/**
 * "Ritmo dele": o que os registros dos últimos 14 dias mostram (com os 14 anteriores entre parênteses).
 * Fica no topo do Histórico, recolhido numa linha.
 */
function cartaoRitmo() {
  const sono = ritmoDoSono(ctx);
  const leite = ritmoDoLeite(ctx);
  const a = sono.atual, b = sono.anterior, la = leite.atual, lb = leite.anterior;
  const dur = (m) => (m ? `~${fmtDuracao(minutos5(m))}` : '');
  const hora = (h) => (h !== null && h !== undefined ? `~${textoHoraDecimal(h)}` : '');
  const antes = (agora, depois, fmt, minDif) =>
    agora !== null && depois !== null && depois !== undefined && Math.abs(agora - depois) >= minDif ? ` <span class="ritmo-antes">(antes ${esc(fmt(depois))})</span>` : '';
  const linhas = [];
  const faixas = [[2, 'Acordado de manhã'], [3, 'Acordado no começo da tarde'], [4, 'Acordado no fim da tarde']];
  for (const [i, rotulo] of faixas) {
    if (a.janelas[i]) linhas.push([rotulo, esc(dur(a.janelas[i])) + antes(a.janelas[i], b.janelas[i], dur, 10)]);
  }
  if (a.cochilosPorDia) {
    linhas.push(['Cochilos', `${esc(fmtNumero(a.cochilosPorDia, 1))} por dia${a.duracaoCochilo ? ` · ${esc(dur(a.duracaoCochilo))} cada` : ''}` +
      antes(a.cochilosPorDia, b.cochilosPorDia, (v) => `${fmtNumero(v, 1)}/dia`, 0.3)]);
  }
  if (a.dormir !== null) linhas.push(['Dorme à noite', esc(hora(a.dormir)) + antes(a.dormir, b.dormir, hora, 0.25)]);
  if (a.acordar !== null) linhas.push(['Acorda de manhã', esc(hora(a.acordar)) + antes(a.acordar, b.acordar, hora, 0.25)]);
  if (la.porDia) {
    linhas.push(['Leite', `${esc(fmtNumero(la.porDia, 1))} mamadeiras por dia${la.mlPorDia ? ` · ~${Math.round(la.mlPorDia / 10) * 10} mL` : ''}` +
      antes(la.mlPorDia, lb.mlPorDia, (v) => `~${Math.round(v / 10) * 10} mL`, 50)]);
  }
  if (la.dia) linhas.push(['Entre mamadeiras (de dia)', esc(dur(la.dia)) + antes(la.dia, lb.dia, dur, 15)]);
  if (!linhas.length) return '';
  const resumo = [a.geral ? `acordado ${dur(a.geral)}` : '', a.dormir !== null ? `dorme ${hora(a.dormir)}` : '',
    la.porDia ? `${fmtNumero(la.porDia, 1)} mamadeiras/dia` : ''].filter(Boolean).join(' · ');
  return `
    <div class="blocos ritmo">
      ${bloco('ritmo', cabecaBloco(`Ritmo dele · últimos ${RITMO_DIAS} dias`, resumo), `
        <dl class="ritmo-lista">${linhas.map(([r, v]) => `<div><dt>${esc(r)}</dt><dd>${v}</dd></div>`).join('')}</dl>
        <p class="ajuda">É o que os registros mostram (entre parênteses, os ${RITMO_DIAS} dias anteriores, quando mudou). As previsões
          "por volta de" usam estes números. Não é orientação médica.</p>`)}
    </div>`;
}

// ---------------------------------------------------------------------------
// Ajustes
// ---------------------------------------------------------------------------

// Blocos de Ajustes que estão abertos (o redesenho da tela mantém aberto o que estava aberto).
const blocosAbertos = new Set();

/** Bloco que abre ao tocar (<details>). chave identifica o bloco; resumo é o HTML da linha de cima. */
function bloco(chave, resumo, conteudo, classe = '', estilo = '') {
  return `
    <details class="bloco ${classe}" data-bloco="${esc(chave)}" ${blocosAbertos.has(chave) ? 'open' : ''} ${estilo}>
      <summary class="bloco-topo">${resumo}<span class="bloco-seta" aria-hidden="true"></span></summary>
      <div class="bloco-corpo">${conteudo}</div>
    </details>`;
}

/** Linha de cima de um bloco: título e, embaixo, um resumo do que tem dentro. */
const cabecaBloco = (titulo, detalhe, icone = '') => `
  ${icone ? `<span class="icone icone--pequeno">${icone}</span>` : ''}
  <span class="bloco-textos">
    <span class="bloco-titulo">${esc(titulo)}</span>
    ${detalhe ? `<span class="bloco-detalhe">${esc(detalhe)}</span>` : ''}
  </span>`;

const decimal = (v) => esc(String(v ?? '').replace('.', ','));

function vistaAjustes() {
  const c = estado.config;
  const nome = String(c.nome_bebe || '').trim();
  const limite = String(c.febre_limite_c || '37.8').replace('.', ',');
  const ajustes = ctx.eventos.filter((e) => e.tipo === 'ajuste');
  const ultimoAjuste = ajustes.at(-1);
  const emUso = remediosNaLista().emUso.length;
  return `
    <div class="blocos ajustes">
      ${bloco('bebe', cabecaBloco('Bebê', [nome || 'Sem nome', idadeTexto(c.nascimento, ctx.agora), `febre a partir de ${limite} °C`].filter(Boolean).join(' · ')), formBebe())}
      ${bloco('remedios', cabecaBloco('Remédios', emUso === 1 ? '1 em uso' : `${emUso} em uso`), conteudoRemedios())}
      ${bloco('inicio', cabecaBloco('Tela inicial', resumoBotoesInicio()), conteudoBotoesInicio())}
      ${bloco('historico-ajustes', cabecaBloco('Histórico de ajustes', ultimoAjuste
        ? `Última mudança: ${quandoCurto(ultimoAjuste.t, ctx.agora)}${ultimoAjuste.quem ? ` · ${ultimoAjuste.quem}` : ''}`
        : 'Nenhuma mudança ainda'), conteudoHistoricoAjustes())}
      ${bloco('celular', cabecaBloco('Este celular', [store.lerApelido(), textoSyncCurto()].filter(Boolean).join(' · ')), conteudoCelular())}
    </div>`;
}

const textoSyncCurto = () => {
  const s = estado.sync;
  if (s.pendentes) return `${s.pendentes} esperando internet`;
  return s.ultima ? `sincronizado às ${fmtHora(s.ultima)}` : '';
};

function formBebe() {
  const c = estado.config;
  return `
    <form class="form" data-form="config">
      <label class="campo">
        <span>Nome do bebê</span>
        <input name="nome_bebe" maxlength="40" autocomplete="off" value="${esc(c.nome_bebe || '')}" placeholder="O primeiro nome aparece no topo da tela">
      </label>
      <label class="campo">
        <span>Data de nascimento</span>
        <input name="nascimento" type="date" max="${chaveDia(Date.now())}" value="${esc(/^\d{4}-\d{2}-\d{2}$/.test(c.nascimento || '') ? c.nascimento : '')}">
        <small>Para mostrar a idade no Relatório para a consulta.</small>
      </label>
      <label class="campo">
        <span>Febre a partir de (°C)</span>
        <input name="febre_limite_c" inputmode="decimal" value="${decimal(c.febre_limite_c)}" placeholder="37,8">
      </label>
      <button class="botao botao--cheio" type="submit">Salvar</button>
    </form>`;
}

/** Linha de cima do bloco Tela inicial. */
function resumoBotoesInicio() {
  const prefs = lerBotoesInicio(estado.config);
  const existentes = new Set(idsPadraoInicio());
  const ocultos = prefs.ocultos.filter((id) => existentes.has(id)).length;
  const propria = textoBotoesInicio({ ordem: aplicarBotoesInicio([...existentes].map((id) => ({ id })), prefs, true).map((x) => x.id), ocultos: [] }, [...existentes]);
  const partes = [ocultos ? (ocultos === 1 ? '1 botão escondido' : `${ocultos} botões escondidos`) : 'Todos os botões aparecem'];
  if (propria) partes.push('ordem escolhida');
  return partes.join(' · ');
}

/** Ajustes → Tela inicial: mostrar/esconder e subir/descer cada botão (grandes e faixa, cada um no seu grupo). */
function conteudoBotoesInicio() {
  const prefs = lerBotoesInicio(estado.config);
  const { grandes, faixa } = botoesPadrao();
  const linha = (t) => `
    <li class="ordem-item" data-id="${esc(t.id)}" ${estiloCor(t)}>
      <span class="icone icone--pequeno">${t.icone}</span>
      <span class="ordem-textos">
        <span class="ordem-nome">${esc(t.rotulo)}</span>
        ${t.naInicio && !t.naInicio(ctx) ? '<small class="ajuda">Só aparece durante o tratamento</small>' : ''}
      </span>
      <label class="ordem-mostrar"><input type="checkbox" name="mostrar" ${prefs.ocultos.includes(t.id) ? '' : 'checked'}><span>Mostrar</span></label>
      <span class="ordem-setas">
        <button type="button" class="ordem-mover" data-acao="mover" data-dir="-1" aria-label="Subir ${esc(t.rotulo)}">${ICONES.subir}</button>
        <button type="button" class="ordem-mover" data-acao="mover" data-dir="1" aria-label="Descer ${esc(t.rotulo)}">${ICONES.descer}</button>
      </span>
    </li>`;
  const grupo = (titulo, lista) => `
    <p class="ordem-titulo">${esc(titulo)}</p>
    <ul class="lista ordem">${aplicarBotoesInicio(lista, prefs, true).map(linha).join('')}</ul>`;
  return `
    <form class="form" data-form="inicio">
      <p class="ajuda">Escolha o que aparece na tela inicial e em que ordem. Vale para os dois celulares.
        O que ficar escondido continua no Histórico e no filtro, e os horários continuam no card PRÓXIMO.</p>
      ${grupo('Botões grandes', grandes)}
      ${grupo('Remédios e saúde', faixa)}
      <button class="botao botao--cheio" type="submit">Salvar</button>
      <button class="botao botao--leve" type="button" data-acao="inicio-padrao">Voltar ao padrão</button>
    </form>`;
}

/** Grava a escolha da tela inicial (texto da config) e registra o antes e o depois. */
function salvarBotoesInicio(texto) {
  const antes = String(estado.config.inicio_botoes ?? '');
  if (antes === texto) return toast('Nada mudou');
  registrarAjuste('config:inicio_botoes', antes, texto);
  store.salvarConfig('inicio_botoes', texto);
  toast('Tela inicial atualizada');
  render();
}

/** Remédios em uso (Tylenol, cadastrados ativos, amoxicilina durante o tratamento) e encerrados. */
function remediosNaLista() {
  const cadastrados = lerRemedios(estado.config);
  const amox = TIPOS.amoxicilina;
  const amoxEmUso = !!amox && (!amox.naInicio || amox.naInicio(ctx));
  return {
    emUso: [
      ...cadastrados.filter((r) => r.ativo).map((r) => ({ id: `remedio_${r.id}`, r })),
      ...(amoxEmUso ? [{ id: 'amoxicilina' }] : []),
      { id: 'tylenol' }
    ],
    encerrados: [
      ...cadastrados.filter((r) => !r.ativo).map((r) => ({ id: `remedio_${r.id}`, r })),
      ...(amox && !amoxEmUso ? [{ id: 'amoxicilina' }] : [])
    ]
  };
}

function conteudoRemedios() {
  const { emUso, encerrados } = remediosNaLista();
  const item = (x) => blocoRemedio(x);
  return `
    <p class="ajuda">Toque num remédio para ver e mudar a dose, o jeito de dar e os horários.</p>
    <div class="blocos blocos--dentro">
      ${emUso.map(item).join('')}
      ${bloco('rem:novo', cabecaBloco('+ Adicionar remédio', 'Vitamina, antibiótico, xarope…'), formRemedio(null), 'bloco--novo')}
      ${encerrados.length ? bloco('encerrados', cabecaBloco('Tratamentos encerrados', `${encerrados.length} · as doses continuam no Histórico`),
        `<div class="blocos blocos--dentro">${encerrados.map(item).join('')}</div>`, 'bloco--encerrados') : ''}
    </div>`;
}

const num = (v) => (v === null || v === undefined ? '' : String(v).replace('.', ','));
const descricaoRemedio = (x) => [
  x.modo === 'intervalo' && x.cadaH ? `A cada ${num(x.cadaH)}h` : x.modo === 'diario' ? `1 vez por dia (até ${x.horaRef})` : MODOS[x.modo],
  x.dose
].filter(Boolean).join(' · ');

/** Um remédio da lista: linha com nome e resumo; dentro, tudo dele. */
function blocoRemedio({ id, r }) {
  const tipo = TIPOS[id];
  if (!tipo) return '';
  const c = estado.config;
  let detalhe = '';
  let conteudo = '';
  if (r) {
    detalhe = descricaoRemedio(r);
    conteudo = formRemedio(r) + (r.modo === 'fixo' && r.ativo ? formPlano(tipo) : '');
  } else if (id === 'tylenol') {
    const gotas = c.tylenol_apresentacao === 'gotas';
    const dose = gotas ? (c.tylenol_dose_gotas ? `${c.tylenol_dose_gotas} gotas` : '') : (c.tylenol_dose_ml ? `${num(c.tylenol_dose_ml)} mL` : '');
    detalhe = ['Só se precisar', gotas ? 'Paracetamol gotas' : 'Tylenol Bebê', dose].filter(Boolean).join(' · ');
    conteudo = formTylenol();
  } else if (id === 'amoxicilina') {
    const plano = ctx.plano('amoxicilina');
    detalhe = [c.amoxicilina_dose_ml ? `${num(c.amoxicilina_dose_ml)} mL` : '',
      plano?.horarios.length ? `plano até ${quandoCurto(plano.horarios.at(-1), ctx.agora)}` : 'sem plano'].filter(Boolean).join(' · ');
    conteudo = formAmoxicilina() + formPlano(tipo);
  }
  return bloco(`rem:${id}`, cabecaBloco(tipo.rotulo, detalhe, tipo.icone), conteudo, 'bloco--remedio', estiloCor(tipo));
}

function formTylenol() {
  const c = estado.config;
  return `
    <form class="form" data-form="config">
      <div class="campo">
        <span>Remédio em uso</span>
        <div class="seg seg--largo">
          <label><input type="radio" name="tylenol_apresentacao" value="suspensao" ${c.tylenol_apresentacao === 'gotas' ? '' : 'checked'}><span>Tylenol Bebê</span></label>
          <label><input type="radio" name="tylenol_apresentacao" value="gotas" ${c.tylenol_apresentacao === 'gotas' ? 'checked' : ''}><span>Paracetamol gotas</span></label>
        </div>
        <small>As concentrações são diferentes (100 mg/mL e 200 mg/mL): a dose de um não vale para o outro. Ao trocar de remédio, troque aqui.</small>
      </div>
      <label class="campo">
        <span>Tylenol Bebê (100 mg/mL): dose em mL</span>
        <input name="tylenol_dose_ml" inputmode="decimal" value="${decimal(c.tylenol_dose_ml)}" placeholder="Como orientado pelo pediatra">
        <small>Para bebês com menos de 11 kg ou 2 anos, a bula pede orientação médica.</small>
      </label>
      <label class="campo">
        <span>Paracetamol em gotas (200 mg/mL): dose em gotas</span>
        <input name="tylenol_dose_gotas" inputmode="numeric" value="${esc(c.tylenol_dose_gotas || '')}" placeholder="Como na receita do pediatra">
        <small>A dose do remédio em uso já vem preenchida ao registrar.</small>
      </label>
      <label class="campo">
        <span>Máximo de doses em 24 horas</span>
        <input name="tylenol_max_24h" inputmode="numeric" value="${esc(c.tylenol_max_24h || '')}" placeholder="${c.tylenol_apresentacao === 'gotas' ? 'Conforme a bula das gotas' : 'A bula do Tylenol Bebê diz 5'}">
        <small>${c.tylenol_max_24h ? 'Confira sempre com a bula do remédio em uso ou a orientação médica.' : 'Ainda não preenchido. Preencha conforme a bula ou a orientação médica.'}</small>
      </label>
      <button class="botao botao--cheio" type="submit">Salvar</button>
    </form>`;
}

function formAmoxicilina() {
  const c = estado.config;
  return `
    <form class="form" data-form="config">
      <label class="campo">
        <span>Dose da receita (mL)</span>
        <input name="amoxicilina_dose_ml" inputmode="decimal" value="${decimal(c.amoxicilina_dose_ml)}" placeholder="Como na receita do pediatra">
        <small>Já vem preenchida ao registrar uma dose.</small>
      </label>
      <label class="campo">
        <span>Frasco preparado em</span>
        <input name="amoxicilina_frasco_preparado" type="date" max="${chaveDia(ctx.agora)}" value="${esc(c.amoxicilina_frasco_preparado || '')}">
        <small>Depois de misturado com água, a bula diz que vale 14 dias na geladeira. Ao preparar um frasco novo, troque a data.</small>
      </label>
      <button class="botao botao--cheio" type="submit">Salvar</button>
    </form>`;
}

/** Horários fixos de um remédio (aba planos). */
function formPlano(tipo) {
  const plano = ctx.plano(tipo.id);
  const linhas = plano ? plano.horarios.map((t) => `${fmtData(t)}/${chaveDia(t).slice(0, 4)} ${fmtHora(t)}`).join('\n') : '';
  const resumo = plano && plano.horarios.length
    ? `${plano.horarios.length} horários · de ${quandoCurto(plano.horarios[0])} a ${quandoCurto(plano.horarios.at(-1))}`
    : 'Nenhum plano ativo';
  return `
    <form class="form form--plano" data-form="plano" data-tipo="${tipo.id}">
      <strong>Horários do plano</strong>
      <p class="ajuda">${esc(resumo)}</p>
      <label class="campo">
        <span>Um horário por linha (dia/mês/ano hora)</span>
        <textarea name="horarios" rows="6" spellcheck="false" placeholder="25/10/2026 08:00">${esc(linhas)}</textarea>
      </label>
      <p class="ajuda">Os horários ficam fixos: uma dose atrasada não muda as próximas.</p>
      <div class="botoes">
        <button class="botao botao--cheio" type="submit">Salvar plano</button>
        ${plano ? '<button class="botao botao--leve" type="button" data-acao="desativar-plano">Encerrar plano</button>' : ''}
      </div>
    </form>`;
}

function conteudoCelular() {
  const chave = store.lerChave();
  return `
    <form class="form" data-form="apelido">
      <label class="campo">
        <span>Seu apelido</span>
        <input name="apelido" maxlength="20" autocomplete="off" value="${esc(store.lerApelido())}">
        <small>Aparece no Histórico ao lado do que você registrar.</small>
      </label>
      <button class="botao botao--cheio" type="submit">Salvar apelido</button>
    </form>
    <div class="form form--separado">
      <div class="linha-chave">
        <div>
          <span class="rotulo-pequeno">Chave de acesso</span>
          <code id="chave" data-chave="${esc(chave)}">${esc(mascarar(chave))}</code>
        </div>
        <button class="botao botao--leve" type="button" data-acao="mostrar-chave">Mostrar</button>
      </div>
      <button class="botao botao--cheio" type="button" data-acao="compartilhar">${ICONES.compartilhar} Compartilhar link de acesso</button>
      <button class="botao botao--leve" type="button" data-acao="copiar-link">Copiar link</button>
      <p class="ajuda">Quem tiver o link consegue ver e registrar. Envie só para quem cuida do bebê.</p>
    </div>
    ${instalado() ? '' : `
    <div class="form form--separado instalar">
      <strong>Instalar na tela de início</strong>
      <p class="ajuda"><b>iPhone (Safari):</b> toque em <b>Copiar link</b> acima. Depois toque em Compartilhar
        <span class="simbolo">${ICONES.compartilhar}</span> → <b>Adicionar à Tela de Início</b> → <b>Adicionar</b>.
        Abra pelo ícone novo e cole o link quando pedir (o iPhone guarda o app separado do Safari).</p>
      <p class="ajuda"><b>Android (Chrome):</b> menu <b>⋮</b> → <b>Adicionar à tela inicial</b> (ou <b>Instalar app</b>).</p>
    </div>`}
    <div class="form form--separado">
      <p class="ajuda" id="status-sync">${esc(textoSyncDetalhado())}</p>
      <button class="botao botao--leve" type="button" data-acao="sync">${ICONES.sync} Sincronizar agora</button>
      <p class="ajuda versao">Versão ${esc(VERSAO)} · o app se atualiza sozinho</p>
      <p class="ajuda versao" id="versao-backend">${esc(textoVersaoBackend())}</p>
      <p class="ajuda versao" id="agenda-google">${esc(textoAgenda())}</p>
    </div>`;
}

/** Horários de meia em meia hora (05:00 a 23:00), sempre em 24h; inclui o atual se for "quebrado". */
function opcoesHoraRef(atual) {
  const lista = [];
  for (let m = 5 * 60; m <= 23 * 60; m += 30) lista.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  if (!lista.includes(atual)) lista.push(atual), lista.sort();
  return lista.map((h) => `<option value="${h}" ${h === atual ? 'selected' : ''}>${h}</option>`).join('');
}

/** Formulário de um remédio cadastrado (config.remedios); r = null para um remédio novo. */
function formRemedio(r) {
  const modo = r?.modo || 'intervalo';
  return `
    <form class="form" data-form="remedio" data-id="${esc(r?.id || '')}">
      <label class="campo">
        <span>Nome</span>
        <input name="nome" maxlength="40" autocomplete="off" value="${esc(r?.nome || '')}" placeholder="Ex.: Vitamina D">
      </label>
      <label class="campo">
        <span>Dose</span>
        <input name="dose" maxlength="40" autocomplete="off" value="${esc(r?.dose || '')}" placeholder="Como na receita, ex. 4 mL ou 2 gotas">
        <small>Já vem preenchida ao registrar.</small>
      </label>
      <div class="campo">
        <span>Como dar</span>
        <div class="seg seg--largo">
          ${Object.entries(MODOS).map(([id, rotulo]) => `<label><input type="radio" name="modo" value="${id}" ${modo === id ? 'checked' : ''}><span>${esc(rotulo.replace('A cada X horas', 'A cada X h'))}</span></label>`).join('')}
        </div>
        <small class="so-fixo">Horários fixos: depois de salvar, os horários do plano aparecem logo abaixo deste formulário.</small>
        <small class="so-se_precisar">Só se precisar: nunca aparece como próximo; o app só mostra quando está liberado.</small>
        <small class="so-diario">1 vez por dia: mostra se já foi dada hoje. Passando da hora abaixo sem registro, aparece como próximo.</small>
      </div>
      <label class="campo so-diario">
        <span>Avisar se não for dada até</span>
        <select name="horaRef">${opcoesHoraRef(r?.horaRef || HORA_REF_PADRAO)}</select>
      </label>
      <label class="campo so-intervalo">
        <span>A cada quantas horas</span>
        <input name="cadaH" inputmode="decimal" value="${esc(num(r?.cadaH))}" placeholder="Ex.: 8">
      </label>
      <label class="campo">
        <span>Intervalo mínimo entre doses (horas)</span>
        <input name="minimoH" inputmode="decimal" value="${esc(num(r?.minimoH))}" placeholder="Opcional">
        <small>Avisa se alguém registrar antes disso.</small>
      </label>
      <label class="campo">
        <span>Máximo de doses em 24 horas</span>
        <input name="maxDia" inputmode="numeric" value="${esc(num(r?.maxDia))}" placeholder="Opcional, conforme a bula">
      </label>
      <label class="campo">
        <span>Lembrete na hora de registrar</span>
        <input name="lembrete" maxlength="200" autocomplete="off" value="${esc(r?.lembrete || '')}" placeholder="Opcional, ex. dar depois de mamar">
      </label>
      <button class="botao botao--cheio" type="submit">${r ? 'Salvar alterações' : 'Adicionar remédio'}</button>
      ${r ? `<button class="botao botao--perigo" type="button" data-acao="encerrar-remedio" data-id="${esc(r.id)}">${r.ativo ? 'Encerrar remédio' : 'Reativar remédio'}</button>
      <p class="ajuda">${r.ativo ? 'Encerrar tira o remédio da tela inicial. As doses continuam no Histórico.' : 'Reativar volta o remédio para a tela inicial.'}</p>
      ${ctx.doTipo(`remedio_${r.id}`).length ? '' : `<button class="botao botao--perigo" type="button" data-acao="excluir-remedio" data-id="${esc(r.id)}">Excluir remédio</button>
      <p class="ajuda">Só aparece para remédio sem nenhuma dose registrada (ex. cadastrado por engano).</p>`}` : ''}
    </form>`;
}

// ---------------------------------------------------------------------------
// Histórico de ajustes (tipo interno "ajuste" na aba eventos; ver js/tipos/ajuste.js)
// ---------------------------------------------------------------------------

/** Registra uma mudança de Ajustes com o antes e o depois (crus). Nada é gravado se não mudou. */
function registrarAjuste(chave, antes, depois) {
  if (String(antes ?? '') === String(depois ?? '')) return;
  store.adicionarEvento('ajuste', Date.now(), { chave, antes: String(antes ?? ''), depois: String(depois ?? '') });
}

/** Horários (ms ou ISO) → JSON de ISO em ordem, ou '' sem plano. */
const planoTexto = (horarios) => {
  const lista = (horarios || []).map((t) => (typeof t === 'number' ? t : Date.parse(t))).filter(Number.isFinite).sort((a, b) => a - b);
  return lista.length ? JSON.stringify(lista.map((t) => isoSP(t))) : '';
};

/** Salva um plano de horários e registra o antes e o depois. Devolve false se nada mudou. */
function salvarPlanoComAjuste(tipo, horarios) {
  const antes = planoTexto(ctx.plano(tipo)?.horarios);
  const depois = planoTexto(horarios);
  if (antes === depois) return false;
  registrarAjuste(`plano:${tipo}`, antes, depois);
  store.salvarPlano(tipo, horarios);
  return true;
}

function conteudoHistoricoAjustes() {
  // ctx.eventos já vem em ordem (horário, criação; empates na ordem em que foram gravados): basta inverter.
  const lista = ctx.eventos.filter((e) => e.tipo === 'ajuste').reverse();
  const nomes = Object.fromEntries(TODOS_TIPOS.map((t) => [t.id, t.rotulo]));
  const itens = lista.slice(0, limiteAjustes).map((e) => {
    const d = descreverAjuste(e.dados, nomes);
    return `
      <li class="ajuste-item">
        <p class="ajuste-quando">${esc(quandoCurto(e.t, ctx.agora))}${e.quem ? ` · ${esc(e.quem)}` : ''}</p>
        <p class="ajuste-rotulo">${esc(d.rotulo)}</p>
        <p class="ajuste-valores"><span class="ajuste-antes">${esc(d.antes)}</span> <span aria-label="mudou para">→</span> <span>${esc(d.depois)}</span></p>
        <button class="botao botao--leve botao--pequeno" type="button" data-acao="voltar-ajuste" data-id="${esc(e.id)}" aria-label="Voltar ao valor anterior">Voltar</button>
      </li>`;
  }).join('');
  return `
      ${lista.length ? `
        <ul class="lista ajustes-lista">${itens}</ul>
        ${lista.length > limiteAjustes ? `<button class="botao botao--leve" type="button" data-acao="mais-ajustes">Ver mais (${lista.length - limiteAjustes})</button>` : ''}
      ` : '<p class="ajuda">As mudanças feitas aqui em Ajustes aparecem nesta lista, com quem mudou, quando, o valor de antes e o de depois.</p>'}`;
}

/** Volta ao valor de antes de um ajuste. A volta também fica registrada. */
function voltarAjuste(evento) {
  const { chave = '', antes = '' } = evento.dados || {};
  const [grupo, ...resto] = chave.split(':');
  const alvo = resto.join(':');
  if (grupo === 'config') {
    const atual = String(estado.config[alvo] ?? '');
    if (atual === antes) return toast('Já está com esse valor');
    registrarAjuste(chave, atual, antes);
    store.salvarConfig(alvo, antes);
  } else if (grupo === 'remedio') {
    const lista = lerRemedios(estado.config);
    const i = lista.findIndex((x) => x.id === alvo);
    let def = null;
    try { def = antes ? JSON.parse(antes) : null; } catch { return toast('Não foi possível voltar este ajuste'); }
    if (!def) {
      if (i < 0) return toast('Já está assim');
      if (ctx.doTipo(`remedio_${alvo}`).length) return toast('Esse remédio já tem doses. Em vez de excluir, use Encerrar.', 4000);
      lista.splice(i, 1);
    } else if (i >= 0) lista[i] = def;
    else lista.push(def);
    if (JSON.stringify(lerRemedios({ remedios: JSON.stringify(lista) })) === JSON.stringify(lerRemedios(estado.config))) {
      return toast('Já está com esse valor');
    }
    salvarRemedios(lista);
  } else if (grupo === 'plano') {
    let horarios = [];
    try { horarios = antes ? JSON.parse(antes) : []; } catch { return toast('Não foi possível voltar este ajuste'); }
    if (!salvarPlanoComAjuste(alvo, horarios)) return toast('Já está com esse valor');
  } else {
    return toast('Não foi possível voltar este ajuste');
  }
  toast('Voltou ao valor anterior');
  render();
}

/** Grava a lista inteira de remédios (aba config, chave "remedios") e registra o que mudou em cada um. */
function salvarRemedios(lista) {
  const antes = new Map(lerRemedios(estado.config).map((r) => [r.id, JSON.stringify(r)]));
  const depois = new Map(lerRemedios({ remedios: JSON.stringify(lista) }).map((r) => [r.id, JSON.stringify(r)]));
  for (const id of new Set([...antes.keys(), ...depois.keys()])) {
    registrarAjuste(`remedio:${id}`, antes.get(id) || '', depois.get(id) || '');
  }
  store.salvarConfig('remedios', JSON.stringify(lista));
}

function salvarFormRemedio(form) {
  const lista = lerRemedios(estado.config);
  const nome = form.nome.value.trim().slice(0, 40);
  const modo = MODOS[form.modo.value] ? form.modo.value : 'intervalo';
  const ler = (campo) => (form[campo].value.trim() ? numero(form[campo].value) : null);
  const cadaH = ler('cadaH');
  const minimoH = ler('minimoH');
  const maxDia = ler('maxDia');
  if (!nome) return toast('Escreva o nome do remédio');
  if (lista.some((x) => x.nome.toLowerCase() === nome.toLowerCase() && x.id !== form.dataset.id)) return toast('Já existe um remédio com esse nome');
  if (modo === 'intervalo' && (cadaH === null || cadaH < 0.5 || cadaH > 72)) return toast('Diga de quantas em quantas horas (ex.: 8)');
  if (form.cadaH.value.trim() && cadaH === null) return toast('Confira as horas (ex.: 8)');
  if (form.minimoH.value.trim() && (minimoH === null || minimoH <= 0 || minimoH > 72)) return toast('Confira o intervalo mínimo em horas (ex.: 6)');
  if (form.maxDia.value.trim() && (maxDia === null || !Number.isInteger(maxDia) || maxDia < 1 || maxDia > 24)) return toast('O máximo em 24 horas precisa ser um número inteiro');
  const dados = {
    nome,
    dose: form.dose.value.trim().slice(0, 40),
    modo,
    cadaH: modo === 'intervalo' ? cadaH : null,
    horaRef: modo === 'diario' ? (horaValida(form.horaRef.value) ? form.horaRef.value : HORA_REF_PADRAO) : null,
    minimoH,
    maxDia,
    lembrete: form.lembrete.value.trim().slice(0, 200)
  };
  const atual = lista.find((x) => x.id === form.dataset.id);
  if (atual) Object.assign(atual, dados);
  else {
    const novo = { id: Date.now().toString(36), ativo: true, cor: corPara(lista.length), ...dados };
    lista.push(novo);
    // Fecha o "Adicionar" e abre o remédio novo (para um de horários fixos, os horários do plano estão nele).
    blocosAbertos.delete('rem:novo');
    blocosAbertos.add(`rem:remedio_${novo.id}`);
  }
  salvarRemedios(lista);
  toast(atual ? 'Remédio salvo' : modo === 'fixo' ? 'Remédio adicionado. Preencha os horários do plano logo abaixo.' : 'Remédio adicionado', modo === 'fixo' && !atual ? 4500 : 2800);
  render();
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
    // Cada bloco de Ajustes tem só alguns campos: grava só os que estão neste formulário.
    const CHAVES = ['nome_bebe', 'nascimento', 'febre_limite_c', 'tylenol_max_24h', 'tylenol_apresentacao', 'tylenol_dose_ml',
      'tylenol_dose_gotas', 'amoxicilina_dose_ml', 'amoxicilina_frasco_preparado'];
    const valores = {};
    for (const chave of CHAVES) if (form.elements[chave]) valores[chave] = String(form.elements[chave].value ?? '').trim();
    if ('tylenol_apresentacao' in valores) valores.tylenol_apresentacao = valores.tylenol_apresentacao === 'gotas' ? 'gotas' : 'suspensao';
    for (const chave of ['tylenol_dose_ml', 'amoxicilina_dose_ml']) {
      if (!(chave in valores)) continue;
      const dose = numero(valores[chave]);
      if (valores[chave] && (dose === null || dose <= 0 || dose > 10)) {
        return toast('Confira a dose em mL (ex.: 1,2)');
      }
      valores[chave] = valores[chave] ? String(dose) : '';
    }
    if (valores.tylenol_dose_gotas && !(/^\d+$/.test(valores.tylenol_dose_gotas) && Number(valores.tylenol_dose_gotas) >= 1 && Number(valores.tylenol_dose_gotas) <= 60)) {
      return toast('A dose em gotas precisa ser um número inteiro (ex.: 7)');
    }
    const preparo = valores.amoxicilina_frasco_preparado;
    if (preparo && (!/^\d{4}-\d{2}-\d{2}$/.test(preparo) || preparo > chaveDia(Date.now()))) {
      return toast('Confira a data em que o frasco foi preparado');
    }
    if (valores.nascimento && (!/^\d{4}-\d{2}-\d{2}$/.test(valores.nascimento) || valores.nascimento > chaveDia(Date.now()))) {
      return toast('Confira a data de nascimento');
    }
    if (valores.febre_limite_c && (numero(valores.febre_limite_c) === null || numero(valores.febre_limite_c) < 36 || numero(valores.febre_limite_c) > 40)) {
      return toast('Confira o limite de febre (ex.: 37,8)');
    }
    if (valores.tylenol_max_24h && !/^\d+$/.test(valores.tylenol_max_24h)) {
      return toast('O máximo de doses precisa ser um número inteiro');
    }
    if ('febre_limite_c' in valores) valores.febre_limite_c = valores.febre_limite_c ? String(numero(valores.febre_limite_c)) : '';
    let mudou = 0;
    for (const [chave, valor] of Object.entries(valores)) {
      const antes = String(estado.config[chave] ?? '');
      if (antes !== valor) {
        registrarAjuste(`config:${chave}`, antes, valor);
        store.salvarConfig(chave, valor);
        mudou++;
      }
    }
    toast(mudou ? 'Ajustes salvos' : 'Nada mudou');
    render();
  } else if (tipoForm === 'inicio') {
    const itens = [...form.querySelectorAll('.ordem-item')];
    salvarBotoesInicio(textoBotoesInicio({
      ordem: itens.map((li) => li.dataset.id),
      ocultos: itens.filter((li) => !li.querySelector('[name="mostrar"]').checked).map((li) => li.dataset.id)
    }, idsPadraoInicio()));
  } else if (tipoForm === 'remedio') {
    salvarFormRemedio(form);
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
    salvarPlanoComAjuste(form.dataset.tipo, [...new Set(horarios)].sort((a, b) => a - b));
    toast('Plano salvo');
    render();
  } else if (tipoForm === 'apelido') {
    const nome = form.apelido.value.trim().slice(0, 20);
    if (!nome) return toast('Escreva um apelido');
    store.salvarApelido(nome);
    toast('Apelido salvo');
  }
}

function linkDeAcesso() {
  let hash = `k=${encodeURIComponent(store.lerChave())}`;
  if (!urlDoConfig && store.urlBackendDoLink()) hash += `&u=${encodeURIComponent(store.urlBackendDoLink())}`;
  // ?v= diferente a cada envio: o WhatsApp trata como link novo e monta a prévia com imagem de novo.
  return `${location.origin}${location.pathname}?v=${Date.now().toString(36)}#${hash}`;
}

async function copiarLink() {
  const link = linkDeAcesso();
  try {
    await navigator.clipboard.writeText(link);
    toast('Link copiado');
  } catch {
    prompt('Copie o link:', link);
  }
}

async function compartilharLink() {
  const link = linkDeAcesso();
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
  if (campo.tipo === 'hora') {
    const t = ms(valor);
    const [h, m] = Number.isFinite(t) ? fmtHora(t).split(':') : ['', ''];
    return `
      <div class="campo">
        <span>${esc(campo.rotulo)}</span>
        <div class="hora">
          <select name="${nome}_h" aria-label="${esc(campo.rotulo)}: hora"><option value="">--</option>${opcoesNumero(24, h)}</select>
          <span aria-hidden="true">:</span>
          <select name="${nome}_m" aria-label="${esc(campo.rotulo)}: minuto"><option value="">--</option>${opcoesNumero(60, m)}</select>
          <button type="button" class="botao botao--leve botao--pequeno" data-acao="agora-campo" data-campo="${esc(campo.id)}">Agora</button>
        </div>
        ${campo.ajuda ? `<small>${esc(campo.ajuda)}</small>` : ''}
      </div>`;
  }
  if (campo.tipo === 'multiplas') {
    const marcados = Array.isArray(valor) ? valor : [];
    return `
      <div class="campo" data-campo="${esc(campo.id)}">
        <span>${esc(campo.rotulo)}</span>
        <div class="seg seg--multiplas">
          ${campo.opcoes.map((o) => `<label><input type="checkbox" name="${nome}" value="${esc(o.valor)}" ${marcados.includes(o.valor) ? 'checked' : ''}><span>${esc(o.rotulo)}</span></label>`).join('')}
        </div>
      </div>`;
  }
  if (campo.tipo === 'textolongo') {
    return `
      <div class="campo" data-campo="${esc(campo.id)}">
        <label class="campo-rotulo" for="${nome}">${esc(campo.rotulo)}</label>
        <textarea id="${nome}" name="${nome}" rows="4" placeholder="${esc(campo.placeholder || '')}">${esc(valor ?? '')}</textarea>
        ${campo.ajuda ? `<small>${esc(campo.ajuda)}</small>` : ''}
      </div>`;
  }
  if (campo.tipo === 'data') {
    // Dia do calendário (AAAA-MM-DD), ex. próxima dose da vacina. Vazio = sem data.
    const dia = /^\d{4}-\d{2}-\d{2}$/.test(String(valor || '')) ? valor : '';
    return `
      <div class="campo" data-campo="${esc(campo.id)}">
        <label class="campo-rotulo" for="${nome}">${esc(campo.rotulo)}</label>
        <div class="campo-data">
          <input id="${nome}" name="${nome}" type="date" value="${esc(dia)}">
          <button type="button" class="botao botao--leve botao--pequeno" data-acao="limpar-campo" data-campo="${esc(campo.id)}">Sem data</button>
        </div>
        ${campo.ajuda ? `<small>${esc(campo.ajuda)}</small>` : ''}
      </div>`;
  }
  if (campo.tipo === 'opcoes') {
    return `
      <div class="campo">
        <span>${esc(campo.rotulo)}</span>
        <div class="seg">
          ${campo.opcoes.map((o) => `<label><input type="radio" name="${nome}" value="${esc(o)}" ${valor === o ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('')}
        </div>
      </div>`;
  }
  const v = campo.tipo === 'numero' ? (numero(valor) === null ? '' : fmtNumero(numero(valor), campo.casas ?? 1)) : valor ?? '';
  const modo = campo.tipo === 'numero' ? `inputmode="${campo.casas === 0 ? 'numeric' : 'decimal'}" class="input-numero"` : '';
  return `
    <div class="campo" data-campo="${esc(campo.id)}">
      <label class="campo-rotulo" for="${nome}">${esc(campo.rotulo)}</label>
      ${campo.atalhos ? `<div class="atalhos" data-atalhos="${esc(campo.id)}"></div>` : ''}
      <input id="${nome}" name="${nome}" type="text" ${modo} autocomplete="off" value="${esc(v)}" placeholder="${esc(campo.placeholder || '')}">
    </div>`;
}

/** horario: o do registro; um campo 'hora' vira o primeiro HH:MM a partir dele. */
function lerCampos(form, tipo, horario) {
  const dados = {};
  for (const campo of tipo.campos || []) {
    if (campo.tipo === 'hora') {
      const h = form.elements[`c_${campo.id}_h`]?.value || '';
      const m = form.elements[`c_${campo.id}_m`]?.value || '00';
      dados[campo.id] = h && Number.isFinite(horario) ? isoSP(horaDepois(horario, `${h}:${m}`)) : '';
      continue;
    }
    if (campo.tipo === 'multiplas') {
      dados[campo.id] = [...form.querySelectorAll(`input[name="c_${campo.id}"]:checked`)].map((i) => i.value);
      continue;
    }
    const el = form.elements[`c_${campo.id}`];
    if (!el) continue;
    const bruto = el.value ?? '';
    dados[campo.id] = campo.tipo === 'numero' ? numero(bruto) : String(bruto).trim();
  }
  // Campo escondido (mostrarSe) não vale: ex. mL de leite quando Leite não está marcado.
  for (const campo of tipo.campos || []) {
    if (campo.mostrarSe && !campo.mostrarSe(dados)) dados[campo.id] = campo.tipo === 'numero' ? null : '';
  }
  return dados;
}

/**
 * Campos que dependem de outros (mostrarSe) e atalhos (valores prontos para tocar), refeitos a cada mudança.
 * Campo escondido continua com o valor, mas não é gravado (lerCampos zera abaixo).
 */
function mostrarCampos(form, tipo, dados) {
  for (const campo of tipo.campos || []) {
    const caixa = form.querySelector(`[data-campo="${campo.id}"]`);
    if (!caixa) continue;
    if (campo.mostrarSe) caixa.hidden = !campo.mostrarSe(dados);
    const lugar = caixa.querySelector(`[data-atalhos="${campo.id}"]`);
    if (lugar && campo.atalhos) {
      const atual = String(form.elements[`c_${campo.id}`]?.value ?? '').trim();
      const lista = campo.atalhos(ctx, dados) || [];
      const html = lista.map((a) => `<button type="button" class="chip chip--pequeno ${atual === a.valor ? 'chip--ativo' : ''}" data-acao="atalho" data-campo="${esc(campo.id)}" data-valor="${esc(a.valor)}">${esc(a.rotulo)}</button>`).join('');
      if (lugar.innerHTML !== html) lugar.innerHTML = html;
      lugar.hidden = !lista.length;
    }
  }
}

/** extra: { dados, titulo } para abrir já preenchido (ex. marcar o despertar de um sono). */
function abrirFolha(tipoId, eventoId = null, extra = {}) {
  ctx = contexto();
  const tipo = TIPOS[tipoId];
  if (!tipo) return;
  const evento = eventoId ? ctx.eventos.find((e) => e.id === eventoId) : null;
  const padroes = !evento && tipo.padroes ? tipo.padroes(ctx) : {};
  const dadosIniciais = { ...padroes, ...(evento?.dados || {}), ...(extra.dados || {}) };
  const inicial = evento ? evento.t : Date.now();
  const hoje = chaveDia(Date.now());
  // Agendável (ex. consulta): marca dia e hora à frente; os outros registram o que já aconteceu.
  const agendavel = !!tipo.agendavel;
  const dias = agendavel ? [hoje, somarDias(hoje, 1)] : [hoje, somarDias(hoje, -1)];
  const diaInicial = chaveDia(inicial);
  if (!dias.includes(diaInicial)) dias.push(diaInicial);
  const [horaInicial, minutoInicial] = fmtHora(inicial).split(':');
  const rotDia = (d) => (d === hoje ? 'Hoje' : d === somarDias(hoje, -1) ? 'Ontem' : d === somarDias(hoje, 1) ? 'Amanhã'
    : fmtData(Date.parse(`${d}T12:00:00-03:00`)));
  const titulo = extra.titulo || (!evento && tipo.tituloNovo) || `${evento ? 'Editar' : 'Registrar'} ${nomeNaFrase(tipo)}`;
  const lembrete = typeof tipo.lembrete === 'function' ? tipo.lembrete(ctx) : tipo.lembrete;

  folha.innerHTML = `
    <form class="folha-corpo" id="form-registro" ${estiloCor(tipo)} novalidate>
      <div class="folha-alca" aria-hidden="true"></div>
      <header class="folha-topo">
        <span class="icone">${tipo.icone}</span>
        <div class="folha-titulos">
          <h2>${esc(titulo)}</h2>
          <p class="folha-info" id="folha-info"></p>
        </div>
        <button type="button" class="fechar" data-acao="fechar" aria-label="Fechar">${ICONES.fechar}</button>
      </header>
      ${lembrete ? `<p class="lembrete">${esc(lembrete)}</p>` : ''}
      <div class="campo">
        <span>${agendavel ? 'Dia e hora' : 'Horário'}</span>
        <div class="quando">
          <div class="seg">
            ${dias.map((d) => `<label><input type="radio" name="dia" value="${d}" ${d === diaInicial ? 'checked' : ''}><span>${esc(rotDia(d))}</span></label>`).join('')}
            <label><input type="radio" name="dia" value="outro"><span>Outro dia</span></label>
          </div>
          ${agendavel ? '' : '<button type="button" class="botao botao--leve botao--pequeno" data-acao="agora">Agora</button>'}
        </div>
        <input type="date" name="dia_outro" class="dia-outro" ${agendavel ? '' : `max="${hoje}"`} value="${diaInicial}" aria-label="Dia" hidden>
        <div class="hora">
          <select name="h" aria-label="Hora">${opcoesNumero(24, horaInicial)}</select>
          <span aria-hidden="true">:</span>
          <select name="m" aria-label="Minuto">${opcoesNumero(60, minutoInicial)}</select>
        </div>
      </div>
      ${(tipo.campos || []).map((c) => campoHtml(c, dadosIniciais)).join('')}
      <div class="avisos" id="avisos" aria-live="polite"></div>
      <label class="confirmar" id="confirmar" hidden>
        <input type="checkbox" name="confirmo">
        <span>Li o aviso e quero registrar mesmo assim</span>
      </label>
      <button class="botao botao--cheio botao--grande" type="submit" id="salvar">${evento && !extra.titulo ? 'Salvar alteração' : 'Registrar'}</button>
      ${evento ? `
        <button type="button" class="botao botao--perigo" data-acao="apagar" data-id="${esc(evento.id)}">Apagar registro</button>
        <p class="folha-quem">${evento.quem ? `Registrado por ${esc(evento.quem)}` : ''}</p>` : ''}
    </form>`;

  const form = folha.querySelector('form');
  const horario = () => {
    let dia = form.elements.dia.value || hoje;
    if (dia === 'outro') dia = /^\d{4}-\d{2}-\d{2}$/.test(form.elements.dia_outro.value) ? form.elements.dia_outro.value : hoje;
    return deDataHoraSP(dia, `${form.elements.h.value}:${form.elements.m.value}`);
  };

  const atualizar = () => {
    form.elements.dia_outro.hidden = form.elements.dia.value !== 'outro';
    const h = horario();
    const dados = lerCampos(form, tipo, h);
    mostrarCampos(form, tipo, dados);
    const info = tipo.regras?.infoRegistro ? tipo.regras.infoRegistro(ctx, h, evento?.id || '') : '';
    form.querySelector('#folha-info').textContent = info || (evento ? quandoCurto(evento.t) : '');
    const avisos = [...(tipo.regras?.avisos ? tipo.regras.avisos(ctx, h, dados, evento?.id || '') : [])];
    if (!agendavel && h > Date.now() + 5 * 60 * 1000) avisos.unshift({ texto: 'Esse horário está no futuro. Confira o dia e a hora.', confirmar: true });
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
    } else if (b.dataset.acao === 'atalho') {
      const input = form.elements[`c_${b.dataset.campo}`];
      input.value = b.dataset.valor;
      atualizar();
    } else if (b.dataset.acao === 'limpar-campo') {
      form.elements[`c_${b.dataset.campo}`].value = '';
      atualizar();
    } else if (b.dataset.acao === 'agora-campo') {
      const nome = `c_${b.dataset.campo}`;
      [form.elements[`${nome}_h`].value, form.elements[`${nome}_m`].value] = fmtHora(Date.now()).split(':');
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
      const idApagado = store.apagarEvento(b.dataset.id);
      folha.close();
      oferecerDesfazer('Registro apagado', () => store.editarEvento(idApagado, {}));
    }
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (form.querySelector('#salvar').disabled) return;
    const h = horario();
    const dados = lerCampos(form, tipo, h);
    if (evento) {
      const novoId = store.editarEvento(evento.id, { horario: h, dados });
      folha.close();
      oferecerDesfazer(extra.titulo ? 'Registrado' : 'Alteração salva',
        () => store.editarEvento(novoId, { horario: evento.horario, dados: dadosParaVoltar(evento.dados, dados) }));
      return;
    }
    const novoId = store.adicionarEvento(tipo.id, h, dados);
    folha.close();
    const depois = tipo.regras?.aposRegistrar ? tipo.regras.aposRegistrar(ctx, h, dados) : '';
    oferecerDesfazer(depois ? `Registrado. ${depois}` : 'Registrado', () => store.apagarEvento(novoId), depois ? 10000 : DESFAZER_MS);
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

// O "toggle" do <details> não sobe pela árvore: escuta na captura.
app.addEventListener('toggle', (e) => {
  if (e.target.matches?.('[data-detalhes]') && !imprimindo) detalhesAbertos = e.target.open;
}, true);

app.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-acao]');
  if (!b) return;
  const acao = b.dataset.acao;
  if (acao === 'vista') {
    vista = b.dataset.vista;
    render();
    window.scrollTo({ top: 0 });
  } else if (acao === 'registrar') {
    const tipoId = b.dataset.tipo;
    // Tipos em que o botão depende do outro celular (ex. sono já iniciado lá): confere antes de abrir,
    // por no máximo alguns segundos (sem internet, abre com o que tem).
    if (TIPOS[tipoId]?.regras?.registrarComo && estado.sync.estado !== 'sem_config' && navigator.onLine !== false &&
        Date.now() - (estado.sync.ultima || 0) > CONFERIR_ANTES_MS) {
      await Promise.race([store.sincronizar(), new Promise((r) => setTimeout(r, ESPERA_CONFERIR_MS))]);
      if (folha.open) return; // tocaram em outra coisa enquanto conferia
    }
    const como = TIPOS[tipoId]?.regras?.registrarComo?.(contexto());
    if (como) abrirFolha(b.dataset.tipo, como.editarId, como);
    else abrirFolha(b.dataset.tipo);
  } else if (acao === 'ver-historico') {
    filtroHistorico = b.dataset.tipo;
    vista = 'historico';
    render();
    window.scrollTo({ top: 0 });
    document.querySelector('.chip--ativo')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  } else if (acao === 'editar') {
    const ev = ctx.eventos.find((x) => x.id === b.dataset.id);
    if (ev) abrirFolha(ev.tipo, ev.id);
  } else if (acao === 'periodo-relatorio') {
    diasRelatorio = Number(b.dataset.dias) || PERIODO_PADRAO;
    render();
  } else if (acao === 'imprimir-relatorio') {
    imprimirRelatorio();
  } else if (acao === 'compartilhar-relatorio') {
    compartilharRelatorio(b);
  } else if (acao === 'periodo-familia') {
    diasFamilia = Number(b.dataset.dias) || PERIODO_FAMILIA;
    render();
  } else if (acao === 'compartilhar-marcos') {
    compartilharMarcos(b);
  } else if (acao === 'compartilhar-retro') {
    compartilharRetrospectiva(b, b.dataset.mes);
  } else if (acao === 'compartilhar-familia') {
    compartilharFamilia(b);
  } else if (acao === 'filtro') {
    filtroHistorico = b.dataset.tipo;
    render();
    if (b.classList.contains('total')) {
      // Veio de um total do dia: sobe para o topo, com o filtro escolhido à vista.
      window.scrollTo({ top: 0 });
      document.querySelector('.chip--ativo')?.scrollIntoView({ inline: 'center', block: 'nearest' });
    }
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
  } else if (acao === 'copiar-link') {
    copiarLink();
  } else if (acao === 'encerrar-remedio') {
    if (b.dataset.armado !== '1') {
      b.dataset.armado = '1';
      b.textContent = 'Toque de novo para confirmar';
      return;
    }
    const lista = lerRemedios(estado.config);
    const r = lista.find((x) => x.id === b.dataset.id);
    if (!r) return;
    r.ativo = !r.ativo;
    salvarRemedios(lista);
    toast(r.ativo ? `${r.nome} voltou para a tela inicial` : `${r.nome} encerrado. As doses continuam no Histórico.`, 3500);
    render();
  } else if (acao === 'voltar-ajuste') {
    const ev = ctx.eventos.find((x) => x.id === b.dataset.id && x.tipo === 'ajuste');
    if (!ev) return;
    if (b.dataset.armado !== '1') {
      b.dataset.armado = '1';
      b.textContent = 'Confirmar';
      setTimeout(() => { if (b.isConnected) { b.dataset.armado = ''; b.textContent = 'Voltar'; } }, 4000);
      return;
    }
    voltarAjuste(ev);
  } else if (acao === 'mais-ajustes') {
    limiteAjustes += 20;
    render();
  } else if (acao === 'excluir-remedio') {
    // Só existe para remédio sem doses: nenhum registro da aba eventos fica sem dono.
    if (ctx.doTipo(`remedio_${b.dataset.id}`).length) return toast('Esse remédio já tem doses. Use Encerrar.');
    if (b.dataset.armado !== '1') {
      b.dataset.armado = '1';
      b.textContent = 'Toque de novo para excluir';
      return;
    }
    const lista = lerRemedios(estado.config);
    const r = lista.find((x) => x.id === b.dataset.id);
    if (!r) return;
    salvarRemedios(lista.filter((x) => x !== r));
    toast(`${r.nome} excluído`);
    render();
  } else if (acao === 'mover') {
    // Ajustes → Tela inicial: troca de lugar com o vizinho, sem redesenhar (só grava no Salvar).
    const li = b.closest('.ordem-item');
    const vizinho = b.dataset.dir === '-1' ? li.previousElementSibling : li.nextElementSibling;
    if (!vizinho) return;
    if (b.dataset.dir === '-1') vizinho.before(li);
    else vizinho.after(li);
    // Mantém o foco na mesma seta; se o item chegou na ponta (seta escondida), passa para a outra.
    const naPonta = b.dataset.dir === '-1' ? !li.previousElementSibling : !li.nextElementSibling;
    li.querySelector(`[data-dir="${naPonta ? -b.dataset.dir : b.dataset.dir}"]`)?.focus();
  } else if (acao === 'inicio-padrao') {
    salvarBotoesInicio('');
  } else if (acao === 'desativar-plano') {
    const form = b.closest('form');
    if (b.dataset.armado !== '1') {
      b.dataset.armado = '1';
      b.textContent = 'Toque de novo para encerrar';
      return;
    }
    salvarPlanoComAjuste(form.dataset.tipo, []);
    toast('Plano encerrado');
    render();
  }
});

// Lembra quais blocos de Ajustes estão abertos ("toggle" não borbulha: escuta na captura).
app.addEventListener('toggle', (e) => {
  const d = e.target;
  if (!(d instanceof HTMLDetailsElement) || !d.dataset.bloco) return;
  if (d.open) blocosAbertos.add(d.dataset.bloco);
  else blocosAbertos.delete(d.dataset.bloco);
}, true);

app.addEventListener('submit', (e) => {
  const form = e.target.closest('form[data-form]');
  if (!form) return;
  e.preventDefault();
  salvarFormAjustes(form);
});

iniciar();
