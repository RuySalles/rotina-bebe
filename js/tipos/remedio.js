// Remédios cadastrados em Ajustes (sem programar). Cada um vira um tipo "remedio_<id>".
// A definição fica na aba config, chave "remedios" (JSON); as doses vão para a aba eventos como qualquer tipo
// e o plano de horários fixos para a aba planos (tipo "remedio_<id>").
//
// Definição: { id, nome, dose, modo: 'fixo' | 'intervalo' | 'diario' | 'se_precisar', cadaH?, horaRef?, minimoH?, maxDia?,
//   lembrete?, ativo, cor }
// horaRef (só no diário, "HH:MM"): passando dessa hora sem dose no dia, entra no card PRÓXIMO.

import {
  statusPlano, casarPlano, liberacao, contarEmJanela, numero, fmtHora, fmtData, fmtDuracao, chaveDia, deDataHoraSP, tratamentoAcabou
} from '../regras.js';

export const PREFIXO = 'remedio_';
export const MODOS = { fixo: 'Horários fixos', intervalo: 'A cada X horas', diario: '1 vez por dia', se_precisar: 'Só se precisar' };
export const HORA_REF_PADRAO = '10:00';
export const horaValida = (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v || ''));

const CORES = ['#2E8B6E', '#C06A2B', '#6E5BB8', '#2F7FB4', '#A8507E', '#6F8A2A', '#B8862E', '#4D6B8A'];
const ICONE = '<svg viewBox="0 0 24 24"><rect x="7" y="3" width="10" height="4" rx="1"/><path d="M8 7h8v12.5a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 19.5z"/><path d="M12 11v5M9.5 13.5h5"/></svg>';
const TOLERANCIA_MIN = 30;
const MIN = 60 * 1000;
const HORA = 60 * MIN;

export const corPara = (n) => CORES[n % CORES.length];

const positivo = (v) => {
  const n = numero(v);
  return n !== null && n > 0 ? n : null;
};

/** config.remedios (JSON) → definições válidas. Texto inválido vira lista vazia. */
export function lerRemedios(config = {}) {
  let lista;
  try { lista = JSON.parse(config.remedios || '[]'); } catch { return []; }
  if (!Array.isArray(lista)) return [];
  return lista
    .filter((r) => r && /^[a-z0-9]+$/.test(String(r.id)) && String(r.nome || '').trim())
    .map((r, i) => ({
      id: String(r.id),
      nome: String(r.nome).trim().slice(0, 40),
      dose: String(r.dose || '').trim().slice(0, 40),
      modo: MODOS[r.modo] ? r.modo : 'se_precisar',
      cadaH: positivo(r.cadaH),
      minimoH: positivo(r.minimoH),
      maxDia: positivo(r.maxDia),
      horaRef: horaValida(r.horaRef) ? r.horaRef : HORA_REF_PADRAO,
      lembrete: String(r.lembrete || '').trim().slice(0, 200),
      ativo: r.ativo !== false,
      cor: /^#[0-9a-f]{6}$/i.test(String(r.cor)) ? r.cor : corPara(i)
    }));
}

const quando = (t, agora) => (chaveDia(t) === chaveDia(agora) ? fmtHora(t) : `${fmtData(t)} às ${fmtHora(t)}`);
const horas = (h) => fmtDuracao(h * 60);

