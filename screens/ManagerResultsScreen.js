import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import { useTabBarSpacing } from '../components/TabBar';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import StatCard from '../components/StatCard';
import DonutProgress from '../components/DonutProgress';
import SegmentedControl from '../components/SegmentedControl';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useFetch from '../services/useFetch';
import { managerApi, downloadOlympiadResults } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { centerIdForUser } from '../services/roles';
import { TrophyIcon, EditIcon, BarsIcon, DownloadIcon } from '../components/icons/Icons';

const asArray = (data) => (Array.isArray(data) ? data : data?.results || []);

const donutColor = (colors, v) =>
  v >= 80 ? colors.greenLight : v >= 50 ? colors.blue : colors.orange;

export default function ManagerResultsScreen({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const tabBarSpacing = useTabBarSpacing();
  const { user } = useAuth();
  const centerId = centerIdForUser(user);
  const [tab, setTab] = useState(0); // 0 = Tadbirlar, 1 = Savollar
  const [exportingId, setExportingId] = useState(null);

  const exportResults = (olympiadId, format) => {
    if (exportingId) return;
    setExportingId(olympiadId);
    downloadOlympiadResults(olympiadId, format)
      .catch((e) => {
        const detail = e?.response?.data?.detail;
        Alert.alert('Xatolik', detail || "Natijalarni eksport qilib bo'lmadi.");
      })
      .finally(() => setExportingId(null));
  };

  const confirmExport = (olympiadId) => {
    Alert.alert('Natijalarni eksport qilish', 'Formatni tanlang', [
      { text: 'CSV', onPress: () => exportResults(olympiadId, 'csv') },
      { text: 'Excel', onPress: () => exportResults(olympiadId, 'xlsx') },
      { text: 'PDF', onPress: () => exportResults(olympiadId, 'pdf') },
      { text: 'Bekor qilish', style: 'cancel' },
    ]);
  };

  const { data, loading, refreshing, error, reload, refresh } = useFetch(async () => {
    const [stats, qa] = await Promise.all([
      managerApi.stats(centerId, { page_size: 200 }).then((r) => r.data).catch(() => null),
      centerId
        ? managerApi.questionAnalytics(centerId).then((r) => r.data).catch(() => null)
        : Promise.resolve(null),
    ]);
    if (stats === null && qa === null) throw new Error('manager_results_load_failed');
    return { stats: stats || {}, qa: asArray(qa) };
  }, [centerId]);

  if (loading) return <LoadingState message="Natijalar yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  const stats = data?.stats || {};
  const qa = data?.qa || [];
  const events = Array.isArray(stats.events) ? stats.events : [];
  const ranked = events.filter((e) => (e.participants || 0) > 0);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarSpacing }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.blue} />}
      >
        <Text style={styles.title}>Natijalar</Text>

        <View style={styles.statsRow}>
          <StatCard label="O'rtacha ball" value={`${Math.round(stats.average_score || 0)}%`} valueColor={colors.blue} style={styles.stat} />
          <StatCard label="Eng yuqori" value={`${stats.best_score || 0}%`} valueColor={colors.gold} style={styles.stat} />
          <StatCard label="Qatnashuvchi" value={stats.participants || 0} style={styles.stat} />
        </View>

        <SegmentedControl
          segments={['Tadbirlar', 'Savollar']}
          activeIndex={tab}
          onChange={setTab}
          style={styles.segment}
        />

        {tab === 0 ? (
          ranked.length === 0 ? (
            <EmptyState
              compact
              icon={<BarsIcon size={24} color={colors.blueLight} />}
              title="Natija yo'q"
              message="Hali natijasi bor tadbirlar yo'q. O'quvchilar qatnashgach shu yerda ko'rinadi."
            />
          ) : (
            <View style={styles.list}>
              {ranked.map((e) => {
                const avg = Math.round(e.average_score || 0);
                return (
                  <Card key={e.olympiad_id} style={styles.eventCard}>
                    <View style={styles.eventHead}>
                      <View style={styles.eventInfo}>
                        <Text style={styles.eventTitle} numberOfLines={2}>{e.title}</Text>
                        <Text style={styles.eventSub}>
                          {[e.subject, `${e.participants} ishtirokchi`, `eng yuqori ${e.best_score || 0}%`]
                            .filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                      <DonutProgress size={56} strokeWidth={7} progress={avg} color={donutColor(colors, avg)}>
                        <Text style={styles.donutText}>{avg}%</Text>
                      </DonutProgress>
                    </View>
                    <View style={styles.eventActions}>
                      <Button
                        title="Reyting"
                        variant="muted"
                        height={38}
                        radius={11}
                        fontSize={12.5}
                        icon={<TrophyIcon size={13} color={colors.gold} />}
                        style={styles.eventBtn}
                        onPress={() => navigation.navigate('Leaderboard')}
                      />
                      <Button
                        title="Essay baholash"
                        variant="muted"
                        height={38}
                        radius={11}
                        fontSize={12.5}
                        icon={<EditIcon size={13} color={colors.textSecondary} />}
                        style={styles.eventBtn}
                        onPress={() => navigation.navigate('EssayGrading')}
                      />
                      <Button
                        title={exportingId === e.olympiad_id ? '…' : 'Eksport'}
                        variant="muted"
                        height={38}
                        radius={11}
                        fontSize={12.5}
                        icon={<DownloadIcon size={13} color={colors.textSecondary} />}
                        style={styles.eventBtn}
                        disabled={!!exportingId}
                        onPress={() => confirmExport(e.olympiad_id)}
                      />
                    </View>
                  </Card>
                );
              })}
            </View>
          )
        ) : (
          <View style={styles.list}>
            <Text style={styles.hint}>
              Eng ko'p noto'g'ri javob berilgan savollar (kamida 3 urinish, ≥30% xato).
            </Text>
            {qa.length === 0 ? (
              <EmptyState
                compact
                icon={<BarsIcon size={24} color={colors.blueLight} />}
                title="Ma'lumot yo'q"
                message="Tahlilga yaroqli savollar hali yo'q. O'quvchilar tadbirlarda qatnashgach ko'rinadi."
              />
            ) : (
              qa.map((r) => {
                const rate = Math.round(r.wrong_rate || 0);
                const tone =
                  rate >= 70 ? { color: colors.red, bg: tints.red14 }
                  : rate >= 50 ? { color: colors.orange, bg: tints.orange14 }
                  : { color: colors.blue, bg: tints.blue14 };
                return (
                  <Card key={r.question_id} style={styles.qaCard}>
                    <View style={styles.qaHead}>
                      <View style={[styles.qaBadge, { backgroundColor: tone.bg }]}>
                        <Text style={[styles.qaRate, { color: tone.color }]}>{rate}%</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.qaText} numberOfLines={3}>{r.text || '—'}</Text>
                        <Text style={styles.qaSub}>
                          {[r.subject || 'Umumiy', `${r.total_attempts} urinish`, `${r.wrong_count} xato`]
                            .filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.qaTrack}>
                      <View style={[styles.qaFill, { width: `${Math.min(100, Math.max(0, rate))}%`, backgroundColor: tone.color }]} />
                    </View>
                  </Card>
                );
              })
            )}
          </View>
        )}

        {stats.disqualified_count > 0 ? (
          <View style={styles.dqRow}>
            <Badge label={`${stats.disqualified_count} diskvalifikatsiya`} color={colors.red} background={tints.red14} size={11.5} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors, tints) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 100 },
  title: { fontSize: 19, fontFamily: FONTS.extrabold, color: colors.text },
  statsRow: { flexDirection: 'row', gap: 9, marginTop: 14 },
  stat: { flex: 1, paddingVertical: 13, paddingHorizontal: 11 },
  segment: { marginTop: 16 },
  list: { gap: 10, marginTop: 14 },
  hint: { fontSize: 12, fontFamily: FONTS.semibold, color: colors.textSecondary, marginBottom: 2 },
  eventCard: { padding: 15 },
  eventHead: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 14, fontFamily: FONTS.extrabold, color: colors.text },
  eventSub: { fontSize: 11.5, fontFamily: FONTS.semibold, color: colors.textSecondary, marginTop: 4 },
  donutText: { fontSize: 13, fontFamily: FONTS.extrabold, color: colors.text },
  eventActions: {
    flexDirection: 'row', gap: 8, marginTop: 13, paddingTop: 13,
    borderTopWidth: 1, borderTopColor: colors.divider,
  },
  eventBtn: { flex: 1 },
  qaCard: { padding: 14 },
  qaHead: { flexDirection: 'row', gap: 12 },
  qaBadge: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  qaRate: { fontSize: 13, fontFamily: FONTS.extrabold },
  qaText: { fontSize: 13, fontFamily: FONTS.bold, color: colors.text, lineHeight: 18 },
  qaSub: { fontSize: 11, fontFamily: FONTS.semibold, color: colors.textSecondary, marginTop: 4 },
  qaTrack: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceDeep, marginTop: 12, overflow: 'hidden' },
  qaFill: { height: '100%', borderRadius: 4 },
  dqRow: { marginTop: 16, alignItems: 'flex-start' },
});
