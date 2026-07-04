import { View, Text, TouchableOpacity, ScrollView, SectionList } from 'react-native';
import { useState, useMemo } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F } from '../lib/theme';
import { useStore, txDoMes } from '../lib/store';
import { brl, mesAtual, diaMesExtenso, rotuloMes } from '../lib/utils';
import { SeletorMes, IconeCat, Vazio } from '../lib/ui';

export default function HistoricoScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { dados } = useStore();
  const [mes, setMes] = useState(mesAtual());
  const [filtroCat, setFiltroCat] = useState(null); // id ou null
  const [filtroTipo, setFiltroTipo] = useState('todos'); // todos|receita|despesa

  const catPorId = useMemo(() => {
    const m = {}; for (const c of dados.categorias) m[c.id] = c; return m;
  }, [dados.categorias]);

  // categorias que tem transacao no mes (p/ os chips de filtro)
  const catsDoMes = useMemo(() => {
    const ids = new Set(txDoMes(dados.transacoes, mes).map((t) => t.categoria));
    return dados.categorias.filter((c) => ids.has(c.id));
  }, [dados.transacoes, dados.categorias, mes]);

  // transacoes filtradas, agrupadas por dia
  const secoes = useMemo(() => {
    let tx = txDoMes(dados.transacoes, mes);
    if (filtroCat) tx = tx.filter((t) => t.categoria === filtroCat);
    if (filtroTipo !== 'todos') tx = tx.filter((t) => t.tipo === filtroTipo);
    tx.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));

    const porDia = {};
    for (const t of tx) (porDia[t.data] = porDia[t.data] || []).push(t);
    return Object.keys(porDia).sort((a, b) => (a < b ? 1 : -1)).map((dia) => ({
      title: dia,
      total: porDia[dia].reduce((s, t) => s + (t.tipo === 'receita' ? t.valor : -t.valor), 0),
      data: porDia[dia],
    }));
  }, [dados.transacoes, mes, filtroCat, filtroTipo]);

  const totalFiltrado = useMemo(
    () => secoes.reduce((s, sec) => s + sec.data.reduce((ss, t) => ss + (t.tipo === 'receita' ? t.valor : -t.valor), 0), 0),
    [secoes]
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 12 }}>
      <View style={{ paddingHorizontal: 18 }}>
        <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 24, marginBottom: 14 }}>Histórico</Text>
        <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 14, marginBottom: 12 }}>
          <SeletorMes mes={mes} onChange={setMes} />
        </View>

        {/* filtro tipo */}
        <View style={{ flexDirection: 'row', backgroundColor: C.card, borderRadius: 12, padding: 4, marginBottom: 12 }}>
          {[['todos', 'Todos'], ['receita', 'Receitas'], ['despesa', 'Despesas']].map(([v, l]) => {
            const on = filtroTipo === v;
            const cor = v === 'receita' ? C.receita : v === 'despesa' ? C.despesa : C.primary;
            return (
              <TouchableOpacity key={v} onPress={() => setFiltroTipo(v)}
                style={{ flex: 1, paddingVertical: 8, borderRadius: 9, backgroundColor: on ? cor : 'transparent', alignItems: 'center' }}>
                <Text style={{ color: on ? C.bg : C.muted, fontFamily: F.bold, fontSize: 13 }}>{l}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* chips de categoria */}
      {catsDoMes.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 18, gap: 8, paddingBottom: 12 }}>
          <ChipFiltro label="Todas" ativo={!filtroCat} onPress={() => setFiltroCat(null)} />
          {catsDoMes.map((c) => (
            <ChipFiltro key={c.id} label={c.nome} cor={c.cor} icone={c.icone}
              ativo={filtroCat === c.id} onPress={() => setFiltroCat(filtroCat === c.id ? null : c.id)} />
          ))}
        </ScrollView>
      )}

      {secoes.length === 0 ? (
        <Vazio icone="filter-remove-outline" texto={`Nada encontrado em ${rotuloMes(mes)} com esses filtros.`} />
      ) : (
        <SectionList
          sections={secoes}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 110 }}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, marginBottom: 6 }}>
              <Text style={{ color: C.muted, fontFamily: F.bold, fontSize: 13 }}>{diaMesExtenso(section.title)}</Text>
              <Text style={{ color: section.total >= 0 ? C.receita : C.despesa, fontSize: 13 }}>
                {section.total >= 0 ? '+' : ''}{brl(section.total)}
              </Text>
            </View>
          )}
          renderItem={({ item: t }) => {
            const cat = catPorId[t.categoria];
            return (
              <TouchableOpacity activeOpacity={0.7}
                onPress={() => navigation.navigate('Add', { transacao: t })}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 14, padding: 12, marginBottom: 8 }}>
                <IconeCat cat={cat} size={40} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 14 }}>{cat?.nome || 'Categoria'}</Text>
                  {!!t.descricao && <Text style={{ color: C.muted, fontSize: 12 }} numberOfLines={1}>{t.descricao}</Text>}
                </View>
                <Text style={{ color: t.tipo === 'receita' ? C.receita : C.despesa, fontFamily: F.bold, fontSize: 15 }}>
                  {t.tipo === 'receita' ? '+' : '-'}{brl(t.valor).replace('R$ ', '')}
                </Text>
              </TouchableOpacity>
            );
          }}
          ListHeaderComponent={
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
              <Text style={{ color: C.muted, fontSize: 13 }}>Resultado do filtro</Text>
              <Text style={{ color: totalFiltrado >= 0 ? C.receita : C.despesa, fontFamily: F.bold, fontSize: 16 }}>
                {totalFiltrado >= 0 ? '+' : ''}{brl(totalFiltrado)}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function ChipFiltro({ label, cor, icone, ativo, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14,
        borderRadius: 18, backgroundColor: ativo ? (cor || C.primary) : C.card,
        borderWidth: 1, borderColor: ativo ? (cor || C.primary) : C.borderSoft,
      }}>
      {icone && <MaterialCommunityIcons name={icone} size={15} color={ativo ? C.bg : (cor || C.muted)} />}
      <Text style={{ color: ativo ? C.bg : C.text, fontFamily: F.bold, fontSize: 13 }}>{label}</Text>
    </TouchableOpacity>
  );
}
