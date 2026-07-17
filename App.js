import React, { useEffect, useRef } from 'react';
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
import ErrorBoundary from './components/ErrorBoundary';
import OfflineBanner from './components/OfflineBanner';
import { AuthProvider } from './services/AuthContext';
import { ThemeProvider, useTheme } from './services/ThemeContext';
import { navigationRef } from './services/navigationRef';
import { routeFromPushData } from './services/linking';
import { devLog } from './services/logger';

function navigateFromPush(data) {
  const target = routeFromPushData(data);
  if (!target?.name) return;
  // Navigatsiya tayyor bo'lishini kutamiz (cold start).
  const tryNav = (attemptsLeft) => {
    if (navigationRef.isReady()) {
      try {
        navigationRef.navigate(target.name, target.params);
      } catch (e) {
        // rol guard rad etishi mumkin — jim
      }
      return;
    }
    if (attemptsLeft <= 0) return;
    setTimeout(() => tryNav(attemptsLeft - 1), 300);
  };
  tryNav(20);
}

function ThemedApp() {
  const { isDark, colors } = useTheme();
  const handledInitial = useRef(false);

  // Push: foreground/background tap → deep navigate.
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data;
      devLog('[push] Bildirishnoma bosildi, data:', data);
      navigateFromPush(data);
    });

    // Cold start: oxirgi bosilgan bildirishnoma.
    if (!handledInitial.current) {
      handledInitial.current = true;
      Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          if (!response) return;
          const data = response?.notification?.request?.content?.data;
          navigateFromPush(data);
        })
        .catch(() => {});
    }

    return () => subscription.remove();
  }, []);

  return (
    <ErrorBoundary colors={colors}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <OfflineBanner />
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </View>
    </ErrorBoundary>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

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
