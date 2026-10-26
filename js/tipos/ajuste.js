// Histórico de ajustes: cada mudança feita em Ajustes vira uma linha na aba eventos (tipo interno "ajuste").
// A aba config é sobrescrita pelo backend; é este registro que guarda o antes e o depois, quem e quando.
//
// dados = { chave, antes, depois } com os valores crus (para poder voltar):
//   "config:<chave>"  → texto da aba config
//   "remedio:<id>"    → JSON da definição do remédio ('' = não existia / excluído)
//   "plano:<tipo>"    → JSON da lista de horários ISO ('' = sem plano)
// Não tem botão, não entra no Histórico de registros nem no Resumo (interno: true).

import { numero, fmtNumero, fmtHora, fmtData, ms } from '../regras.js';
import { MODOS } from './remedio.js';

const CONFIG = {
  nome_bebe: { rotulo: 'Nome do bebê' },
  febre_limite_c: { rotulo: 'Limite de febre', fmt: (v) => `${fmtNumero(numero(v))} °C` },
  tylenol_apresentacao: { rotulo: 'Tylenol: remédio em uso', fmt: (v) => (v === 'gotas' ? 'Paracetamol gotas' : 'Tylenol Bebê') },
  tylenol_max_24h: { rotulo: 'Tylenol: máximo em 24 horas', fmt: (v) => `${v} doses` },
  tylenol_dose_ml: { rotulo: 'Tylenol Bebê: dose', fmt: (v) => `${fmtNumero(numero(v), 2).replace(/,?0+$/, '')} mL` },
  tylenol_dose_gotas: { rotulo: 'Paracetamol em gotas: dose', fmt: (v) => `${v} gotas` },
  amoxicilina_dose_ml: { rotulo: 'Amoxicilina: dose', fmt: (v) => `${fmtNumero(numero(v), 2).replace(/,?0+$/, '')} mL` },
  amoxicilina_frasco_preparado: { rotulo: 'Amoxicilina: frasco preparado em', fmt: (v) => v.split('-').reverse().join('/') }
};

const VAZIO = '(vazio)';

function jsonOu(texto, padrao) {
  if (!texto) return padrao;
  try { return JSON.parse(texto); } catch { return padrao; }
}

/** Resumo de uma definição de remédio, para comparar antes e depois. */
function textoRemedio(r) {
  if (!r) return '';
  const partes = [r.modo === 'intervalo' && r.cadaH ? `a cada ${fmtNumero(numero(r.cadaH), 1).replace(',0', '')}h` : (MODOS[r.modo] || '').toLowerCase()];
  if (r.dose) partes.push(r.dose);
  if (r.minimoH) partes.push(`mín. ${fmtNumero(numero(r.minimoH), 1).replace(',0', '')}h entre doses`);
  if (r.maxDia) partes.push(`máx. ${r.maxDia} em 24h`);
  if (r.lembrete) partes.push(`lembrete "${r.lembrete}"`);
  if (r.ativo === false) partes.push('encerrado');
  return partes.filter(Boolean).join(' · ');
}

/** Lista de horários → "14 horários, de 25/10 01:30 a 31/10 09:00". */
function textoPlano(lista) {
  const horarios = (Array.isArray(lista) ? lista : []).map(ms).filter(Number.isFinite).sort((a, b) => a - b);
  if (!horarios.length) return 'sem plano';
  const q = (t) => `${fmtData(t)} ${fmtHora(t)}`;
  if (horarios.length === 1) return `1 horário: ${q(horarios[0])}`;
  return `${horarios.length} horários, de ${q(horarios[0])} a ${q(horarios.at(-1))}`;
}

/**
 * Texto legível de um ajuste: { rotulo, antes, depois, acao? }.
 * nomes: { tipoId: rótulo } para dar nome aos planos (ex. remédios cadastrados).
 */
export function descreverAjuste(dados = {}, nomes = {}) {
  const chave = String(dados.chave || '');
  const [grupo, ...resto] = chave.split(':');
  const alvo = resto.join(':');
  const antes = dados.antes ?? '';
  const depois = dados.depois ?? '';

  if (grupo === 'config') {
    const def = CONFIG[alvo] || { rotulo: alvo };
    const fmt = (v) => (v === '' || v === null || v === undefined ? VAZIO : def.fmt ? def.fmt(String(v)) : String(v));
    return { rotulo: def.rotulo, antes: fmt(antes), depois: fmt(depois) };
  }

  if (grupo === 'remedio') {
    const a = jsonOu(antes, null);
    const d = jsonOu(depois, null);
    const nome = d?.nome || a?.nome || 'Remédio';
    let acao = 'alterado';
    if (!a) acao = 'adicionado';
    else if (!d) acao = 'excluído';
    else if (a.ativo !== false && d.ativo === false) acao = 'encerrado';
    else if (a.ativo === false && d.ativo !== false) acao = 'reativado';
    return {
      rotulo: `Remédio ${nome} (${acao})`,
      acao,
      antes: a ? textoRemedio(a) : '(não existia)',
      depois: d ? textoRemedio(d) : '(excluído)'
    };
  }

  if (grupo === 'plano') {
    const nome = nomes[alvo] || alvo;
    return { rotulo: `Plano de horários: ${nome}`, antes: textoPlano(jsonOu(antes, [])), depois: textoPlano(jsonOu(depois, [])) };
  }

  return { rotulo: chave || 'Ajuste', antes: String(antes) || VAZIO, depois: String(depois) || VAZIO };
}

export default {
  id: 'ajuste',
  rotulo: 'Ajuste',
  interno: true,
  cor: '#7A7068',
  icone: '<svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
  campos: [],

  resumo(dados) {
    const d = descreverAjuste(dados);
    return { texto: `${d.rotulo}: ${d.antes} → ${d.depois}` };
  }
};
