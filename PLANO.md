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
| 1 | Desfazer logo depois de registrar | ✅ |
| 2 | Remédio novo sem precisar de programação | ✅ |
| 3 | Histórico de ajustes (quem mudou o quê, com volta) | 🧪 |
| 4 | Sincronização mais rápida | 🧪 |
| 5 | Rotina em primeiro lugar na tela inicial | ⬜ |
| 6 | Ajustes reorganizado (remédios agrupados) | ⬜ |
| 7 | Alimentação: leite, sólido ou sopa | ⬜ |
| 8 | Previsões de sono e de leite | ⬜ |
| 9 | Abrir o app sem internet | ⬜ |
| 10 | Alertas no celular pelo Google Agenda | ⬜ |
| 11 | Esconder e reordenar botões | ⬜ |
| 12 | Anotações livres | ⬜ |
| 13 | Relatório para a consulta | ⬜ |
| 14 | Consultas e retornos | ⬜ |
| 15 | Peso e altura | ⬜ |
| 16 | Aviso de vacina | ⬜ |

**Revisão de 22/11 (depois de 1 mês de uso):** a ordem foi refeita olhando os registros do mês. Quase todos os
registros são de alimentação, sono, fralda e banho, mas os primeiros botões da tela são remédios; houve sonos
iniciados duas vezes (um celular ainda não sabia do outro); e a pergunta do dia a dia é "já está na hora de dormir / de
comer?". Por isso entraram as fases 4 a 8. A antiga "App leve depois de muitos meses" virou parte da fase 4 e a antiga
"Mamada completa" (peito, lado) virou a fase 7, porque a alimentação é por mamadeira e sólidos.

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
- máximo de doses em 24 horas e um lembrete na hora de registrar (opcionais);
- encerrar o remédio quando o tratamento acabar (o histórico continua) ou reativar depois;
- excluir um remédio cadastrado por engano (só aparece se ele não tiver nenhuma dose).

Cada remédio cadastrado ganha botão na tela inicial, entra no Resumo, no Histórico (com filtro) e na linha do tempo.
Amoxicilina e Tylenol continuam exatamente como estão.

**Você vai precisar:** nada (os remédios ficam na aba config da planilha; o Web App não muda).

**Como testar** (Ajustes → Remédios; use nomes como "Teste 1" para achar fácil):
- [ ] Cadastrar "Teste 1", **A cada X h**, a cada 8 horas, intervalo mínimo 6, dose "1 mL". O botão aparece na tela
      inicial; ao registrar, a dose já vem "1 mL" e o botão mostra "Próxima" 8h depois.
- [ ] Registrar outra dose de "Teste 1" logo em seguida: o app pede confirmação (intervalo mínimo).
- [ ] Cadastrar "Teste 2", **Só se precisar**, máximo 2 em 24h. Registrar 2 doses: o botão mostra "Limite atingido"
      e ele nunca aparece no card PRÓXIMO.
- [ ] Cadastrar "Teste 3", **Horários fixos**; em Planos de horário aparece "Teste 3": salvar 2 horários de hoje.
      O botão mostra "0 de 2 doses" e a próxima, como a amoxicilina.
- [ ] No outro celular, depois de sincronizar, os 3 remédios aparecem.
- [ ] Encerrar "Teste 1": o botão some; no Histórico, o filtro "Teste 1" ainda mostra as doses.
- [ ] Limpeza: desfazer/apagar as doses de teste e, em cada remédio de teste, tocar em **Excluir remédio**.
- [ ] Amoxicilina e Tylenol seguem iguais.

---

## Fase 3 — Histórico de ajustes (quem mudou o quê, com volta)

**Por quê:** hoje a planilha **sobrescreve** cada ajuste: o valor antigo se perde e não fica registrado quem mudou nem
quando. Se alguém mexer sem querer (uma dose, o limite de febre, um remédio, um plano de horários), não dá para saber o
que era antes.

**O que muda:**
- Toda mudança feita em Ajustes passa a deixar um registro: **quando, quem (o apelido do celular), o quê, o valor de
  antes e o de depois**. Vale para: nome do bebê, limite de febre, Tylenol (remédio em uso, máximo, doses),
  amoxicilina (dose, frasco), remédios cadastrados (adicionado, alterado, encerrado, reativado, excluído) e planos de
  horário (salvo ou encerrado).
