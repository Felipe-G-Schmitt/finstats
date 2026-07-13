import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useState, useMemo } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F } from '../lib/theme';
import {
  useStore, resumoMes, gastoCategoriaMes, totalInvestidoMes,
  projecao, planoPorData, planoPorMensal, mesesAte,
} from '../lib/store';
import { brl, mesAtual, parseValor, num, hojeISO, rotuloMes, diaMesExtenso } from '../lib/utils';
import { SeletorMes, Progresso, IconeCat, Vazio, Botao } from '../lib/ui';

export default function MetasScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { dados, addMeta, editMeta, delMeta } = useStore();
  const [mes, setMes] = useState(mesAtual());
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);

  // form comum
  const [tipo, setTipo] = useState('objetivo');   // objetivo | investir | limite_categoria
  const [alvoStr, setAlvoStr] = useState('');
  const [catSel, setCatSel] = useState(null);
  // form investir
  const [modo, setModo] = useState('valor');       // valor | percent
  // form objetivo
  const [nome, setNome] = useState('');
  const [jaStr, setJaStr] = useState('');
  const [modoPlano, setModoPlano] = useState('data'); // data | mensal
  const [dataAlvo, setDataAlvo] = useState(hojeMais(6));
  const [mensalStr, setMensalStr] = useState('');

  const catPorId = useMemo(() => {
    const m = {}; for (const c of dados.categorias) m[c.id] = c; return m;
  }, [dados.categorias]);
  const catsDespesa = useMemo(() => dados.categorias.filter((c) => c.tipo === 'despesa'), [dados.categorias]);
  const proj = useMemo(() => projecao(dados), [dados]);

  const metas = useMemo(() => {
    return dados.metas.map((m) => {
      if (m.tipo === 'objetivo') {
        const ja = Number(m.jaGuardado) || 0;
        const pct = m.alvo > 0 ? ja / m.alvo : 0;
        return { ...m, atual: ja, alvoValor: m.alvo, pct, cat: catPorId[m.categoria] };
      }
      let atual = 0, alvoValor = 0;
      if (m.tipo === 'investir') {
        atual = totalInvestidoMes(dados.investimentos, mes);
        alvoValor = m.modo === 'percent'
          ? (resumoMes(dados.transacoes, mes, dados.investimentos).entradas * m.alvo) / 100
          : m.alvo;
      } else {
        atual = gastoCategoriaMes(dados.transacoes, m.categoria, mes);
        alvoValor = m.alvo;
      }
      const pct = alvoValor > 0 ? atual / alvoValor : 0;
      return { ...m, atual, alvoValor, pct, cat: catPorId[m.categoria] };
    });
  }, [dados.metas, dados.transacoes, dados.investimentos, mes, catPorId]);

  const objetivos = metas.filter((m) => m.tipo === 'objetivo');
  const outras = metas.filter((m) => m.tipo !== 'objetivo');

  function abrirNovo() {
    setEditId(null); setTipo('objetivo'); setModo('valor'); setAlvoStr(''); setCatSel(null);
    setNome(''); setJaStr(''); setModoPlano('data'); setDataAlvo(hojeMais(6)); setMensalStr('');
    setModal(true);
  }
  function abrirEditar(m) {
    setEditId(m.id); setTipo(m.tipo); setModo(m.modo || 'valor');
    setAlvoStr(num(m.alvo)); setCatSel(m.categoria || null);
    setNome(m.nome || ''); setJaStr(m.jaGuardado ? num(m.jaGuardado) : '');
    setModoPlano(m.modoPlano || 'data');
    setDataAlvo(m.dataAlvo || hojeMais(6));
    setMensalStr(m.mensal ? num(m.mensal) : '');
    setModal(true);
  }

  function salvar() {
    if (tipo === 'objetivo') {
      const alvo = parseValor(alvoStr);
      if (!nome.trim() || alvo <= 0) return;
      const payload = {
        tipo: 'objetivo', nome: nome.trim(), alvo,
        jaGuardado: parseValor(jaStr),
        modoPlano,
        dataAlvo: modoPlano === 'data' ? dataAlvo : null,
        mensal: modoPlano === 'mensal' ? parseValor(mensalStr) : null,
      };
      if (editId) editMeta(editId, payload); else addMeta(payload);
      setModal(false);
      return;
    }
    const alvo = parseValor(alvoStr);
    if (alvo <= 0) return;
    if (tipo === 'limite_categoria' && !catSel) return;
    const payload = {
      tipo, alvo,
      modo: tipo === 'investir' ? modo : 'valor',
      categoria: tipo === 'limite_categoria' ? catSel : null,
    };
    if (editId) editMeta(editId, payload); else addMeta(payload);
    setModal(false);
  }

  function addValor(m, quanto) {
    editMeta(m.id, { jaGuardado: (Number(m.jaGuardado) || 0) + quanto });
  }

  const podeSalvar = tipo === 'objetivo'
    ? (nome.trim() && parseValor(alvoStr) > 0)
    : (parseValor(alvoStr) > 0 && (tipo === 'investir' || !!catSel));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={{ marginRight: 10 }}>
            <MaterialCommunityIcons name="arrow-left" size={26} color={C.text} />
          </TouchableOpacity>
          <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 24 }}>Metas</Text>
        </View>
        <TouchableOpacity onPress={abrirNovo} style={{
          flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primary,
          paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 }}>
          <MaterialCommunityIcons name="plus" size={18} color={C.bg} />
          <Text style={{ color: C.bg, fontFamily: F.bold, fontSize: 13 }}>Nova</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 110 }}>
        {/* objetivos/planos */}
        {objetivos.length > 0 && (
          <>
            <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 17, marginBottom: 10 }}>Planos</Text>
            {objetivos.map((m) => (
              <CardObjetivo key={m.id} m={m} proj={proj}
                onEdit={() => abrirEditar(m)} onAdd={(q) => addValor(m, q)} />
            ))}
          </>
        )}

        {/* metas mensais (investir / limite) */}
        <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 14, marginBottom: 14, marginTop: objetivos.length ? 8 : 0 }}>
          <SeletorMes mes={mes} onChange={setMes} />
        </View>

        {outras.length === 0 && objetivos.length === 0 ? (
          <Vazio icone="flag-outline" texto={'Nenhuma meta ainda.\nCrie um plano (viagem, compra), ou metas de investir e de limite de gasto.'} />
        ) : (
          outras.map((m) => {
            const ehLimite = m.tipo === 'limite_categoria';
            const ok = ehLimite ? m.pct < 1 : m.pct >= 1;
            const corBarra = ehLimite ? (m.pct >= 1 ? C.despesa : m.pct >= 0.8 ? C.alerta : C.primary) : C.primary;
            return (
              <TouchableOpacity key={m.id} activeOpacity={0.8} onPress={() => abrirEditar(m)}
                style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' }}>
                    <MaterialCommunityIcons name={ehLimite ? 'target' : 'piggy-bank-outline'} size={22} color={C.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 15 }}>
                      {ehLimite ? `Gastar até em ${m.cat?.nome || '—'}` : 'Investir este mês'}
                    </Text>
                    <Text style={{ color: C.muted, fontSize: 12 }}>
                      {m.tipo === 'investir' && m.modo === 'percent' ? `${m.alvo}% da renda · ` : ''}
                      Alvo {brl(m.alvoValor)}
                    </Text>
                  </View>
                  {ok
                    ? <MaterialCommunityIcons name="check-circle" size={22} color={C.primary} />
                    : ehLimite && m.pct >= 1 && <MaterialCommunityIcons name="alert-circle" size={22} color={C.despesa} />}
                </View>
                <Progresso pct={m.pct} cor={corBarra} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                  <Text style={{ color: C.muted, fontSize: 12 }}>{ehLimite ? 'Gasto' : 'Investido'} {brl(m.atual)}</Text>
                  <Text style={{ color: ok ? C.primary : ehLimite && m.pct >= 1 ? C.despesa : C.muted, fontFamily: F.bold, fontSize: 12 }}>
                    {Math.round(m.pct * 100)}%
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* modal */}
      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <TouchableOpacity activeOpacity={1} onPress={() => setModal(false)} style={{ flex: 1, backgroundColor: '#000a' }} />
          <ScrollView style={{ maxHeight: '92%' }} keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Math.max(insets.bottom, 20) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 18 }}>{editId ? 'Editar meta' : 'Nova meta'}</Text>
              <TouchableOpacity onPress={() => setModal(false)} hitSlop={10}>
                <MaterialCommunityIcons name="close" size={24} color={C.muted} />
              </TouchableOpacity>
            </View>

            {/* tipo de meta — 3 opcoes */}
            <View style={{ flexDirection: 'row', backgroundColor: C.cardSoft, borderRadius: 12, padding: 4, marginBottom: 18 }}>
              {[['objetivo', 'Plano', 'map-marker-path'], ['investir', 'Investir', 'piggy-bank-outline'], ['limite_categoria', 'Limite', 'target']].map(([v, l, ic]) => {
                const on = tipo === v;
                return (
                  <TouchableOpacity key={v} onPress={() => setTipo(v)}
                    style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, paddingVertical: 10, borderRadius: 9, backgroundColor: on ? C.primary : 'transparent' }}>
                    <MaterialCommunityIcons name={ic} size={15} color={on ? C.bg : C.muted} />
                    <Text style={{ color: on ? C.bg : C.muted, fontFamily: F.bold, fontSize: 12 }}>{l}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ===== FORM OBJETIVO/PLANO ===== */}
            {tipo === 'objetivo' && (
              <>
                <TextInput value={nome} onChangeText={setNome}
                  placeholder="Nome do plano (ex: Viagem Argentina)" placeholderTextColor={C.mutedDim}
                  style={{ backgroundColor: C.cardSoft, borderRadius: 12, padding: 14, color: C.text, fontFamily: F.reg, fontSize: 15, marginBottom: 14 }} />

                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>Quanto custa</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardSoft, borderRadius: 12, paddingHorizontal: 12 }}>
                      <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 15 }}>R$</Text>
                      <TextInput value={alvoStr} onChangeText={setAlvoStr} keyboardType="numeric" placeholder="0,00" placeholderTextColor={C.mutedDim}
                        style={{ flex: 1, color: C.text, fontFamily: F.bold, fontSize: 18, paddingVertical: 12, marginLeft: 6 }} />
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>Já tenho</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardSoft, borderRadius: 12, paddingHorizontal: 12 }}>
                      <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 15 }}>R$</Text>
                      <TextInput value={jaStr} onChangeText={setJaStr} keyboardType="numeric" placeholder="0,00" placeholderTextColor={C.mutedDim}
                        style={{ flex: 1, color: C.text, fontFamily: F.bold, fontSize: 18, paddingVertical: 12, marginLeft: 6 }} />
                    </View>
                  </View>
                </View>

                {/* toggle modo do plano */}
                <Text style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>Planejar por</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                  {[['data', 'Quando quero', 'calendar'], ['mensal', 'Quanto guardo', 'cash-sync']].map(([v, l, ic]) => {
                    const on = modoPlano === v;
                    return (
                      <TouchableOpacity key={v} onPress={() => setModoPlano(v)}
                        style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: 12,
                          backgroundColor: on ? C.primarySoft : C.cardSoft, borderWidth: 1.5, borderColor: on ? C.primary : 'transparent' }}>
                        <MaterialCommunityIcons name={ic} size={16} color={on ? C.primary : C.muted} />
                        <Text style={{ color: on ? C.primary : C.muted, fontFamily: F.bold, fontSize: 12 }}>{l}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {modoPlano === 'data' ? (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('SelecionarData', { data: dataAlvo, onPick: (d) => setDataAlvo(d) })}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.cardSoft, borderRadius: 12, padding: 14, marginBottom: 16 }}>
                    <MaterialCommunityIcons name="calendar" size={18} color={C.primary} />
                    <Text style={{ color: C.text, fontFamily: F.reg, fontSize: 15 }}>Meta: {diaMesExtenso(dataAlvo)} de {dataAlvo.slice(0, 4)}</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardSoft, borderRadius: 14, paddingHorizontal: 16 }}>
                      <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 18 }}>R$</Text>
                      <TextInput value={mensalStr} onChangeText={setMensalStr} keyboardType="numeric"
                        placeholder={proj.sobraSugerida > 0 ? num(Math.round(proj.sobraSugerida * 0.8)) : '0,00'}
                        placeholderTextColor={C.mutedDim}
                        style={{ flex: 1, color: C.text, fontFamily: F.bold, fontSize: 20, paddingVertical: 13, marginLeft: 8 }} />
                      <Text style={{ color: C.muted, fontSize: 13 }}>/mês</Text>
                    </View>
                    {proj.sobraSugerida > 0 && (
                      <TouchableOpacity onPress={() => setMensalStr(num(Math.round(proj.sobraSugerida * 0.8)))}>
                        <Text style={{ color: C.primary, fontSize: 12, marginTop: 8 }}>
                          Sugestão: {brl(Math.round(proj.sobraSugerida * 0.8))}/mês (80% da sua sobra)
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* previa da projecao dentro do modal */}
                <PreviaPlano
                  alvo={parseValor(alvoStr)} ja={parseValor(jaStr)}
                  modoPlano={modoPlano} dataAlvo={dataAlvo} mensal={parseValor(mensalStr)}
                  proj={proj}
                />
              </>
            )}

            {/* ===== FORM INVESTIR ===== */}
            {tipo === 'investir' && (
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
                {[['valor', 'Valor fixo (R$)'], ['percent', '% da renda']].map(([v, l]) => {
                  const on = modo === v;
                  return (
                    <TouchableOpacity key={v} onPress={() => setModo(v)}
                      style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
                        backgroundColor: on ? C.primarySoft : C.cardSoft, borderWidth: 1, borderColor: on ? C.primary : C.borderSoft }}>
                      <Text style={{ color: on ? C.primary : C.muted, fontFamily: F.bold, fontSize: 13 }}>{l}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* ===== FORM LIMITE ===== */}
            {tipo === 'limite_categoria' && (
              <>
                <Text style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>Categoria</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}
                  contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
                  {catsDespesa.map((c) => (
                    <TouchableOpacity key={c.id} onPress={() => setCatSel(c.id)} style={{ alignItems: 'center', width: 64 }}>
                      <View style={{ opacity: catSel === c.id ? 1 : 0.5 }}>
                        <IconeCat cat={c} size={48} />
                      </View>
                      <Text numberOfLines={1} style={{ color: catSel === c.id ? C.text : C.muted, fontSize: 11, marginTop: 4, fontFamily: catSel === c.id ? F.bold : F.reg }}>{c.nome}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* alvo (investir / limite) */}
            {tipo !== 'objetivo' && (
              <>
                <Text style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>
                  {tipo === 'investir' && modo === 'percent' ? 'Percentual da renda' : 'Valor alvo'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardSoft, borderRadius: 14, paddingHorizontal: 16, marginBottom: 20 }}>
                  <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 20 }}>{tipo === 'investir' && modo === 'percent' ? '%' : 'R$'}</Text>
                  <TextInput value={alvoStr} onChangeText={setAlvoStr} keyboardType="numeric"
                    placeholder={tipo === 'investir' && modo === 'percent' ? '20' : '0,00'} placeholderTextColor={C.mutedDim}
                    style={{ flex: 1, color: C.text, fontFamily: F.bold, fontSize: 24, paddingVertical: 14, marginLeft: 8 }} />
                </View>
              </>
            )}

            <Botao titulo={editId ? 'Salvar' : 'Salvar meta'} icone="check" onPress={salvar} disabled={!podeSalvar} />
            {editId && (
              <TouchableOpacity onPress={() => { delMeta(editId); setModal(false); }} style={{ alignItems: 'center', paddingVertical: 14 }}>
                <Text style={{ color: C.despesa, fontFamily: F.bold, fontSize: 14 }}>Excluir meta</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ---------- card de um objetivo/plano na lista ----------
function CardObjetivo({ m, proj, onEdit, onAdd }) {
  const [aberto, setAberto] = useState(false);
  const falta = Math.max(0, m.alvo - m.atual);
  const concluido = falta <= 0;

  // calcula projecao conforme o modo salvo
  let linhaProjecao, mensalEfetivo, aperta = false;
  if (m.modoPlano === 'mensal') {
    const r = planoPorMensal(m.alvo, m.atual, m.mensal || 0);
    mensalEfetivo = m.mensal || 0;
    linhaProjecao = r.meses === Infinity
      ? 'Defina um valor mensal pra ver a previsão'
      : `Guardando ${brl(m.mensal)}/mês → chega em ${rotuloMes(r.dataISO?.slice(0, 7))}`;
  } else {
    const r = planoPorData(m.alvo, m.atual, m.dataAlvo);
    mensalEfetivo = r.mensal;
    linhaProjecao = `Precisa de ${brl(r.mensal)}/mês pra chegar em ${rotuloMes(m.dataAlvo?.slice(0, 7))}`;
  }
  aperta = proj.sobraSugerida > 0 && mensalEfetivo > proj.sobraSugerida;

  return (
    <View style={{ backgroundColor: C.card, borderRadius: 18, padding: 16, marginBottom: 12 }}>
      <TouchableOpacity activeOpacity={0.8} onPress={onEdit}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' }}>
            <MaterialCommunityIcons name={concluido ? 'check-decagram' : 'map-marker-path'} size={22} color={C.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 16 }}>{m.nome}</Text>
            <Text style={{ color: C.muted, fontSize: 12 }}>{brl(m.atual)} de {brl(m.alvo)}</Text>
          </View>
          <Text style={{ color: C.primary, fontFamily: F.bold, fontSize: 15 }}>{Math.round(m.pct * 100)}%</Text>
        </View>
        <Progresso pct={m.pct} cor={C.primary} />
      </TouchableOpacity>

      {concluido ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
          <MaterialCommunityIcons name="party-popper" size={18} color={C.primary} />
          <Text style={{ color: C.primary, fontFamily: F.bold, fontSize: 13 }}>Meta atingida! 🎉</Text>
        </View>
      ) : (
        <View style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialCommunityIcons name={aperta ? 'alert' : 'trending-up'} size={16} color={aperta ? C.alerta : C.primary} />
            <Text style={{ color: aperta ? C.alerta : C.text, fontSize: 13, flex: 1 }}>{linhaProjecao}</Text>
          </View>
          {aperta && (
            <Text style={{ color: C.alerta, fontSize: 12, marginTop: 4, marginLeft: 22 }}>
              Isso é mais do que você costuma sobrar ({brl(proj.sobraSugerida)}/mês). Pode faltar.
            </Text>
          )}
        </View>
      )}

      {/* acoes */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
        <TouchableOpacity onPress={() => onAdd(50)} style={botaoAdd}><Text style={txtAdd}>+50</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => onAdd(100)} style={botaoAdd}><Text style={txtAdd}>+100</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => onAdd(mensalEfetivo > 0 ? Math.round(mensalEfetivo) : 200)} style={botaoAdd}>
          <Text style={txtAdd}>+{mensalEfetivo > 0 ? Math.round(mensalEfetivo) : 200}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setAberto(!aberto)} style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8 }}>
          <Text style={{ color: C.muted, fontSize: 12, fontFamily: F.bold }}>Detalhes</Text>
          <MaterialCommunityIcons name={aberto ? 'chevron-up' : 'chevron-down'} size={16} color={C.muted} />
        </TouchableOpacity>
      </View>

      {/* comparativo fixa vs media (checador de realidade) */}
      {aberto && (
        <View style={{ marginTop: 12, backgroundColor: C.cardSoft, borderRadius: 12, padding: 12 }}>
          <View style={{ flexDirection: 'row', marginBottom: 6 }}>
            <Text style={{ flex: 2, color: C.muted, fontSize: 11 }}> </Text>
            <Text style={{ flex: 1.3, color: C.muted, fontSize: 11, textAlign: 'right' }}>Fixa cad.</Text>
            <Text style={{ flex: 1.3, color: C.muted, fontSize: 11, textAlign: 'right' }}>
              {proj.temHistorico ? 'Média 3m' : 'Base'}
            </Text>
          </View>
          <LinhaComp label="Receita" a={proj.fixa.receita} b={proj.media.receita} />
          <LinhaComp label="− Despesas" a={proj.fixa.despesa} b={proj.media.despesa} />
          <View style={{ height: 1, backgroundColor: C.borderSoft, marginVertical: 6 }} />
          <LinhaComp label="= Sobra" a={proj.fixa.sobra} b={proj.media.sobra} bold />
          {!proj.temHistorico && proj.precisaBase && (
            <Text style={{ color: C.alerta, fontSize: 11, marginTop: 8 }}>
              Sem histórico ainda. Cadastre sua receita fixa ou um valor base nos Ajustes pra projeção ficar precisa.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

function LinhaComp({ label, a, b, bold }) {
  return (
    <View style={{ flexDirection: 'row', marginVertical: 2 }}>
      <Text style={{ flex: 2, color: bold ? C.text : C.muted, fontSize: 12, fontFamily: bold ? F.bold : F.reg }}>{label}</Text>
      <Text style={{ flex: 1.3, color: bold ? C.text : C.muted, fontSize: 12, textAlign: 'right', fontFamily: bold ? F.bold : F.reg }}>{brl(a)}</Text>
      <Text style={{ flex: 1.3, color: bold ? C.text : C.muted, fontSize: 12, textAlign: 'right', fontFamily: bold ? F.bold : F.reg }}>{brl(b)}</Text>
    </View>
  );
}

// previa da projecao dentro do modal (enquanto preenche)
function PreviaPlano({ alvo, ja, modoPlano, dataAlvo, mensal, proj }) {
  if (!alvo || alvo <= 0) return null;
  let texto, aperta = false, mensalEf = 0;
  if (modoPlano === 'data') {
    const r = planoPorData(alvo, ja, dataAlvo);
    mensalEf = r.mensal;
    texto = `Precisa guardar ${brl(r.mensal)}/mês (${r.meses} ${r.meses === 1 ? 'mês' : 'meses'})`;
  } else {
    const r = planoPorMensal(alvo, ja, mensal);
    mensalEf = mensal;
    texto = r.meses === Infinity ? 'Informe o valor mensal' : `Chega em ${rotuloMes(r.dataISO?.slice(0, 7))} (${r.meses} ${r.meses === 1 ? 'mês' : 'meses'})`;
  }
  aperta = proj.sobraSugerida > 0 && mensalEf > proj.sobraSugerida;
  return (
    <View style={{ backgroundColor: aperta ? C.alertaSoft : C.primarySoft, borderRadius: 12, padding: 12, marginBottom: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <MaterialCommunityIcons name={aperta ? 'alert' : 'trending-up'} size={18} color={aperta ? C.alerta : C.primary} />
        <Text style={{ color: C.text, fontSize: 13, flex: 1, fontFamily: F.bold }}>{texto}</Text>
      </View>
      {aperta && (
        <Text style={{ color: C.alerta, fontSize: 12, marginTop: 6 }}>
          Passa da sua sobra estimada ({brl(proj.sobraSugerida)}/mês).
        </Text>
      )}
    </View>
  );
}

const botaoAdd = { backgroundColor: C.cardSoft, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 };
const txtAdd = { color: C.primary, fontFamily: F.bold, fontSize: 13 };

function hojeMais(meses) {
  const d = new Date();
  d.setMonth(d.getMonth() + meses);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
