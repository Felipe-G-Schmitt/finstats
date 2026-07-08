# FinStats 💸

App de finanças pessoais em React Native / Expo (SDK 54), com **armazenamento 100% local** (AsyncStorage) e **export/import** de backup em `.json`. Tema dark verde-limão, fonte Geist, tab bar com botão central flutuante.

## Como rodar

```bash
npm install
npx expo start -c
```

Abra no Expo Go (Android/iOS) ou `npm run android` / `npm run ios`.

### ⚠️ Dependências novas na v1.1 (drag-and-drop)

A reordenação de categorias usa `react-native-draggable-flatlist`, que precisa de `gesture-handler` + `reanimated` + `worklets`. Se você atualizou de uma versão anterior, rode o instalador do Expo pra casar as versões certas com o SDK 54:

```bash
npx expo install react-native-gesture-handler react-native-reanimated react-native-worklets react-native-draggable-flatlist
npx expo start -c
```

> No SDK 54 **não** se adiciona o plugin do reanimated no `babel.config.js` — o `babel-preset-expo` já configura isso sozinho. O `babel.config.js` fica só com o preset. O `-c` limpa o cache do Metro.

## Novidades da v1.1

- **Investimentos separados (aba Investir).** Patrimônio investido é um total à parte, que não entra no saldo do mês. Cada aporte é marcado como:
  - **Recente** → saiu da conta agora, desconta do saldo do mês (transferência real).
  - **Histórico** → dinheiro já investido antes, só soma no patrimônio, sem mexer no saldo.
  Assim seus ~10K acumulados não quebram mais o saldo atual. Lançamento aporte a aporte, com editar e excluir.
- **Gastos fixos vs. variáveis + checklist.** Categorias de despesa têm a marca fixo/variável (nos Ajustes). A tela **Gastos fixos** (atalho na Home e nos Ajustes) é um checklist mensal: ao registrar uma despesa numa categoria fixa, ela marca sozinha; dá pra marcar manualmente também (quando pagou mas não quer lançar a transação).
- **Excluir transações.** Ao editar uma receita/despesa, tem lixeira no topo (com confirmação). O mesmo vale para aportes e metas.
- **Arrastar pra reordenar categorias.** Nos Ajustes, segure e arraste (ou use a alça ⠿) pra mudar a ordem — reflete na tela de adicionar e nos filtros.
- **X pra fechar os modais** de categoria, orçamento e meta.

## Modelo de dados (backup .json)

```json
{
  "schema": 2,
  "transacoes":    [{ "id", "tipo", "valor", "data", "categoria", "descricao" }],
  "categorias":    [{ "id", "nome", "icone", "cor", "tipo", "fixo", "ordem" }],
  "orcamentos":    [{ "id", "categoria", "limite", "mes" }],
  "metas":         [{ "id", "tipo", "alvo", "modo", "categoria" }],
  "investimentos": [{ "id", "valor", "data", "ativo", "recente" }],
  "fixosPagos":    { "YYYY-MM": { "categoriaId": "txId | true" } }
}
```

Backups da v1 (schema 1) são migrados automaticamente: categorias ganham `ordem`, e os campos novos (`investimentos`, `fixosPagos`) entram vazios.

## Estrutura

```
App.js                 GestureHandlerRootView + fontes + StoreProvider
Navigation.js          stack + tabs (Início, Histórico, +, Orçam., Investir)
src/lib/
  store.js             Context, persistência, export/import, seletores
  theme.js             tokens de cor/fonte
  utils.js             moeda BRL, datas, ids
  categories.js        categorias padrão (com flag fixo)
  ui.js                componentes reutilizáveis
  backup.js            arquivo (file-system + sharing + document-picker)
src/screens/
  AddScreen.js         lançamento rápido + excluir
  HomeScreen.js        dashboard (saldo, patrimônio, fixos, orçam., metas)
  HistoricoScreen.js   lista + filtros
  GraficosScreen.js    pizza + barras
  OrcamentosScreen.js  limites por categoria
  MetasScreen.js       metas
  InvestirScreen.js    patrimônio + aportes (recente/histórico)
  FixosScreen.js       checklist mensal de gastos fixos
  DateScreen.js        calendário
  AjustesScreen.js     categorias (drag), fixo/variável, backup, reset
```

Tudo fica só no aparelho — sem login, sem servidor. Exporte de vez em quando pra não perder.
