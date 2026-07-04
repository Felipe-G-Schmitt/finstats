// Componentes de UI compartilhados
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { C, F } from './theme';
import { rotuloMes, deslocaMes, mesAtual } from './utils';

// barra de progresso com cor dinamica (verde -> amarelo -> vermelho)
export function Progresso({ pct, cor }) {
  const p = Math.max(0, Math.min(pct, 1));
  const corBarra = cor || (p >= 1 ? C.despesa : p >= 0.8 ? C.alerta : C.primary);
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: C.cardSoft, overflow: 'hidden' }}>
      <View style={{ height: '100%', width: `${p * 100}%`, backgroundColor: corBarra, borderRadius: 4 }} />
    </View>
  );
}

// navegador de mes (< Junho 2026 >)
export function SeletorMes({ mes, onChange, style }) {
  const ehAtual = mes === mesAtual();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, style]}>
      <TouchableOpacity
        onPress={() => onChange(deslocaMes(mes, -1))}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={{ padding: 4 }}
      >
        <MaterialCommunityIcons name="chevron-left" size={26} color={C.text} />
      </TouchableOpacity>
      <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 16 }}>{rotuloMes(mes)}</Text>
      <TouchableOpacity
        onPress={() => onChange(deslocaMes(mes, 1))}
        disabled={ehAtual}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={{ padding: 4, opacity: ehAtual ? 0.25 : 1 }}
      >
        <MaterialCommunityIcons name="chevron-right" size={26} color={C.text} />
      </TouchableOpacity>
    </View>
  );
}

// chip de categoria (icone redondo + nome)
export function ChipCategoria({ cat, ativo, onPress, size = 56 }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ alignItems: 'center', width: size + 18 }}>
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: ativo ? cat.cor : C.cardSoft,
        borderWidth: ativo ? 0 : 1, borderColor: C.borderSoft,
        justifyContent: 'center', alignItems: 'center',
      }}>
        <MaterialCommunityIcons name={cat.icone} size={size * 0.45} color={ativo ? C.bg : cat.cor} />
      </View>
      <Text numberOfLines={1} style={{
        color: ativo ? C.text : C.muted, fontSize: 11, marginTop: 5,
        fontFamily: ativo ? F.bold : F.reg, textAlign: 'center',
      }}>
        {cat.nome}
      </Text>
    </TouchableOpacity>
  );
}

// avatar de icone simples (usado em listas)
export function IconeCat({ cat, size = 42 }) {
  const cor = cat?.cor || C.muted;
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: cor + '22', justifyContent: 'center', alignItems: 'center',
    }}>
      <MaterialCommunityIcons name={cat?.icone || 'help'} size={size * 0.5} color={cor} />
    </View>
  );
}

// botao primario cheio
export function Botao({ titulo, onPress, icone, cor, dark, style, disabled }) {
  return (
    <TouchableOpacity
      onPress={onPress} disabled={disabled} activeOpacity={0.85}
      style={[{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: cor || C.primary, paddingVertical: 15, borderRadius: 16,
        opacity: disabled ? 0.4 : 1,
      }, style]}
    >
      {icone && <MaterialCommunityIcons name={icone} size={20} color={dark ? C.bg : C.bg} />}
      <Text style={{ color: C.bg, fontFamily: F.bold, fontSize: 16 }}>{titulo}</Text>
    </TouchableOpacity>
  );
}

// cabecalho de secao
export function TituloSecao({ children, acao }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 6 }}>
      <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 18 }}>{children}</Text>
      {acao}
    </View>
  );
}

// estado vazio
export function Vazio({ icone, texto }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 40 }}>
      <MaterialCommunityIcons name={icone || 'inbox-outline'} size={48} color={C.mutedDim} />
      <Text style={{ color: C.muted, marginTop: 10, fontSize: 14, textAlign: 'center' }}>{texto}</Text>
    </View>
  );
}
