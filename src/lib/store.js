// Store global — substitui o banco. Tudo vive no AsyncStorage e e exportavel/importavel.
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATEGORIAS_PADRAO } from './categories';
import { uid, mesDe, mesAtual, deslocaMes } from './utils';

const CHAVE = '@finstats/dados/v1';
const SCHEMA = 3;

function estadoInicial() {
  return {
    schema: SCHEMA,
    criadoEm: new Date().toISOString(),
    transacoes: [],
    categorias: CATEGORIAS_PADRAO.map((c, i) => ({ ...c, padrao: true, ordem: i })),
    orcamentos: [],
    metas: [],
    // aportes de investimento — patrimonio separado do fluxo do mes
    //   recente=true  -> saiu da conta agora (reduz o saldo do mes)
    //   recente=false -> aporte historico, so soma no patrimonio
    investimentos: [],
    // gastos fixos = LISTA PROPRIA de itens recorrentes (ex: Aluguel, Netflix)
    // {id, nome, valorEsperado, categoria, ordem}
    fixos: [],
    // pagamentos por mes: { 'YYYY-MM': { fixoId: txId } } — vinculado a uma transacao
    fixosPagos: {},
    // receitas fixas = fontes recorrentes de renda (ex: Salario, Bolsa)
    // {id, nome, valorEsperado, dia, ordem}
    receitasFixas: [],
    // config de projecao: valores base usados quando falta historico (< 3 meses)
    // {receitaBase, despesaBase} — 0 = nao definido
    config: { receitaBase: 0, despesaBase: 0 },
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
  // t pode conter { fixoId } -> vincula a despesa a um gasto fixo e marca como pago no mes
  const addTransacao = useCallback((t) => {
    const novaId = uid();
    atualizar((d) => {
      const { fixoId, ...limpo } = t;
      let fixosPagos = d.fixosPagos;
      if (fixoId) {
        const ym = mesDe(t.data);
        fixosPagos = { ...fixosPagos, [ym]: { ...(fixosPagos[ym] || {}), [fixoId]: novaId } };
      }
      return {
        ...d,
        transacoes: [
          { id: novaId, criadoEm: new Date().toISOString(), ...limpo, fixoId: fixoId || null, valor: Math.abs(Number(t.valor) || 0) },
          ...d.transacoes,
        ],
        fixosPagos,
      };
    });
    return novaId;
  }, [atualizar]);

  const editTransacao = useCallback((id, patch) => {
    atualizar((d) => {
      const { fixoId, ...resto } = patch;
      const antiga = d.transacoes.find((t) => t.id === id);
      let fixosPagos = d.fixosPagos;
      // se mudou o vinculo de fixo, atualiza o mapa de pagos
      if (antiga && fixoId !== undefined && fixoId !== antiga.fixoId) {
        fixosPagos = desvincularTx(fixosPagos, id);
        if (fixoId) {
          const ym = mesDe(patch.data || antiga.data);
          fixosPagos = { ...fixosPagos, [ym]: { ...(fixosPagos[ym] || {}), [fixoId]: id } };
        }
      }
      return {
        ...d,
        fixosPagos,
        transacoes: d.transacoes.map((t) =>
          t.id === id
            ? { ...t, ...resto, ...(fixoId !== undefined ? { fixoId: fixoId || null } : {}), valor: patch.valor != null ? Math.abs(Number(patch.valor) || 0) : t.valor }
            : t
        ),
      };
    });
  }, [atualizar]);

  const delTransacao = useCallback((id) => {
    atualizar((d) => ({
      ...d,
      transacoes: d.transacoes.filter((t) => t.id !== id),
      fixosPagos: desvincularTx(d.fixosPagos, id),
    }));
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
      fixos: d.fixos.filter((f) => f.categoria !== id),
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

  // ---------- GASTOS FIXOS (lista propria) ----------
  const addFixo = useCallback((f) => {
    atualizar((d) => {
      const maxOrdem = d.fixos.reduce((m, x) => Math.max(m, x.ordem ?? 0), 0);
      return {
        ...d,
        fixos: [...d.fixos, {
          id: uid(), ordem: maxOrdem + 1,
          nome: (f.nome || '').trim(),
          valorEsperado: Math.abs(Number(f.valorEsperado) || 0),
          categoria: f.categoria || null,
        }],
      };
    });
  }, [atualizar]);

  const editFixo = useCallback((id, patch) => {
    atualizar((d) => ({
      ...d,
      fixos: d.fixos.map((f) => (f.id === id ? {
        ...f, ...patch,
        valorEsperado: patch.valorEsperado != null ? Math.abs(Number(patch.valorEsperado) || 0) : f.valorEsperado,
      } : f)),
    }));
  }, [atualizar]);

  const delFixo = useCallback((id) => {
    atualizar((d) => {
      // remove o vinculo em fixosPagos e desmarca fixoId nas transacoes
      const fixosPagos = {};
      for (const ym of Object.keys(d.fixosPagos)) {
        const mesObj = { ...d.fixosPagos[ym] };
        delete mesObj[id];
        fixosPagos[ym] = mesObj;
      }
      return {
        ...d,
        fixos: d.fixos.filter((f) => f.id !== id),
        fixosPagos,
        transacoes: d.transacoes.map((t) => (t.fixoId === id ? { ...t, fixoId: null } : t)),
      };
    });
  }, [atualizar]);

  const reordenarFixos = useCallback((listaOrdenada) => {
    atualizar((d) => {
      const ordemPorId = {};
      listaOrdenada.forEach((f, i) => { ordemPorId[f.id] = i; });
      return { ...d, fixos: d.fixos.map((f) => (ordemPorId[f.id] != null ? { ...f, ordem: ordemPorId[f.id] } : f)) };
    });
  }, [atualizar]);

  // marca/desmarca um fixo como pago SEM transacao (avulso)
  const toggleFixoPago = useCallback((fixoId, ym) => {
    atualizar((d) => {
      const mesObj = { ...(d.fixosPagos[ym] || {}) };
      if (mesObj[fixoId]) delete mesObj[fixoId];
      else mesObj[fixoId] = true;
      return { ...d, fixosPagos: { ...d.fixosPagos, [ym]: mesObj } };
    });
  }, [atualizar]);

  // ---------- RECEITAS FIXAS (fontes de renda recorrentes) ----------
  const addReceitaFixa = useCallback((r) => {
    atualizar((d) => {
      const maxOrdem = d.receitasFixas.reduce((m, x) => Math.max(m, x.ordem ?? 0), 0);
      return {
        ...d,
        receitasFixas: [...d.receitasFixas, {
          id: uid(), ordem: maxOrdem + 1,
          nome: (r.nome || '').trim(),
          valorEsperado: Math.abs(Number(r.valorEsperado) || 0),
          dia: r.dia != null ? Number(r.dia) : null,
        }],
      };
    });
  }, [atualizar]);

  const editReceitaFixa = useCallback((id, patch) => {
    atualizar((d) => ({
      ...d,
      receitasFixas: d.receitasFixas.map((r) => (r.id === id ? {
        ...r, ...patch,
        valorEsperado: patch.valorEsperado != null ? Math.abs(Number(patch.valorEsperado) || 0) : r.valorEsperado,
      } : r)),
    }));
  }, [atualizar]);

  const delReceitaFixa = useCallback((id) => {
    atualizar((d) => ({ ...d, receitasFixas: d.receitasFixas.filter((r) => r.id !== id) }));
  }, [atualizar]);

  const reordenarReceitasFixas = useCallback((listaOrdenada) => {
    atualizar((d) => {
      const ordemPorId = {};
      listaOrdenada.forEach((r, i) => { ordemPorId[r.id] = i; });
      return { ...d, receitasFixas: d.receitasFixas.map((r) => (ordemPorId[r.id] != null ? { ...r, ordem: ordemPorId[r.id] } : r)) };
    });
  }, [atualizar]);

  // ---------- CONFIG (valores base de projecao) ----------
  const setConfig = useCallback((patch) => {
    atualizar((d) => ({ ...d, config: { ...d.config, ...patch } }));
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

  // ---------- INVESTIMENTOS ----------
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
      const fixoIds = new Set(dados.fixos.map((f) => f.id));
      const novosFixos = limpo.fixos.filter((f) => !fixoIds.has(f.id));
      const merged = {
        ...dados,
        transacoes: [...novasTx, ...dados.transacoes],
        categorias: [...dados.categorias, ...novasCat],
        investimentos: [...novosInv, ...dados.investimentos],
        fixos: [...dados.fixos, ...novosFixos],
      };
      await persistir(merged);
      return { transacoes: novasTx.length, categorias: novasCat.length, investimentos: novosInv.length };
    }
    await persistir(limpo);
    return { transacoes: limpo.transacoes.length, categorias: limpo.categorias.length, investimentos: limpo.investimentos.length };
  }, [dados, persistir]);

  const resetar = useCallback(async () => { await persistir(estadoInicial()); }, [persistir]);

  const valor = useMemo(() => ({
    dados, pronto,
    addTransacao, editTransacao, delTransacao,
    addCategoria, editCategoria, delCategoria, reordenarCategorias,
    addFixo, editFixo, delFixo, reordenarFixos, toggleFixoPago,
    addReceitaFixa, editReceitaFixa, delReceitaFixa, reordenarReceitasFixas,
    setConfig,
    setOrcamento,
    addMeta, editMeta, delMeta,
    addInvestimento, editInvestimento, delInvestimento,
    exportarJSON, importarJSON, resetar,
  }), [dados, pronto, addTransacao, editTransacao, delTransacao, addCategoria, editCategoria,
       delCategoria, reordenarCategorias, addFixo, editFixo, delFixo, reordenarFixos, toggleFixoPago,
       addReceitaFixa, editReceitaFixa, delReceitaFixa, reordenarReceitasFixas, setConfig,
       setOrcamento, addMeta, editMeta, delMeta, addInvestimento, editInvestimento, delInvestimento,
       exportarJSON, importarJSON, resetar]);

  return <StoreContext.Provider value={valor}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore fora do StoreProvider');
  return ctx;
}

// remove qualquer vinculo de uma transacao no mapa de fixosPagos
function desvincularTx(fixosPagos, txId) {
  const novo = {};
  for (const ym of Object.keys(fixosPagos)) {
    const mesObj = { ...fixosPagos[ym] };
    for (const fixoId of Object.keys(mesObj)) {
      if (mesObj[fixoId] === txId) delete mesObj[fixoId];
    }
    novo[ym] = mesObj;
  }
  return novo;
}

function migrar(d) {
  const base = estadoInicial();
  let categorias = Array.isArray(d.categorias) && d.categorias.length ? d.categorias : base.categorias;
  categorias = categorias.map((c, i) => ({ ...c, ordem: c.ordem ?? i }));

  // migracao v1->v2: se havia categorias com fixo:true, cria itens fixos correspondentes
  let fixos = Array.isArray(d.fixos) ? d.fixos : [];
  if (!Array.isArray(d.fixos)) {
    const antigasFixas = categorias.filter((c) => c.tipo === 'despesa' && c.fixo);
    fixos = antigasFixas.map((c, i) => ({
      id: uid(), nome: c.nome, valorEsperado: 0, categoria: c.id, ordem: i,
    }));
  }
  // remove a flag fixo das categorias (agora e entidade propria)
  categorias = categorias.map(({ fixo, ...c }) => c);

  return {
    ...base,
    ...d,
    schema: SCHEMA,
    transacoes: Array.isArray(d.transacoes) ? d.transacoes : [],
    categorias,
    orcamentos: Array.isArray(d.orcamentos) ? d.orcamentos : [],
    metas: Array.isArray(d.metas) ? d.metas : [],
    investimentos: Array.isArray(d.investimentos) ? d.investimentos : [],
    fixos,
    fixosPagos: d.fixosPagos && typeof d.fixosPagos === 'object' ? d.fixosPagos : {},
    receitasFixas: Array.isArray(d.receitasFixas) ? d.receitasFixas : [],
    config: d.config && typeof d.config === 'object'
      ? { receitaBase: 0, despesaBase: 0, ...d.config }
      : { receitaBase: 0, despesaBase: 0 },
  };
}

// ============ SELETORES ============

export function txDoMes(transacoes, ym) {
  return transacoes.filter((t) => mesDe(t.data) === ym);
}

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

// ---- gastos fixos ----
// lista de fixos com status de pagamento no mes
export function fixosDoMes(fixos, fixosPagos, transacoes, ym) {
  const pagosMes = fixosPagos[ym] || {};
  return [...fixos]
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
    .map((fixo) => {
      const marca = pagosMes[fixo.id];
      const txId = typeof marca === 'string' ? marca : null;
      const tx = txId ? transacoes.find((t) => t.id === txId) : null;
      return {
        fixo,
        pago: !!marca,
        txId,
        valorPago: tx ? tx.valor : 0,
      };
    });
}

// ---- receitas fixas ----
export function totalReceitaFixa(receitasFixas = []) {
  return receitasFixas.reduce((s, r) => s + (Number(r.valorEsperado) || 0), 0);
}

// ---- PROJECAO / PLANEJAMENTO ----

// meses fechados anteriores ao atual (o mes corrente esta incompleto, entao nao entra na media)
function mesesFechados(n) {
  const out = [];
  let ym = deslocaMes(mesAtual(), -1); // comeca no mes passado
  for (let i = 0; i < n; i++) { out.unshift(ym); ym = deslocaMes(ym, -1); }
  return out;
}

// media de receita e despesa dos ultimos `n` meses fechados que tenham dados.
// retorna tambem quantos meses de fato tinham movimento (p/ saber se ha historico)
export function mediaMensal(transacoes, n = 3) {
  const meses = mesesFechados(n);
  let somaRec = 0, somaDesp = 0, mesesComDados = 0;
  for (const ym of meses) {
    const tx = txDoMes(transacoes, ym);
    if (tx.length === 0) continue;
    mesesComDados++;
    for (const t of tx) {
      if (t.tipo === 'receita') somaRec += Number(t.valor) || 0;
      else somaDesp += Number(t.valor) || 0;
    }
  }
  const div = mesesComDados || 1;
  return {
    receita: somaRec / div,
    despesa: somaDesp / div,
    mesesComDados,
    temHistorico: mesesComDados > 0,
  };
}

// monta o comparativo lado a lado (fixa cadastrada vs media) + qual sobra usar.
// config.receitaBase/despesaBase entram como fallback quando nao ha historico.
export function projecao(dados) {
  const { transacoes, receitasFixas, fixos, config } = dados;
  const media = mediaMensal(transacoes, 3);

  // coluna "fixa cadastrada": receita fixa cadastrada e despesa = soma dos gastos fixos previstos
  const receitaFixaCad = totalReceitaFixa(receitasFixas);
  const despesaFixaCad = (fixos || []).reduce((s, f) => s + (Number(f.valorEsperado) || 0), 0);

  // coluna "media 3 meses": usa historico; se nao houver, cai pro valor base do config
  const temHist = media.temHistorico;
  const receitaMedia = temHist ? media.receita : (Number(config?.receitaBase) || 0);
  const despesaMedia = temHist ? media.despesa : (Number(config?.despesaBase) || 0);

  const colFixa = { receita: receitaFixaCad, despesa: despesaFixaCad, sobra: receitaFixaCad - despesaFixaCad };
  const colMedia = { receita: receitaMedia, despesa: despesaMedia, sobra: receitaMedia - despesaMedia };

  // sobra sugerida: usa a MENOR das duas sobras positivas (conservador); se so uma existe, usa ela
  const sobras = [colFixa.sobra, colMedia.sobra].filter((s) => s > 0);
  const sobraSugerida = sobras.length ? Math.min(...sobras) : Math.max(colFixa.sobra, colMedia.sobra, 0);

  return {
    fixa: colFixa,
    media: colMedia,
    temHistorico: temHist,
    mesesComDados: media.mesesComDados,
    // precisa de valor base? (sem historico E sem receita fixa cadastrada)
    precisaBase: !temHist && receitaFixaCad === 0,
    sobraSugerida,
  };
}

// numero de meses cheios entre hoje e uma data-alvo 'YYYY-MM-DD' (minimo 1)
export function mesesAte(dataAlvoISO) {
  if (!dataAlvoISO) return 1;
  const hoje = new Date();
  const [a, m] = dataAlvoISO.split('-').map(Number);
  const alvo = new Date(a, m - 1, 1);
  const meses = (alvo.getFullYear() - hoje.getFullYear()) * 12 + (alvo.getMonth() - hoje.getMonth());
  return Math.max(1, meses);
}

// dado alvo + ja guardado + data -> quanto por mes
export function planoPorData(alvo, jaGuardado, dataAlvoISO) {
  const falta = Math.max(0, (Number(alvo) || 0) - (Number(jaGuardado) || 0));
  const meses = mesesAte(dataAlvoISO);
  return { falta, meses, mensal: falta / meses };
}

// dado alvo + ja guardado + mensal -> em quantos meses termina, e a data
export function planoPorMensal(alvo, jaGuardado, mensal) {
  const falta = Math.max(0, (Number(alvo) || 0) - (Number(jaGuardado) || 0));
  const m = Number(mensal) || 0;
  if (falta <= 0) return { falta: 0, meses: 0, dataISO: hojeMaisMeses(0) };
  if (m <= 0) return { falta, meses: Infinity, dataISO: null };
  const meses = Math.ceil(falta / m);
  return { falta, meses, dataISO: hojeMaisMeses(meses) };
}

function hojeMaisMeses(meses) {
  const d = new Date();
  d.setMonth(d.getMonth() + meses);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
