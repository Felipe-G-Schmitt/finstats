import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import { useState, useMemo } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { C, F, PALETA } from '../lib/theme';
import { useStore } from '../lib/store';
import { ICONES_DISPONIVEIS } from '../lib/categories';
import { exportarArquivo, importarArquivo } from '../lib/backup';
import { IconeCat, Botao } from '../lib/ui';

export default function AjustesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { dados, addCategoria, editCategoria, delCategoria, reordenarCategorias, exportarJSON, importarJSON, resetar } = useStore();
  const [busy, setBusy] = useState(false);

  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('despesa');
  const [icone, setIcone] = useState(ICONES_DISPONIVEIS[0]);
  const [cor, setCor] = useState(PALETA[0]);

  const despesas = useMemo(
    () => dados.categorias.filter((c) => c.tipo === 'despesa').sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
    [dados.categorias]
  );
  const receitas = useMemo(
    () => dados.categorias.filter((c) => c.tipo === 'receita').sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
    [dados.categorias]
  );

  // itens combinados: cabecalhos (nao-arrastaveis) + categorias (arrastaveis), tudo num unico DraggableFlatList
  const listaCombinada = useMemo(() => {
    return [
      { _tipo: 'header-despesa', id: 'h-despesa' },
      ...despesas.map((c) => ({ ...c, _drag: true })),
      { _tipo: 'header-receita', id: 'h-receita' },
      ...receitas.map((c) => ({ ...c, _drag: true })),
    ];
  }, [despesas, receitas]);

  function abrirNova(t) { setEditId(null); setNome(''); setTipo(t); setIcone(ICONES_DISPONIVEIS[0]); setCor(PALETA[0]); setModal(true); }
  function abrirEditar(c) { setEditId(c.id); setNome(c.nome); setTipo(c.tipo); setIcone(c.icone); setCor(c.cor); setModal(true); }
  function salvarCat() {
    if (!nome.trim()) return;
    const payload = { nome: nome.trim(), tipo, icone, cor };
    if (editId) editCategoria(editId, payload); else addCategoria(payload);
    setModal(false);
  }
  function removerCat(c) {
    Alert.alert('Remover categoria', `Remover "${c.nome}"? As transações antigas continuam, mas sem categoria definida.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => { delCategoria(c.id); setModal(false); } },
    ]);
  }

  // ao soltar: reconstroi a ordem de cada seccao a partir da lista combinada
  function onDragEnd({ data }) {
    const novaDespesa = [];
    const novaReceita = [];
    let secao = null;
    for (const item of data) {
      if (item._tipo === 'header-despesa') { secao = 'despesa'; continue; }
      if (item._tipo === 'header-receita') { secao = 'receita'; continue; }
      if (secao === 'despesa') novaDespesa.push(item);
      else if (secao === 'receita') novaReceita.push(item);
    }
    reordenarCategorias('despesa', novaDespesa);
    reordenarCategorias('receita', novaReceita);
  }

  async function onExportar() {
    setBusy(true);
    try { await exportarArquivo(exportarJSON()); }
    catch (e) { Alert.alert('Erro ao exportar', e.message); }
    finally { setBusy(false); }
  }
  async function onImportar() {
    try {
      const res = await importarArquivo();
      if (!res) return;
      Alert.alert('Importar backup', `Arquivo: ${res.nome}\n\nComo deseja importar?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Mesclar', onPress: () => fazerImport(res.texto, 'mesclar') },
        { text: 'Substituir tudo', style: 'destructive', onPress: () => fazerImport(res.texto, 'substituir') },
      ]);
    } catch (e) { Alert.alert('Erro ao importar', e.message); }
  }
  async function fazerImport(texto, modo) {
    setBusy(true);
    try {
      const r = await importarJSON(texto, modo);
      Alert.alert('Pronto!', modo === 'mesclar'
        ? `${r.transacoes} transações, ${r.categorias} categorias e ${r.investimentos} aportes novos.`
        : `Backup carregado: ${r.transacoes} transações.`);
    } catch (e) { Alert.alert('Erro ao importar', e.message); }
    finally { setBusy(false); }
  }
  function onResetar() {
    Alert.alert('Apagar tudo', 'Isso apaga transações, investimentos, fixos, orçamentos e metas. Categorias voltam ao padrão. Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar tudo', style: 'destructive', onPress: resetar },
    ]);
  }

  const renderItem = ({ item, drag, isActive }) => {
    // cabecalhos de secao
    if (item._tipo === 'header-despesa' || item._tipo === 'header-receita') {
      const ehDespesa = item._tipo === 'header-despesa';
      return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: ehDespesa ? 8 : 22, marginBottom: 10 }}>
          <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 18 }}>
            Categorias de {ehDespesa ? 'despesa' : 'receita'}
          </Text>
          <TouchableOpacity onPress={() => abrirNova(ehDespesa ? 'despesa' : 'receita')}>
            <MaterialCommunityIcons name="plus-circle" size={24} color={C.primary} />
          </TouchableOpacity>
        </View>
      );
    }
    // item de categoria arrastavel
    return (
      <ScaleDecorator>
        <View style={{
          flexDirection: 'row', alignItems: 'center', backgroundColor: isActive ? C.cardSoft : C.card,
          borderRadius: 14, padding: 12, marginBottom: 8,
        }}>
          <TouchableOpacity onLongPress={drag} delayLongPress={150} hitSlop={8} style={{ paddingRight: 10 }}>
            <MaterialCommunityIcons name="drag-vertical" size={22} color={C.mutedDim} />
          </TouchableOpacity>
          <IconeCat cat={item} size={38} />
          <TouchableOpacity activeOpacity={0.7} onPress={() => abrirEditar(item)} style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 14 }}>{item.nome}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => abrirEditar(item)} hitSlop={8} style={{ padding: 6 }}>
            <MaterialCommunityIcons name="pencil-outline" size={18} color={C.muted} />
          </TouchableOpacity>
        </View>
      </ScaleDecorator>
    );
  };

  const Header = (
    <View>
      <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 18, marginBottom: 12, marginTop: 6 }}>Backup local</Text>
      <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 8 }}>
        <Text style={{ color: C.muted, fontSize: 13, marginBottom: 14, lineHeight: 19 }}>
          Seus dados ficam só no aparelho. Exporte um .json para guardar no Drive/WhatsApp e importe de volta quando quiser.
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Botao titulo="Exportar" icone="export" onPress={onExportar} disabled={busy} style={{ flex: 1 }} />
          <Botao titulo="Importar" icone="import" cor={C.cardSoft} onPress={onImportar} disabled={busy} style={{ flex: 1 }} />
        </View>
        {busy && <ActivityIndicator color={C.primary} style={{ marginTop: 12 }} />}
      </View>

      <TouchableOpacity onPress={() => navigation.navigate('Fixos')}
        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 16, padding: 16, marginTop: 8 }}>
        <MaterialCommunityIcons name="playlist-check" size={22} color={C.primary} />
        <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 15, flex: 1, marginLeft: 12 }}>Gerenciar gastos fixos</Text>
        <MaterialCommunityIcons name="chevron-right" size={24} color={C.muted} />
      </TouchableOpacity>

      <Text style={{ color: C.mutedDim, fontSize: 12, marginTop: 14 }}>
        Segure ⠿ e arraste pra reordenar (nos dois sentidos). Toque pra editar.
      </Text>
    </View>
  );

  const Footer = (
    <View>
      <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 18, marginBottom: 12, marginTop: 22 }}>Zona de perigo</Text>
      <TouchableOpacity onPress={onResetar}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.despesaSoft, borderRadius: 16, paddingVertical: 15, marginBottom: 20 }}>
        <MaterialCommunityIcons name="trash-can-outline" size={20} color={C.despesa} />
        <Text style={{ color: C.despesa, fontFamily: F.bold, fontSize: 15 }}>Apagar todos os dados</Text>
      </TouchableOpacity>
      <Text style={{ color: C.mutedDim, fontSize: 12, textAlign: 'center' }}>
        FinStats v1.2 · {dados.transacoes.length} transações · {dados.fixos.length} fixos · {dados.investimentos.length} aportes
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, marginBottom: 10 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={{ marginRight: 10 }}>
          <MaterialCommunityIcons name="arrow-left" size={26} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 24 }}>Ajustes</Text>
      </View>

      <DraggableFlatList
        data={listaCombinada}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onDragEnd={onDragEnd}
        activationDistance={8}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 30 }}
        ListHeaderComponent={Header}
        ListFooterComponent={Footer}
      />

      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <TouchableOpacity activeOpacity={1} onPress={() => setModal(false)} style={{ flex: 1, backgroundColor: '#000a' }} />
          <ScrollView style={{ maxHeight: '90%' }} keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Math.max(insets.bottom, 20) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
              <IconeCat cat={{ icone, cor }} size={48} />
              <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 18, marginLeft: 12, flex: 1 }}>
                {editId ? 'Editar categoria' : 'Nova categoria'}
              </Text>
              <TouchableOpacity onPress={() => setModal(false)} hitSlop={10} style={{ padding: 4 }}>
                <MaterialCommunityIcons name="close" size={24} color={C.muted} />
              </TouchableOpacity>
            </View>

            <TextInput value={nome} onChangeText={setNome} placeholder="Nome da categoria" placeholderTextColor={C.mutedDim}
              style={{ backgroundColor: C.cardSoft, borderRadius: 12, padding: 14, color: C.text, fontFamily: F.reg, fontSize: 15, marginBottom: 16 }} />

            <View style={{ flexDirection: 'row', backgroundColor: C.cardSoft, borderRadius: 12, padding: 4, marginBottom: 18 }}>
              {[['despesa', 'Despesa'], ['receita', 'Receita']].map(([v, l]) => {
                const on = tipo === v;
                const c = v === 'receita' ? C.receita : C.despesa;
                return (
                  <TouchableOpacity key={v} onPress={() => setTipo(v)}
                    style={{ flex: 1, paddingVertical: 10, borderRadius: 9, backgroundColor: on ? c : 'transparent', alignItems: 'center' }}>
                    <Text style={{ color: on ? C.bg : C.muted, fontFamily: F.bold, fontSize: 13 }}>{l}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>Cor</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
              {PALETA.map((p) => (
                <TouchableOpacity key={p} onPress={() => setCor(p)}
                  style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: p, borderWidth: cor === p ? 3 : 0, borderColor: C.text }} />
              ))}
            </View>

            <Text style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>Ícone</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 }}>
              {ICONES_DISPONIVEIS.map((ic) => (
                <TouchableOpacity key={ic} onPress={() => setIcone(ic)}
                  style={{ width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
                    backgroundColor: icone === ic ? cor + '33' : C.cardSoft, borderWidth: icone === ic ? 1.5 : 0, borderColor: cor }}>
                  <MaterialCommunityIcons name={ic} size={22} color={icone === ic ? cor : C.muted} />
                </TouchableOpacity>
              ))}
            </View>

            <Botao titulo="Salvar categoria" icone="check" onPress={salvarCat} disabled={!nome.trim()} />
            {editId && (
              <TouchableOpacity onPress={() => removerCat({ id: editId, nome })} style={{ alignItems: 'center', paddingVertical: 14 }}>
                <Text style={{ color: C.despesa, fontFamily: F.bold, fontSize: 14 }}>Remover categoria</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
