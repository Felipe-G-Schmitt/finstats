import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider } from './src/lib/store';
import RootNavigation from './Navigation';

export default function App() {
  const [fontsLoaded] = useFonts({
    'Geist-Regular': require('./assets/fonts/Geist-Regular.ttf'),
    'Geist-Bold': require('./assets/fonts/Geist-Bold.ttf'),
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <StoreProvider>
          <RootNavigation />
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
