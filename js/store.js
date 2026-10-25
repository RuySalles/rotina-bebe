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
    sync: { ...sync, pendentes: fila.length }
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

async function enviarFila() {
  while (fila.length) {
    const item = fila[0];
    try {
      await pedir({
        url: urlBackend,
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ k: lerChave(), acao: item.acao, payload: item.payload })
      });
    } catch (e) {
      // Erro de validação de um item (não da chave): descarta para não travar a fila.
      if (e.doServidor && !e.definitivo) console.warn('Registro recusado pelo servidor:', e.message, item);
      else throw e;
    }
    fila.shift();
    lsGravar(LS.fila, JSON.stringify(fila));
    avisar();
  }
}

async function baixar() {
  const sep = urlBackend.includes('?') ? '&' : '?';
  const json = await pedir({ url: `${urlBackend}${sep}k=${encodeURIComponent(lerChave())}`, method: 'GET' });
  servidor = {
    eventos: json.eventos || [],
    planos: json.planos || [],
    config: json.config || {},
    ultima: Date.now()
  };
  lsGravar(LS.cache, JSON.stringify(servidor));
}

/** Envia a fila e baixa tudo de novo. Chamadas simultâneas compartilham a mesma promessa. */
export function sincronizar() {
  if (emAndamento) return emAndamento;
  emAndamento = (async () => {
    if (!urlBackend || !lerChave()) {
      definirSync('sem_config');
      return obterEstado();
    }
    definirSync('sincronizando');
    try {
      await enviarFila();
      await baixar();
      sync.ultima = servidor.ultima;
      definirSync(fila.length ? 'pendente' : 'ok');
    } catch (e) {
      const mensagem = e.message === 'chave_invalida' ? 'Link inválido' : navigator.onLine === false ? 'Sem internet' : 'Não foi possível sincronizar';
      definirSync(fila.length && !e.definitivo ? 'pendente' : 'erro', mensagem);
    } finally {
      emAndamento = null;
    }
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
  return sincronizar();
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
