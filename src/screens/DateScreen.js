import { View, Text, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F, MESES } from '../lib/theme';
import { hojeISO } from '../lib/utils';

const DIAS_CAB = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export default function DateScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const inicial = route.params?.data || hojeISO();
  const onPick = route.params?.onPick;
  const [ano, setAno] = useState(Number(inicial.slice(0, 4)));
  const [mes, setMes] = useState(Number(inicial.slice(5, 7)) - 1); // 0-11
  const sel = inicial;

  const primeiroDia = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const celulas = [];
  for (let i = 0; i < primeiroDia; i++) celulas.push(null);
  for (let d = 1; d <= diasNoMes; d++) celulas.push(d);

  function escolher(d) {
    const iso = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    onPick?.(iso);
    navigation.goBack();
  }
  function navMes(delta) {
    let m = mes + delta, a = ano;
    if (m < 0) { m = 11; a--; } else if (m > 11) { m = 0; a++; }
    setMes(m); setAno(a);
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 12, paddingHorizontal: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <MaterialCommunityIcons name="close" size={26} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 18, marginLeft: 12 }}>Escolher data</Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <TouchableOpacity onPress={() => navMes(-1)} style={{ padding: 6 }}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 17 }}>{MESES[mes]} {ano}</Text>
        <TouchableOpacity onPress={() => navMes(1)} style={{ padding: 6 }}>
          <MaterialCommunityIcons name="chevron-right" size={28} color={C.text} />
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', marginBottom: 6 }}>
        {DIAS_CAB.map((d, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', color: C.muted, fontFamily: F.bold, fontSize: 12 }}>{d}</Text>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {celulas.map((d, i) => {
          const iso = d ? `${ano}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null;
          const ativo = iso === sel;
          const ehHoje = iso === hojeISO();
          return (
            <View key={i} style={{ width: '14.28%', aspectRatio: 1, padding: 3 }}>
              {d ? (
                <TouchableOpacity
                  onPress={() => escolher(d)} activeOpacity={0.7}
                  style={{
                    flex: 1, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
                    backgroundColor: ativo ? C.primary : ehHoje ? C.cardSoft : 'transparent',
                  }}
                >
                  <Text style={{ color: ativo ? C.bg : C.text, fontFamily: ativo || ehHoje ? F.bold : F.reg, fontSize: 15 }}>{d}</Text>
                </TouchableOpacity>
              ) : <View style={{ flex: 1 }} />}
            </View>
          );
        })}
      </View>

      <TouchableOpacity
        onPress={() => escolher(new Date().getDate()) || setMes(new Date().getMonth())}
        style={{ marginTop: 24, alignSelf: 'center' }}
      >
        <Text style={{ color: C.primary, fontFamily: F.bold, fontSize: 15 }}>Ir para hoje</Text>
      </TouchableOpacity>
    </View>
  );
}
