import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useMemo } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F } from '../lib/theme';
import { useStore, resumoMes, gastoCategoriaMes, totalInvestidoMes } from '../lib/store';
import { brl, mesAtual, parseValor, num } from '../lib/utils';
import { SeletorMes, Progresso, IconeCat, Vazio, Botao } from '../lib/ui';

export default function MetasScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { dados, addMeta, editMeta, delMeta } = useStore();
  const [mes, setMes] = useState(mesAtual());
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);

  // form
  const [tipo, setTipo] = useState('investir');      // investir | limite_categoria
  const [modo, setModo] = useState('valor');          // valor | percent (so investir)
  const [alvoStr, setAlvoStr] = useState('');
  const [catSel, setCatSel] = useState(null);

  const catPorId = useMemo(() => {
    const m = {}; for (const c of dados.categorias) m[c.id] = c; return m;
  }, [dados.categorias]);
  const catsDespesa = useMemo(() => dados.categorias.filter((c) => c.tipo === 'despesa'), [dados.categorias]);

  const metas = useMemo(() => {
    return dados.metas.map((m) => {
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
  }, [dados.metas, dados.transacoes, mes, catPorId]);

  function abrirNovo() {
    setEditId(null); setTipo('investir'); setModo('valor'); setAlvoStr(''); setCatSel(null); setModal(true);
  }
  function abrirEditar(m) {
    setEditId(m.id); setTipo(m.tipo); setModo(m.modo || 'valor');
    setAlvoStr(num(m.alvo)); setCatSel(m.categoria || null); setModal(true);
  }
  function salvar() {
    const alvo = modo === 'percent' && tipo === 'investir' ? Number(parseValor(alvoStr)) : parseValor(alvoStr);
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

  const podeSalvar = parseValor(alvoStr) > 0 && (tipo === 'investir' || !!catSel);

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
        <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 14, marginBottom: 14 }}>
          <SeletorMes mes={mes} onChange={setMes} />
        </View>

        {metas.length === 0 ? (
          <Vazio icone="flag-outline" texto={'Nenhuma meta ainda.\nEx: investir 20% da renda, ou gastar no máximo R$ 300 em lazer.'} />
        ) : (
          metas.map((m) => {
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
                  <Text style={{ color: C.muted, fontSize: 12 }}>
                    {ehLimite ? 'Gasto' : 'Investido'} {brl(m.atual)}
                  </Text>
                  <Text style={{ color: ok ? C.primary : ehLimite && m.pct >= 1 ? C.despesa : C.muted, fontFamily: F.bold, fontSize: 12 }}>
                    {Math.round(m.pct * 100)}%
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* modal nova/editar meta */}
      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <TouchableOpacity activeOpacity={1} onPress={() => setModal(false)} style={{ flex: 1, backgroundColor: '#000a' }} />
          <ScrollView style={{ maxHeight: '88%' }} keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Math.max(insets.bottom, 20) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 18 }}>
                {editId ? 'Editar meta' : 'Nova meta'}
              </Text>
              <TouchableOpacity onPress={() => setModal(false)} hitSlop={10}>
                <MaterialCommunityIcons name="close" size={24} color={C.muted} />
              </TouchableOpacity>
            </View>

            {/* tipo de meta */}
            <View style={{ flexDirection: 'row', backgroundColor: C.cardSoft, borderRadius: 12, padding: 4, marginBottom: 18 }}>
              {[['investir', 'Investir', 'piggy-bank-outline'], ['limite_categoria', 'Limite de gasto', 'target']].map(([v, l, ic]) => {
                const on = tipo === v;
                return (
                  <TouchableOpacity key={v} onPress={() => setTipo(v)}
                    style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 10, borderRadius: 9, backgroundColor: on ? C.primary : 'transparent' }}>
                    <MaterialCommunityIcons name={ic} size={16} color={on ? C.bg : C.muted} />
                    <Text style={{ color: on ? C.bg : C.muted, fontFamily: F.bold, fontSize: 13 }}>{l}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* se investir: escolher modo valor/percent */}
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

            {/* se limite: escolher categoria */}
            {tipo === 'limite_categoria' && (
              <>
                <Text style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>Categoria</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {catsDespesa.map((c) => (
                      <TouchableOpacity key={c.id} onPress={() => setCatSel(c.id)} style={{ alignItems: 'center', width: 64 }}>
                        <View style={{ opacity: catSel === c.id ? 1 : 0.5 }}>
                          <IconeCat cat={c} size={48} />
                        </View>
                        <Text numberOfLines={1} style={{ color: catSel === c.id ? C.text : C.muted, fontSize: 11, marginTop: 4, fontFamily: catSel === c.id ? F.bold : F.reg }}>{c.nome}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}

            {/* alvo */}
            <Text style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>
              {tipo === 'investir' && modo === 'percent' ? 'Percentual da renda' : 'Valor alvo'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardSoft, borderRadius: 14, paddingHorizontal: 16, marginBottom: 20 }}>
              <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 20 }}>
                {tipo === 'investir' && modo === 'percent' ? '%' : 'R$'}
              </Text>
              <TextInput
                value={alvoStr} onChangeText={setAlvoStr}
                keyboardType="numeric" placeholder={tipo === 'investir' && modo === 'percent' ? '20' : '0,00'}
                placeholderTextColor={C.mutedDim}
                style={{ flex: 1, color: C.text, fontFamily: F.bold, fontSize: 24, paddingVertical: 14, marginLeft: 8 }}
              />
            </View>

            <Botao titulo="Salvar meta" icone="check" onPress={salvar} disabled={!podeSalvar} />
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
