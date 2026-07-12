import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from './Card';
import useFetch from '../services/useFetch';
import { studentApi } from '../services/api';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';

// Haftalik eng faol o'quvchilar (streak bo'yicha) — Haftalik Musobaqa
// (ball bo'yicha)dan farqli, alohida reyting. Web: pages/StudentDashboard.jsx
// (~1591-1625), getActivityLeaderboard.
const medal = (idx) => (idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null);

export default function ActivityLeaderboardCard() {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const { data, loading } = useFetch(() => studentApi.activityLeaderboard().then((r) => r.data), []);
  if (loading) return null;
  const entries = (Array.isArray(data) ? data : []).slice(0, 9);
  if (!entries.length) return null;

  return (
    <Card radius={16} elevated={false} background={tints.orange14} borderColor={tints.orangeBorder30} style={styles.card}>
      <View style={styles.headRow}>
        <Text style={styles.heading}>🔥 Haftalik eng faol o'quvchilar</Text>
        <View style={styles.tag}>
          <Text style={styles.tagText}>Streak bo'yicha</Text>
        </View>
      </View>
      <View style={styles.list}>
        {entries.map((entry, idx) => (
          <View key={entry.user_id} style={styles.row}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{medal(idx) || `#${entry.rank}`}</Text>
            </View>
            <Text style={styles.name} numberOfLines={1}>{entry.name}</Text>
            <Text style={styles.streak}>🔥 {entry.streak_count} kun</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const makeStyles = (colors, tints) =>
  StyleSheet.create({
    card: {
      padding: 16,
    },
    headRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginBottom: 12,
      flexWrap: 'wrap',
    },
    heading: {
      fontSize: 14,
      fontFamily: FONTS.extrabold,
      color: colors.text,
    },
    tag: {
      paddingVertical: 2,
      paddingHorizontal: 8,
      borderRadius: 8,
      backgroundColor: tints.orange14,
      borderWidth: 1,
      borderColor: tints.orangeBorder30,
    },
    tagText: {
      fontSize: 9.5,
      fontFamily: FONTS.extrabold,
      color: colors.orange,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    list: {
      gap: 6,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 12,
      backgroundColor: colors.surfaceDeep,
    },
    badge: {
      width: 30,
      height: 30,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    badgeText: {
      fontSize: 12,
      fontFamily: FONTS.extrabold,
      color: colors.textSecondary,
    },
    name: {
      flex: 1,
      fontSize: 12.5,
      fontFamily: FONTS.bold,
      color: colors.text,
    },
    streak: {
      fontSize: 11.5,
      fontFamily: FONTS.extrabold,
      color: colors.orange,
    },
  });
