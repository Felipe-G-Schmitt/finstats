import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useState, useMemo } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F } from '../lib/theme';
import { useStore, fixosDoMes } from '../lib/store';
import { brl, mesAtual } from '../lib/utils';
import { SeletorMes, Progresso, IconeCat, Vazio } from '../lib/ui';

export default function FixosScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { dados, toggleFixoPago } = useStore();
  const [mes, setMes] = useState(mesAtual());

  const fixos = useMemo(
    () => fixosDoMes(dados.categorias, dados.transacoes, dados.fixosPagos, mes),
    [dados.categorias, dados.transacoes, dados.fixosPagos, mes]
  );

  const pagos = fixos.filter((f) => f.pago).length;
  const totalPago = fixos.reduce((s, f) => s + (f.pago ? f.valorPago : 0), 0);
  const pct = fixos.length > 0 ? pagos / fixos.length : 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, marginBottom: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={{ marginRight: 10 }}>
          <MaterialCommunityIcons name="arrow-left" size={26} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 24 }}>Gastos fixos</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40 }}>
        <View style={{ backgroundColor: C.card, borderRadius: 20, padding: 18, marginBottom: 16 }}>
          <SeletorMes mes={mes} onChange={setMes} style={{ marginBottom: 16 }} />
          {fixos.length > 0 && (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: C.muted, fontSize: 13 }}>{pagos} de {fixos.length} pagos</Text>
                <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 13 }}>{brl(totalPago)}</Text>
              </View>
              <Progresso pct={pct} cor={pct >= 1 ? C.primary : C.alerta} />
            </>
          )}
        </View>

        {fixos.length === 0 ? (
          <Vazio icone="playlist-check" texto={'Nenhuma categoria fixa ainda.\nMarque categorias como "fixo" nos Ajustes para elas aparecerem aqui.'} />
        ) : (
          fixos.map((f) => (
            <View key={f.cat.id}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 16, padding: 14, marginBottom: 10 }}>
              <IconeCat cat={f.cat} size={42} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 15 }}>{f.cat.nome}</Text>
                <Text style={{ color: f.pago ? C.primary : C.muted, fontSize: 12 }}>
                  {f.pago
                    ? (f.valorPago > 0 ? `Pago · ${brl(f.valorPago)}` : 'Marcado como pago')
                    : 'Pendente'}
                </Text>
              </View>

              {/* atalho pra registrar pagamento como transacao */}
              {!f.pago && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('Add', { presetCategoria: f.cat.id, presetTipo: 'despesa' })}
                  style={{ marginRight: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: C.cardSoft }}>
                  <Text style={{ color: C.primary, fontFamily: F.bold, fontSize: 12 }}>Registrar</Text>
                </TouchableOpacity>
              )}

              {/* checkbox: marca/desmarca manual */}
              <TouchableOpacity onPress={() => toggleFixoPago(f.cat.id, mes)} hitSlop={8}
                style={{
                  width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center',
                  backgroundColor: f.pago ? C.primary : 'transparent',
                  borderWidth: f.pago ? 0 : 2, borderColor: C.borderSoft,
                }}>
                {f.pago && <MaterialCommunityIcons name="check" size={20} color={C.bg} />}
              </TouchableOpacity>
            </View>
          ))
        )}

        {fixos.length > 0 && (
          <Text style={{ color: C.mutedDim, fontSize: 12, textAlign: 'center', marginTop: 8, lineHeight: 17 }}>
            Ao registrar uma despesa numa categoria fixa, ela marca sozinha aqui. O check manual serve pra quando você pagou mas não quer lançar a transação.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