- Em Ajustes, uma seção nova **Histórico de ajustes** mostra as mudanças mais recentes primeiro, por exemplo:
  "25/10 21:10 · Mãe · Tylenol Bebê: dose em mL · 1,2 → 1,5".
- Cada item tem **Voltar** (toque e depois **Confirmar**), que desfaz aquela mudança (e a volta também fica registrada).
  Mostra as 10 mais recentes; **Ver mais** traz as anteriores.
- Os registros ficam na aba **eventos** (que só recebe linhas novas, nunca apaga), como um tipo interno que não aparece
  na tela inicial, no Histórico de registros nem no Resumo.

**Limites (de propósito):**
- Só registra mudanças feitas **pelo app a partir desta fase**. O que foi mudado antes, ou direto na planilha, não
  aparece.
- O apelido de cada celular não entra (ele fica só naquele aparelho).

**Você vai precisar:** nada (sem republicar o Web App, sem mexer na planilha).

**Como testar:**
- [ ] Mudar o limite de febre de 37,8 para 38: o Histórico de ajustes mostra "Limite de febre · 37,8 → 38" com seu
      apelido e o horário.
- [ ] Tocar em **Voltar** e depois em **Confirmar**: o limite volta a 37,8 e aparece uma linha nova da volta.
- [ ] No celular da sua esposa, mudar a dose do Tylenol: no seu celular, depois de sincronizar, aparece com o apelido
      dela.
- [ ] Encerrar e reativar um remédio, e salvar um plano de horários: cada um aparece com antes e depois.
- [ ] Tela inicial, Histórico e Resumo continuam sem nenhum item de ajuste.

---

## Fase 4 — Sincronização mais rápida

**Por quê:** hoje cada registro é enviado sozinho e, depois de cada envio, o app baixa a planilha inteira de novo. Com
algumas dezenas de linhas novas por dia, isso fica mais lento a cada semana. Quando um celular ainda não sabe do outro,
acontece de o sono ser iniciado duas vezes, ou de alguém esperar para fechar o sono que o outro abriu.

**O que muda:**
- O que estiver na fila vai **de uma vez só**, num único envio.
- O app baixa **só o que mudou** desde a última vez, não a planilha toda. Ao abrir o app e a cada 10 minutos,
  confere tudo de novo, para nunca ficar com algo faltando.
- Um registro feito enquanto o app sincroniza sobe logo em seguida (antes podia esperar até 30 segundos).
- Ao tocar em **Sono**, se a última sincronização foi há mais de 15 segundos, o app confere o outro celular antes de
  abrir (no máximo 4 segundos; sem internet, abre na hora). Assim, se o sono já foi iniciado lá, abre direto
  "Registrar despertar".
- Se mesmo assim o outro celular iniciar um sono enquanto a tela está aberta, ao salvar aparece "Já tem um sono
  iniciado às 14:02 por Pai" e é preciso confirmar. O mesmo vale para um horário que cai dentro de um sono já
  registrado.

**Você vai precisar:** republicar o Web App (Implantar → Gerenciar implantações → editar → Nova versão). A mudança é
compatível: a versão atual do app continua funcionando com o Web App novo, e vice-versa.

**Como testar:**
- [ ] Registrar uma fralda num celular: no outro, aparece em até 30 segundos (ou na hora, ao voltar para o app).
- [ ] Em modo avião, registrar 3 coisas; desligar o modo avião: as 3 sobem juntas e viram "Sincronizado".
- [ ] Iniciar um sono num celular e, uns 20 segundos depois, tocar em Sono no outro: abre "Registrar despertar"
      (e não um sono novo).
- [ ] Antes de republicar o Web App o app continua funcionando normalmente (só sem a parte mais rápida).
- [ ] O Histórico, o Resumo de ontem e o Histórico de ajustes continuam completos.

---

## Fase 5 — Rotina em primeiro lugar na tela inicial

