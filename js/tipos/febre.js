import { numero, fmtNumero, fmtHora, fmtData, chaveDia } from '../regras.js';

const LIMITE_PADRAO = 37.8;

const limite = (ctx) => ctx.numeroConfig('febre_limite_c') ?? LIMITE_PADRAO;

function texto(dados, ctx) {
  const temp = numero(dados.temperatura);
  if (temp === null) return { texto: dados.observacao || 'Febre (sem temperatura)' };
  return { texto: `${fmtNumero(temp)} °C`, destaque: ctx ? temp >= limite(ctx) : false };
}

export default {
  id: 'febre',
  rotulo: 'Febre',
  cor: '#D2614F',
  icone: '<svg viewBox="0 0 24 24"><path d="M14 14.6V5a2 2 0 0 0-4 0v9.6a4 4 0 1 0 4 0z"/><path d="M12 9v6.5"/></svg>',
  campos: [
    { id: 'temperatura', rotulo: 'Temperatura (°C)', tipo: 'numero', min: 34, max: 43, passo: 0.1, placeholder: 'ex. 38,2' },
    { id: 'observacao', rotulo: 'Observação', tipo: 'texto', placeholder: 'Opcional' }
  ],

  // schema_version 0: a temperatura podia vir como "temp" e em texto ("38,2").
  migrar(dados, versao) {
    if (versao < 1 && dados.temperatura === undefined && dados.temp !== undefined) {
      dados.temperatura = numero(dados.temp);
      delete dados.temp;
    }
    if (typeof dados.temperatura === 'string') dados.temperatura = numero(dados.temperatura);
    return dados;
  },

  resumo(dados, ctx) {
    return texto(dados, ctx);
  },

  resumoDia(ctx, dia) {
    const lista = ctx.doDia('febre', dia);
    if (!lista.length) return null;
    const temps = lista.map((e) => numero(e.dados.temperatura)).filter((v) => v !== null);
    const medicoes = lista.length === 1 ? '1 medição' : `${lista.length} medições`;
    if (!temps.length) return { valor: medicoes };
    const maxima = Math.max(...temps);
    return { valor: `${fmtNumero(maxima)} °C`, detalhe: `máxima · ${medicoes}`, destaque: maxima >= limite(ctx) };
  },

  regras: {
    prioridade: 10,

    status(ctx) {
      const ultima = ctx.ultimo('febre', ctx.agora);
      if (!ultima) return { linhas: ['Nenhuma medição', `Limite ${fmtNumero(limite(ctx))} °C`] };
      const r = texto(ultima.dados, ctx);
      const quando = chaveDia(ultima.t) === chaveDia(ctx.agora) ? fmtHora(ultima.t) : `${fmtData(ultima.t)} ${fmtHora(ultima.t)}`;
      return { linhas: [r.texto, `Medida às ${quando}`], alerta: !!r.destaque };
    },

    avisos(ctx, horario, dados) {
      const temp = numero(dados.temperatura);
      if (temp !== null && temp >= limite(ctx)) {
        return [{ texto: `${fmtNumero(temp)} °C está acima do limite de febre (${fmtNumero(limite(ctx))} °C).` }];
      }
      return [];
    }
  },

  /** Últimas medições, mostradas na tela principal. */
  painel(ctx) {
    const lista = ctx.doTipo('febre').filter((e) => e.t <= ctx.agora).slice(-6).reverse();
    if (!lista.length) return null;
    return {
      titulo: 'Últimas medições',
      itens: lista.map((e) => ({
        evento: e,
        quando: chaveDia(e.t) === chaveDia(ctx.agora) ? fmtHora(e.t) : `${fmtData(e.t)} ${fmtHora(e.t)}`,
        ...texto(e.dados, ctx)
      }))
    };
  }
};
