# FinStats 💸

App de finanças pessoais em React Native / Expo, com **armazenamento 100% local** (AsyncStorage) e **export/import** de backup em `.json`. Mesma arquitetura e identidade visual do Gym Stats (tema dark verde-limão, fonte Geist, tab bar com botão central flutuante).

## Como rodar

```bash
npm install
npx expo start
```

Abra no Expo Go (Android/iOS) ou rode `npm run android` / `npm run ios`.

> Requer **Expo SDK 54**. As libs de gráfico (`react-native-gifted-charts` + `react-native-svg`) já estão no `package.json`. Se o Metro reclamar de versão do svg, rode `npx expo install react-native-svg` para casar com o SDK.

## O que tem

- **Adicionar rápido** (`AddScreen`): o coração do app. Botão `+` central → tela com teclado numérico próprio, toggle Despesa/Receita, grid de categorias e data (default = hoje). Mínimo de toques: valor → categoria → adicionar.
- **Home**: saldo do mês no topo (entradas, saídas, saldo), resumo de orçamentos com alerta, metas e últimas transações. Navegação de mês com `< >`.
- **Histórico**: lista agrupada por dia, com filtro por **mês**, por **tipo** (receita/despesa) e por **categoria** (chips).
- **Gráficos**: pizza (donut) de gastos por categoria no mês + barras de evolução dos últimos 6 meses (entradas vs saídas).
- **Orçamentos**: limite mensal por categoria, barra de progresso e alerta visual (amarelo ≥80%, vermelho ao estourar).
- **Metas**: "investir X% da renda ou R$ X no mês" e "gastar no máximo R$ X em tal categoria", com progresso.
- **Categorias**: 16 pré-definidas + criação/edição livre (nome, tipo, ícone, cor) em Ajustes.
- **Backup**: exportar gera `finstats-backup-AAAA-MM-DD.json` (abre a folha de compartilhamento → salva no Drive/WhatsApp/etc). Importar lê um `.json` e permite **mesclar** ou **substituir tudo**.

## Estrutura

```
App.js                 fontes + StoreProvider
Navigation.js          stack + tabs + botão central (+)
src/lib/
  store.js             Context global, persistência AsyncStorage, export/import, seletores
  theme.js             tokens de cor/fonte + paleta de gráficos
  utils.js             moeda BRL, datas, ids (funções puras)
  categories.js        categorias e ícones padrão
  ui.js                componentes reutilizáveis (Progresso, SeletorMes, etc)
  backup.js            escrita/leitura de arquivo (expo-file-system + sharing + document-picker)
src/screens/
  AddScreen.js         lançamento rápido
  HomeScreen.js        dashboard
  HistoricoScreen.js   lista + filtros
  GraficosScreen.js    pizza + barras
  OrcamentosScreen.js  limites por categoria
  MetasScreen.js       metas
  DateScreen.js        calendário simples (sem libs)
  AjustesScreen.js     categorias + backup + reset
```

## Formato do backup

```json
{
  "schema": 1,
  "transacoes": [{ "id", "tipo", "valor", "data", "categoria", "descricao" }],
  "categorias": [{ "id", "nome", "icone", "cor", "tipo" }],
  "orcamentos": [{ "id", "categoria", "limite", "mes" }],
  "metas": [{ "id", "tipo", "alvo", "modo", "categoria" }]
}
```

O `migrar()` no `store.js` deixa o import tolerante a backups antigos/parciais.

## Notas

- Aportes de investimento: lance como **despesa** na categoria "Investimento" (ou marque `investimento: true`); a meta de investir soma essas transações no mês.
- Tudo fica só no aparelho — sem login, sem servidor. Exporte de vez em quando pra não perder.
