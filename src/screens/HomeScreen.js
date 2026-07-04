import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useState, useMemo } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F } from '../lib/theme';
import { useStore, resumoMes, gastoCategoriaMes, totalInvestidoMes } from '../lib/store';
import { brl, mesAtual, diaMesExtenso, rotuloMes } from '../lib/utils';
import { SeletorMes, Progresso, IconeCat, TituloSecao, Vazio } from '../lib/ui';

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { dados } = useStore();
  const [mes, setMes] = useState(mesAtual());

  const catPorId = useMemo(() => {
    const m = {};
    for (const c of dados.categorias) m[c.id] = c;
    return m;
  }, [dados.categorias]);

  const resumo = useMemo(() => resumoMes(dados.transacoes, mes), [dados.transacoes, mes]);

  // orcamentos com progresso
  const orcamentos = useMemo(() => {
    return dados.orcamentos
      .map((o) => {
        const gasto = gastoCategoriaMes(dados.transacoes, o.categoria, mes);
        return { ...o, gasto, pct: o.limite > 0 ? gasto / o.limite : 0, cat: catPorId[o.categoria] };
      })
      .filter((o) => o.cat)
      .sort((a, b) => b.pct - a.pct);
  }, [dados.orcamentos, dados.transacoes, mes, catPorId]);

  const estourados = orcamentos.filter((o) => o.pct >= 1).length;

  // metas do mes
  const metas = useMemo(() => {
    return dados.metas.map((m) => {
      let atual = 0, alvoValor = 0;
      if (m.tipo === 'investir') {
        atual = totalInvestidoMes(dados.transacoes, mes);
        alvoValor = m.modo === 'percent'
          ? (resumoMes(dados.transacoes, mes).entradas * m.alvo) / 100
          : m.alvo;
      } else { // limite_categoria
        atual = gastoCategoriaMes(dados.transacoes, m.categoria, mes);
        alvoValor = m.alvo;
      }
      return { ...m, atual, alvoValor, cat: catPorId[m.categoria] };
    });
  }, [dados.metas, dados.transacoes, mes, catPorId]);

  const ultimas = useMemo(
    () => dados.transacoes.filter((t) => t.data.slice(0, 7) === mes).slice(0, 5),
    [dados.transacoes, mes]
  );

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 18, paddingTop: insets.top + 14, paddingBottom: 110 }}>
      {/* header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <View>
          <Text style={{ color: C.muted, fontSize: 14 }}>Seu dinheiro</Text>
          <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 26 }}>FinStats 💸</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <TouchableOpacity onPress={() => navigation.navigate('Graficos')} style={{ padding: 4 }}>
            <MaterialCommunityIcons name="chart-pie" size={25} color={C.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Ajustes')} style={{ padding: 4 }}>
            <MaterialCommunityIcons name="cog-outline" size={26} color={C.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* card de saldo */}
      <View style={{ backgroundColor: C.card, borderRadius: 24, padding: 20, marginBottom: 16 }}>
        <SeletorMes mes={mes} onChange={setMes} style={{ marginBottom: 16 }} />
        <Text style={{ color: C.muted, fontSize: 13 }}>Saldo do mês</Text>
        <Text style={{
          color: resumo.saldo >= 0 ? C.receita : C.despesa,
          fontFamily: F.bold, fontSize: 40, marginTop: 2, marginBottom: 16,
        }}>
          {brl(resumo.saldo)}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Resumo icone="arrow-down-circle" cor={C.receita} label="Entradas" valor={resumo.entradas} />
          <Resumo icone="arrow-up-circle" cor={C.despesa} label="Saídas" valor={resumo.saidas} />
        </View>
      </View>

      {/* orcamentos */}
      {orcamentos.length > 0 && (
        <View style={{ marginBottom: 8 }}>
          <TituloSecao
            acao={
              <TouchableOpacity onPress={() => navigation.navigate('Tabs', { screen: 'Orcamentos' })}>
                <Text style={{ color: C.primary, fontFamily: F.bold, fontSize: 13 }}>Ver todos</Text>
              </TouchableOpacity>
            }
          >
            Orçamentos {estourados > 0 ? `(${estourados} estourado${estourados > 1 ? 's' : ''})` : ''}
          </TituloSecao>
          {orcamentos.slice(0, 3).map((o) => (
            <View key={o.id} style={{ backgroundColor: C.card, borderRadius: 16, padding: 14, marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <IconeCat cat={o.cat} size={34} />
                <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 14, marginLeft: 10, flex: 1 }}>{o.cat.nome}</Text>
                {o.pct >= 1 && <MaterialCommunityIcons name="alert" size={18} color={C.despesa} />}
                {o.pct >= 0.8 && o.pct < 1 && <MaterialCommunityIcons name="alert-outline" size={18} color={C.alerta} />}
              </View>
              <Progresso pct={o.pct} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={{ color: o.pct >= 1 ? C.despesa : C.muted, fontSize: 12 }}>
                  {brl(o.gasto)} de {brl(o.limite)}
                </Text>
                <Text style={{ color: C.muted, fontSize: 12 }}>{Math.round(o.pct * 100)}%</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* metas */}
      {metas.length > 0 && (
        <View style={{ marginBottom: 8 }}>
          <TituloSecao
            acao={
              <TouchableOpacity onPress={() => navigation.navigate('Tabs', { screen: 'Metas' })}>
                <Text style={{ color: C.primary, fontFamily: F.bold, fontSize: 13 }}>Ver todas</Text>
              </TouchableOpacity>
            }
          >
            Metas
          </TituloSecao>
          {metas.slice(0, 2).map((m) => {
            const pct = m.alvoValor > 0 ? m.atual / m.alvoValor : 0;
            const ehLimite = m.tipo === 'limite_categoria';
            // limite: bom = abaixo; investir: bom = acima
            const corBarra = ehLimite ? (pct >= 1 ? C.despesa : pct >= 0.8 ? C.alerta : C.primary) : C.primary;
            return (
              <View key={m.id} style={{ backgroundColor: C.card, borderRadius: 16, padding: 14, marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <MaterialCommunityIcons
                    name={ehLimite ? 'target' : 'piggy-bank-outline'} size={20}
                    color={C.primary} style={{ marginRight: 8 }}
                  />
                  <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 14, flex: 1 }}>
                    {ehLimite ? `Gastar até em ${m.cat?.nome || '—'}` : 'Investir este mês'}
                  </Text>
                </View>
                <Progresso pct={pct} cor={corBarra} />
                <Text style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>
                  {brl(m.atual)} de {brl(m.alvoValor)}{m.modo === 'percent' && m.tipo === 'investir' ? ` (${m.alvo}% da renda)` : ''}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* ultimas transacoes */}
      <TituloSecao
        acao={
          <TouchableOpacity onPress={() => navigation.navigate('Tabs', { screen: 'Historico' })}>
            <Text style={{ color: C.primary, fontFamily: F.bold, fontSize: 13 }}>Histórico</Text>
          </TouchableOpacity>
        }
      >
        Últimas
      </TituloSecao>
      {ultimas.length === 0 ? (
        <Vazio icone="cash-remove" texto={`Nenhuma transação em ${rotuloMes(mes)}.\nToque no + para adicionar.`} />
      ) : (
        <View style={{ backgroundColor: C.card, borderRadius: 16, overflow: 'hidden' }}>
          {ultimas.map((t, i) => {
            const cat = catPorId[t.categoria];
            return (
              <TouchableOpacity
                key={t.id} activeOpacity={0.7}
                onPress={() => navigation.navigate('Add', { transacao: t })}
                style={{
                  flexDirection: 'row', alignItems: 'center', padding: 14,
                  borderTopWidth: i === 0 ? 0 : 1, borderTopColor: C.borderSoft,
                }}
              >
                <IconeCat cat={cat} size={40} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 14 }}>{cat?.nome || 'Categoria'}</Text>
                  <Text style={{ color: C.muted, fontSize: 12 }} numberOfLines={1}>
                    {t.descricao || diaMesExtenso(t.data)}
                  </Text>
                </View>
                <Text style={{ color: t.tipo === 'receita' ? C.receita : C.despesa, fontFamily: F.bold, fontSize: 15 }}>
                  {t.tipo === 'receita' ? '+' : '-'}{brl(t.valor).replace('R$ ', '')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function Resumo({ icone, cor, label, valor }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.cardSoft, borderRadius: 16, padding: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 }}>
        <MaterialCommunityIcons name={icone} size={16} color={cor} />
        <Text style={{ color: C.muted, fontSize: 12 }}>{label}</Text>
      </View>
      <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 17 }}>{brl(valor)}</Text>
    </View>
  );
}