**Por quê:** quase todos os registros do mês foram de alimentação, sono, fralda e banho, mas os primeiros botões da
tela são remédios: um tratamento que já acabou e um remédio "só se precisar" que quase não foi usado. E uma vitamina de
todo dia não se encaixa em nenhum dos jeitos de dar de hoje (fica mostrando "Sem plano de horários"), e passa
despercebida quando esquecem.

**O que muda:**
- Os botões da rotina (Alimentação, Sono, Fralda, Banho) vêm primeiro e maiores.
- Os remédios ficam numa faixa compacta logo abaixo, com o estado em uma linha ("Dada às 08:19", "Liberado",
  "Próxima 21:00").
- Remédio com tratamento concluído (como a amoxicilina depois da última dose do plano) sai da tela inicial sozinho e
  continua no Histórico.
- Jeito de dar novo: **1 vez por dia**, com um horário de referência opcional (ex. "de manhã"). Mostra "Hoje: dada
  ✓" ou "Hoje: ainda não", e só entra no card PRÓXIMO se passar do horário de referência sem registro.
- Febre, Vacina e os remédios "só se precisar" continuam a um toque, sem destaque.

**Você vai precisar:** mudar a vitamina em Ajustes para **1 vez por dia** (eu explico onde, é um toque).

**Como testar:**
- [ ] A tela inicial abre com Alimentação, Sono, Fralda e Banho em cima.
- [ ] A amoxicilina (já concluída) não aparece mais na tela inicial; no Histórico, o filtro dela mostra as doses.
- [ ] Com a vitamina em "1 vez por dia": antes de registrar mostra "Hoje: ainda não"; depois, "Dada às HH:MM".
- [ ] O Tylenol continua acessível e nunca aparece no card PRÓXIMO.

---

## Fase 6 — Ajustes reorganizado (remédios agrupados)

**Por quê:** em Ajustes, Tylenol e amoxicilina ficam misturados com o nome do bebê e o limite de febre, os remédios
cadastrados ficam em outra seção e os horários de cada um em uma terceira. Para mudar um remédio é preciso procurar em
três lugares.

**O que muda:**
- **Bebê:** nome e limite de febre.
- **Remédios:** uma lista só, com todos (Tylenol, amoxicilina e os cadastrados). Tocar num remédio abre tudo dele:
  dose, jeito de dar, horários do plano, máximo, lembrete, encerrar/reativar.
- **Tratamentos encerrados** ficam recolhidos no fim da lista.
- O Histórico de ajustes continua registrando tudo, com Voltar.

**Você vai precisar:** nada.

**Como testar:**
- [ ] Mudar a dose do Tylenol pela lista de Remédios: vale no registro e aparece no Histórico de ajustes.
- [ ] Abrir um remédio de horários fixos: os horários do plano estão dentro dele.
- [ ] A amoxicilina aparece em "Tratamentos encerrados"; reativar e encerrar de novo funciona.
- [ ] Nada mudou nos registros já feitos.

---

## Fase 7 — Alimentação: leite, sólido ou sopa

**Por quê:** hoje a alimentação é só um texto livre, então o app não sabe se foi mamadeira ou uma fruta. Isso impede
somar o leite do dia e faz a "próxima alimentação" contar a partir de qualquer coisa que ele comeu.

**O que muda:**
- Ao registrar: **Leite**, **Sólido** ou **Sopa**, com um toque.
  - Leite: quantidade em mL (com os valores mais usados como atalho, ex. 150 / 180 / 210).
  - Sólido e sopa: texto livre como hoje (ex. "2 cubos de feijão, 2 de arroz"), com os últimos usados como atalho.
- O botão mostra o último leite e o último sólido separados.
- O Resumo mostra quantas mamadeiras e o total de mL no dia, e quantas refeições de sólidos.
- Registros antigos continuam aparecendo normalmente. Os que têm só "180ml" ou "150 ml de leite" passam a contar como
  leite automaticamente; o resto fica como está.

**Você vai precisar:** nada.

**Como testar:**
- [ ] Registrar Leite 180 mL: o Resumo soma os mL do dia.
- [ ] Registrar um Sólido: o botão mostra o último sólido, e o horário do último leite não muda.
- [ ] Alimentações antigas continuam no Histórico, e as de leite entram na soma de mL dos dias passados.
- [ ] A regra de "20–30 min após o Tylenol" continua valendo.

