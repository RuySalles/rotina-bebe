# Plano de melhorias em fases

Uma melhoria por fase. Só passamos para a próxima depois do seu ok.

## Como cada fase funciona

1. **Eu implemento**, rodo os testes automáticos e confiro no navegador com dados de teste (sem tocar na planilha real).
2. **Publico** no site. Como vocês só usam a versão web, o teste é no próprio app.
3. **Você testa no celular** seguindo o roteiro "Como testar" da fase.
4. **Você dá o ok** (ou me diz o que ajustar). Se algo der errado, eu corrijo ou desfaço a mudança e publico de novo.
5. Marco a fase como aprovada aqui e começamos a próxima.

Nenhuma fase apaga ou altera registros já feitos. Fases que exigem algo da sua parte (republicar o Web App, autorizar
algo) dizem isso em "Você vai precisar".

**Situação:** ⬜ pendente · 🔄 em andamento · 🧪 publicada, aguardando seu teste · ✅ aprovada

| Fase | Melhoria | Situação |
|---|---|---|
| 1 | Desfazer logo depois de registrar | 🧪 |
| 2 | Remédio novo sem precisar de programação | ⬜ |
| 3 | Abrir o app sem internet | ⬜ |
| 4 | Alertas no celular pelo Google Agenda | ⬜ |
| 5 | Mamada completa (peito, lado, tempo) | ⬜ |
| 6 | Esconder e reordenar botões | ⬜ |
| 7 | Anotações livres | ⬜ |
| 8 | Relatório para a consulta | ⬜ |
| 9 | Consultas e retornos | ⬜ |
| 10 | Peso e altura | ⬜ |
| 11 | Aviso de vacina | ⬜ |
| 12 | App leve depois de muitos meses | ⬜ |

---

## Fase 1 — Desfazer logo depois de registrar

**Por quê:** um toque errado de madrugada hoje exige ir ao Histórico, abrir o registro e apagar.

**O que muda:** depois de registrar, salvar uma alteração ou apagar, aparece por 8 segundos um aviso com o botão
**Desfazer**. Ele apaga o registro novo, volta a alteração ou traz de volta o apagado (pela regra de sempre: uma linha
nova na planilha, nada é sobrescrito).

**Você vai precisar:** nada.

**Como testar:**
- [ ] Registrar uma fralda e tocar em **Desfazer**: o registro some do Histórico e do Resumo.
- [ ] Registrar outra e **não** tocar em Desfazer: o aviso some sozinho e o registro fica.
- [ ] Registrar o despertar de um sono e desfazer: o sono volta a aparecer como "Dormindo".
- [ ] Editar um registro (ex. mudar a hora), desfazer: volta como estava.
- [ ] Apagar um registro pelo Histórico, desfazer: ele volta.
- [ ] No outro celular, depois de sincronizar, o registro desfeito também não aparece.

---

## Fase 2 — Remédio novo sem precisar de programação

**Por quê:** hoje cada remédio está escrito no código. Uma receita nova (vitamina D, outro antibiótico, um xarope)
dependeria de mim.

**O que muda:** em Ajustes, **Remédios → Adicionar remédio**, com:
- nome e dose (texto livre, ex. "4 mL" ou "2 gotas");
- jeito de dar: **horários fixos** (como a amoxicilina, com plano e contador de doses), **a cada X horas**, ou
  **só se precisar** (como o Tylenol: nunca entra no card PRÓXIMO, só mostra quando está liberado);
- intervalo mínimo entre doses (aviso se registrar antes);
- encerrar o remédio quando o tratamento acabar (o histórico continua).

Cada remédio cadastrado ganha botão na tela inicial, entra no Resumo, no Histórico (com filtro) e na linha do tempo.
Amoxicilina e Tylenol continuam exatamente como estão.

**Você vai precisar:** nada (os remédios ficam na aba config da planilha; o Web App não muda).

