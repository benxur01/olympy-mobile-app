import React, { useEffect } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Manrope_400Regular,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import RootNavigator from './navigation/RootNavigator';
import LoadingState from './components/LoadingState';
import { AuthProvider } from './services/AuthContext';
import { ThemeProvider, useTheme } from './services/ThemeContext';

function ThemedApp() {
  const { isDark, colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  // Foydalanuvchi bildirishnomani bosganda ishlaydi. Hozircha faqat data
  // payloadni loglaymiz — to'liq deep-link routing bu vazifa doirasidan
  // tashqarida. Muhimi: bosish ilovani buzmasligi kerak.
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data;
      console.log('[push] Bildirishnoma bosildi, data:', data);
    });
    return () => subscription.remove();
  }, []);

  if (!fontsLoaded) {
    return <LoadingState />;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
