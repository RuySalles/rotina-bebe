// Registro central dos tipos de evento.
// Para criar um tipo novo: crie js/tipos/<id>.js (veja os existentes) e adicione abaixo.
// A ordem da lista é a ordem dos botões na tela principal.
//
// Formato de um tipo:
// {
//   id, rotulo, cor, icone (SVG), lembrete? (texto ou (ctx) → texto), interno? (sem botão/histórico/resumo),
//   campos: [{ id, rotulo, tipo: 'texto' | 'textolongo' | 'numero' | 'opcoes' | 'multiplas' | 'hora' | 'data', opcoes?, min?, max?, passo?, casas?,
//              placeholder?, ajuda?, mostrarSe?(dados) → bool, atalhos?(ctx, dados) → [{ valor, rotulo }] }],
//     ('multiplas': opcoes = [{ valor, rotulo }], guarda uma lista; campo com mostrarSe falso não é gravado)
//     ('hora' guarda um ISO: o primeiro horário HH:MM a partir do horário do registro; vazio = '')
//     ('textolongo': texto de várias linhas)
//     ('data' guarda um dia do calendário, AAAA-MM-DD; vazio = ''. Ex.: próxima dose da vacina)
//   resumo(dados, ctx, evento?) → { texto, destaque? },
//   padroes?(ctx) → dados                 (valores já preenchidos num registro novo)
//   resumoDia?(ctx, dia) → { valor, detalhe?, destaque? } | null   (cartão "Resumo" e cabeçalho do histórico filtrado)
//   migrar?(dados, versao) → dados        (ler schema_version antigo)
//   painel?(ctx) → { titulo, itens }      (bloco extra na tela principal)
//   evolucao?(ctx) → [{ id, rotulo, fmt(v), pontos: [{ t, v }] }]   (gráficos no topo do Histórico filtrado pelo tipo)
//   naInicio?(ctx) → bool                (false = fora da tela inicial agora, ex. tratamento concluído; o Histórico continua)
//   agendavel?: true                     (registro com dia e hora à frente, ex. consulta: o formulário oferece Amanhã e
//                                         datas futuras; no Histórico, só depois que a hora passa)
//   tituloNovo?: texto                    (título do formulário de um registro novo, ex. "Marcar consulta")
//   rotina?: true                         (botão grande no topo da tela inicial; os outros vão para a faixa compacta)
//   regras?: {
//     prioridade, usaPlano?, intervaloMinimoH?, recorrenciaH?,
//     status(ctx) → { linhas, alerta?, aviso?, ok?, ativo?, config? },   (ativo: algo em andamento, ex. dormindo;
//                                         config: o aviso é só de configuração e não sobe na faixa)
//     proximos(ctx) → [{ t, titulo, detalhe, alerta?, informativo?, destaque?, diaInteiro? }],
//       (destaque: primeira linha do "Depois", em destaque; diaInteiro: mostra "Hoje" em vez da hora;
//        alemDe24h: entra mesmo depois das próximas 24h, ex. consulta daqui a 5 dias)
//     emCurso?(ctx) → { titulo, detalhe?, botao } | null   (algo acontecendo agora, ex. dormindo: toma o card PRÓXIMO)
//     registrarComo?(ctx) → { editarId, dados?, titulo? } | null   (o botão abre um registro existente)
//     infoRegistro?(ctx, horario, editandoId) → texto,
//     avisos?(ctx, horario, dados, editandoId) → [{ texto, confirmar? }],
//     aposRegistrar?(ctx, horario, dados) → texto
//   }
// }

import amoxicilina from './amoxicilina.js';
import tylenol from './tylenol.js';
import alimentacao from './alimentacao.js';
import febre from './febre.js';
import sono from './sono.js';
import fralda from './fralda.js';
import banho from './banho.js';
import vacina from './vacina.js';
import medidas from './medidas.js';
import consulta from './consulta.js';
import anotacao from './anotacao.js';

import ajuste from './ajuste.js';
import { lerRemedios, criarTipoRemedio } from './remedio.js';

/** Tipos fixos (os que estão no código). */
export const LISTA_TIPOS = [amoxicilina, tylenol, alimentacao, febre, sono, fralda, banho, vacina, consulta, medidas, anotacao];

export const TIPOS = Object.fromEntries(LISTA_TIPOS.map((t) => [t.id, t]));

/**
 * Tipos fixos + remédios cadastrados em Ajustes (config.remedios).
 * todos: inclui remédios encerrados (o histórico deles continua); visiveis: os que têm botão na tela inicial.
 * mapa: todos + tipos internos (ex. "ajuste", que não aparecem em listas, histórico nem resumo).
 */
export function montarTipos(config = {}) {
  const remedios = lerRemedios(config).map(criarTipoRemedio);
  const todos = [amoxicilina, tylenol, ...remedios, alimentacao, febre, sono, fralda, banho, vacina, consulta, medidas, anotacao];
  return {
    todos,
    visiveis: todos.filter((t) => !t.remedio || t.remedio.ativo),
    mapa: Object.fromEntries([...todos, ajuste].map((t) => [t.id, t]))
  };
}
