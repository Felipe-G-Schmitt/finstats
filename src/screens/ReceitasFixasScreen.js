import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useState, useMemo } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { C, F } from '../lib/theme';
import { useStore, totalReceitaFixa } from '../lib/store';
import { brl, parseValor, num } from '../lib/utils';
import { Botao, Vazio } from '../lib/ui';

export default function ReceitasFixasScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { dados, addReceitaFixa, editReceitaFixa, delReceitaFixa, reordenarReceitasFixas } = useStore();

  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [nome, setNome] = useState('');
  const [valorStr, setValorStr] = useState('');
  const [diaStr, setDiaStr] = useState('');

  const lista = useMemo(
    () => [...dados.receitasFixas].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
    [dados.receitasFixas]
  );
  const total = useMemo(() => totalReceitaFixa(dados.receitasFixas), [dados.receitasFixas]);

  function abrirNovo() { setEditId(null); setNome(''); setValorStr(''); setDiaStr(''); setModal(true); }
  function abrirEditar(r) { setEditId(r.id); setNome(r.nome); setValorStr(r.valorEsperado ? num(r.valorEsperado) : ''); setDiaStr(r.dia ? String(r.dia) : ''); setModal(true); }
  function salvar() {
    if (!nome.trim() || parseValor(valorStr) <= 0) return;
    let dia = parseInt(diaStr, 10);
    if (isNaN(dia) || dia < 1) dia = null; else if (dia > 31) dia = 31;
    const payload = { nome: nome.trim(), valorEsperado: parseValor(valorStr), dia };
    if (editId) editReceitaFixa(editId, payload); else addReceitaFixa(payload);
    setModal(false);
  }
  function excluir() {
    Alert.alert('Excluir receita fixa', `Remover "${nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => { delReceitaFixa(editId); setModal(false); } },
    ]);
  }

  const renderItem = ({ item: r, drag, isActive }) => (
    <ScaleDecorator>
      <View style={{
        flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, marginBottom: 10,
        backgroundColor: isActive ? C.cardSoft : C.card,
      }}>
        <TouchableOpacity onLongPress={drag} delayLongPress={150} hitSlop={8} style={{ paddingRight: 10 }}>
          <MaterialCommunityIcons name="drag-vertical" size={22} color={C.mutedDim} />
        </TouchableOpacity>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.receitaSoft, justifyContent: 'center', alignItems: 'center' }}>
          <MaterialCommunityIcons name="cash-multiple" size={20} color={C.receita} />
        </View>
        <TouchableOpacity activeOpacity={0.7} onPress={() => abrirEditar(r)} style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 15 }}>{r.nome}</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>
            {r.dia ? `Todo dia ${r.dia}` : 'Sem dia definido'}
          </Text>
        </TouchableOpacity>
        <Text style={{ color: C.receita, fontFamily: F.bold, fontSize: 15 }}>{brl(r.valorEsperado)}</Text>
      </View>
    </ScaleDecorator>
  );

  const Header = (
    <View style={{ backgroundColor: C.card, borderRadius: 20, padding: 18, marginBottom: 14 }}>
      <Text style={{ color: C.muted, fontSize: 13 }}>Receita fixa mensal prevista</Text>
      <Text style={{ color: C.receita, fontFamily: F.bold, fontSize: 34, marginTop: 2 }}>{brl(total)}</Text>
      <Text style={{ color: C.mutedDim, fontSize: 12, marginTop: 8, lineHeight: 17 }}>
        Cadastre suas fontes de renda recorrentes (salário, bolsa, freela fixo). Isso alimenta as projeções do planejamento e a meta de investir.
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, marginBottom: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={{ marginRight: 10 }}>
          <MaterialCommunityIcons name="arrow-left" size={26} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 24, flex: 1 }}>Receita fixa</Text>
        <TouchableOpacity onPress={abrirNovo} style={{
          flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primary,
          paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 }}>
          <MaterialCommunityIcons name="plus" size={18} color={C.bg} />
          <Text style={{ color: C.bg, fontFamily: F.bold, fontSize: 13 }}>Nova</Text>
        </TouchableOpacity>
      </View>

      {lista.length === 0 ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 18 }}>
          {Header}
          <Vazio icone="cash-plus" texto={'Nenhuma receita fixa ainda.\nEx: Salário, Bolsa, Freela recorrente.'} />
        </ScrollView>
      ) : (
        <DraggableFlatList
          data={lista}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          onDragEnd={({ data }) => reordenarReceitasFixas(data)}
          activationDistance={8}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40 }}
          ListHeaderComponent={Header}
          ListFooterComponent={
            <Text style={{ color: C.mutedDim, fontSize: 12, textAlign: 'center', marginTop: 8 }}>
              Segure ⠿ pra reordenar · toque pra editar.
            </Text>
          }
        />
      )}

      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <TouchableOpacity activeOpacity={1} onPress={() => setModal(false)} style={{ flex: 1, backgroundColor: '#000a' }} />
          <ScrollView style={{ maxHeight: '90%' }} keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Math.max(insets.bottom, 20) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 18 }}>
                {editId ? 'Editar receita fixa' : 'Nova receita fixa'}
              </Text>
              <TouchableOpacity onPress={() => setModal(false)} hitSlop={10}>
                <MaterialCommunityIcons name="close" size={24} color={C.muted} />
              </TouchableOpacity>
            </View>

            <TextInput value={nome} onChangeText={setNome}
              placeholder="Nome (ex: Salário, Bolsa)" placeholderTextColor={C.mutedDim}
              style={{ backgroundColor: C.cardSoft, borderRadius: 12, padding: 14, color: C.text, fontFamily: F.reg, fontSize: 15, marginBottom: 16 }} />

            <Text style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>Valor mensal</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardSoft, borderRadius: 14, paddingHorizontal: 16, marginBottom: 16 }}>
              <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 20 }}>R$</Text>
              <TextInput value={valorStr} onChangeText={setValorStr} keyboardType="numeric"
                placeholder="0,00" placeholderTextColor={C.mutedDim}
                style={{ flex: 1, color: C.text, fontFamily: F.bold, fontSize: 22, paddingVertical: 13, marginLeft: 8 }} />
            </View>

            <Text style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>Dia do recebimento (opcional)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardSoft, borderRadius: 14, paddingHorizontal: 16, marginBottom: 20 }}>
              <MaterialCommunityIcons name="calendar" size={18} color={C.muted} />
              <TextInput value={diaStr} onChangeText={setDiaStr} keyboardType="numeric" maxLength={2}
                placeholder="Ex: 5" placeholderTextColor={C.mutedDim}
                style={{ flex: 1, color: C.text, fontFamily: F.reg, fontSize: 15, paddingVertical: 13, marginLeft: 10 }} />
            </View>

            <Botao titulo={editId ? 'Salvar' : 'Criar receita fixa'} icone="check" onPress={salvar} disabled={!nome.trim() || parseValor(valorStr) <= 0} />
            {editId && (
              <TouchableOpacity onPress={excluir} style={{ alignItems: 'center', paddingVertical: 14 }}>
                <Text style={{ color: C.despesa, fontFamily: F.bold, fontSize: 14 }}>Excluir receita fixa</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
