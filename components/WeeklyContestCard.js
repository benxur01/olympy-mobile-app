import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from './Card';
import useFetch from '../services/useFetch';
import { studentApi } from '../services/api';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';

// DH4. Haftalik musobaqa (top 5 + o'z o'rni). Web: pages/RetentionWidgets.jsx (397-432).
const medal = (rank) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`);

export default function WeeklyContestCard() {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const { data, loading } = useFetch(() => studentApi.weeklyContest().then((r) => r.data), []);
  if (loading) return null;
  const top = (data?.top || []).slice(0, 5);
  const myEntry = data?.my_entry;
  if (!top.length && !myEntry) return null;
  const inTop = myEntry && top.some((t) => t.is_me);

  const Row = ({ rank, name, score, me }) => (
    <View style={[styles.row, me ? styles.rowMe : null]}>
      <Text style={styles.rank}>{medal(rank)}</Text>
      <Text style={styles.name} numberOfLines={1}>{name}{me ? ' (siz)' : ''}</Text>
      <Text style={styles.score}>{score}</Text>
    </View>
  );

  return (
    <Card radius={16} elevated={false} background={tints.gold08} borderColor={tints.goldBorder30} style={styles.card}>
      <Text style={styles.heading}>🏆 Haftalik musobaqa</Text>
      <View style={styles.list}>
        {top.map((t) => (
          <Row key={t.user_id} rank={t.rank} name={t.full_name} score={t.score} me={t.is_me} />
        ))}
        {myEntry && !inTop ? (
          <>
            <Text style={styles.ellipsis}>···</Text>
            <Row rank={myEntry.rank} name={myEntry.full_name} score={myEntry.score} me />
          </>
        ) : null}
      </View>
    </Card>
  );
}

const makeStyles = (colors, tints) =>
  StyleSheet.create({
    card: {
      padding: 16,
    },
    heading: {
      fontSize: 14,
      fontFamily: FONTS.extrabold,
      color: colors.text,
      marginBottom: 12,
    },
    list: {
      gap: 6,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: colors.surfaceDeep,
    },
    rowMe: {
      backgroundColor: tints.blue14,
      borderWidth: 1,
      borderColor: tints.blueBorder30,
    },
    rank: {
      width: 26,
      textAlign: 'center',
      fontSize: 13,
      fontFamily: FONTS.extrabold,
      color: colors.text,
    },
    name: {
      flex: 1,
      fontSize: 13,
      fontFamily: FONTS.bold,
      color: colors.text,
    },
    score: {
      fontSize: 13,
      fontFamily: FONTS.extrabold,
      color: colors.goldSoftText,
    },
    ellipsis: {
      textAlign: 'center',
      fontSize: 12,
      color: colors.textMuted,
      paddingVertical: 1,
    },
  });