/** Tipo de evento para um remédio cadastrado. */
export function criarTipoRemedio(r) {
  const id = PREFIXO + r.id;

  const situacaoPlano = (ctx) => {
    const plano = ctx.plano(id);
    if (!plano || !plano.horarios.length) return null;
    return statusPlano(plano.horarios, ctx.doTipo(id), ctx.agora, TOLERANCIA_MIN);
  };
  const dosesEm24h = (ctx, ate, ignorarId = '') =>
    contarEmJanela(ctx.doTipo(id).filter((e) => !ignorarId || (e.id !== ignorarId && e.raiz !== ignorarId)), ate, 24);
  /** Linha "x de N doses em 24h" quando há máximo. */
  const linhaMaximo = (ctx) => {
    if (!r.maxDia) return null;
    const n = dosesEm24h(ctx, ctx.agora);
    return n >= r.maxDia ? { texto: `Limite atingido: ${n} de ${r.maxDia} em 24h`, alerta: true } : { texto: `${n} de ${r.maxDia} doses em 24h` };
  };
  const proximaIntervalo = (ctx) => {
    const ultima = ctx.ultimo(id, ctx.agora);
    if (!ultima || !r.cadaH) return null;
    const t = ultima.t + r.cadaH * HORA;
    return { ultima, t, atrasoMin: (ctx.agora - t) / MIN };
  };

  /** Dose registrada hoje (até agora), no diário. */
  const doseDeHoje = (ctx) => {
    const hoje = chaveDia(ctx.agora);
    return ctx.doTipo(id).filter((e) => e.t <= ctx.agora && chaveDia(e.t) === hoje).at(-1) || null;
  };
  const referenciaHoje = (ctx) => deDataHoraSP(chaveDia(ctx.agora), r.horaRef);

  const lembretes = [];
  if (r.modo === 'se_precisar') lembretes.push('Só quando precisar, como na receita.');
  if (r.lembrete) lembretes.push(r.lembrete);

  return {
    id,
    rotulo: r.nome,
    cor: r.cor,
    icone: ICONE,
    remedio: r,
    lembrete: lembretes.join(' '),
    campos: [
      { id: 'dose', rotulo: 'Dose', tipo: 'texto', placeholder: 'Opcional, como na receita' },
      { id: 'observacao', rotulo: 'Observação', tipo: 'texto', placeholder: 'Opcional' }
    ],

    resumo(dados) {
      return { texto: [dados.dose, dados.observacao].filter(Boolean).join(' · ') || 'Dose dada' };
    },

    /** Horários fixos com o plano todo já passado há mais de 12h: sai da tela inicial (o Histórico continua). */
    naInicio(ctx) {
      if (!r.ativo) return false;
      if (r.modo !== 'fixo') return true;
      const plano = ctx.plano(id);
      return !plano || !tratamentoAcabou(plano.horarios, situacaoPlano(ctx), ctx.agora);
    },

    padroes() {
      return r.dose ? { dose: r.dose } : {};
    },

    resumoDia(ctx, dia) {
      const lista = ctx.doDia(id, dia);
      const previstas = r.modo === 'fixo' ? (ctx.plano(id)?.horarios || []).filter((t) => chaveDia(t) === dia).length : 0;
      if (!lista.length && !previstas) return null;
      return {
        valor: lista.length === 1 ? '1 dose' : `${lista.length} doses`,
        detalhe: previstas ? `de ${previstas} no plano` : lista.map((e) => fmtHora(e.t)).join(', ')
      };
    },

    regras: {
      prioridade: r.modo === 'fixo' ? 90 : r.modo === 'intervalo' ? 60 : r.modo === 'diario' ? 50 : 40,
      usaPlano: r.modo === 'fixo' && r.ativo,

      status(ctx) {
        if (!r.ativo) return { linhas: ['Encerrado'] };
        const max = linhaMaximo(ctx);
        const extra = max ? [max.texto] : [];

        if (r.modo === 'fixo') {
          const s = situacaoPlano(ctx);
          if (!s) return { linhas: ['Sem plano de horários', 'Defina em Ajustes'] };
          const contador = `${s.feitas} de ${s.total} doses`;
          if (s.concluido) return { linhas: [contador, 'Tratamento concluído'], ok: true };
          if (s.atrasada) return { linhas: [contador, `Atrasada há ${fmtDuracao(s.minutosAtraso)}`], alerta: true };
          return { linhas: [contador, `Próxima ${quando(s.proxima.t, ctx.agora)}`, ...extra], alerta: !!max?.alerta };
        }

        if (r.modo === 'intervalo') {
          const p = proximaIntervalo(ctx);
          if (!p) return { linhas: ['Nenhuma dose', r.cadaH ? `A cada ${horas(r.cadaH)}` : 'Defina o intervalo em Ajustes'] };
          const linhas = [`Última ${quando(p.ultima.t, ctx.agora)}`];
          if (p.atrasoMin > TOLERANCIA_MIN) return { linhas: [...linhas, `Atrasada há ${fmtDuracao(p.atrasoMin)}`, ...extra], alerta: true };
          return { linhas: [...linhas, `Próxima ${quando(p.t, ctx.agora)}`, ...extra], alerta: !!max?.alerta };
        }

        if (r.modo === 'diario') {
          const hoje = doseDeHoje(ctx);
          if (hoje) return { linhas: [`Hoje: dada às ${fmtHora(hoje.t)}`, ...extra], ok: true, alerta: !!max?.alerta };
          const passou = ctx.agora >= referenciaHoje(ctx);
          return { linhas: ['Hoje: ainda não', passou ? `Costuma ser até ${r.horaRef}` : `Até ${r.horaRef}`, ...extra], aviso: passou };
        }

        // Só se precisar: nunca é sugerido, só mostra quando está liberado.
        const { liberadoEm, liberado } = liberacao(ctx.ultimo(id, ctx.agora), r.minimoH || 0, ctx.agora);
        const linhas = [liberado ? 'Liberado (se precisar)' : `Liberado a partir de ${fmtHora(liberadoEm)}`];
        return { linhas: [...linhas, ...extra], alerta: !!max?.alerta };
      },

      proximos(ctx) {
        if (!r.ativo) return [];
        if (r.modo === 'fixo') {
          const s = situacaoPlano(ctx);
          if (!s) return [];
          return s.doses
            .filter((d) => !d.evento && d.fim > ctx.agora)
            .map((d) => ({ t: d.t, titulo: r.nome, detalhe: `Dose ${d.numero} de ${s.total}`, alerta: d === s.proxima && s.atrasada }));
        }
        if (r.modo === 'intervalo') {
          const p = proximaIntervalo(ctx);
          if (!p) return [];
          return [{ t: p.t, titulo: r.nome, detalhe: `A cada ${horas(r.cadaH)} (última ${fmtHora(p.ultima.t)})`, alerta: p.atrasoMin > TOLERANCIA_MIN }];
        }
        if (r.modo === 'diario') {
          // Só entra na agenda (e no card PRÓXIMO) depois da hora de referência, se ainda não foi dada hoje.
          const t = referenciaHoje(ctx);
          if (doseDeHoje(ctx) || ctx.agora < t) return [];
          return [{ t, titulo: r.nome, detalhe: `1 vez por dia · ainda não foi dada hoje` }];
        }
        const { liberadoEm, liberado } = liberacao(ctx.ultimo(id, ctx.agora), r.minimoH || 0, ctx.agora);
        if (liberado) return [];
        return [{ t: liberadoEm, titulo: `${r.nome} liberado`, detalhe: 'Só se precisar', informativo: true }];
      },

      infoRegistro(ctx, horario, editandoId) {
        if (r.modo !== 'fixo') return '';
        const plano = ctx.plano(id);
        if (!plano || !plano.horarios.length) return '';
        const eventos = ctx.doTipo(id).filter((e) => e.id !== editandoId);
        const doses = casarPlano(plano.horarios, [...eventos, { id: '__novo__', t: horario }]);
        const dose = doses.find((d) => d.evento && d.evento.id === '__novo__');
        if (!dose) return 'Fora dos horários do plano';
        return `Dose ${dose.numero} de ${plano.horarios.length} · prevista ${quando(dose.t, ctx.agora)}`;
      },

      avisos(ctx, horario, dados, editandoId) {
        const avisos = [];
        if (r.minimoH) {
          const anterior = ctx.ultimo(id, horario, editandoId);
          const { liberadoEm, liberado } = liberacao(anterior, r.minimoH, horario);
          if (!liberado) {
            avisos.push({ texto: `Ainda não passaram ${horas(r.minimoH)} da última dose (${fmtHora(anterior.t)}). Liberado a partir de ${fmtHora(liberadoEm)}.`, confirmar: true });
          }
        }
        if (r.maxDia) {
          const n = dosesEm24h(ctx, horario, editandoId);
          if (n >= r.maxDia) avisos.push({ texto: `Limite atingido: já foram ${n} de ${r.maxDia} doses nas últimas 24h.`, confirmar: true });
        }
        if (r.modo === 'diario') {
          const dia = chaveDia(horario);
          const ja = ctx.doTipo(id).find((e) => e.id !== editandoId && e.raiz !== editandoId && chaveDia(e.t) === dia);
          if (ja) avisos.push({ texto: `${r.nome} já foi dada nesse dia, às ${fmtHora(ja.t)}${ja.quem ? ` por ${ja.quem}` : ''}.`, confirmar: true });
        }
        if (r.modo === 'fixo') {
          const plano = ctx.plano(id);
          if (plano && plano.horarios.length) {
            const doses = casarPlano(plano.horarios, ctx.doTipo(id).filter((e) => e.id !== editandoId));
            const alvo = doses.find((d) => horario >= d.inicio && horario < d.fim);
            if (alvo && alvo.evento) {
              avisos.push({ texto: `A dose ${alvo.numero} já foi registrada às ${fmtHora(alvo.evento.t)}. Confira antes de registrar de novo.`, confirmar: true });
            }
          }
        }
        return avisos;
      }
    }
  };
}
