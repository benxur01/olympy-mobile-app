import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from './Card';
import useFetch from '../services/useFetch';
import { studentApi } from '../services/api';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';

// LT3. "O'tgan oy shu paytda" taqqoslash. Web: pages/RetentionWidgets.jsx (483-509).
export default function ProgressComparisonCard() {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const { data, loading } = useFetch(() => studentApi.progressComparison().then((r) => r.data), []);
  if (loading || !data) return null;
  const currentAttempts = data.current_month?.attempts || 0;
  const lastAttempts = data.last_month?.attempts || 0;
  if (currentAttempts === 0 && lastAttempts === 0) return null;

  const growth = data.growth_percent || 0;
  const up = growth > 0;
  const down = growth < 0;
  const emoji = up ? '📈' : down ? '📉' : '➡️';
  const growthColor = up ? colors.greenLight : colors.red;

  return (
    <Card radius={16} elevated={false} style={styles.row}>
      <Text style={styles.emoji}>{emoji}</Text>
      <View style={styles.body}>
        <Text style={styles.title}>{data.message}</Text>
        <Text style={styles.sub}>
          Bu oy: <Text style={styles.strong}>{data.current_month?.avg_score} ball</Text> ({currentAttempts} ta)
          {'  ·  '}O'tgan oy: <Text style={styles.strong}>{data.last_month?.avg_score} ball</Text>
        </Text>
      </View>
      {growth !== 0 ? (
        <Text style={[styles.growth, { color: growthColor }]}>{up ? '+' : ''}{growth}%</Text>
      ) : null}
    </Card>
  );
}

const makeStyles = (colors, tints) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
    },
    emoji: {
      fontSize: 26,
    },
    body: {
      flex: 1,
    },
    title: {
      fontSize: 13,
      fontFamily: FONTS.bold,
      color: colors.text,
    },
    sub: {
      fontSize: 11.5,
      fontFamily: FONTS.semibold,
      color: colors.textSecondary,
      marginTop: 3,
      lineHeight: 16,
    },
    strong: {
      color: colors.text,
      fontFamily: FONTS.bold,
    },
    growth: {
      fontSize: 14,
      fontFamily: FONTS.extrabold,
    },
  });
