import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Card from '../components/Card';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import useFetch from '../services/useFetch';
import { ownerApi } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { centerIdForUser } from '../services/roles';
import { BackIcon, TrophyIcon } from '../components/icons/Icons';

const asArray = (data) => (Array.isArray(data) ? data : data?.results || []);

// O'rin badge'ining rangi: 1/2/3 uchun oltin/kumush/bronza, keyingilarga neutral.
const rankMeta = (colors, tints, rank) => {
  if (rank === 1) return { bg: tints.gold10, fg: colors.gold };
  if (rank === 2) return { bg: colors.surfaceDeep, fg: colors.silver };
  if (rank === 3) return { bg: tints.orange10, fg: colors.bronze };
  return { bg: colors.surfaceDeep, fg: colors.textSecondary };
};

// O'rtacha ballga qarab rang: 80+ yashil, 60+ ko'k, 40+ oltin, past — muted.
const scoreColor = (colors, avg) => {
  if (avg >= 80) return colors.greenLight;
  if (avg >= 60) return colors.blueLight;
  if (avg >= 40) return colors.gold;
  return colors.textMuted;
};

export default function CenterRankingScreen({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const { user } = useAuth();
  const myCenterId = centerIdForUser(user);

  const { data, loading, refreshing, error, reload, refresh } = useFetch(
    () => ownerApi.centerRanking().then((r) => r.data),
    []
  );

  if (loading && !data) return <LoadingState message="Reyting yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  const rows = asArray(data);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()} style={styles.backBtn}>
          <BackIcon size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Markazlar reytingi</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            Barcha tasdiqlangan markazlar — o'rtacha ball
          </Text>
        </View>
        <View style={styles.trophyWrap}>
          <TrophyIcon size={18} color={colors.gold} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.blue} />}
      >
        {rows.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Reyting ma'lumotlari mavjud emas</Text>
          </Card>
        ) : (
          <View style={styles.list}>
            {rows.map((row, i) => {
              const rank = row.rank ?? i + 1;
              const meta = rankMeta(colors, tints, rank);
              const mine = myCenterId != null && String(row.center_id) === String(myCenterId);
              const avg = Number(row.average_score) || 0;
              const sub = [row.organization_type || 'Tashkilot', row.region].filter(Boolean).join(' · ');
              return (
                <Card
                  key={row.center_id ?? i}
                  style={styles.rowCard}
                  borderColor={mine ? colors.blue : undefined}
                  background={mine ? tints.blue08 : undefined}
                >
                  <View style={[styles.rankBadge, { backgroundColor: meta.bg }]}>
                    <Text style={[styles.rankText, { color: meta.fg }]}>{rank}</Text>
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {row.center_name || 'Markaz'}
                      {mine ? <Text style={styles.meTag}>  · Sizniki</Text> : null}
                    </Text>
                    <Text style={styles.rowSub} numberOfLines={1}>{sub}</Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {(row.student_count ?? 0)} o'quvchi · {(row.total_attempts ?? 0)} urinish · eng yuqori {(row.top_score ?? 0)}%
                    </Text>
                  </View>
                  <View style={styles.scoreWrap}>
                    <Text style={[styles.scoreValue, { color: scoreColor(colors, avg) }]}>{avg}%</Text>
                    <Text style={styles.scoreLabel}>o'rt.</Text>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors, tints) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingTop: 6,
      paddingHorizontal: 20,
      paddingBottom: 14,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: { flex: 1 },
    title: { fontSize: 18, fontFamily: FONTS.extrabold, color: colors.text },
    subtitle: { fontSize: 11.5, fontFamily: FONTS.semibold, color: colors.textSecondary, marginTop: 1 },
    trophyWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: tints.gold08,
      borderWidth: 1,
      borderColor: tints.goldBorder30,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: { paddingHorizontal: 20, paddingBottom: 40 },
    list: { gap: 8 },
    rowCard: { paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
    rankBadge: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    rankText: { fontSize: 14, fontFamily: FONTS.extrabold },
    rowText: { flex: 1 },
    rowName: { fontSize: 13.5, fontFamily: FONTS.extrabold, color: colors.text },
    meTag: { fontSize: 10.5, fontFamily: FONTS.extrabold, color: colors.blueLight },
    rowSub: { fontSize: 11, fontFamily: FONTS.semibold, color: colors.textSecondary, marginTop: 2 },
    rowMeta: { fontSize: 10.5, fontFamily: FONTS.semibold, color: colors.textMuted, marginTop: 2 },
    scoreWrap: { alignItems: 'flex-end' },
    scoreValue: { fontSize: 16, fontFamily: FONTS.extrabold },
    scoreLabel: { fontSize: 10, fontFamily: FONTS.bold, color: colors.textMuted, marginTop: 1 },
    emptyCard: { padding: 20, alignItems: 'center' },
    emptyText: { fontSize: 12.5, fontFamily: FONTS.semibold, color: colors.textMuted, textAlign: 'center' },
  });
