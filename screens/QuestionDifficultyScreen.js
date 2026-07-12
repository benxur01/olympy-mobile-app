import React from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Card from '../components/Card';
import ProgressBar from '../components/ProgressBar';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useFetch from '../services/useFetch';
import { managerApi } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { centerIdForUser } from '../services/roles';
import { BarsIcon } from '../components/icons/Icons';

// Savol bankidagi qiyinlik darajasi bo'yicha taqsimot + har daraja bo'yicha
// o'rtacha to'g'rilik foizi (websaytdagi "Analitika → Savollar" tabi bilan
// bir xil ma'lumot, faqat teacher/manager/owner uchun).
export default function QuestionDifficultyScreen() {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const { user } = useAuth();
  const centerId = centerIdForUser(user);

  const { data, loading, refreshing, error, reload, refresh } = useFetch(
    () => (centerId ? managerApi.questionDifficultyStats(centerId).then((r) => r.data) : Promise.resolve(null)),
    [centerId]
  );

  if (!centerId) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <EmptyState
          icon={<BarsIcon size={22} color={colors.blueLight} />}
          title="Markaz topilmadi"
          message="Bu tahlil uchun sizga biriktirilgan o'quv markazi kerak."
        />
      </SafeAreaView>
    );
  }

  if (loading) return <LoadingState message="Tahlil yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  const total = data?.total_questions || 0;
  const rows = Array.isArray(data?.by_difficulty) ? data.by_difficulty : [];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.blue} />}
      >
        <Text style={styles.title}>Qiyinlik bo'yicha taqsimot</Text>
        <Text style={styles.subtitle}>
          Jami savollar: <Text style={styles.subtitleStrong}>{total}</Text>
        </Text>

        {rows.length === 0 ? (
          <EmptyState
            compact
            icon={<BarsIcon size={22} color={colors.blueLight} />}
            title="Savollar topilmadi"
            message="Savol bankida hali savol yo'q."
          />
        ) : (
          <View style={styles.list}>
            {rows.map((d, i) => {
              const pct = total ? Math.round((d.count / total) * 100) : 0;
              const rate = Math.round(d.avg_correct_rate || 0);
              const rateColor = rate >= 70 ? colors.green : rate >= 50 ? colors.orange : colors.red;
              return (
                <Card key={i} style={styles.row}>
                  <View style={styles.rowHead}>
                    <View style={styles.rowHeadLeft}>
                      <Text style={styles.rowLabel}>{d.label}</Text>
                      <View style={styles.countChip}>
                        <Text style={styles.countChipText}>{d.count} ta</Text>
                      </View>
                    </View>
                    <Text style={[styles.rateText, { color: rateColor }]}>
                      To'g'rilik: {rate}%
                    </Text>
                  </View>
                  <ProgressBar progress={pct} color={colors.blue} />
                  <View style={styles.rowFoot}>
                    <Text style={styles.rowFootText}>{pct}% bankdan</Text>
                    <Text style={styles.rowFootText}>{rate}% to'g'ri javob</Text>
                  </View>
                </Card>
              );
            })}
          </View>
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
    paddingBottom: 30,
  },
  title: {
    fontSize: 19,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  subtitle: {
    fontSize: 12.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 4,
  },
  subtitleStrong: {
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  list: {
    gap: 10,
    marginTop: 18,
  },
  row: {
    padding: 14,
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 9,
    flexWrap: 'wrap',
  },
  rowHeadLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  rowLabel: {
    fontSize: 13.5,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  countChip: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 7,
    backgroundColor: colors.surfaceDeep,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countChipText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
  },
  rateText: {
    fontSize: 11.5,
    fontFamily: FONTS.extrabold,
  },
  rowFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 7,
  },
  rowFootText: {
    fontSize: 10,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
  },
});
