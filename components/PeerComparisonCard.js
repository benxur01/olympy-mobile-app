import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from './Card';
import useFetch from '../services/useFetch';
import { studentApi } from '../services/api';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';

// OB3. "Sizga o'xshash o'quvchi" taqqoslash. Web: pages/RetentionWidgets.jsx (434-454).
// Palitrada cyan token yo'q — eng yaqin ohang sifatida blue ishlatiladi.
export default function PeerComparisonCard() {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const { data, loading } = useFetch(() => studentApi.peerComparison().then((r) => r.data), []);
  if (loading || !data) return null;
  if ((data.total_peers || 0) <= 1) return null;

  return (
    <Card radius={16} elevated={false} background={tints.blue08} borderColor={tints.blueBorder30} style={styles.row}>
      <Text style={styles.emoji}>📊</Text>
      <View style={styles.body}>
        <Text style={styles.title}>{data.message}</Text>
        <Text style={styles.sub}>
          Sizning o'rtacha: <Text style={[styles.strong, { color: colors.blueLight }]}>{data.my_avg}</Text>
          {'  ·  '}Sinf o'rtacha: <Text style={styles.strong}>{data.peer_avg}</Text>
          {data.grade ? `  ·  ${data.grade}-sinf` : ''}
        </Text>
      </View>
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
  });
