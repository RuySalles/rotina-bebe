// Casos de teste das regras. Rodam no navegador (regras.test.html) e no Node (node tests/rodar.mjs).
import {
  resolverEventos, resolverPlanos, criarContexto, montarAgenda, escolherProximo,
  statusPlano, isoSP, deDataHoraSP, fmtHora, contarEmJanela, horaDepois
} from '../js/regras.js';
import { TIPOS } from '../js/tipos/index.js';

export function igual(obtido, esperado, msg = '') {
  const a = JSON.stringify(obtido), b = JSON.stringify(esperado);
  if (a !== b) throw new Error(`${msg}\n  esperado: ${b}\n  obtido:   ${a}`);
}
export function verdade(v, msg) { if (!v) throw new Error(msg || 'esperava verdadeiro'); }

/** grupo(nome) abre uma seção; teste(nome, fn) roda um caso. */
export function casos({ grupo, teste }) {
  // ---- dados de teste (fictícios) ----
  const T = (dia, hora) => `2026-10-${dia}T${hora}:00-03:00`;
  const t = (dia, hora) => Date.parse(T(dia, hora));
  let seq = 0;
  const linha = (tipo, horario, dados = {}, extra = {}) => ({
    id: extra.id || `ev-${++seq}`,
    tipo,
    horario,
    dados: JSON.stringify(dados),
    quem: 'Teste',
    criado_em: extra.criado_em || T('25', '00:00'),
    apagado: extra.apagado ? 'true' : 'false',
    substitui_id: extra.substitui_id || '',
    schema_version: extra.schema_version ?? '1'
  });
  const PLANO_AMOX = [
    T('25', '01:30'), T('25', '12:30'), T('25', '23:30'), T('26', '10:30'), T('26', '21:30'),
    T('27', '09:00'), T('27', '21:00'), T('28', '09:00'), T('28', '21:00'), T('29', '09:00'),
    T('29', '21:00'), T('30', '09:00'), T('30', '21:00'), T('31', '09:00')
  ];
  const planoLinha = (horarios, extra = {}) => ({
    id: extra.id || `pl-${++seq}`, tipo: extra.tipo || 'amoxicilina', horarios: JSON.stringify(horarios),
    ativo: extra.ativo === false ? 'false' : 'true', criado_em: extra.criado_em || T('24', '20:00')
  });

  function montar(linhas, agora, config = {}, planos = [planoLinha(PLANO_AMOX)]) {
    return criarContexto({
      eventos: resolverEventos(linhas, TIPOS),
      planos: resolverPlanos(planos),
      config,
      agora,
      tipos: TIPOS
    });
  }

  const base = () => [
    linha('amoxicilina', T('25', '01:30')),
    linha('tylenol', T('25', '03:00')),
    linha('tylenol', T('25', '11:45')),
    linha('febre', T('25', '11:40'), { temperatura: null }),
    linha('alimentacao', T('25', '09:00')),
    linha('alimentacao', T('25', '12:25'))
  ];
  const tyl = TIPOS.tylenol.regras;
  const amox = TIPOS.amoxicilina.regras;
  const alim = TIPOS.alimentacao.regras;

  // ---------------------------------------------------------------------
  grupo('Tempo');
  teste('isoSP gera ISO com fuso -03:00', () => {
    igual(isoSP(t('25', '12:30')), '2026-10-25T12:30:00-03:00');
  });
  teste('deDataHoraSP lê dia + hora no fuso de São Paulo', () => {
    igual(deDataHoraSP('2026-10-25', '01:30'), t('25', '01:30'));
    igual(fmtHora(t('25', '23:05')), '23:05');
  });

  // ---------------------------------------------------------------------
  grupo('Tylenol — próximo liberado');
  teste('6h após a última dose: "Liberado a partir de 17:45"', () => {
    const ctx = montar(base(), t('25', '13:00'));
    igual(tyl.status(ctx).linhas[0], 'Liberado a partir de 17:45 (se tiver febre)');
  });
  teste('Depois de 6h: "Liberado agora"', () => {
    const ctx = montar(base(), t('25', '17:45'));
    igual(tyl.status(ctx).linhas[0], 'Liberado agora (se tiver febre)');
  });
  teste('Sem nenhuma dose: liberado agora', () => {
    const ctx = montar([], t('25', '13:00'));
    igual(tyl.status(ctx).linhas[0], 'Liberado agora (se tiver febre)');
  });
  teste('Registrar antes de 6h pede confirmação', () => {
    const ctx = montar(base(), t('25', '13:00'), { tylenol_max_24h: '5' });
    const avisos = tyl.avisos(ctx, t('25', '14:00'), {}, '');
    verdade(avisos.some((a) => a.confirmar && a.texto.includes('17:45')), JSON.stringify(avisos));
  });
  teste('Tylenol nunca entra no card PRÓXIMO (só informativo)', () => {
    const ctx = montar(base(), t('25', '13:00'));
    const agenda = montarAgenda(ctx);
    const item = agenda.find((i) => i.tipo === 'tylenol');
    verdade(item && item.informativo, 'esperava item informativo');
    const { principal, depois } = escolherProximo(agenda);
    verdade(principal.tipo !== 'tylenol' && (!depois || depois.tipo !== 'tylenol'));
  });

  // ---------------------------------------------------------------------
  grupo('Tylenol — limite de 24h');
  teste('Limite vazio: pede para preencher conforme a bula', () => {
    const ctx = montar(base(), t('25', '13:00'), { tylenol_max_24h: '' });
    verdade(tyl.status(ctx).aviso);
    verdade(tyl.avisos(ctx, t('25', '18:00'), {}, '').some((a) => a.texto.includes('bula')));
  });
  teste('Abaixo do limite: mostra "2 de 4 doses em 24h"', () => {
    const ctx = montar(base(), t('25', '13:00'), { tylenol_max_24h: '4' });
    igual(tyl.status(ctx).linhas[1], '2 de 4 doses em 24h');
  });
  teste('Limite atingido: alerta e confirmação obrigatória', () => {
    const ctx = montar(base(), t('25', '18:00'), { tylenol_max_24h: '2' });
    verdade(tyl.status(ctx).alerta, 'status deveria alertar');
    const avisos = tyl.avisos(ctx, t('25', '18:00'), {}, '');
    verdade(avisos.some((a) => a.confirmar && a.texto.startsWith('Limite atingido')), JSON.stringify(avisos));
  });
  teste('Janela de 24h é móvel (dose das 03:00 sai no dia seguinte)', () => {
    const ctx = montar(base(), t('26', '04:00'), { tylenol_max_24h: '2' });
    igual(contarEmJanela(ctx.doTipo('tylenol'), t('26', '04:00'), 24), 1);
    verdade(!tyl.avisos(ctx, t('26', '04:00'), {}, '').some((a) => a.texto.startsWith('Limite')));
  });
  teste('Ao editar, a própria dose não conta no limite', () => {
    const linhas = base();
    const ctx = montar(linhas, t('25', '12:00'), { tylenol_max_24h: '2' });
    const editando = linhas[2].id;
    verdade(!tyl.avisos(ctx, t('25', '11:50'), {}, editando).some((a) => a.texto.startsWith('Limite')));
  });

  // ---------------------------------------------------------------------
  grupo('Tylenol — proximidade com a amoxicilina');
  teste('A menos de 30 min de uma dose: "Separe 30–60 min da amoxicilina"', () => {
    const ctx = montar(base(), t('25', '18:00'), { tylenol_max_24h: '5' });
    const avisos = tyl.avisos(ctx, t('25', '23:10'), {}, '');
    verdade(avisos.some((a) => a.texto.startsWith('Separe 30–60 min da amoxicilina')), JSON.stringify(avisos));
  });
  teste('A 45 min da dose: sem aviso', () => {
    const ctx = montar(base(), t('25', '18:00'), { tylenol_max_24h: '5' });
    verdade(!tyl.avisos(ctx, t('25', '22:45'), {}, '').some((a) => a.texto.startsWith('Separe')));
  });
  teste('Depois de registrar, sugere alimentar em 20–30 min', () => {
    const ctx = montar(base(), t('25', '18:00'));
    igual(tyl.aposRegistrar(ctx, t('25', '18:00')), 'Ofereça alimento entre 18:20 e 18:30.');
  });

  // ---------------------------------------------------------------------
  grupo('Amoxicilina — contador e atraso');
  teste('Contador "1 de 14 doses" e próxima 12:30', () => {
    const ctx = montar(base(), t('25', '10:00'));
    igual(amox.status(ctx).linhas, ['1 de 14 doses', 'Próxima 12:30']);
  });
  teste('Até 30 min depois do horário: ainda não é atraso', () => {
    const s = statusPlano(PLANO_AMOX.map(Date.parse), resolverEventos(base(), TIPOS).filter((e) => e.tipo === 'amoxicilina'), t('25', '13:00'));
    verdade(!s.atrasada, 'não deveria estar atrasada');
  });
  teste('Mais de 30 min sem registro: alerta de atraso', () => {
    const ctx = montar(base(), t('25', '13:05'));
    const st = amox.status(ctx);
    verdade(st.alerta, 'deveria alertar');
    igual(st.linhas[1], 'Atrasada há 35 min');
    const { principal } = escolherProximo(montarAgenda(ctx));
    igual([principal.tipo, principal.alerta], ['amoxicilina', true]);
  });
  teste('Dose atrasada não recalcula os próximos horários', () => {
    const linhas = [...base(), linha('amoxicilina', T('25', '14:10'))];
    const ctx = montar(linhas, t('25', '14:15'));
    const s = statusPlano(ctx.plano('amoxicilina').horarios, ctx.doTipo('amoxicilina'), ctx.agora);
    igual(s.feitas, 2);
    igual(s.proxima.t, t('25', '23:30'));
  });
  teste('Dose não registrada fica para trás e a seguinte vira a próxima', () => {
    const ctx = montar(base(), t('25', '19:00'));
    const s = statusPlano(ctx.plano('amoxicilina').horarios, ctx.doTipo('amoxicilina'), ctx.agora);
    igual([s.feitas, s.perdidas, s.proxima.numero], [1, 1, 3]);
  });
  teste('Tratamento completo: 14 de 14', () => {
    const linhas = PLANO_AMOX.map((h) => linha('amoxicilina', h));
    const ctx = montar(linhas, t('31', '12:00'));
    igual(amox.status(ctx).linhas, ['14 de 14 doses', 'Tratamento concluído']);
  });

  // ---------------------------------------------------------------------
  grupo('Alimentação');
  teste('Próxima = 3h após a última', () => {
    const ctx = montar(base(), t('25', '13:00'));
    igual(alim.proximos(ctx)[0].t, t('25', '15:25'));
  });
  teste('Tylenol nos últimos 30 min: "20–30 min após o Tylenol"', () => {
    const linhas = [...base(), linha('tylenol', T('25', '18:00'))];
    const ctx = montar(linhas, t('25', '18:10'));
    const item = alim.proximos(ctx)[0];
    igual(item.t, t('25', '18:20'));
    verdade(item.detalhe.startsWith('20–30 min após o Tylenol'), item.detalhe);
  });
  teste('Tylenol há mais de 30 min: volta para as 3h', () => {
    const linhas = [...base(), linha('tylenol', T('25', '18:00'))];
    const ctx = montar(linhas, t('25', '18:40'));
    igual(alim.proximos(ctx)[0].t, t('25', '15:25'));
  });

  // ---------------------------------------------------------------------
  grupo('Edição e exclusão via substitui_id');
  teste('Edição substitui o original', () => {
    const a = linha('alimentacao', T('25', '09:00'), {}, { id: 'A' });
    const b = linha('alimentacao', T('25', '09:15'), { quantidade: '90 ml' }, { id: 'B', substitui_id: 'A', criado_em: T('25', '10:00') });
    const r = resolverEventos([a, b], TIPOS);
    igual(r.length, 1);
    igual([r[0].id, r[0].horario, r[0].dados.quantidade], ['B', T('25', '09:15'), '90 ml']);
  });
  teste('Edição de uma edição (cadeia) mostra só a última', () => {
    const a = linha('febre', T('25', '09:00'), { temperatura: 38 }, { id: 'A' });
    const b = linha('febre', T('25', '09:00'), { temperatura: 38.4 }, { id: 'B', substitui_id: 'A' });
    const c = linha('febre', T('25', '09:00'), { temperatura: 38.6 }, { id: 'C', substitui_id: 'B' });
    const r = resolverEventos([c, a, b], TIPOS);
    igual(r.map((e) => [e.id, e.dados.temperatura]), [['C', 38.6]]);
  });
  teste('Exclusão (apagado=true) remove o evento', () => {
    const a = linha('tylenol', T('25', '09:00'), {}, { id: 'A' });
    const b = linha('tylenol', T('25', '09:30'), {}, { id: 'B', substitui_id: 'A' });
    const c = linha('tylenol', T('25', '09:30'), {}, { id: 'C', substitui_id: 'B', apagado: true });
    const outro = linha('tylenol', T('25', '15:00'), {}, { id: 'D' });
    igual(resolverEventos([a, b, c, outro], TIPOS).map((e) => e.id), ['D']);
  });
  teste('Duas edições ao mesmo tempo: vale a criada por último', () => {
    const a = linha('alimentacao', T('25', '09:00'), {}, { id: 'A' });
    const b1 = linha('alimentacao', T('25', '09:10'), {}, { id: 'B1', substitui_id: 'A', criado_em: T('25', '10:00') });
    const b2 = linha('alimentacao', T('25', '09:20'), {}, { id: 'B2', substitui_id: 'A', criado_em: T('25', '10:01') });
    igual(resolverEventos([a, b2, b1], TIPOS).map((e) => e.id), ['B2']);
  });
  teste('Edição que perdeu o original (linha ausente) ainda aparece uma vez', () => {
    const b = linha('alimentacao', T('25', '09:10'), {}, { id: 'B', substitui_id: 'SUMIU' });
    igual(resolverEventos([b], TIPOS).map((e) => e.id), ['B']);
  });

  // ---------------------------------------------------------------------
  grupo('schema_version antigo');
  teste('schema_version vazio + "temp" em texto vira temperatura numérica', () => {
    const velho = linha('febre', T('25', '08:00'), { temp: '38,2' }, { schema_version: '' });
    const [e] = resolverEventos([velho], TIPOS);
    igual([e.schema_version, e.dados.temperatura, 'temp' in e.dados], [0, 38.2, false]);
  });
  teste('"dados" como texto solto vira observação', () => {
    const velho = { ...linha('alimentacao', T('25', '08:00')), dados: 'mamou bem', schema_version: '' };
    const [e] = resolverEventos([velho], TIPOS);
    igual(e.dados, { observacao: 'mamou bem' });
  });
  teste('"dados" vazio vira objeto vazio', () => {
    const velho = { ...linha('tylenol', T('25', '08:00')), dados: '', schema_version: '0' };
    igual(resolverEventos([velho], TIPOS)[0].dados, {});
  });
  teste('Versão atual não passa pela migração', () => {
    const atual = linha('febre', T('25', '08:00'), { temperatura: 37.5, temp: 'x' }, { schema_version: '1' });
    igual(resolverEventos([atual], TIPOS)[0].dados, { temperatura: 37.5, temp: 'x' });
  });
  teste('Tipo desconhecido (de versão futura) não quebra a leitura', () => {
    const futuro = linha('tipo_do_futuro', T('25', '08:00'), { duracao: 90 }, { schema_version: '2' });
    igual(resolverEventos([futuro], TIPOS)[0].dados, { duracao: 90 });
  });

  // ---------------------------------------------------------------------
  grupo('Sono');
  const sono = TIPOS.sono;
  teste('horaDepois passa da meia-noite quando o horário é menor', () => {
    igual(horaDepois(t('25', '22:30'), '06:15'), t('26', '06:15'));
    igual(horaDepois(t('25', '13:00'), '14:40'), t('25', '14:40'));
  });
  teste('Sono sem horário de acordar: "Dormindo há 40 min" e o botão marca o despertar', () => {
    const linhas = [linha('sono', T('25', '13:00'), {}, { id: 'S1' })];
    const ctx = montar(linhas, t('25', '13:40'));
    const st = sono.regras.status(ctx);
    igual([st.linhas[0], st.ativo], ['Dormindo há 40 min', true]);
    const como = sono.regras.registrarComo(ctx);
    igual([como.editarId, como.dados.fim], ['S1', isoSP(t('25', '13:40'))]);
  });
  teste('Depois de acordar: "Acordado há" e total do dia', () => {
    const linhas = [
      linha('sono', T('25', '09:00'), { fim: T('25', '10:30') }),
      linha('sono', T('25', '13:00'), { fim: T('25', '14:10') })
    ];
    const ctx = montar(linhas, t('25', '15:00'));
    igual(sono.regras.status(ctx).linhas, ['Acordado há 50 min', 'Hoje: 2h 40min de sono']);
    igual(sono.regras.registrarComo(ctx), null);
  });
  teste('Sono da noite é dividido entre os dois dias', () => {
    const linhas = [linha('sono', T('25', '21:00'), { fim: T('26', '06:00') })];
    const ctx = montar(linhas, t('26', '12:00'));
    igual(sono.resumoDia(ctx, '2026-10-25').valor, '3h');
    igual(sono.resumoDia(ctx, '2026-10-26').valor, '6h');
  });
  teste('Sono em andamento conta até agora no resumo do dia', () => {
    const linhas = [linha('sono', T('25', '13:00'))];
    const ctx = montar(linhas, t('25', '14:30'));
    igual(sono.resumoDia(ctx, '2026-10-25'), { valor: '1h 30min', detalhe: '1 sono' });
  });
  teste('Resumo no histórico mostra até quando e quanto durou', () => {
    const linhas = [linha('sono', T('25', '13:00'), { fim: T('25', '14:10') })];
    const ctx = montar(linhas, t('25', '15:00'));
    igual(sono.resumo(ctx.eventos[0].dados, ctx, ctx.eventos[0]).texto, 'Até 14:10 · 1h 10min');
  });
  teste('Sono de mais de 14h pede confirmação', () => {
    const ctx = montar([], t('26', '12:00'));
    const avisos = sono.regras.avisos(ctx, t('25', '20:00'), { fim: isoSP(t('26', '11:00')) }, '');
    verdade(avisos.some((a) => a.confirmar), JSON.stringify(avisos));
  });

  // ---------------------------------------------------------------------
  grupo('Fralda, banho e vacinas');
  teste('Fralda: contagem do dia e último cocô', () => {
    const linhas = [
      linha('fralda', T('24', '22:00'), { conteudo: 'Cocô' }),
      linha('fralda', T('25', '08:00'), { conteudo: 'Xixi' }),
      linha('fralda', T('25', '11:00'), { conteudo: 'Os dois' }),
      linha('fralda', T('25', '14:00'), { conteudo: 'Xixi' })
    ];
    const ctx = montar(linhas, t('25', '15:00'));
    igual(TIPOS.fralda.regras.status(ctx).linhas, ['Última 14:00 · Xixi', 'Hoje: 3 trocas', 'Último cocô 11:00']);
    igual(TIPOS.fralda.resumoDia(ctx, '2026-10-25'), { valor: '3 trocas', detalhe: '1 com cocô' });
    igual(TIPOS.fralda.resumoDia(ctx, '2026-10-23'), null);
  });
  teste('Banho: "Hoje às", "Ontem às" e "Há N dias"', () => {
    const b = TIPOS.banho.regras;
    const linhas = [linha('banho', T('25', '19:00'))];
    igual(b.status(montar(linhas, t('25', '20:00'))).linhas, ['Hoje às 19:00']);
    igual(b.status(montar(linhas, t('26', '08:00'))).linhas, ['Ontem às 19:00']);
    igual(b.status(montar(linhas, t('28', '08:00'))).linhas[0], 'Há 3 dias');
  });
  teste('Vacina: nome com dose e contagem', () => {
    const linhas = [
      linha('vacina', T('10', '09:00'), { vacina: 'Vacina A', dose: '1ª' }),
      linha('vacina', T('24', '10:00'), { vacina: 'Vacina B', dose: 'Reforço', local: 'coxa esquerda' })
    ];
    const ctx = montar(linhas, t('25', '12:00'));
    igual(TIPOS.vacina.regras.status(ctx).linhas, ['Vacina B · reforço', 'Última em 24/10 · 2 registradas']);
    igual(TIPOS.vacina.resumo(ctx.eventos[1].dados).texto, 'Vacina B · reforço · coxa esquerda');
  });

  // ---------------------------------------------------------------------
  grupo('Resumo do dia');
  teste('Febre: máxima do dia em destaque acima do limite', () => {
    const linhas = [
      linha('febre', T('25', '08:00'), { temperatura: 37.2 }),
      linha('febre', T('25', '12:00'), { temperatura: 38.4 })
    ];
    const ctx = montar(linhas, t('25', '13:00'));
    igual(TIPOS.febre.resumoDia(ctx, '2026-10-25'), { valor: '38,4 °C', detalhe: 'máxima · 2 medições', destaque: true });
  });
  teste('Amoxicilina, Tylenol e alimentação do dia', () => {
    const ctx = montar(base(), t('25', '13:00'));
    igual(TIPOS.amoxicilina.resumoDia(ctx, '2026-10-25'), { valor: '1 dose', detalhe: 'de 3 no plano' });
    igual(TIPOS.tylenol.resumoDia(ctx, '2026-10-25'), { valor: '2 doses', detalhe: '03:00, 11:45' });
    igual(TIPOS.alimentacao.resumoDia(ctx, '2026-10-25'), { valor: '2 vezes', detalhe: 'última 12:25' });
  });
  teste('Dia sem registros: nenhum tipo aparece', () => {
    const ctx = montar([], t('25', '13:00'), {}, []);
    igual(Object.values(TIPOS).map((tp) => tp.resumoDia?.(ctx, '2026-10-25') ?? null).filter(Boolean), []);
  });

  // ---------------------------------------------------------------------
  grupo('Planos');
  teste('Plano novo desativa o anterior do mesmo tipo', () => {
    const p1 = planoLinha([T('25', '08:00')], { criado_em: T('24', '10:00') });
    const p2 = planoLinha([T('25', '09:00'), T('25', '21:00')], { criado_em: T('24', '11:00') });
    igual(resolverPlanos([p2, p1]).amoxicilina.horarios, [t('25', '09:00'), t('25', '21:00')]);
  });
  teste('Plano com ativo=false encerra o tipo', () => {
    const p1 = planoLinha([T('25', '08:00')], { criado_em: T('24', '10:00') });
    const p2 = planoLinha([], { criado_em: T('24', '11:00'), ativo: false });
    igual(resolverPlanos([p1, p2]).amoxicilina, undefined);
  });
}
