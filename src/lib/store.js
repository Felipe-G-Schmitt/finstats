// Store global — substitui o banco. Tudo vive no AsyncStorage e e exportavel/importavel.
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATEGORIAS_PADRAO } from './categories';
import { uid, mesDe } from './utils';

const CHAVE = '@finstats/dados/v1';
const SCHEMA = 1;

// estado inicial (primeira vez que abre o app)
function estadoInicial() {
  return {
    schema: SCHEMA,
    criadoEm: new Date().toISOString(),
    transacoes: [],          // {id, tipo:'receita'|'despesa', valor, data:'YYYY-MM-DD', categoria, descricao, criadoEm}
    categorias: CATEGORIAS_PADRAO.map((c) => ({ ...c, padrao: true })),
    orcamentos: [],          // {id, categoria, limite, mes:'YYYY-MM'|null(recorrente)}
    metas: [],               // {id, tipo:'investir'|'limite_categoria', alvo, modo:'percent'|'valor', categoria?, mes}
  };
}

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [dados, setDados] = useState(null);   // null = carregando
  const [pronto, setPronto] = useState(false);

  // carrega do disco
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CHAVE);
        if (raw) {
          const parsed = JSON.parse(raw);
          setDados(migrar(parsed));
        } else {
          setDados(estadoInicial());
        }
      } catch (e) {
        setDados(estadoInicial());
      } finally {
        setPronto(true);
      }
    })();
  }, []);

  // persiste sempre que muda
  const persistir = useCallback(async (novo) => {
    setDados(novo);
    try { await AsyncStorage.setItem(CHAVE, JSON.stringify(novo)); } catch (e) {}
  }, []);

  // helper p/ atualizar via funcao
  const atualizar = useCallback((fn) => {
    setDados((atual) => {
      const novo = fn(atual);
      AsyncStorage.setItem(CHAVE, JSON.stringify(novo)).catch(() => {});
      return novo;
    });
  }, []);

  // ---------- TRANSACOES ----------
  const addTransacao = useCallback((t) => {
    atualizar((d) => ({
      ...d,
      transacoes: [
        { id: uid(), criadoEm: new Date().toISOString(), ...t, valor: Math.abs(Number(t.valor) || 0) },
        ...d.transacoes,
      ],
    }));
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
    atualizar((d) => ({ ...d, transacoes: d.transacoes.filter((t) => t.id !== id) }));
  }, [atualizar]);

  // ---------- CATEGORIAS ----------
  const addCategoria = useCallback((c) => {
    atualizar((d) => ({ ...d, categorias: [...d.categorias, { id: uid(), padrao: false, ...c }] }));
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

  // ---------- ORCAMENTOS ----------
  // um orcamento por categoria (recorrente, mes=null). upsert.
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

  // ---------- EXPORT / IMPORT ----------
  // gera o objeto exportavel (JSON string)
  const exportarJSON = useCallback(() => {
    return JSON.stringify({ ...dados, exportadoEm: new Date().toISOString(), app: 'FinStats' }, null, 2);
  }, [dados]);

  // recebe string JSON, valida e substitui (ou mescla)
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
      const merged = {
        ...dados,
        transacoes: [...novasTx, ...dados.transacoes],
        categorias: [...dados.categorias, ...novasCat],
      };
      await persistir(merged);
      return { transacoes: novasTx.length, categorias: novasCat.length };
    }
    await persistir(limpo);
    return { transacoes: limpo.transacoes.length, categorias: limpo.categorias.length };
  }, [dados, persistir]);

  // apaga tudo
  const resetar = useCallback(async () => {
    await persistir(estadoInicial());
  }, [persistir]);

  const valor = useMemo(() => ({
    dados, pronto,
    addTransacao, editTransacao, delTransacao,
    addCategoria, editCategoria, delCategoria,
    setOrcamento,
    addMeta, editMeta, delMeta,
    exportarJSON, importarJSON, resetar,
  }), [dados, pronto, addTransacao, editTransacao, delTransacao, addCategoria, editCategoria,
       delCategoria, setOrcamento, addMeta, editMeta, delMeta, exportarJSON, importarJSON, resetar]);

  return <StoreContext.Provider value={valor}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore fora do StoreProvider');
  return ctx;
}

// migra backups antigos p/ o schema atual (defensivo)
function migrar(d) {
  const base = estadoInicial();
  return {
    ...base,
    ...d,
    schema: SCHEMA,
    transacoes: Array.isArray(d.transacoes) ? d.transacoes : [],
    categorias: Array.isArray(d.categorias) && d.categorias.length ? d.categorias : base.categorias,
    orcamentos: Array.isArray(d.orcamentos) ? d.orcamentos : [],
    metas: Array.isArray(d.metas) ? d.metas : [],
  };
}

// ============ SELETORES (funcoes puras usadas pelas telas) ============

export function txDoMes(transacoes, ym) {
  return transacoes.filter((t) => mesDe(t.data) === ym);
}

export function resumoMes(transacoes, ym) {
  const tx = txDoMes(transacoes, ym);
  let entradas = 0, saidas = 0;
  for (const t of tx) {
    if (t.tipo === 'receita') entradas += Number(t.valor) || 0;
    else saidas += Number(t.valor) || 0;
  }
  return { entradas, saidas, saldo: entradas - saidas, qtd: tx.length };
}

// gastos por categoria no mes -> [{categoria, total}]
export function gastosPorCategoria(transacoes, ym) {
  const tx = txDoMes(transacoes, ym).filter((t) => t.tipo === 'despesa');
  const mapa = {};
  for (const t of tx) mapa[t.categoria] = (mapa[t.categoria] || 0) + (Number(t.valor) || 0);
  return Object.entries(mapa)
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total);
}

// total gasto numa categoria especifica no mes
export function gastoCategoriaMes(transacoes, categoria, ym) {
  return txDoMes(transacoes, ym)
    .filter((t) => t.tipo === 'despesa' && t.categoria === categoria)
    .reduce((s, t) => s + (Number(t.valor) || 0), 0);
}

// total investido no mes (receitas com categoria de rendimento/investimento + despesas marcadas investimento)
// aqui consideramos transacoes do tipo despesa na categoria 'investimento' como aporte
export function totalInvestidoMes(transacoes, ym) {
  return txDoMes(transacoes, ym)
    .filter((t) => t.categoria === 'investimento' || t.categoria === 'investimento_rend' || t.investimento)
    .reduce((s, t) => s + (Number(t.valor) || 0), 0);
}