---

## Fase 8 — Previsões de sono e de leite

**Por quê:** a pergunta de todo dia é "será que já está na hora de dormir? de comer de novo?". O app hoje usa um
número fixo (3 horas depois de qualquer alimentação) e não diz nada sobre o sono. Um mês de registros mostra que o
bebê tem um ritmo próprio e bem regular, que muda com a hora do dia.

**O que muda:**
- No botão de Sono e no card PRÓXIMO: **"Próximo sono por volta de 14:10"**, a partir de quanto tempo ele costuma
  ficar acordado naquele horário do dia (de manhã é diferente do fim da tarde), e o horário que costuma dormir à noite.
- No botão de Alimentação: **"Próximo leite por volta de 15:30"**, a partir do intervalo que ele costuma fazer entre
  mamadeiras durante o dia. Sólidos não mudam essa conta.
- As contas usam só os **últimos 14 dias dele**, então se ajustam sozinhas conforme ele cresce. Noites com buracos no
  registro são ignoradas para não estragar a média.
- Sempre escrito como "costuma" e "por volta de". Não é orientação: é só o que os próprios registros mostram.
- Um cartão pequeno **"Ritmo dele"** no Resumo: tempo acordado típico, cochilos por dia, horário de dormir e acordar,
  mamadeiras por dia (últimos 14 dias comparados com os 14 anteriores).

**Você vai precisar:** nada.

**Como testar:**
- [ ] Depois de registrar o fim de um sono de manhã, o botão de Sono mostra "Próximo sono por volta de …" num horário
      que faz sentido para vocês.
- [ ] Depois de uma mamadeira, o botão de Alimentação mostra "Próximo leite por volta de …"; registrar uma fruta não
      muda esse horário.
- [ ] O cartão "Ritmo dele" bate com o que vocês percebem.
- [ ] Se o horário previsto passar, ele não fica vermelho nem dá alarme (é previsão, não tarefa).

---

## Fase 9 — Abrir o app sem internet

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

## Fase 10 — Alertas no celular pelo Google Agenda

**Por quê:** por não ser de loja, o app não consegue tocar alarme sozinho de forma confiável (principalmente no iPhone).
O Google Agenda consegue.

**O que muda:** ao salvar um plano de horários (amoxicilina ou um remédio cadastrado), a planilha cria os eventos numa
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

## Fase 11 — Esconder e reordenar botões

**O que muda:** em Ajustes, escolher quais botões aparecem na tela inicial e em que ordem (a fase 5 já põe a rotina
primeiro e tira os tratamentos concluídos; esta deixa vocês ajustarem o resto).

**Você vai precisar:** nada. A escolha vale para os dois celulares.

**Como testar:**
- [ ] Esconder Banho: o botão some, os registros continuam no Histórico e no filtro.
- [ ] Mudar a ordem: vale nos dois celulares.

---

## Fase 12 — Anotações livres

**O que muda:** um tipo **Anotação** para sintomas e acontecimentos ("vomitou após mamar", "manchinha no braço",
"primeira vez que comeu pera"), com texto livre. Aparece no Histórico, com filtro, e entra no relatório da fase 13.

**Você vai precisar:** nada.

**Como testar:**
- [ ] Registrar uma anotação de ontem às 22h: aparece no lugar certo do Histórico.
- [ ] O filtro "Anotação" mostra só as anotações.

---

## Fase 13 — Relatório para a consulta

**O que muda:** uma tela **Relatório** com um período à escolha (ex.: últimos 3 dias): gráfico da temperatura, doses
de cada remédio com horários, sono por dia, fraldas, leite e sólidos, e anotações. Dá para mostrar no celular ou
salvar em PDF pelo compartilhar do celular.

**Você vai precisar:** nada.

**Como testar:**
- [ ] Gerar o relatório dos últimos 3 dias e conferir com o Histórico.
- [ ] Salvar em PDF pelo celular e abrir o arquivo.
- [ ] No tema escuro do celular, o relatório continua legível (e o PDF sai claro).

---

## Fase 14 — Consultas e retornos

