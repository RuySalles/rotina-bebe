// ÚNICO módulo que conversa com o backend (Google Apps Script).
//
// API pública estável — pode ganhar funções novas, mas estas não mudam de assinatura:
//   carregar(), adicionarEvento(tipo, horario, dados), editarEvento(id, mudancas),
//   apagarEvento(id), salvarPlano(tipo, horarios), salvarConfig(chave, valor), assinar(callback)
//
// Gravações vão primeiro para uma fila no localStorage e são reenviadas até o
// servidor confirmar. O servidor ignora ids repetidos, então reenviar é seguro.

import { SCHEMA_VERSION, isoSP } from './regras.js';

const LS = {
  chave: 'rb_chave',
  url: 'rb_url',
  apelido: 'rb_apelido',
  cache: 'rb_cache',
  fila: 'rb_fila'
};
const INTERVALO_SYNC_MS = 30 * 1000;
// De tempos em tempos baixa tudo de novo, para corrigir qualquer diferença (ex. mexeram direto na planilha).
const COMPLETA_A_CADA_MS = 10 * 60 * 1000;
const LOTE_MAX = 40;
// Versão do apps-script/Code.gs que este app espera (VERSAO_BACKEND lá). Ajustes avisa se a publicada for mais velha.
export const VERSAO_BACKEND_ESPERADA = 7;

/** Versão do Code.gs pela resposta: o número, ou deduzida (fase 4 publicada antes de ter número; 0 = anterior). */
const versaoDaResposta = (json) => (Number.isFinite(json.versao_backend) ? json.versao_backend : Number.isFinite(json.linha_eventos) ? 4 : 0);

