import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useMemo } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F } from '../lib/theme';
import { useStore, gastoCategoriaMes } from '../lib/store';
import { brl, mesAtual, parseValor, num } from '../lib/utils';
import { SeletorMes, Progresso, IconeCat, Vazio, Botao } from '../lib/ui';

export default function OrcamentosScreen() {
  const insets = useSafeAreaInsets();
  const { dados, setOrcamento } = useStore();
  const [mes, setMes] = useState(mesAtual());
  const [modal, setModal] = useState(false);
  const [catSel, setCatSel] = useState(null);
  const [limiteStr, setLimiteStr] = useState('');

  const catPorId = useMemo(() => {
    const m = {}; for (const c of dados.categorias) m[c.id] = c; return m;
  }, [dados.categorias]);

  const orcamentos = useMemo(() => {
    return dados.orcamentos
      .map((o) => {
        const gasto = gastoCategoriaMes(dados.transacoes, o.categoria, mes);
        return { ...o, gasto, pct: o.limite > 0 ? gasto / o.limite : 0, restante: o.limite - gasto, cat: catPorId[o.categoria] };
      })
      .filter((o) => o.cat)
      .sort((a, b) => b.pct - a.pct);
  }, [dados.orcamentos, dados.transacoes, mes, catPorId]);

  // categorias de despesa ainda sem orcamento
  const semOrcamento = useMemo(() => {
    const comOrc = new Set(dados.orcamentos.map((o) => o.categoria));
    return dados.categorias.filter((c) => c.tipo === 'despesa' && !comOrc.has(c.id));
  }, [dados.categorias, dados.orcamentos]);

  const totalLimite = orcamentos.reduce((s, o) => s + o.limite, 0);
  const totalGasto = orcamentos.reduce((s, o) => s + o.gasto, 0);

  function abrirNovo() { setCatSel(null); setLimiteStr(''); setModal(true); }
  function abrirEditar(o) { setCatSel(o.categoria); setLimiteStr(num(o.limite)); setModal(true); }
  function salvar() {
    if (!catSel) return;
    setOrcamento(catSel, parseValor(limiteStr));
    setModal(false);
  }
  function remover() {
    if (catSel) setOrcamento(catSel, 0);
    setModal(false);
  }

  const catModal = catSel ? catPorId[catSel] : null;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, marginBottom: 12 }}>
        <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 24 }}>Orçamentos</Text>
        <TouchableOpacity onPress={abrirNovo} style={{
          flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primary,
          paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
        }}>
          <MaterialCommunityIcons name="plus" size={18} color={C.bg} />
          <Text style={{ color: C.bg, fontFamily: F.bold, fontSize: 13 }}>Novo</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 110 }}>
        <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 14, marginBottom: 14 }}>
          <SeletorMes mes={mes} onChange={setMes} />
          {orcamentos.length > 0 && (
            <View style={{ marginTop: 14 }}>
              <Progresso pct={totalLimite > 0 ? totalGasto / totalLimite : 0} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <Text style={{ color: C.muted, fontSize: 12 }}>Gasto total</Text>
                <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 13 }}>{brl(totalGasto)} / {brl(totalLimite)}</Text>
              </View>
            </View>
          )}
        </View>

        {orcamentos.length === 0 ? (
          <Vazio icone="wallet-outline" texto={'Nenhum orçamento ainda.\nDefina um limite mensal por categoria.'} />
        ) : (
          orcamentos.map((o) => {
            const estourou = o.pct >= 1;
            const perto = o.pct >= 0.8 && o.pct < 1;
            return (
              <TouchableOpacity key={o.id} activeOpacity={0.8} onPress={() => abrirEditar(o)}
                style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 12,
                  borderWidth: estourou ? 1 : 0, borderColor: C.despesa }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <IconeCat cat={o.cat} size={40} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 15 }}>{o.cat.nome}</Text>
                    <Text style={{ color: estourou ? C.despesa : C.muted, fontSize: 12 }}>
                      {estourou
                        ? `Estourou ${brl(-o.restante)}`
                        : `Resta ${brl(o.restante)}`}
                    </Text>
                  </View>
                  {estourou && <MaterialCommunityIcons name="alert-circle" size={22} color={C.despesa} />}
                  {perto && <MaterialCommunityIcons name="alert" size={20} color={C.alerta} />}
                </View>
                <Progresso pct={o.pct} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                  <Text style={{ color: C.muted, fontSize: 12 }}>{brl(o.gasto)} de {brl(o.limite)}</Text>
                  <Text style={{ color: estourou ? C.despesa : perto ? C.alerta : C.muted, fontFamily: F.bold, fontSize: 12 }}>
                    {Math.round(o.pct * 100)}%
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* modal definir orcamento */}
      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <TouchableOpacity activeOpacity={1} onPress={() => setModal(false)} style={{ flex: 1, backgroundColor: '#000a' }} />
          <View style={{ backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Math.max(insets.bottom, 20) }}>
            <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 18, marginBottom: 16 }}>
              {catModal ? `Orçamento — ${catModal.nome}` : 'Novo orçamento'}
            </Text>

            {/* escolher categoria (so se for novo) */}
            {!catModal && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {semOrcamento.map((c) => (
                    <TouchableOpacity key={c.id} onPress={() => setCatSel(c.id)}
                      style={{ alignItems: 'center', width: 64 }}>
                      <IconeCat cat={c} size={48} />
                      <Text numberOfLines={1} style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{c.nome}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}

            <Text style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>Limite mensal</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardSoft, borderRadius: 14, paddingHorizontal: 16, marginBottom: 20 }}>
              <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 20 }}>R$</Text>
              <TextInput
                value={limiteStr} onChangeText={setLimiteStr}
                keyboardType="numeric" placeholder="0,00" placeholderTextColor={C.mutedDim}
                style={{ flex: 1, color: C.text, fontFamily: F.bold, fontSize: 24, paddingVertical: 14, marginLeft: 8 }}
              />
            </View>

            <Botao titulo="Salvar" icone="check" onPress={salvar} disabled={!catSel || parseValor(limiteStr) <= 0} />
            {catModal && (
              <TouchableOpacity onPress={remover} style={{ alignItems: 'center', paddingVertical: 14 }}>
                <Text style={{ color: C.despesa, fontFamily: F.bold, fontSize: 14 }}>Remover orçamento</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