**Como testar:**
- [ ] Cadastrar um remédio de teste "a cada 8 horas" e registrar uma dose: aparece "Próxima" 8h depois.
- [ ] Registrar outra dose antes do intervalo: o app pede confirmação.
- [ ] Cadastrar um "só se precisar": nunca aparece no card PRÓXIMO.
- [ ] Cadastrar um com horários fixos: contador "1 de N doses" e aviso de atraso, como a amoxicilina.
- [ ] Encerrar o remédio de teste: o botão some, os registros continuam no Histórico.
- [ ] Amoxicilina e Tylenol seguem iguais.

---

## Fase 3 — Abrir o app sem internet

**Por quê:** os registros já ficam guardados quando a internet cai com o app aberto, mas **abrir** o app sem sinal
pode não carregar a tela.

**O que muda:** o app passa a guardar a si mesmo no celular. Abre sempre, mostra os últimos dados conhecidos e envia
os registros quando a internet voltar. A atualização automática de versão continua funcionando.

**Você vai precisar:** abrir o app uma vez com internet depois da publicação.

**Como testar:**
- [ ] Abrir o app com internet uma vez. Depois, ativar o modo avião, fechar o app de vez e abrir de novo: a tela
      aparece com os dados.
- [ ] Ainda em modo avião, registrar uma fralda: aparece "Pendente (1)".
- [ ] Desligar o modo avião: em até 30 segundos vira "Sincronizado" e o registro aparece no outro celular.
- [ ] Na fase seguinte que eu publicar, o app se atualiza sozinho como hoje.

---

## Fase 4 — Alertas no celular pelo Google Agenda

**Por quê:** por não ser de loja, o app não consegue tocar alarme sozinho de forma confiável (principalmente no iPhone).
O Google Agenda consegue.

**O que muda:** ao salvar um plano de horários (amoxicilina ou um remédio da fase 2), a planilha cria os eventos numa
agenda própria ("Rotina do bebê"), com aviso no horário. Se o plano mudar ou for encerrado, os eventos são
atualizados ou removidos. Vocês dois assinam essa agenda no celular.

**Você vai precisar:**
- republicar o Web App (Implantar → Gerenciar implantações → editar → Nova versão) e autorizar o acesso à Agenda;
- assinar a agenda "Rotina do bebê" no celular de vocês dois (eu explico o passo a passo).

**Como testar:**
- [ ] Salvar um plano de teste com um horário daqui a 10 minutos: o evento aparece na agenda e o celular avisa.
- [ ] Mudar o horário no plano: o evento muda na agenda.
- [ ] Encerrar o plano: o evento some.
- [ ] Registros e planos antigos continuam iguais.

---

## Fase 5 — Mamada completa

**O que muda:** o registro de Alimentação ganha **peito esquerdo / peito direito / mamadeira** (com quantidade) e
tempo de mamada (início e fim, como o sono). O botão mostra **qual foi o último lado**. O Resumo mostra quantas
mamadas e o total de mamadeira no dia. Registros antigos continuam aparecendo normalmente.

**Você vai precisar:** nada.

**Como testar:**
- [ ] Registrar mamada no peito esquerdo: o botão mostra "Último lado: esquerdo".
- [ ] Registrar mamadeira de 90 mL: o Resumo soma os mL do dia.
- [ ] Mamadas antigas continuam no Histórico.
- [ ] A regra de "20–30 min após o Tylenol" continua valendo.

---

## Fase 6 — Esconder e reordenar botões

**O que muda:** em Ajustes, escolher quais botões aparecem na tela inicial e em que ordem. Um remédio com tratamento
concluído (como a amoxicilina depois da 14ª dose) sai da tela inicial sozinho, mas continua no Histórico.

**Você vai precisar:** nada. A escolha vale para os dois celulares.

**Como testar:**
- [ ] Esconder Banho: o botão some, os registros continuam no Histórico e no filtro.
- [ ] Mudar a ordem: vale nos dois celulares.
- [ ] Ao concluir um tratamento, o botão do remédio sai da tela inicial.

---

## Fase 7 — Anotações livres

**O que muda:** um tipo **Anotação** para sintomas e acontecimentos ("vomitou após mamar", "manchinha no braço"), com
texto livre. Aparece no Histórico, com filtro, e entra no relatório da fase 8.

**Você vai precisar:** nada.

