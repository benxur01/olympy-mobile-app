import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, AppState } from 'react-native';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import { publicApi } from '../services/api';

/**
 * Oddiy offline banner — health endpoint yoki tarmoq xatosini kuzatadi.
 * NetInfo paketisiz ishlaydi (dependencies qo'shmaydi).
 */
export default function OfflineBanner() {
  const { colors } = useTheme();
  const [offline, setOffline] = useState(false);

  const ping = useCallback(async () => {
    try {
      await publicApi.health();
      setOffline(false);
    } catch (e) {
      setOffline(true);
    }
  }, []);

  useEffect(() => {
    ping();
    const id = setInterval(ping, 30000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') ping();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [ping]);

  if (!offline) return null;

  return (
    <View
      style={[styles.banner, { backgroundColor: colors.orange || '#F59E0B' }]}
      accessibilityRole="alert"
      accessibilityLabel="Internet aloqasi yo'q"
    >
      <Text style={[styles.text, { color: colors.goldText || '#241A03' }]}>
        Internet aloqasi yo‘q yoki server javob bermayapti
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  text: {
    fontSize: 12.5,
    fontFamily: FONTS.bold,
    textAlign: 'center',
  },
});
