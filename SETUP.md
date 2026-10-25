# Como colocar a Rotina do bebê para funcionar

Leva uns 15 minutos, uma vez só. Você vai precisar do computador e da sua conta Google.

Endereço do app: **https://ruysalles.github.io/rotina-bebe/**

---

## 1. Criar a planilha

1. Abra [sheets.new](https://sheets.new) (cria uma planilha em branco no seu Google Drive).
2. Dê um nome, por exemplo **Rotina do bebê**.

Não precisa criar abas nem colunas: o próprio script faz isso.

## 2. Colar o código (Code.gs)

1. Na planilha, clique em **Extensões → Apps Script**.
2. Apague tudo o que estiver no arquivo `Código.gs` e cole o conteúdo de
   `E:\Trabalho\RotinaBebe\apps-script\Code.gs`.
3. Clique em **+** (ao lado de "Arquivos") → **Script**, dê o nome **Seed** e cole o conteúdo de
   `E:\Trabalho\RotinaBebe\apps-script\Seed.gs`
   (esse arquivo só existe no seu computador — ele tem os horários de remédio e não vai para o GitHub).
4. Clique no disquete (**Salvar projeto**).

## 3. Definir a chave secreta

1. No topo do editor, na lista de funções, escolha **gerarChave** e clique em **Executar**.
2. Na primeira vez o Google pede autorização:
   **Revisar permissões → escolha sua conta → Avançado → Acessar "…" (não seguro) → Permitir**.
   (O aviso aparece porque o script é seu e não passou por revisão do Google. É esperado.)
3. Embaixo, no **Registro de execução**, aparece `Chave criada: …`. **Copie essa chave** e guarde.

> Se um dia precisar trocar a chave (por exemplo, o link vazou), rode **trocarChave**.
> Os links antigos param de funcionar e vocês abrem o novo link nos celulares.

## 4. Carregar os dados iniciais (seed)

1. Escolha a função **rodarSeed** e clique em **Executar**.
2. Volte para a planilha: devem existir as abas **eventos**, **planos** e **config**, já com o plano de 14 doses
   da amoxicilina e os registros iniciais.

Pode rodar de novo sem medo: ele não duplica nada.

## 5. Publicar o Web App

1. No editor, clique em **Implantar → Nova implantação**.
2. Na engrenagem ao lado de "Selecione o tipo", escolha **App da Web**.
3. Preencha:
   - **Descrição:** Rotina do bebê
   - **Executar como:** **Eu** (seu e-mail)
   - **Quem pode acessar:** **Qualquer pessoa**
4. Clique em **Implantar** e copie a **URL do app da Web** (termina em `/exec`).

> "Qualquer pessoa" é necessário para os celulares acessarem sem login. Sem a chave secreta,
> o script não mostra nem grava nada.

## 6. Preencher o config.js (ligar o app à planilha)

O `config.js` guarda a URL do Web App e **não** fica no GitHub. No site publicado ele é gerado
automaticamente a partir de um segredo do repositório:

**Pelo site do GitHub:**
1. Abra https://github.com/RuySalles/rotina-bebe/settings/secrets/actions
2. **New repository secret** → Nome: `ROTINA_WEBAPP_URL` → Valor: a URL do passo 5 → **Add secret**.
3. Abra https://github.com/RuySalles/rotina-bebe/actions/workflows/pages.yml → **Run workflow** → **Run workflow**.
4. Espere ficar verde (1–2 minutos).

**Ou pelo terminal** (na pasta `E:\Trabalho\RotinaBebe`):

```bash
gh secret set ROTINA_WEBAPP_URL --repo RuySalles/rotina-bebe
```

```bash
gh workflow run pages.yml --repo RuySalles/rotina-bebe
```

Para testar no computador, copie `config.example.js` para `config.js` e cole a URL no lugar indicado.

## 7. Montar o link e abrir nos celulares

O link de acesso é o endereço do app + `#k=` + a chave do passo 3:

```
https://ruysalles.github.io/rotina-bebe/#k=SUA_CHAVE
```

1. Abra esse link no **seu** celular. Escolha o apelido (**Pai**).
2. Em **Ajustes**, preencha o **nome do bebê** e o **máximo de doses de Tylenol em 24h** (conforme a bula).
3. Ainda em **Ajustes**, toque em **Compartilhar link de acesso** e envie para sua esposa.
   Ela abre o link, escolhe **Mãe** e pronto.
4. Dica: no celular, use **Adicionar à tela de início** (Android: menu ⋮; iPhone: botão Compartilhar)
   para abrir como um app.

Depois do primeiro acesso a chave fica guardada no celular e some da barra de endereço.

---

## Manutenção

**Atualizei o Code.gs — e agora?**
Cole o código novo no editor, salve e vá em **Implantar → Gerenciar implantações → lápis (editar) →
Versão: Nova versão → Implantar**. A URL continua a mesma; não precisa mexer no segredo.

**Atualizações do app:** chegam sozinhas. Ao abrir o app ou voltar para ele, o celular confere se há versão
nova e recarrega (se alguém estiver digitando, aparece "Nova versão disponível · Atualizar" no topo).
A versão instalada aparece no fim da tela **Ajustes**.

**Conferir os testes:** abra https://ruysalles.github.io/rotina-bebe/tests/regras.test.html
(ou rode `node tests/rodar.mjs` na pasta do projeto).

**Ver os dados:** estão todos na planilha. A aba **eventos** só recebe linhas novas — editar ou apagar
no app cria uma linha nova que aponta para a antiga (`substitui_id`). Não edite essa aba à mão.

**Sem internet?** O app guarda os registros no celular ("Pendente (N)") e envia sozinho quando a conexão volta.