**Como testar:**
- [ ] Registrar uma anotação de ontem às 22h: aparece no lugar certo do Histórico.
- [ ] O filtro "Anotação" mostra só as anotações.

---

## Fase 8 — Relatório para a consulta

**O que muda:** uma tela **Relatório** com um período à escolha (ex.: últimos 3 dias): gráfico da temperatura, doses
de cada remédio com horários, sono por dia, fraldas, mamadas e anotações. Dá para mostrar no celular ou salvar em PDF
pelo compartilhar do celular.

**Você vai precisar:** nada.

**Como testar:**
- [ ] Gerar o relatório dos últimos 3 dias e conferir com o Histórico.
- [ ] Salvar em PDF pelo celular e abrir o arquivo.
- [ ] No tema escuro do celular, o relatório continua legível (e o PDF sai claro).

---

## Fase 9 — Consultas e retornos

**O que muda:** um tipo **Consulta** com data, hora, local e motivo (ex. retorno com o pediatra). Consultas futuras
aparecem em "Próximas 24 horas" quando estiverem perto, e no card PRÓXIMO no dia.

**Você vai precisar:** nada.

**Como testar:**
- [ ] Cadastrar uma consulta para amanhã: aparece na linha do tempo.
- [ ] Depois da data, ela vai para o Histórico.

---

## Fase 10 — Peso e altura

**O que muda:** um tipo **Medidas** (peso, altura, perímetro da cabeça, todos opcionais), com a evolução num gráfico.
Sem comparar com curvas de crescimento: isso fica com o pediatra.

**Você vai precisar:** nada.

**Como testar:**
- [ ] Registrar duas medidas em dias diferentes (pode usar "Outro dia"): o gráfico mostra as duas.
- [ ] Registrar só o peso: altura fica em branco sem erro.

---

## Fase 11 — Aviso de vacina

**O que muda:** ao registrar uma vacina, dá para anotar a **data da próxima dose** (como está na caderneta). Perto da
data, ela aparece na linha do tempo e no botão de Vacinas. O app não calcula o calendário sozinho, para não arriscar
orientação errada.

**Você vai precisar:** nada.

**Como testar:**
- [ ] Registrar uma vacina com próxima dose daqui a 2 dias: aparece no botão e, no dia, na linha do tempo.
- [ ] Vacinas antigas continuam iguais.

---

## Fase 12 — App leve depois de muitos meses

**Por quê:** hoje o app carrega todos os registros a cada sincronização. Por enquanto não faz diferença; com muitos
meses de uso, fica mais lento, principalmente com internet fraca.

**O que muda:** o app passa a carregar só o necessário (os registros recentes e o que os planos e resumos precisam).
O Histórico busca os antigos quando você rola até eles. A planilha continua com tudo.

**Você vai precisar:** republicar o Web App (a mudança é compatível com a versão atual).

**Como testar:**
- [ ] O app abre e sincroniza normalmente.
- [ ] Rolar o Histórico até os primeiros registros: eles aparecem.
- [ ] O Resumo de ontem e o contador da amoxicilina continuam certos.

---

## Notas técnicas (para quem for implementar)

- Fase 1: guardar o id do último registro feito no aparelho e usar `store.apagarEvento(id)`; no despertar do sono,
  desfazer = `editarEvento` de volta para os dados anteriores.
- Fase 2: um tipo genérico `remedio` em `js/tipos/` (dados com `remedio_id`, dose) e definições em `config`
  (chave `remedios`, JSON). Planos por remédio na aba `planos` com `tipo` = `remedio:<id>`. Sem coluna nova.
- Fase 3: service worker com cache por versão (`v/<sha>/`), alinhado ao `versao.json` e ao `scripts/montar-site.sh`.
- Fase 4: muda o `Code.gs` (retrocompatível): `CalendarApp` ao salvar plano. Atualizar o `SETUP.md`.
- Fase 5: campos novos em `dados` da alimentação; registros antigos sem eles continuam válidos (se o formato de um
  campo existente mudar, subir `SCHEMA_VERSION` com `migrar`).
- Fase 12: muda o `Code.gs` (parâmetro opcional de período; sem ele, devolve tudo como hoje). Atualizar o `SETUP.md`.
