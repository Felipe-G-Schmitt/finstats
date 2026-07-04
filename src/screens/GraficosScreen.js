import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useState, useMemo } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PieChart, BarChart } from 'react-native-gifted-charts';
import { C, F } from '../lib/theme';
import { useStore, resumoMes, gastosPorCategoria } from '../lib/store';
import { brl, mesAtual, ultimosMeses, rotuloMesCurto, compacto } from '../lib/utils';
import { SeletorMes, Vazio } from '../lib/ui';

export default function GraficosScreen() {
  const insets = useSafeAreaInsets();
  const { dados } = useStore();
  const [mes, setMes] = useState(mesAtual());

  const catPorId = useMemo(() => {
    const m = {}; for (const c of dados.categorias) m[c.id] = c; return m;
  }, [dados.categorias]);

  // ---- pizza: gastos por categoria no mes ----
  const gastos = useMemo(() => gastosPorCategoria(dados.transacoes, mes), [dados.transacoes, mes]);
  const totalGasto = gastos.reduce((s, g) => s + g.total, 0);

  const pieData = useMemo(() => gastos.map((g) => {
    const cat = catPorId[g.categoria];
    return {
      value: g.total,
      color: cat?.cor || C.muted,
      cat,
      pct: totalGasto > 0 ? g.total / totalGasto : 0,
    };
  }), [gastos, catPorId, totalGasto]);

  // ---- barras: evolucao dos ultimos 6 meses (entradas vs saidas) ----
  const meses6 = useMemo(() => ultimosMeses(6), []);
  const barData = useMemo(() => {
    const out = [];
    for (const ym of meses6) {
      const r = resumoMes(dados.transacoes, ym);
      const label = rotuloMesCurto(ym);
      out.push({ value: r.entradas, label, frontColor: C.receita, spacing: 2, labelTextStyle: { color: C.muted, fontSize: 10 } });
      out.push({ value: r.saidas, frontColor: C.despesa });
    }
    return out;
  }, [dados.transacoes, meses6]);

  const maxBar = useMemo(() => Math.max(1, ...barData.map((b) => b.value)), [barData]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ padding: 18, paddingTop: insets.top + 12, paddingBottom: 110 }}>
      <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 24, marginBottom: 14 }}>Gráficos</Text>

      {/* ===== Pizza ===== */}
      <View style={{ backgroundColor: C.card, borderRadius: 20, padding: 16, marginBottom: 16 }}>
        <SeletorMes mes={mes} onChange={setMes} style={{ marginBottom: 16 }} />
        <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 16, marginBottom: 4 }}>Gastos por categoria</Text>

        {pieData.length === 0 ? (
          <Vazio icone="chart-pie" texto="Sem despesas neste mês." />
        ) : (
          <>
            <View style={{ alignItems: 'center', marginVertical: 12 }}>
              <PieChart
                data={pieData}
                donut
                radius={100}
                innerRadius={62}
                innerCircleColor={C.card}
                centerLabelComponent={() => (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: C.muted, fontSize: 11 }}>Total</Text>
                    <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 15 }}>{brl(totalGasto)}</Text>
                  </View>
                )}
              />
            </View>
            {/* legenda / ranking */}
            <View style={{ marginTop: 6 }}>
              {pieData.map((d) => (
                <View key={d.cat?.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7 }}>
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: d.color, marginRight: 10 }} />
                  <MaterialCommunityIcons name={d.cat?.icone || 'help'} size={16} color={C.muted} style={{ marginRight: 6 }} />
                  <Text style={{ color: C.text, fontSize: 13, flex: 1 }}>{d.cat?.nome || 'Categoria'}</Text>
                  <Text style={{ color: C.muted, fontSize: 12, marginRight: 10 }}>{Math.round(d.pct * 100)}%</Text>
                  <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 13 }}>{brl(d.value)}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>

      {/* ===== Barras ===== */}
      <View style={{ backgroundColor: C.card, borderRadius: 20, padding: 16 }}>
        <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 16, marginBottom: 2 }}>Evolução mensal</Text>
        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 14 }}>
          <Legenda cor={C.receita} label="Entradas" />
          <Legenda cor={C.despesa} label="Saídas" />
        </View>
        {dados.transacoes.length === 0 ? (
          <Vazio icone="chart-bar" texto="Adicione transações para ver a evolução." />
        ) : (
          <BarChart
            data={barData}
            barWidth={14}
            spacing={22}
            roundedTop
            hideRules
            xAxisThickness={0}
            yAxisThickness={0}
            yAxisTextStyle={{ color: C.mutedDim, fontSize: 10 }}
            noOfSections={4}
            maxValue={Math.ceil(maxBar * 1.1)}
            formatYLabel={(v) => compacto(v)}
            height={170}
            isAnimated
          />
        )}
      </View>
    </ScrollView>
  );
}

function Legenda({ cor, label }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: cor }} />
      <Text style={{ color: C.muted, fontSize: 12 }}>{label}</Text>
    </View>
  );
}