const lsLer = (k, padrao = null) => {
  try {
    const v = localStorage.getItem(k);
    return v === null ? padrao : v;
  } catch { return padrao; }
};
const lsGravar = (k, v) => {
  try {
    if (v === null || v === undefined) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch { /* armazenamento indisponível */ }
};
const lsJson = (k, padrao) => {
  try { return JSON.parse(lsLer(k)) ?? padrao; } catch { return padrao; }
};

let urlBackend = '';
let servidor = lsJson(LS.cache, { eventos: [], planos: [], config: {} });
let fila = lsJson(LS.fila, []);
let sync = { estado: 'inicial', ultima: servidor.ultima || null, mensagem: '' };
let emAndamento = null;
let outraRodada = false;     // algo entrou na fila durante a sincronização
let pedirCompleta = false;   // pediram carga completa durante a sincronização
let servidorAntigo = false;  // Web App ainda não republicado na fase 4 (sem "lote")
const assinantes = new Set();

// ---------------------------------------------------------------------------
// Identidade deste celular (chave, endereço do backend, apelido)
// ---------------------------------------------------------------------------

/** Define o endereço do Web App (vem do config.js ou do link). */
export function configurarBackend(url) {
  if (url) urlBackend = url;
  if (!urlBackend) urlBackend = lsLer(LS.url, '');
  return urlBackend;
}
export const temBackend = () => !!urlBackend;
export const lerChave = () => lsLer(LS.chave, '');
export const salvarChave = (k) => lsGravar(LS.chave, k);
export const salvarUrlBackend = (u) => { lsGravar(LS.url, u); urlBackend = u; };
export const urlBackendDoLink = () => lsLer(LS.url, '');
export const lerApelido = () => lsLer(LS.apelido, '');
export const salvarApelido = (a) => lsGravar(LS.apelido, a);

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------

/** Linhas como estão na planilha, já com as gravações pendentes da fila. */
function linhasAtuais() {
  const idsEventos = new Set(servidor.eventos.map((e) => e.id));
  const idsPlanos = new Set(servidor.planos.map((p) => p.id));
  const config = { ...servidor.config };
  const eventos = [...servidor.eventos];
  const planos = [...servidor.planos];
  for (const item of fila) {
    if (item.acao === 'adicionar_evento' && !idsEventos.has(item.payload.id)) eventos.push(item.payload);
    if (item.acao === 'adicionar_plano' && !idsPlanos.has(item.payload.id)) planos.push(item.payload);
    if (item.acao === 'salvar_config') config[item.payload.chave] = item.payload.valor;
  }
  return { eventos, planos, config };
}

/** Estado completo para as telas. */
export function obterEstado() {
  return {
    ...linhasAtuais(),
    sync: { ...sync, pendentes: fila.length, backend: Number.isFinite(servidor.versao_backend) ? servidor.versao_backend : null,
      agenda: servidor.agenda || null }
  };
}

/** Recebe obterEstado() a cada mudança. Devolve a função para cancelar. */
export function assinar(callback) {
  assinantes.add(callback);
  return () => assinantes.delete(callback);
}

function avisar() {
  const estado = obterEstado();
  for (const cb of assinantes) {
    try { cb(estado); } catch (e) { console.error(e); }
  }
}

function definirSync(estado, mensagem = '') {
  sync = { ...sync, estado, mensagem };
  avisar();
}

// ---------------------------------------------------------------------------
// Rede
// ---------------------------------------------------------------------------

async function pedir(opcoes) {
  if (!urlBackend) throw Object.assign(new Error('sem_backend'), { definitivo: true });
  const resp = await fetch(opcoes.url, { ...opcoes, url: undefined, redirect: 'follow', cache: 'no-store' });
  if (!resp.ok) throw new Error(`http_${resp.status}`);
  const json = await resp.json();
  if (!json.ok) {
    const definitivo = ['chave_invalida', 'chave_nao_configurada'].includes(json.erro);
    throw Object.assign(new Error(json.erro || 'erro'), { doServidor: true, definitivo });
  }
  return json;
}

// Erros de um item que nunca vão passar (o item é descartado para não travar a fila).
// Qualquer outro erro (ex. a planilha demorou) mantém o item na fila para tentar de novo.
const ERROS_DO_ITEM = ['id_obrigatorio', 'acao_desconhecida', 'chave_config_obrigatoria'];

const postar = (corpo) => pedir({
  url: urlBackend,
  method: 'POST',
  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  body: JSON.stringify({ k: lerChave(), ...corpo })
});

function tirarDaFila(n) {
  fila.splice(0, n);
  lsGravar(LS.fila, JSON.stringify(fila));
  avisar();
}

/** Web App de antes da fase 4 (sem "lote"): envia um item por pedido, como antes. */
async function enviarUmPorUm() {
  while (fila.length) {
    const item = fila[0];
    try {
      await postar({ acao: item.acao, payload: item.payload });
    } catch (e) {
      // Erro de validação de um item (não da chave): descarta para não travar a fila.
      if (e.doServidor && !e.definitivo) console.warn('Registro recusado pelo servidor:', e.message, item);
      else throw e;
    }
    tirarDaFila(1);
  }
}

/**
 * Envia a fila em lotes. O último lote já pede a leitura junto (um pedido só).
 * Devolve true se a resposta trouxe a leitura (aí não precisa baixar de novo).
 */
async function enviarLotes(completo) {
  let leu = false;
  while (fila.length) {
    const itens = fila.slice(0, LOTE_MAX);
    const corpo = { acao: 'lote', payload: { itens } };
    if (fila.length <= LOTE_MAX) corpo.desde = podeIncremental(completo) ? servidor.linha_eventos : '';
    let json;
    try {
      json = await postar(corpo);
    } catch (e) {
      if (e.doServidor && e.message === 'acao_desconhecida') { servidorAntigo = true; return false; }
      throw e;
    }
    const resultados = Array.isArray(json.resultados) ? json.resultados : [];
    // Para no primeiro item que falhou por um motivo passageiro: ele e os seguintes ficam na fila
    // (reenviar é seguro: o servidor ignora ids repetidos).
    let enviados = itens.length;
    for (let i = 0; i < itens.length; i++) {
      const r = resultados[i];
      if (r?.ok) continue;
      if (r && ERROS_DO_ITEM.includes(r.erro)) { console.warn('Registro recusado pelo servidor:', r.erro, itens[i]); continue; }
      enviados = i;
      break;
    }
    tirarDaFila(enviados);
    if (enviados < itens.length) throw new Error('item_nao_gravado');
    if (json.leitura) leu = aplicarLeitura(json.leitura);
  }
  return leu;
}

/** Dá para pedir só o que mudou? (senão, carga completa: de tempos em tempos ou se algo não bater) */
function podeIncremental(completo) {
  return !completo && Number.isFinite(servidor.linha_eventos) && servidor.linha_eventos >= 1 &&
    Date.now() - (servidor.completa || 0) < COMPLETA_A_CADA_MS;
}

/** Junta a resposta do servidor ao que está guardado. Devolve false se precisar de carga completa. */
function aplicarLeitura(json) {
  const agora = Date.now();
  if (json.parcial) {
    // A aba encolheu (mexeram direto na planilha): não dá para confiar no incremental.
    if (!(json.linha_eventos >= servidor.linha_eventos)) return false;
    const ids = new Set(servidor.eventos.map((e) => e.id));
    const novos = (json.eventos || []).filter((e) => e.id && !ids.has(e.id));
    servidor = {
      ...servidor,
      eventos: novos.length ? [...servidor.eventos, ...novos] : servidor.eventos,
      planos: json.planos || [],
      config: json.config || {},
      linha_eventos: json.linha_eventos,
      versao_backend: versaoDaResposta(json),
      agenda: json.agenda || null,
      ultima: agora
    };
  } else {
    servidor = {
      eventos: json.eventos || [],
      planos: json.planos || [],
      config: json.config || {},
      // Web App antigo não manda linha_eventos: aí toda leitura continua completa, como antes.
      linha_eventos: Number.isFinite(json.linha_eventos) ? json.linha_eventos : null,
      versao_backend: versaoDaResposta(json),
      agenda: json.agenda || null, // lembretes no Google Agenda (fase 10)
      completa: agora,
      ultima: agora
    };
  }
  lsGravar(LS.cache, JSON.stringify(servidor));
  return true;
}

async function baixar(completo) {
  const sep = urlBackend.includes('?') ? '&' : '?';
  const inc = podeIncremental(completo);
  const desde = inc ? `&desde=${servidor.linha_eventos}` : '';
  const json = await pedir({ url: `${urlBackend}${sep}k=${encodeURIComponent(lerChave())}${desde}`, method: 'GET' });
  if (!aplicarLeitura(json) && inc) await baixar(true);
}

/**
 * Envia a fila e atualiza os dados (só o que mudou ou, de tempos em tempos, tudo).
 * opcoes.completo: força baixar tudo. Chamadas simultâneas compartilham a mesma promessa;
 * um registro feito durante a sincronização dispara outra logo em seguida.
 */
export function sincronizar(opcoes = {}) {
  if (emAndamento) {
    if (opcoes.completo) pedirCompleta = true;
    return emAndamento;
  }
  const completo = !!opcoes.completo || pedirCompleta;
  pedirCompleta = false;
  outraRodada = false;
  emAndamento = (async () => {
    if (!urlBackend || !lerChave()) {
      definirSync('sem_config');
      return obterEstado();
    }
    definirSync('sincronizando');
    let deuCerto = false;
    try {
      let leu = false;
      if (!servidorAntigo) leu = await enviarLotes(completo);
      if (servidorAntigo) await enviarUmPorUm();
      if (!leu) await baixar(completo);
      sync.ultima = servidor.ultima;
      deuCerto = true;
      definirSync(fila.length ? 'pendente' : 'ok');
    } catch (e) {
      const mensagem = e.message === 'chave_invalida' ? 'Link inválido' : navigator.onLine === false ? 'Sem internet' : 'Não foi possível sincronizar';
      definirSync(fila.length && !e.definitivo ? 'pendente' : 'erro', mensagem);
    } finally {
      emAndamento = null;
    }
    if (deuCerto && (outraRodada || pedirCompleta) && (fila.length || pedirCompleta)) return sincronizar();
    return obterEstado();
  })();
  return emAndamento;
}

let sincronizacaoLigada = false;
/** Sincroniza a cada 30s, ao voltar para a aba e ao recuperar a internet. */
export function iniciarSincronizacaoAutomatica() {
  if (sincronizacaoLigada) return;
  sincronizacaoLigada = true;
  setInterval(() => { if (document.visibilityState === 'visible') sincronizar(); }, INTERVALO_SYNC_MS);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sincronizar(); });
  window.addEventListener('online', () => sincronizar());
}

