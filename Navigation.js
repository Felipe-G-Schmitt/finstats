import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useStore } from './src/lib/store';
import { C, F } from './src/lib/theme';

import HomeScreen from './src/screens/HomeScreen';
import HistoricoScreen from './src/screens/HistoricoScreen';
import GraficosScreen from './src/screens/GraficosScreen';
import OrcamentosScreen from './src/screens/OrcamentosScreen';
import MetasScreen from './src/screens/MetasScreen';
import InvestirScreen from './src/screens/InvestirScreen';
import FixosScreen from './src/screens/FixosScreen';
import AddScreen from './src/screens/AddScreen';
import DateScreen from './src/screens/DateScreen';
import AjustesScreen from './src/screens/AjustesScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const ABAS = {
  Home: { icone: 'view-dashboard-outline', label: 'Início' },
  Historico: { icone: 'format-list-bulleted', label: 'Histórico' },
  Orcamentos: { icone: 'wallet-outline', label: 'Orçam.' },
  Investir: { icone: 'chart-areaspline', label: 'Investir' },
};

// Tab bar: Home, Historico, [ + ], Orcamentos, Investir
function TabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const esquerda = ['Home', 'Historico'];
  const direita = ['Orcamentos', 'Investir'];

  const item = (nome) => {
    const rotaIdx = state.routes.findIndex((r) => r.name === nome);
    const focado = state.index === rotaIdx;
    const cfg = ABAS[nome];
    return (
      <TouchableOpacity key={nome} onPress={() => navigation.navigate(nome)}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialCommunityIcons name={cfg.icone} size={24} color={focado ? C.primary : C.muted} />
        <Text style={{ fontSize: 10.5, marginTop: 3, color: focado ? C.primary : C.muted, fontFamily: focado ? F.bold : F.reg }}>
          {cfg.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const padBottom = Math.max(insets.bottom, 12);

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
      borderTopWidth: 1, borderTopColor: C.borderSoft,
      paddingBottom: padBottom, paddingTop: 10, height: 64 + padBottom,
    }}>
      {esquerda.map(item)}
      <View style={{ flex: 1, alignItems: 'center' }}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Add')} activeOpacity={0.85}
          style={{
            position: 'absolute', top: -34, width: 62, height: 62, borderRadius: 31,
            backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center',
            shadowColor: C.primary, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 0 },
            elevation: 8,
          }}>
          <MaterialCommunityIcons name="plus" color={C.bg} size={36} />
        </TouchableOpacity>
      </View>
      {direita.map(item)}
    </View>
  );
}

function Tabs() {
  return (
    <Tab.Navigator tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Historico" component={HistoricoScreen} />
      <Tab.Screen name="Orcamentos" component={OrcamentosScreen} />
      <Tab.Screen name="Investir" component={InvestirScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigation() {
  const { pronto } = useStore();

  if (!pronto) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={{
      ...DarkTheme,
      colors: { ...DarkTheme.colors, primary: C.primary, background: C.bg, card: C.card, text: C.text, border: C.borderSoft, notification: C.primary },
    }}>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="Graficos" component={GraficosScreen} />
        <Stack.Screen name="Metas" component={MetasScreen} />
        <Stack.Screen name="Fixos" component={FixosScreen} />
        <Stack.Screen name="Add" component={AddScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="SelecionarData" component={DateScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Ajustes" component={AjustesScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