**O que muda:** um tipo **Consulta** com data, hora, local e motivo (ex. retorno com o pediatra). Consultas futuras
aparecem em "Próximas 24 horas" quando estiverem perto, e no card PRÓXIMO no dia.

**Você vai precisar:** nada.

**Como testar:**
- [ ] Cadastrar uma consulta para amanhã: aparece na linha do tempo.
- [ ] Depois da data, ela vai para o Histórico.

---

## Fase 15 — Peso e altura

**O que muda:** um tipo **Medidas** (peso, altura, perímetro da cabeça, todos opcionais), com a evolução num gráfico.
Sem comparar com curvas de crescimento: isso fica com o pediatra.

**Você vai precisar:** nada.

**Como testar:**
- [ ] Registrar duas medidas em dias diferentes (pode usar "Outro dia"): o gráfico mostra as duas.
- [ ] Registrar só o peso: altura fica em branco sem erro.

---

## Fase 16 — Aviso de vacina

**O que muda:** ao registrar uma vacina, dá para anotar a **data da próxima dose** (como está na caderneta). Perto da
data, ela aparece na linha do tempo e no botão de Vacinas. O app não calcula o calendário sozinho, para não arriscar
orientação errada.

**Você vai precisar:** nada.

**Como testar:**
- [ ] Registrar uma vacina com próxima dose daqui a 2 dias: aparece no botão e, no dia, na linha do tempo.
- [ ] Vacinas antigas continuam iguais.

---

## Notas técnicas (para quem for implementar)

- Fase 1: guardar o id do último registro feito no aparelho e usar `store.apagarEvento(id)`; no despertar do sono,
  desfazer = `editarEvento` de volta para os dados anteriores.
- Fase 2 (feita): `js/tipos/remedio.js`; definições em `config.remedios` (JSON), tipo `remedio_<id>`, plano na aba
  `planos` com o mesmo tipo.
- Fase 3 (feita): tipo interno `ajuste` em `js/tipos/ajuste.js` (sem botão, fora do Histórico e do Resumo);
  `dados` = { chave, antes, depois }. Sem mudança no `store.js` nem no `Code.gs`.
- Fase 4: muda o `Code.gs` (retrocompatível): ação nova `lote` no `doPost` (vários itens num pedido, mesma regra de
  `adicionarSemRepetir_`) e parâmetro opcional `desde` no `doGet` (só linhas com `criado_em` depois dele; sem ele,
  devolve tudo como hoje). `garantirAbas_` não precisa rodar em todo GET. No `store.js`, só funções internas mudam
  (a API pública fica igual); o cache local junta o incremental e uma carga completa periódica corrige qualquer
  diferença. Atualizar o `SETUP.md`. (Absorve a antiga fase "App leve depois de muitos meses".)
- Fase 5: modo novo `diario` em `js/tipos/remedio.js` (com `horaRef` opcional). Tratamento concluído = plano com
  todas as doses registradas → fora de `visiveis` em `montarTipos`. Layout da tela inicial no `app.js`/`app.css`
  (rotina em grade grande, remédios em faixa compacta).
- Fase 6: só `app.js` (telas de Ajustes); tudo continua passando por `registrarAjuste`.
- Fase 7: campos novos em `dados` da alimentação (`categoria`: leite | solido | sopa, `ml`); registros antigos sem
  eles são lidos por inferência do texto (só leitura, nada é regravado). Se o formato de um campo existente mudar,
  subir `SCHEMA_VERSION` com `migrar` e teste em `tests/regras.casos.js`.
- Fase 8: funções puras em `regras.js` (janela acordado por faixa do dia, intervalo entre leites; medianas dos últimos
  14 dias; ignorar janelas acima de um limite, que indicam registro faltando), com testes. Usadas nos `status`/
  `proximos` de `sono.js` e `alimentacao.js` como `informativo` (não viram alerta).
- Fase 9: service worker com cache por versão (`v/<sha>/`), alinhado ao `versao.json` e ao `scripts/montar-site.sh`.
- Fase 10: muda o `Code.gs` (retrocompatível): `CalendarApp` ao salvar plano. Atualizar o `SETUP.md`.