function enfileirar(acao, payload) {
  fila.push({ acao, payload });
  lsGravar(LS.fila, JSON.stringify(fila));
  avisar();
  if (emAndamento) outraRodada = true;
  sincronizar();
}

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const paraIso = (horario) => (typeof horario === 'number' || horario instanceof Date ? isoSP(+horario) : String(horario));

function lerDados(linha) {
  if (typeof linha.dados !== 'string') return { ...(linha.dados || {}) };
  try { return JSON.parse(linha.dados || '{}') || {}; } catch { return { observacao: linha.dados }; }
}

function novaLinha({ tipo, horario, dados, apagado = false, substitui_id = '' }) {
  return {
    id: uuid(),
    tipo,
    horario: paraIso(horario),
    dados: JSON.stringify(dados || {}),
    quem: lerApelido(),
    criado_em: isoSP(Date.now()),
    apagado: apagado ? 'true' : 'false',
    substitui_id,
    schema_version: String(SCHEMA_VERSION)
  };
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/** Mostra o que está guardado no celular e sincroniza com a planilha. */
export async function carregar() {
  configurarBackend();
  avisar();
  return sincronizar({ completo: true });
}

/** horario: ISO com fuso, Date ou milissegundos. Devolve o id do registro. */
export function adicionarEvento(tipo, horario, dados = {}) {
  const linha = novaLinha({ tipo, horario, dados });
  enfileirar('adicionar_evento', linha);
  return linha.id;
}

/** mudancas: { horario?, dados? } — dados são mesclados aos atuais. Devolve o id da nova versão. */
export function editarEvento(id, mudancas = {}) {
  const atual = linhasAtuais().eventos.find((e) => e.id === id);
  if (!atual) throw new Error('evento_nao_encontrado');
  const linha = novaLinha({
    tipo: atual.tipo,
    horario: mudancas.horario ?? atual.horario,
    dados: { ...lerDados(atual), ...(mudancas.dados || {}) },
    substitui_id: id
  });
  enfileirar('adicionar_evento', linha);
  return linha.id;
}

export function apagarEvento(id) {
  const atual = linhasAtuais().eventos.find((e) => e.id === id);
  if (!atual) throw new Error('evento_nao_encontrado');
  const linha = novaLinha({ tipo: atual.tipo, horario: atual.horario, dados: lerDados(atual), apagado: true, substitui_id: id });
  enfileirar('adicionar_evento', linha);
  return linha.id;
}

/** horarios: lista de ISO/milissegundos. Lista vazia desativa o plano do tipo. */
export function salvarPlano(tipo, horarios) {
  const lista = (horarios || []).map(paraIso);
  const linha = {
    id: uuid(),
    tipo,
    horarios: JSON.stringify(lista),
    ativo: lista.length ? 'true' : 'false',
    criado_em: isoSP(Date.now())
  };
  enfileirar('adicionar_plano', linha);
  return linha.id;
}

export function salvarConfig(chave, valor) {
  enfileirar('salvar_config', { chave, valor: valor === null || valor === undefined ? '' : String(valor) });
}
