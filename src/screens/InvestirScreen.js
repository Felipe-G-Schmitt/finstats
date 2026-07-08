import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useState, useMemo } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F } from '../lib/theme';
import { useStore, patrimonioInvestido, aportesDoMes } from '../lib/store';
import { brl, mesAtual, parseValor, num, hojeISO, diaMesExtenso, mesDe, rotuloMes } from '../lib/utils';
import { Botao, Vazio } from '../lib/ui';

export default function InvestirScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { dados, addInvestimento, editInvestimento, delInvestimento } = useStore();
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);

  // form
  const [valorStr, setValorStr] = useState('');
  const [ativo, setAtivo] = useState('');
  const [data, setData] = useState(hojeISO());
  const [recente, setRecente] = useState(false); // false = historico (nao mexe no saldo)

  const patrimonio = useMemo(() => patrimonioInvestido(dados.investimentos), [dados.investimentos]);
  const aportadoMes = useMemo(() => aportesDoMes(dados.investimentos, mesAtual()), [dados.investimentos]);

  // aportes agrupados por mes (mais recente primeiro)
  const grupos = useMemo(() => {
    const ordenados = [...dados.investimentos].sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
    const porMes = {};
    for (const inv of ordenados) {
      const ym = mesDe(inv.data);
      (porMes[ym] = porMes[ym] || []).push(inv);
    }
    return Object.keys(porMes).sort((a, b) => (a < b ? 1 : -1)).map((ym) => ({
      ym,
      total: porMes[ym].reduce((s, i) => s + (Number(i.valor) || 0), 0),
      itens: porMes[ym],
    }));
  }, [dados.investimentos]);

  function abrirNovo() {
    setEditId(null); setValorStr(''); setAtivo(''); setData(hojeISO()); setRecente(false); setModal(true);
  }
  function abrirEditar(inv) {
    setEditId(inv.id); setValorStr(num(inv.valor)); setAtivo(inv.ativo || '');
    setData(inv.data); setRecente(!!inv.recente); setModal(true);
  }
  function salvar() {
    const valor = parseValor(valorStr);
    if (valor <= 0) return;
    const payload = { valor, ativo: ativo.trim(), data, recente };
    if (editId) editInvestimento(editId, payload); else addInvestimento(payload);
    setModal(false);
  }
  function excluir() {
    Alert.alert('Excluir aporte', 'Remover este aporte do seu patrimônio?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => { delInvestimento(editId); setModal(false); } },
    ]);
  }

  const podeSalvar = parseValor(valorStr) > 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, marginBottom: 12 }}>
        <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 24 }}>Investir</Text>
        <TouchableOpacity onPress={abrirNovo} style={{
          flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primary,
          paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 }}>
          <MaterialCommunityIcons name="plus" size={18} color={C.bg} />
          <Text style={{ color: C.bg, fontFamily: F.bold, fontSize: 13 }}>Aporte</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 110 }}>
        {/* card patrimonio */}
        <View style={{ backgroundColor: C.card, borderRadius: 24, padding: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <MaterialCommunityIcons name="chart-areaspline" size={18} color={C.primary} />
            <Text style={{ color: C.muted, fontSize: 13 }}>Patrimônio total investido</Text>
          </View>
          <Text style={{ color: C.primary, fontFamily: F.bold, fontSize: 40, marginBottom: 14 }}>{brl(patrimonio)}</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, backgroundColor: C.cardSoft, borderRadius: 16, padding: 12 }}>
              <Text style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>Aportado em {rotuloMes(mesAtual())}</Text>
              <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 17 }}>{brl(aportadoMes)}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: C.cardSoft, borderRadius: 16, padding: 12 }}>
              <Text style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>Nº de aportes</Text>
              <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 17 }}>{dados.investimentos.length}</Text>
            </View>
          </View>
        </View>

        <View style={{ backgroundColor: C.primarySoft, borderRadius: 14, padding: 12, marginBottom: 16, flexDirection: 'row', gap: 8 }}>
          <MaterialCommunityIcons name="information-outline" size={18} color={C.primary} />
          <Text style={{ color: C.muted, fontSize: 12, flex: 1, lineHeight: 17 }}>
            Aportes marcados como <Text style={{ color: C.text, fontFamily: F.bold }}>recentes</Text> são descontados do saldo do mês (dinheiro que saiu da conta agora). Os <Text style={{ color: C.text, fontFamily: F.bold }}>históricos</Text> só somam no patrimônio, sem mexer no saldo.
          </Text>
        </View>

        {grupos.length === 0 ? (
          <Vazio icone="chart-areaspline" texto={'Nenhum aporte ainda.\nRegistre seus investimentos, um a um.'} />
        ) : (
          grupos.map((g) => (
            <View key={g.ym} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, marginTop: 2 }}>
                <Text style={{ color: C.muted, fontFamily: F.bold, fontSize: 13 }}>{rotuloMes(g.ym)}</Text>
                <Text style={{ color: C.primary, fontFamily: F.bold, fontSize: 13 }}>+{brl(g.total)}</Text>
              </View>
              {g.itens.map((inv) => (
                <TouchableOpacity key={inv.id} activeOpacity={0.8} onPress={() => abrirEditar(inv)}
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 8 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' }}>
                    <MaterialCommunityIcons name={inv.recente ? 'arrow-top-right' : 'history'} size={20} color={C.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 14 }}>{inv.ativo || 'Aporte'}</Text>
                    <Text style={{ color: C.muted, fontSize: 12 }}>
                      {diaMesExtenso(inv.data)} · {inv.recente ? 'recente' : 'histórico'}
                    </Text>
                  </View>
                  <Text style={{ color: C.primary, fontFamily: F.bold, fontSize: 15 }}>{brl(inv.valor)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {/* modal aporte */}
      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <TouchableOpacity activeOpacity={1} onPress={() => setModal(false)} style={{ flex: 1, backgroundColor: '#000a' }} />
          <ScrollView style={{ maxHeight: '90%' }} keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Math.max(insets.bottom, 20) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 18 }}>
                {editId ? 'Editar aporte' : 'Novo aporte'}
              </Text>
              <TouchableOpacity onPress={() => setModal(false)} hitSlop={10}>
                <MaterialCommunityIcons name="close" size={24} color={C.muted} />
              </TouchableOpacity>
            </View>

            {/* valor */}
            <Text style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>Valor do aporte</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardSoft, borderRadius: 14, paddingHorizontal: 16, marginBottom: 16 }}>
              <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 20 }}>R$</Text>
              <TextInput value={valorStr} onChangeText={setValorStr} keyboardType="numeric"
                placeholder="0,00" placeholderTextColor={C.mutedDim}
                style={{ flex: 1, color: C.text, fontFamily: F.bold, fontSize: 24, paddingVertical: 14, marginLeft: 8 }} />
            </View>

            {/* ativo (opcional) */}
            <Text style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>Onde? (opcional)</Text>
            <TextInput value={ativo} onChangeText={setAtivo}
              placeholder="Ex: Tesouro Selic, HGLG11, CDB..." placeholderTextColor={C.mutedDim}
              style={{ backgroundColor: C.cardSoft, borderRadius: 12, padding: 14, color: C.text, fontFamily: F.reg, fontSize: 15, marginBottom: 16 }} />

            {/* data */}
            <Text style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>Data do aporte</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('SelecionarData', { data, onPick: (d) => setData(d) })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.cardSoft, borderRadius: 12, padding: 14, marginBottom: 18 }}>
              <MaterialCommunityIcons name="calendar" size={18} color={C.primary} />
              <Text style={{ color: C.text, fontFamily: F.reg, fontSize: 15 }}>
                {data === hojeISO() ? 'Hoje' : diaMesExtenso(data)}
              </Text>
            </TouchableOpacity>

            {/* tipo: recente vs historico */}
            <Text style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>Tipo de aporte</Text>
            <View style={{ gap: 10, marginBottom: 20 }}>
              <OpcaoTipo
                ativo={recente} onPress={() => setRecente(true)}
                icone="arrow-top-right" titulo="Recente"
                sub="Saiu da conta agora — desconta do saldo deste mês"
              />
              <OpcaoTipo
                ativo={!recente} onPress={() => setRecente(false)}
                icone="history" titulo="Histórico"
                sub="Já investido antes — só soma no patrimônio"
              />
            </View>

            <Botao titulo={editId ? 'Salvar' : 'Adicionar aporte'} icone="check" onPress={salvar} disabled={!podeSalvar} />
            {editId && (
              <TouchableOpacity onPress={excluir} style={{ alignItems: 'center', paddingVertical: 14 }}>
                <Text style={{ color: C.despesa, fontFamily: F.bold, fontSize: 14 }}>Excluir aporte</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function OpcaoTipo({ ativo, onPress, icone, titulo, sub }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14,
        backgroundColor: ativo ? C.primarySoft : C.cardSoft,
        borderWidth: 1.5, borderColor: ativo ? C.primary : 'transparent',
      }}>
      <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: ativo ? C.primary : C.card, justifyContent: 'center', alignItems: 'center' }}>
        <MaterialCommunityIcons name={icone} size={20} color={ativo ? C.bg : C.muted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 15 }}>{titulo}</Text>
        <Text style={{ color: C.muted, fontSize: 12, marginTop: 1 }}>{sub}</Text>
      </View>
      {ativo && <MaterialCommunityIcons name="check-circle" size={22} color={C.primary} />}
    </TouchableOpacity>
  );
}
