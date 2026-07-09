import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useState, useMemo } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { C, F } from '../lib/theme';
import { useStore, fixosDoMes } from '../lib/store';
import { brl, mesAtual, parseValor, num } from '../lib/utils';
import { SeletorMes, Progresso, IconeCat, Vazio, Botao } from '../lib/ui';

export default function FixosScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { dados, addFixo, editFixo, delFixo, reordenarFixos, toggleFixoPago } = useStore();
  const [mes, setMes] = useState(mesAtual());

  // modal
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [nome, setNome] = useState('');
  const [valorStr, setValorStr] = useState('');
  const [catSel, setCatSel] = useState(null);

  const catPorId = useMemo(() => {
    const m = {}; for (const c of dados.categorias) m[c.id] = c; return m;
  }, [dados.categorias]);
  const catsDespesa = useMemo(
    () => dados.categorias.filter((c) => c.tipo === 'despesa').sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
    [dados.categorias]
  );

  const lista = useMemo(
    () => fixosDoMes(dados.fixos, dados.fixosPagos, dados.transacoes, mes),
    [dados.fixos, dados.fixosPagos, dados.transacoes, mes]
  );

  const pagos = lista.filter((f) => f.pago).length;
  const totalEsperado = lista.reduce((s, f) => s + (f.fixo.valorEsperado || 0), 0);
  const totalPago = lista.reduce((s, f) => s + (f.pago ? (f.valorPago || f.fixo.valorEsperado) : 0), 0);
  const pct = lista.length > 0 ? pagos / lista.length : 0;

  function abrirNovo() { setEditId(null); setNome(''); setValorStr(''); setCatSel(catsDespesa[0]?.id || null); setModal(true); }
  function abrirEditar(f) { setEditId(f.id); setNome(f.nome); setValorStr(f.valorEsperado ? num(f.valorEsperado) : ''); setCatSel(f.categoria); setModal(true); }
  function salvar() {
    if (!nome.trim()) return;
    const payload = { nome: nome.trim(), valorEsperado: parseValor(valorStr), categoria: catSel };
    if (editId) editFixo(editId, payload); else addFixo(payload);
    setModal(false);
  }
  function excluir() {
    Alert.alert('Excluir gasto fixo', `Remover "${nome}" da lista? As despesas já lançadas continuam.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => { delFixo(editId); setModal(false); } },
    ]);
  }

  const catModal = catSel ? catPorId[catSel] : null;

  const renderItem = ({ item, drag, isActive }) => {
    const f = item;
    const cat = catPorId[f.fixo.categoria];
    return (
      <ScaleDecorator>
        <View style={{
          flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, marginBottom: 10,
          backgroundColor: isActive ? C.cardSoft : C.card,
        }}>
          <TouchableOpacity onLongPress={drag} delayLongPress={150} hitSlop={8} style={{ paddingRight: 10 }}>
            <MaterialCommunityIcons name="drag-vertical" size={22} color={C.mutedDim} />
          </TouchableOpacity>

          <IconeCat cat={cat} size={40} />
          <TouchableOpacity activeOpacity={0.7} onPress={() => abrirEditar(f.fixo)} style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 15 }}>{f.fixo.nome}</Text>
            <Text style={{ color: f.pago ? C.primary : C.muted, fontSize: 12 }}>
              {f.pago
                ? (f.valorPago > 0 ? `Pago · ${brl(f.valorPago)}` : 'Marcado como pago')
                : (f.fixo.valorEsperado > 0 ? `Previsto · ${brl(f.fixo.valorEsperado)}` : 'Pendente')}
            </Text>
          </TouchableOpacity>

          {!f.pago && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Add', {
                presetFixoId: f.fixo.id,
                presetCategoria: f.fixo.categoria,
                presetTipo: 'despesa',
                presetValor: f.fixo.valorEsperado || null,
              })}
              style={{ marginRight: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: C.cardSoft }}>
              <Text style={{ color: C.primary, fontFamily: F.bold, fontSize: 12 }}>Pagar</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => toggleFixoPago(f.fixo.id, mes)} hitSlop={8}
            style={{
              width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center',
              backgroundColor: f.pago ? C.primary : 'transparent',
              borderWidth: f.pago ? 0 : 2, borderColor: C.borderSoft,
            }}>
            {f.pago && <MaterialCommunityIcons name="check" size={20} color={C.bg} />}
          </TouchableOpacity>
        </View>
      </ScaleDecorator>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, marginBottom: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={{ marginRight: 10 }}>
          <MaterialCommunityIcons name="arrow-left" size={26} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 24, flex: 1 }}>Gastos fixos</Text>
        <TouchableOpacity onPress={abrirNovo} style={{
          flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primary,
          paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 }}>
          <MaterialCommunityIcons name="plus" size={18} color={C.bg} />
          <Text style={{ color: C.bg, fontFamily: F.bold, fontSize: 13 }}>Novo</Text>
        </TouchableOpacity>
      </View>

      {/* card resumo */}
      <View style={{ marginHorizontal: 18, backgroundColor: C.card, borderRadius: 20, padding: 18, marginBottom: 14 }}>
        <SeletorMes mes={mes} onChange={setMes} style={{ marginBottom: lista.length > 0 ? 16 : 0 }} />
        {lista.length > 0 && (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: C.muted, fontSize: 13 }}>{pagos} de {lista.length} pagos</Text>
              <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 13 }}>
                {brl(totalPago)}{totalEsperado > 0 ? ` / ${brl(totalEsperado)}` : ''}
              </Text>
            </View>
            <Progresso pct={pct} cor={pct >= 1 ? C.primary : C.alerta} />
          </>
        )}
      </View>

      {lista.length === 0 ? (
        <Vazio icone="playlist-plus" texto={'Nenhum gasto fixo ainda.\nCrie itens como Aluguel, Netflix, Academia — e vincule ao lançar a despesa.'} />
      ) : (
        <DraggableFlatList
          data={lista}
          keyExtractor={(item) => item.fixo.id}
          renderItem={renderItem}
          onDragEnd={({ data }) => reordenarFixos(data.map((x) => x.fixo))}
          activationDistance={8}
          containerStyle={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 110 }}
          ListFooterComponent={
            <Text style={{ color: C.mutedDim, fontSize: 12, textAlign: 'center', marginTop: 8, lineHeight: 17 }}>
              Segure ⠿ pra reordenar. Ao lançar uma despesa você pode vincular a um fixo — ele marca sozinho aqui.
            </Text>
          }
        />
      )}

      {/* modal fixo */}
      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <TouchableOpacity activeOpacity={1} onPress={() => setModal(false)} style={{ flex: 1, backgroundColor: '#000a' }} />
          <ScrollView style={{ maxHeight: '90%' }} keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Math.max(insets.bottom, 20) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 18 }}>
                {editId ? 'Editar gasto fixo' : 'Novo gasto fixo'}
              </Text>
              <TouchableOpacity onPress={() => setModal(false)} hitSlop={10}>
                <MaterialCommunityIcons name="close" size={24} color={C.muted} />
              </TouchableOpacity>
            </View>

            <TextInput value={nome} onChangeText={setNome}
              placeholder="Nome (ex: Aluguel, Netflix)" placeholderTextColor={C.mutedDim}
              style={{ backgroundColor: C.cardSoft, borderRadius: 12, padding: 14, color: C.text, fontFamily: F.reg, fontSize: 15, marginBottom: 16 }} />

            <Text style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>Valor esperado (editável ao pagar)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardSoft, borderRadius: 14, paddingHorizontal: 16, marginBottom: 16 }}>
              <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 20 }}>R$</Text>
              <TextInput value={valorStr} onChangeText={setValorStr} keyboardType="numeric"
                placeholder="0,00" placeholderTextColor={C.mutedDim}
                style={{ flex: 1, color: C.text, fontFamily: F.bold, fontSize: 22, paddingVertical: 13, marginLeft: 8 }} />
            </View>

            <Text style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}
              contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
              {catsDespesa.map((c) => (
                <TouchableOpacity key={c.id} onPress={() => setCatSel(c.id)} style={{ alignItems: 'center', width: 64 }}>
                  <View style={{ opacity: catSel === c.id ? 1 : 0.45 }}>
                    <IconeCat cat={c} size={48} />
                  </View>
                  <Text numberOfLines={1} style={{ color: catSel === c.id ? C.text : C.muted, fontSize: 11, marginTop: 4, fontFamily: catSel === c.id ? F.bold : F.reg }}>{c.nome}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Botao titulo={editId ? 'Salvar' : 'Criar gasto fixo'} icone="check" onPress={salvar} disabled={!nome.trim() || !catSel} />
            {editId && (
              <TouchableOpacity onPress={excluir} style={{ alignItems: 'center', paddingVertical: 14 }}>
                <Text style={{ color: C.despesa, fontFamily: F.bold, fontSize: 14 }}>Excluir gasto fixo</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
