// Store global — substitui o banco. Tudo vive no AsyncStorage e e exportavel/importavel.
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATEGORIAS_PADRAO } from './categories';
import { uid, mesDe } from './utils';

const CHAVE = '@finstats/dados/v1';
const SCHEMA = 2;

function estadoInicial() {
  return {
    schema: SCHEMA,
    criadoEm: new Date().toISOString(),
    transacoes: [],
    categorias: CATEGORIAS_PADRAO.map((c, i) => ({ ...c, padrao: true, ordem: i })),
    orcamentos: [],
    metas: [],
    // aportes de investimento — patrimonio separado do fluxo do mes
    // {id, valor, data, descricao, ativo, recente}
    //   recente=true  -> saiu da conta agora (reduz o saldo do mes)
    //   recente=false -> aporte historico, so soma no patrimonio
    investimentos: [],
    // { 'YYYY-MM': { categoriaId: txId | true } }
    fixosPagos: {},
  };
}

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [dados, setDados] = useState(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CHAVE);
        setDados(raw ? migrar(JSON.parse(raw)) : estadoInicial());
      } catch (e) {
        setDados(estadoInicial());
      } finally {
        setPronto(true);
      }
    })();
  }, []);

  const persistir = useCallback(async (novo) => {
    setDados(novo);
    try { await AsyncStorage.setItem(CHAVE, JSON.stringify(novo)); } catch (e) {}
  }, []);

  const atualizar = useCallback((fn) => {
    setDados((atual) => {
      const novo = fn(atual);
      AsyncStorage.setItem(CHAVE, JSON.stringify(novo)).catch(() => {});
      return novo;
    });
  }, []);

  // ---------- TRANSACOES ----------
  const addTransacao = useCallback((t) => {
    const novaId = uid();
    atualizar((d) => {
      let fixosPagos = d.fixosPagos;
      const cat = d.categorias.find((c) => c.id === t.categoria);
      if (cat && cat.tipo === 'despesa' && cat.fixo) {
        const ym = mesDe(t.data);
        fixosPagos = { ...fixosPagos, [ym]: { ...(fixosPagos[ym] || {}), [t.categoria]: novaId } };
      }
      return {
        ...d,
        transacoes: [
          { id: novaId, criadoEm: new Date().toISOString(), ...t, valor: Math.abs(Number(t.valor) || 0) },
          ...d.transacoes,
        ],
        fixosPagos,
      };
    });
    return novaId;
  }, [atualizar]);

  const editTransacao = useCallback((id, patch) => {
    atualizar((d) => ({
      ...d,
      transacoes: d.transacoes.map((t) =>
        t.id === id ? { ...t, ...patch, valor: patch.valor != null ? Math.abs(Number(patch.valor) || 0) : t.valor } : t
      ),
    }));
  }, [atualizar]);

  const delTransacao = useCallback((id) => {
    atualizar((d) => {
      const fixosPagos = { ...d.fixosPagos };
      for (const ym of Object.keys(fixosPagos)) {
        const mesObj = fixosPagos[ym];
        for (const catId of Object.keys(mesObj)) {
          if (mesObj[catId] === id) {
            const novo = { ...mesObj }; delete novo[catId];
            fixosPagos[ym] = novo;
          }
        }
      }
      return { ...d, transacoes: d.transacoes.filter((t) => t.id !== id), fixosPagos };
    });
  }, [atualizar]);

  // ---------- CATEGORIAS ----------
  const addCategoria = useCallback((c) => {
    atualizar((d) => {
      const maxOrdem = d.categorias.reduce((m, x) => Math.max(m, x.ordem ?? 0), 0);
      return { ...d, categorias: [...d.categorias, { id: uid(), padrao: false, ordem: maxOrdem + 1, ...c }] };
    });
  }, [atualizar]);

  const editCategoria = useCallback((id, patch) => {
    atualizar((d) => ({ ...d, categorias: d.categorias.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  }, [atualizar]);

  const delCategoria = useCallback((id) => {
    atualizar((d) => ({
      ...d,
      categorias: d.categorias.filter((c) => c.id !== id),
      orcamentos: d.orcamentos.filter((o) => o.categoria !== id),
    }));
  }, [atualizar]);

  const reordenarCategorias = useCallback((tipo, listaOrdenada) => {
    atualizar((d) => {
      const ordemPorId = {};
      listaOrdenada.forEach((c, i) => { ordemPorId[c.id] = i; });
      return {
        ...d,
        categorias: d.categorias.map((c) =>
          c.tipo === tipo && ordemPorId[c.id] != null ? { ...c, ordem: ordemPorId[c.id] } : c
        ),
      };
    });
  }, [atualizar]);

  // ---------- ORCAMENTOS ----------
  const setOrcamento = useCallback((categoria, limite) => {
    atualizar((d) => {
      const existe = d.orcamentos.find((o) => o.categoria === categoria);
      const lim = Number(limite) || 0;
      let orcamentos;
      if (existe) {
        orcamentos = lim > 0
          ? d.orcamentos.map((o) => (o.categoria === categoria ? { ...o, limite: lim } : o))
          : d.orcamentos.filter((o) => o.categoria !== categoria);
      } else if (lim > 0) {
        orcamentos = [...d.orcamentos, { id: uid(), categoria, limite: lim, mes: null }];
      } else {
        orcamentos = d.orcamentos;
      }
      return { ...d, orcamentos };
    });
  }, [atualizar]);

  // ---------- METAS ----------
  const addMeta = useCallback((m) => {
    atualizar((d) => ({ ...d, metas: [{ id: uid(), criadoEm: new Date().toISOString(), ...m }, ...d.metas] }));
  }, [atualizar]);
  const editMeta = useCallback((id, patch) => {
    atualizar((d) => ({ ...d, metas: d.metas.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  }, [atualizar]);
  const delMeta = useCallback((id) => {
    atualizar((d) => ({ ...d, metas: d.metas.filter((m) => m.id !== id) }));
  }, [atualizar]);

  // ---------- INVESTIMENTOS (patrimonio) ----------
  const addInvestimento = useCallback((inv) => {
    atualizar((d) => ({
      ...d,
      investimentos: [
        { id: uid(), criadoEm: new Date().toISOString(), ...inv, valor: Math.abs(Number(inv.valor) || 0) },
        ...d.investimentos,
      ],
    }));
  }, [atualizar]);

  const editInvestimento = useCallback((id, patch) => {
    atualizar((d) => ({
      ...d,
      investimentos: d.investimentos.map((i) =>
        i.id === id ? { ...i, ...patch, valor: patch.valor != null ? Math.abs(Number(patch.valor) || 0) : i.valor } : i
      ),
    }));
  }, [atualizar]);

  const delInvestimento = useCallback((id) => {
    atualizar((d) => ({ ...d, investimentos: d.investimentos.filter((i) => i.id !== id) }));
  }, [atualizar]);

  // ---------- CHECKLIST DE FIXOS ----------
  const toggleFixoPago = useCallback((categoriaId, ym) => {
    atualizar((d) => {
      const mesObj = { ...(d.fixosPagos[ym] || {}) };
      if (mesObj[categoriaId]) delete mesObj[categoriaId];
      else mesObj[categoriaId] = true;
      return { ...d, fixosPagos: { ...d.fixosPagos, [ym]: mesObj } };
    });
  }, [atualizar]);

  // ---------- EXPORT / IMPORT ----------
  const exportarJSON = useCallback(() => {
    return JSON.stringify({ ...dados, exportadoEm: new Date().toISOString(), app: 'FinStats' }, null, 2);
  }, [dados]);

  const importarJSON = useCallback(async (texto, modo = 'substituir') => {
    let parsed;
    try { parsed = JSON.parse(texto); } catch { throw new Error('Arquivo inválido (JSON corrompido).'); }
    if (!parsed || !Array.isArray(parsed.transacoes)) {
      throw new Error('Este arquivo não parece um backup do FinStats.');
    }
    const limpo = migrar(parsed);
    if (modo === 'mesclar' && dados) {
      const idsExist = new Set(dados.transacoes.map((t) => t.id));
      const novasTx = limpo.transacoes.filter((t) => !idsExist.has(t.id));
      const catIds = new Set(dados.categorias.map((c) => c.id));
      const novasCat = limpo.categorias.filter((c) => !catIds.has(c.id));
      const invIds = new Set(dados.investimentos.map((i) => i.id));
      const novosInv = limpo.investimentos.filter((i) => !invIds.has(i.id));
      const merged = {
        ...dados,
        transacoes: [...novasTx, ...dados.transacoes],
        categorias: [...dados.categorias, ...novasCat],
        investimentos: [...novosInv, ...dados.investimentos],
      };
      await persistir(merged);
      return { transacoes: novasTx.length, categorias: novasCat.length, investimentos: novosInv.length };
    }
    await persistir(limpo);
    return { transacoes: limpo.transacoes.length, categorias: limpo.categorias.length, investimentos: limpo.investimentos.length };
  }, [dados, persistir]);

  const resetar = useCallback(async () => {
    await persistir(estadoInicial());
  }, [persistir]);

  const valor = useMemo(() => ({
    dados, pronto,
    addTransacao, editTransacao, delTransacao,
    addCategoria, editCategoria, delCategoria, reordenarCategorias,
    setOrcamento,
    addMeta, editMeta, delMeta,
    addInvestimento, editInvestimento, delInvestimento,
    toggleFixoPago,
    exportarJSON, importarJSON, resetar,
  }), [dados, pronto, addTransacao, editTransacao, delTransacao, addCategoria, editCategoria,
       delCategoria, reordenarCategorias, setOrcamento, addMeta, editMeta, delMeta,
       addInvestimento, editInvestimento, delInvestimento, toggleFixoPago,
       exportarJSON, importarJSON, resetar]);

  return <StoreContext.Provider value={valor}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore fora do StoreProvider');
  return ctx;
}

function migrar(d) {
  const base = estadoInicial();
  let categorias = Array.isArray(d.categorias) && d.categorias.length ? d.categorias : base.categorias;
  categorias = categorias.map((c, i) => ({ ...c, ordem: c.ordem ?? i }));
  return {
    ...base,
    ...d,
    schema: SCHEMA,
    transacoes: Array.isArray(d.transacoes) ? d.transacoes : [],
    categorias,
    orcamentos: Array.isArray(d.orcamentos) ? d.orcamentos : [],
    metas: Array.isArray(d.metas) ? d.metas : [],
    investimentos: Array.isArray(d.investimentos) ? d.investimentos : [],
    fixosPagos: d.fixosPagos && typeof d.fixosPagos === 'object' ? d.fixosPagos : {},
  };
}

// ============ SELETORES ============

export function txDoMes(transacoes, ym) {
  return transacoes.filter((t) => mesDe(t.data) === ym);
}

// aportes recentes reduzem o saldo do mes (dinheiro que saiu da conta)
export function resumoMes(transacoes, ym, investimentos = []) {
  const tx = txDoMes(transacoes, ym);
  let entradas = 0, saidas = 0;
  for (const t of tx) {
    if (t.tipo === 'receita') entradas += Number(t.valor) || 0;
    else saidas += Number(t.valor) || 0;
  }
  const aportesRecentes = investimentos
    .filter((i) => i.recente && mesDe(i.data) === ym)
    .reduce((s, i) => s + (Number(i.valor) || 0), 0);
  return { entradas, saidas, aportesRecentes, saldo: entradas - saidas - aportesRecentes, qtd: tx.length };
}

export function gastosPorCategoria(transacoes, ym) {
  const tx = txDoMes(transacoes, ym).filter((t) => t.tipo === 'despesa');
  const mapa = {};
  for (const t of tx) mapa[t.categoria] = (mapa[t.categoria] || 0) + (Number(t.valor) || 0);
  return Object.entries(mapa)
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total);
}

export function gastoCategoriaMes(transacoes, categoria, ym) {
  return txDoMes(transacoes, ym)
    .filter((t) => t.tipo === 'despesa' && t.categoria === categoria)
    .reduce((s, t) => s + (Number(t.valor) || 0), 0);
}

// ---- investimentos ----
export function patrimonioInvestido(investimentos = []) {
  return investimentos.reduce((s, i) => s + (Number(i.valor) || 0), 0);
}
export function aportesDoMes(investimentos = [], ym) {
  return investimentos.filter((i) => mesDe(i.data) === ym).reduce((s, i) => s + (Number(i.valor) || 0), 0);
}
export function totalInvestidoMes(investimentos = [], ym) {
  return aportesDoMes(investimentos, ym);
}

// ---- gastos fixos / checklist ----
export function fixosDoMes(categorias, transacoes, fixosPagos, ym) {
  const fixas = categorias
    .filter((c) => c.tipo === 'despesa' && c.fixo)
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  const pagosMes = fixosPagos[ym] || {};
  return fixas.map((cat) => {
    const marca = pagosMes[cat.id];
    const gasto = gastoCategoriaMes(transacoes, cat.id, ym);
    return { cat, pago: !!marca, valorPago: gasto, txId: typeof marca === 'string' ? marca : null };
  });
}
