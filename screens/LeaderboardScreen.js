import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Avatar from '../components/Avatar';
import Chip from '../components/Chip';
import SegmentedControl from '../components/SegmentedControl';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import useFetch from '../services/useFetch';
import { studentApi } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { CrownIcon } from '../components/icons/Icons';

const makePODIUM_META = (colors, tints) => ([
  { border: colors.silver, height: 78, rankColor: colors.silver, order: 0 },
  { border: colors.gold, height: 104, rankColor: colors.gold, order: 1 },
  { border: colors.bronze, height: 60, rankColor: colors.bronze, order: 2 },
]);

const makeAVATAR_COLORS = (colors, tints) => ([colors.purple, colors.blueDeep, colors.green, colors.red, colors.orange]);

const initialOf = (name) => (name || '?').trim()[0]?.toUpperCase() || '?';
const minutes = (sec) => (sec ? `${Math.round(sec / 60)} daq` : '');

export default function LeaderboardScreen() {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const PODIUM_META = makePODIUM_META(colors, tints);
  const AVATAR_COLORS = makeAVATAR_COLORS(colors, tints);
  const { user } = useAuth();
  const [scope, setScope] = useState(0); // 0 = Umumiy, 1 = Markazim
  const [period, setPeriod] = useState(0); // 0 = Barcha vaqt, 1 = Bu hafta
  const { data, loading, error, reload } = useFetch(
    () =>
      studentApi
        .leaderboard({ page_size: 50, ...(period === 1 ? { period: 'week' } : {}) })
        .then((r) => r.data),
    [period]
  );

  if (loading && !data) return <LoadingState message="Reyting yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  const allEntries = data?.entries || (Array.isArray(data) ? data : []);
  const myCenter = user?.center_name;
  // "Markazim" — global reytingdagi shu markaz a'zolari (client-side filtr).
  const entries =
    scope === 1 && myCenter ? allEntries.filter((e) => (e.center || '') === myCenter) : allEntries;
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const podiumDisplay = [top3[1], top3[0], top3[2]];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Reyting</Text>

        <SegmentedControl
          segments={['Umumiy', 'Markazim']}
          activeIndex={scope}
          onChange={setScope}
          style={styles.scopeControl}
        />
        <View style={styles.periodRow}>
          <Chip label="Barcha vaqt" active={period === 0} onPress={() => setPeriod(0)} />
          <Chip label="Bu hafta" active={period === 1} onPress={() => setPeriod(1)} />
        </View>

        {entries.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>
              {scope === 1 && !myCenter
                ? "Sizga biriktirilgan markaz aniqlanmadi"
                : scope === 1
                ? "Markazingiz bo'yicha reyting ma'lumoti yo'q"
                : "Hozircha reyting ma'lumoti yo'q"}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.podium}>
              {podiumDisplay.map((entry, i) => {
                if (!entry) return <View key={i} style={styles.podiumCol} />;
                const meta = PODIUM_META[i];
                const isWinner = i === 1;
                return (
                  <View key={entry.attempt_id || entry.user_id || i} style={styles.podiumCol}>
                    {isWinner ? (
                      <View style={styles.winnerWrap}>
                        <Avatar
                          letter={initialOf(entry.name)}
                          size={62}
                          fontSize={22}
                          background={colors.blueDeep}
                          borderColor={meta.border}
                          style={styles.winnerAvatar}
                        />
                        <View style={styles.crown}>
                          <CrownIcon size={22} />
                        </View>
                      </View>
                    ) : (
                      <Avatar
                        letter={initialOf(entry.name)}
                        size={52}
                        fontSize={19}
                        background={AVATAR_COLORS[i % AVATAR_COLORS.length]}
                        borderColor={meta.border}
                      />
                    )}
                    <Text style={styles.podiumName} numberOfLines={1}>
                      {(entry.name || '').split(' ')[0]}
                    </Text>
                    <View
                      style={[
                        styles.podiumBlock,
                        { height: meta.height },
                        isWinner ? styles.winnerBlock : null,
                      ]}
                    >
                      <Text style={[styles.podiumRank, { color: meta.rankColor }, isWinner ? { fontSize: 24 } : null]}>
                        {entry.rank}
                      </Text>
                      <Text style={[styles.podiumScore, isWinner ? { color: colors.goldMuted } : null]}>
                        {entry.score}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={styles.list}>
              {rest.map((entry, i) => {
                const me = user && entry.user_id === user.id;
                return (
                  <View key={entry.attempt_id || `${entry.user_id}-${i}`} style={[styles.row, me ? styles.meRow : null]}>
                    <Text style={[styles.rank, me ? { color: colors.blueLight } : null]}>{entry.rank}</Text>
                    <Avatar
                      letter={initialOf(entry.name)}
                      size={36}
                      fontSize={14}
                      background={AVATAR_COLORS[i % AVATAR_COLORS.length]}
                    />
                    <View style={styles.rowText}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {entry.name}
                        {me ? <Text style={styles.meTag}> · Siz</Text> : null}
                      </Text>
                      <Text style={styles.rowSub} numberOfLines={1}>
                        {[entry.center, minutes(entry.time_spent)].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                    <Text style={[styles.rowScore, me ? { color: colors.text } : null]}>{entry.score}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors, tints) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 19,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  scopeControl: {
    marginTop: 14,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  emptyWrap: {
    marginTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
  },
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 10,
    marginTop: 26,
  },
  podiumCol: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  winnerWrap: {
    marginTop: 14,
  },
  winnerAvatar: {
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  crown: {
    position: 'absolute',
    top: -14,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  podiumName: {
    fontSize: 12,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  podiumBlock: {
    width: '100%',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  winnerBlock: {
    backgroundColor: tints.gold10,
    borderColor: tints.goldBorder35,
  },
  podiumRank: {
    fontSize: 20,
    fontFamily: FONTS.extrabold,
  },
  podiumScore: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
  },
  list: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: 14,
    marginTop: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  meRow: {
    borderWidth: 1.5,
    borderColor: colors.blue,
    backgroundColor: tints.blue08,
  },
  rank: {
    width: 24,
    textAlign: 'center',
    fontSize: 13,
    fontFamily: FONTS.extrabold,
    color: colors.textSecondary,
  },
  rowText: {
    flex: 1,
  },
  rowName: {
    fontSize: 13.5,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  meTag: {
    fontSize: 10,
    fontFamily: FONTS.extrabold,
    color: colors.blueLight,
  },
  rowSub: {
    fontSize: 11,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
  },
  rowScore: {
    fontSize: 13,
    fontFamily: FONTS.extrabold,
    color: colors.textBody,
  },
});
