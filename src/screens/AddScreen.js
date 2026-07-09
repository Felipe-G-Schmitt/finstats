import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { useState, useMemo, useEffect } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F } from '../lib/theme';
import { useStore } from '../lib/store';
import { parseValor, hojeISO, num, diaMesExtenso, mesDe } from '../lib/utils';
import { ChipCategoria } from '../lib/ui';

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'del'];

export default function AddScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { dados, addTransacao, editTransacao, delTransacao } = useStore();
  const editando = route.params?.transacao || null;
  const presetCategoria = route.params?.presetCategoria || null;
  const presetTipo = route.params?.presetTipo || null;
  const presetFixoId = route.params?.presetFixoId || null;
  const presetValor = route.params?.presetValor || null;

  const [tipo, setTipo] = useState(editando?.tipo || presetTipo || 'despesa');
  const [valorStr, setValorStr] = useState(
    editando ? num(editando.valor) : presetValor ? num(presetValor) : '0,00'
  );
  const [categoria, setCategoria] = useState(editando?.categoria || presetCategoria || null);
  const [descricao, setDescricao] = useState(editando?.descricao || '');
  const [data, setData] = useState(editando?.data || hojeISO());
  const [fixoId, setFixoId] = useState(editando?.fixoId || presetFixoId || null);
  const [digitando, setDigitando] = useState(!!editando || !!presetValor);

  const categorias = useMemo(
    () => dados.categorias.filter((c) => c.tipo === tipo).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
    [dados.categorias, tipo]
  );

  // fixos ainda nao pagos no mes da transacao (+ o que ja esta vinculado a esta tx)
  const ym = mesDe(data);
  const fixosDisponiveis = useMemo(() => {
    if (tipo !== 'despesa') return [];
    const pagos = dados.fixosPagos[ym] || {};
    return dados.fixos
      .slice()
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
      .filter((f) => !pagos[f.id] || pagos[f.id] === editando?.id || f.id === fixoId);
  }, [dados.fixos, dados.fixosPagos, ym, tipo, editando, fixoId]);

  useEffect(() => {
    if (categoria && !categorias.find((c) => c.id === categoria)) setCategoria(null);
    if (tipo !== 'despesa' && fixoId) setFixoId(null);
  }, [tipo]);

  const valorNum = parseValor(valorStr);
  const corTipo = tipo === 'receita' ? C.receita : C.despesa;

  function tecla(k) {
    setDigitando(true);
    setValorStr((atual) => {
      let raw = digitando ? atual : '';
      if (k === 'del') raw = raw.slice(0, -1);
      else if (k === ',') { if (!raw.includes(',')) raw = (raw || '0') + ','; }
      else {
        if (raw.includes(',')) { const dec = raw.split(',')[1]; if (dec && dec.length >= 2) return raw; }
        raw = raw + k;
      }
      return raw;
    });
  }

  const displayValor = (() => {
    if (!digitando) return valorStr;
    if (valorStr === '' || valorStr === ',') return '0';
    return valorStr;
  })();

  // ao escolher um fixo, herda categoria e sugere o valor esperado
  function escolherFixo(f) {
    if (fixoId === f.id) { setFixoId(null); return; }
    setFixoId(f.id);
    if (f.categoria) setCategoria(f.categoria);
    if (f.valorEsperado > 0 && (!digitando || valorNum === 0)) {
      setValorStr(num(f.valorEsperado));
      setDigitando(true);
    }
  }

  function salvar() {
    if (valorNum <= 0 || !categoria) return;
    const payload = { tipo, valor: valorNum, categoria, descricao: descricao.trim(), data, fixoId: tipo === 'despesa' ? fixoId : null };
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
      {/* topo: fechar + toggle tipo + lixeira */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 6 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={{ padding: 6 }}>
          <MaterialCommunityIcons name="close" size={26} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, flexDirection: 'row', backgroundColor: C.card, borderRadius: 14, padding: 4, marginLeft: 8 }}>
          {['despesa', 'receita'].map((t) => {
            const on = tipo === t;
            const cor = t === 'receita' ? C.receita : C.despesa;
            return (
              <TouchableOpacity key={t} onPress={() => setTipo(t)} activeOpacity={0.8}
                style={{ flex: 1, paddingVertical: 9, borderRadius: 11, backgroundColor: on ? cor : 'transparent', alignItems: 'center' }}>
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
      <View style={{ alignItems: 'center', paddingVertical: 10 }}>
        <Text style={{ color: C.muted, fontSize: 13, marginBottom: 2 }}>
          {tipo === 'receita' ? 'Entrada' : 'Saída'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          <Text style={{ color: corTipo, fontFamily: F.bold, fontSize: 26, marginRight: 4, marginBottom: 7 }}>R$</Text>
          <Text style={{ color: corTipo, fontFamily: F.bold, fontSize: 52, lineHeight: 58 }}>{displayValor}</Text>
        </View>
      </View>

      {/* conteudo do meio rola se precisar; teclado fica fixo embaixo */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
        {/* categorias */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 4 }}>
          {categorias.map((c) => (
            <ChipCategoria key={c.id} cat={c} ativo={categoria === c.id} onPress={() => setCategoria(c.id)} size={50} />
          ))}
        </View>

        {/* vincular a gasto fixo (so despesa e se houver fixos) */}
        {tipo === 'despesa' && fixosDisponiveis.length > 0 && (
          <View style={{ marginTop: 10 }}>
            <Text style={{ color: C.muted, fontSize: 12, paddingHorizontal: 16, marginBottom: 6 }}>
              É um gasto fixo? (opcional)
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
              {fixosDisponiveis.map((f) => {
                const on = fixoId === f.id;
                return (
                  <TouchableOpacity key={f.id} onPress={() => escolherFixo(f)} activeOpacity={0.8}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14,
                      borderRadius: 19, backgroundColor: on ? C.primary : C.card,
                      borderWidth: 1, borderColor: on ? C.primary : C.borderSoft,
                    }}>
                    <MaterialCommunityIcons name={on ? 'check-circle' : 'pin-outline'} size={15} color={on ? C.bg : C.muted} />
                    <Text style={{ color: on ? C.bg : C.text, fontFamily: F.bold, fontSize: 13 }}>{f.nome}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* descricao + data (colado ao teclado) */}
      <View style={{ paddingHorizontal: 16, flexDirection: 'row', gap: 10, marginBottom: 8 }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 12 }}>
          <MaterialCommunityIcons name="text" size={18} color={C.muted} />
          <TextInput value={descricao} onChangeText={setDescricao}
            placeholder="Descrição (opcional)" placeholderTextColor={C.mutedDim}
            style={{ flex: 1, color: C.text, fontFamily: F.reg, fontSize: 14, paddingVertical: 11, marginLeft: 8 }} />
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('SelecionarData', { data, onPick: (d) => setData(d) })}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 14 }}>
          <MaterialCommunityIcons name="calendar" size={18} color={C.primary} />
          <Text style={{ color: C.text, fontFamily: F.reg, fontSize: 14 }}>
            {data === hojeISO() ? 'Hoje' : diaMesExtenso(data)}
          </Text>
        </TouchableOpacity>
      </View>

      {/* teclado numerico custom (fixo no rodape, sem espaco morto) */}
      <View style={{ paddingHorizontal: 8, paddingBottom: Math.max(insets.bottom, 10) }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {TECLAS.map((k) => (
            <TouchableOpacity key={k} onPress={() => tecla(k)} activeOpacity={0.6}
              style={{ width: '33.33%', height: 52, justifyContent: 'center', alignItems: 'center' }}>
              {k === 'del'
                ? <MaterialCommunityIcons name="backspace-outline" size={24} color={C.text} />
                : <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 26 }}>{k}</Text>}
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={salvar} disabled={!podeConfirmar} activeOpacity={0.85}
          style={{
            backgroundColor: podeConfirmar ? corTipo : C.cardSoft,
            borderRadius: 18, paddingVertical: 16, alignItems: 'center', marginTop: 4,
            flexDirection: 'row', justifyContent: 'center', gap: 8,
          }}>
          <MaterialCommunityIcons name="check" size={22} color={podeConfirmar ? C.bg : C.mutedDim} />
          <Text style={{ color: podeConfirmar ? C.bg : C.mutedDim, fontFamily: F.bold, fontSize: 17 }}>
            {editando ? 'Salvar alteração' : 'Adicionar'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
