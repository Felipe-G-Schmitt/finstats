import { View, Text, TouchableOpacity, ScrollView, TextInput, Platform, Alert } from 'react-native';
import { useState, useMemo, useRef, useEffect } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F } from '../lib/theme';
import { useStore } from '../lib/store';
import { parseValor, hojeISO, num, diaMesExtenso } from '../lib/utils';
import { ChipCategoria } from '../lib/ui';

// teclado numerico custom -> menos toques, sem depender do teclado do sistema
const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'del'];

export default function AddScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { dados, addTransacao, editTransacao, delTransacao } = useStore();
  const editando = route.params?.transacao || null;
  const presetCategoria = route.params?.presetCategoria || null;
  const presetTipo = route.params?.presetTipo || null;

  const [tipo, setTipo] = useState(editando?.tipo || presetTipo || 'despesa');
  const [valorStr, setValorStr] = useState(editando ? num(editando.valor) : '0,00');
  const [categoria, setCategoria] = useState(editando?.categoria || presetCategoria || null);
  const [descricao, setDescricao] = useState(editando?.descricao || '');
  const [data, setData] = useState(editando?.data || hojeISO());
  const [digitando, setDigitando] = useState(!!editando); // edicao: ja parte do valor existente

  const categorias = useMemo(
    () => dados.categorias.filter((c) => c.tipo === tipo),
    [dados.categorias, tipo]
  );

  // se troca o tipo e a categoria nao bate, limpa
  useEffect(() => {
    if (categoria && !categorias.find((c) => c.id === categoria)) setCategoria(null);
  }, [tipo]);

  const valorNum = parseValor(valorStr);
  const corTipo = tipo === 'receita' ? C.receita : C.despesa;

  // ---- teclado numerico ----
  function tecla(k) {
    setDigitando(true);
    setValorStr((atual) => {
      let raw = digitando ? atual : ''; // primeiro toque zera o "0,00"
      if (k === 'del') {
        raw = raw.slice(0, -1);
      } else if (k === ',') {
        if (!raw.includes(',')) raw = (raw || '0') + ',';
      } else {
        // limita 2 casas decimais
        if (raw.includes(',')) {
          const dec = raw.split(',')[1];
          if (dec && dec.length >= 2) return raw;
        }
        raw = raw + k;
      }
      return raw === '' ? '' : raw;
    });
  }

  const displayValor = (() => {
    if (!digitando) return valorStr;
    if (valorStr === '' || valorStr === ',') return '0';
    return valorStr;
  })();

  function salvar() {
    if (valorNum <= 0 || !categoria) return;
    const payload = { tipo, valor: valorNum, categoria, descricao: descricao.trim(), data };
    if (editando) editTransacao(editando.id, payload);
    else addTransacao(payload);
    navigation.goBack();
  }

  function excluir() {
    Alert.alert(
      'Excluir transação',
      `Remover esta ${editando.tipo === 'receita' ? 'receita' : 'despesa'} de ${num(editando.valor)}? Não dá pra desfazer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => { delTransacao(editando.id); navigation.goBack(); } },
      ]
    );
  }

  const podeConfirmar = valorNum > 0 && !!categoria;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 8 }}>
      {/* topo: fechar + toggle tipo */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={{ padding: 6 }}>
          <MaterialCommunityIcons name="close" size={26} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, flexDirection: 'row', backgroundColor: C.card, borderRadius: 14, padding: 4, marginLeft: 8 }}>
          {['despesa', 'receita'].map((t) => {
            const on = tipo === t;
            const cor = t === 'receita' ? C.receita : C.despesa;
            return (
              <TouchableOpacity
                key={t} onPress={() => setTipo(t)} activeOpacity={0.8}
                style={{ flex: 1, paddingVertical: 9, borderRadius: 11, backgroundColor: on ? cor : 'transparent', alignItems: 'center' }}
              >
                <Text style={{ color: on ? C.bg : C.muted, fontFamily: F.bold, fontSize: 14 }}>
                  {t === 'receita' ? 'Receita' : 'Despesa'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {editando && (
          <TouchableOpacity onPress={excluir} hitSlop={10} style={{ padding: 6, marginLeft: 6 }}>
            <MaterialCommunityIcons name="trash-can-outline" size={24} color={C.despesa} />
          </TouchableOpacity>
        )}
      </View>

      {/* valor grande */}
      <View style={{ alignItems: 'center', paddingVertical: 14 }}>
        <Text style={{ color: C.muted, fontSize: 13, marginBottom: 2 }}>
          {tipo === 'receita' ? 'Entrada' : 'Saída'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          <Text style={{ color: corTipo, fontFamily: F.bold, fontSize: 26, marginRight: 4, marginBottom: 7 }}>R$</Text>
          <Text style={{ color: corTipo, fontFamily: F.bold, fontSize: 52, lineHeight: 58 }}>{displayValor}</Text>
        </View>
      </View>

      {/* categorias */}
      <ScrollView style={{ maxHeight: 178 }} contentContainerStyle={{ paddingHorizontal: 12 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 4 }}>
          {categorias.map((c) => (
            <ChipCategoria key={c.id} cat={c} ativo={categoria === c.id} onPress={() => setCategoria(c.id)} size={50} />
          ))}
        </View>
      </ScrollView>

      {/* descricao + data */}
      <View style={{ paddingHorizontal: 16, flexDirection: 'row', gap: 10, marginTop: 6, marginBottom: 4 }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 12 }}>
          <MaterialCommunityIcons name="text" size={18} color={C.muted} />
          <TextInput
            value={descricao} onChangeText={setDescricao}
            placeholder="Descrição (opcional)" placeholderTextColor={C.mutedDim}
            style={{ flex: 1, color: C.text, fontFamily: F.reg, fontSize: 14, paddingVertical: 11, marginLeft: 8 }}
          />
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('SelecionarData', { data, onPick: (d) => setData(d) })}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 14 }}
        >
          <MaterialCommunityIcons name="calendar" size={18} color={C.primary} />
          <Text style={{ color: C.text, fontFamily: F.reg, fontSize: 14 }}>
            {data === hojeISO() ? 'Hoje' : diaMesExtenso(data)}
          </Text>
        </TouchableOpacity>
      </View>

      {/* teclado numerico custom */}
      <View style={{ paddingHorizontal: 8, paddingBottom: Math.max(insets.bottom, 10), marginTop: 'auto' }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {TECLAS.map((k) => (
            <TouchableOpacity
              key={k} onPress={() => tecla(k)} activeOpacity={0.6}
              style={{ width: '33.33%', height: 56, justifyContent: 'center', alignItems: 'center' }}
            >
              {k === 'del'
                ? <MaterialCommunityIcons name="backspace-outline" size={24} color={C.text} />
                : <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 26 }}>{k}</Text>}
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          onPress={salvar} disabled={!podeConfirmar} activeOpacity={0.85}
          style={{
            backgroundColor: podeConfirmar ? corTipo : C.cardSoft,
            borderRadius: 18, paddingVertical: 16, alignItems: 'center', marginTop: 6,
            flexDirection: 'row', justifyContent: 'center', gap: 8,
          }}
        >
          <MaterialCommunityIcons name="check" size={22} color={podeConfirmar ? C.bg : C.mutedDim} />
          <Text style={{ color: podeConfirmar ? C.bg : C.mutedDim, fontFamily: F.bold, fontSize: 17 }}>
            {editando ? 'Salvar alteração' : 'Adicionar'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
