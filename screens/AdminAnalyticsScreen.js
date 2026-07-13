import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Card from '../components/Card';
import Badge from '../components/Badge';
import StatCard from '../components/StatCard';
import ProgressBar from '../components/ProgressBar';
import ActivityBarChart from '../components/ActivityBarChart';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import useFetch from '../services/useFetch';
import { adminApi } from '../services/api';
import { BackIcon, TrophyIcon, BuildingIcon, WarningIcon } from '../components/icons/Icons';

// Promise.allSettled natijasini o'qish: muvaffaqiyat → { ok, data }, xato →
// { ok:false, code }. Admin bo'lmasa endpointlar 403 qaytaradi — o'shanda
// bo'lim "Ma'lumot yo'q" ko'rsatadi (butun ekran qulamaydi).
const readSection = (settled) => {
  if (settled?.status === 'fulfilled') return { ok: true, data: settled.value?.data };
  return { ok: false, code: settled?.reason?.response?.status || 0 };
};

const asArray = (v) => (Array.isArray(v) ? v : []);

// Minglik ajratgichli son ('1 250 000'). Hermes'da toLocaleString locale'ni
// qo'llab-quvvatlamasligi mumkin — shuning uchun qo'lda formatlaymiz.
const fmtNum = (n) => {
  const x = Math.round(Number(n) || 0);
  return String(x).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

// Qisqa summa (daromad kartasi uchun): 1 250 000 → "1.25 mln".
const fmtShort = (n) => {
  const x = Math.round(Number(n) || 0);
  if (x >= 1_000_000) return `${(x / 1_000_000).toFixed(x >= 10_000_000 ? 0 : 1)} mln`;
  if (x >= 1_000) return `${(x / 1_000).toFixed(x >= 100_000 ? 0 : 1)} ming`;
  return String(x);
};

// Raqamli qatorni ActivityBarChart uchun 0-100% balandlikka normallashtiradi.
const toBars = (rows, colors, color) => {
  const max = Math.max(1, ...rows.map((r) => Number(r.value) || 0));
  return rows.map((r, i) => ({
    value: (Number(r.value) || 0) > 0 ? Math.max(4, Math.round(((Number(r.value) || 0) / max) * 100)) : 2,
    label: r.label,
    color: color || colors.blue,
    active: i === rows.length - 1,
    glow: i === rows.length - 1,
  }));
};

export default function AdminAnalyticsScreen({ navigation, embedded = false }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const Wrapper = embedded ? View : SafeAreaView;
  const wrapperProps = embedded ? {} : { edges: ['top'] };

  const { data, loading, refreshing, error, reload, refresh } = useFetch(async () => {
    const [metrics, revenue, attempts, olympiads, questions, centers] = await Promise.allSettled([
      adminApi.getMetrics(),
      adminApi.getRevenueTrend(),
      adminApi.getAttemptsTrend(),
      adminApi.getOlympiadStats(),
      adminApi.getQuestionStats(),
      adminApi.getCenterStats(),
    ]);
    const sections = {
      metrics: readSection(metrics),
      revenue: readSection(revenue),
      attempts: readSection(attempts),
      olympiads: readSection(olympiads),
      questions: readSection(questions),
      centers: readSection(centers),
    };
    // Hech biri kelmasa (masalan tarmoq yo'q) — xato holatini ko'rsatamiz.
    if (Object.values(sections).every((s) => !s.ok)) throw new Error('analytics_load_failed');
    return sections;
  }, []);

  if (loading) return <LoadingState message="Analitika yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  const metrics = data?.metrics?.ok ? data.metrics.data : null;
  const premiumBlock = metrics?.premium || {};

  const revenue = asArray(data?.revenue?.data);
  const attempts = asArray(data?.attempts?.data);
  const olympiads = asArray(data?.olympiads?.data);
  const qStats = data?.questions?.ok ? data.questions.data || {} : {};
  const bySubject = asArray(qStats.by_subject);
  const bySource = asArray(qStats.by_source);
  const centerStats = data?.centers?.ok ? data.centers.data || {} : {};
  const byRegion = asArray(centerStats.by_region);
  const premiumVsFree = asArray(centerStats.premium_vs_free);
  const dqTrend = asArray(centerStats.dq_trend);
  const topCenters = asArray(centerStats.top_centers_rating);

  const totalRevenue = revenue.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const totalAttempts = attempts.reduce((s, r) => s + (Number(r.count) || 0), 0);
  const totalQuestions = bySubject.reduce((s, r) => s + (Number(r.count) || 0), 0);

  // Grafik uchun ma'lumot — attempts oxirgi 14 kun, revenue 12 oy, dq 8 hafta.
  const attemptBars = attempts.length
    ? toBars(
        attempts.slice(-14).map((r) => ({ value: r.count, label: String(Number((r.date || '').slice(8, 10)) || '') })),
        colors,
        colors.blue,
      )
    : [];
  const attemptsEmpty = !attempts.length || attempts.every((r) => !r.count);

  const revenueBars = revenue.length
    ? toBars(
        revenue.map((r) => ({ value: r.amount, label: String(Number((r.month || '').slice(5, 7)) || '') })),
        colors,
        colors.green,
      )
    : [];
  const revenueEmpty = !revenue.length || revenue.every((r) => !r.amount);

  const dqBars = dqTrend.length
    ? toBars(
        dqTrend.map((r) => ({ value: r.count, label: String(Number((r.week || '').slice(8, 10)) || '') })),
        colors,
        colors.red,
      )
    : [];
  const dqEmpty = !dqTrend.length || dqTrend.every((r) => !r.count);

  const pvfPremium = premiumVsFree.reduce((s, r) => s + (Number(r.premium) || 0), 0);
  const pvfFree = premiumVsFree.reduce((s, r) => s + (Number(r.free) || 0), 0);

  const maxSubject = Math.max(1, ...bySubject.map((r) => Number(r.count) || 0));

  const emptyCard = (text) => (
    <Card style={styles.emptyCard}>
      <Text style={styles.emptyText}>{text || "Ma'lumot yo'q"}</Text>
    </Card>
  );

  return (
    <Wrapper style={styles.screen} {...wrapperProps}>
      {embedded ? null : (
        <View style={styles.topBar}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()} style={styles.backBtn}>
            <BackIcon size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>Platforma analitikasi</Text>
            <Text style={styles.subtitle}>Daromad, faollik va kontent statistikasi</Text>
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.blue} />}
      >
        {/* Platforma KPI (metrics endpoint — faqat kelsa) */}
        {metrics ? (
          <View style={styles.statsRow}>
            <StatCard label="Foydalanuvchilar" value={fmtNum(premiumBlock.total_users)} valueSize={20} />
            <StatCard
              label="Faol premium"
              value={fmtNum(premiumBlock.premium_active)}
              valueColor={colors.gold}
              valueSize={20}
            />
            <StatCard
              label="Premium %"
              value={`${premiumBlock.premium_pct ?? 0}%`}
              valueColor={colors.purpleLight}
              valueSize={20}
            />
          </View>
        ) : null}

        {/* Trend endpointlaridan hosila ko'rsatkichlar */}
        <View style={styles.statsRow}>
          <StatCard label="Daromad (12 oy)" value={fmtShort(totalRevenue)} valueColor={colors.green} valueSize={18} />
          <StatCard label="Urinish (30 kun)" value={fmtNum(totalAttempts)} valueSize={18} />
          <StatCard label="Savollar" value={fmtNum(totalQuestions)} valueSize={18} />
        </View>

        {/* Kunlik test urinishlari */}
        <Text style={styles.sectionTitle}>Kunlik test urinishlari</Text>
        <Text style={styles.sectionSub}>So'nggi 14 kun</Text>
        {attemptsEmpty ? (
          emptyCard()
        ) : (
          <Card style={styles.chartCard}>
            <ActivityBarChart data={attemptBars} height={120} gap={5} />
          </Card>
        )}

        {/* Oylik daromad */}
        <Text style={styles.sectionTitle}>Oylik daromad</Text>
        <Text style={styles.sectionSub}>So'nggi 12 oy · {fmtNum(totalRevenue)} so'm</Text>
        {revenueEmpty ? (
          emptyCard()
        ) : (
          <Card style={styles.chartCard}>
            <ActivityBarChart data={revenueBars} height={120} gap={6} />
          </Card>
        )}

        {/* Eng faol olimpiadalar */}
        <Text style={styles.sectionTitle}>Eng faol olimpiadalar</Text>
        <Text style={styles.sectionSub}>Ishtirokchilar bo'yicha top-10</Text>
        {olympiads.length === 0 ? (
          emptyCard()
        ) : (
          <View style={styles.list}>
            {olympiads.map((o, i) => (
              <Card key={i} style={styles.rowCard}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{i + 1}</Text>
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowName} numberOfLines={1}>{o.name || "Noma'lum"}</Text>
                  <Text style={styles.rowSub}>O'rtacha ball: {o.avg_score ?? 0}</Text>
                </View>
                <Badge
                  label={`${o.participants ?? 0} kishi`}
                  color={colors.blueLight}
                  background={tints.blue14}
                  size={10.5}
                />
              </Card>
            ))}
          </View>
        )}

        {/* Fan bo'yicha savollar */}
        <Text style={styles.sectionTitle}>Fan bo'yicha savollar</Text>
        <Text style={styles.sectionSub}>Eng ko'p savol bo'lgan fanlar</Text>
        {bySubject.length === 0 ? (
          emptyCard()
        ) : (
          <Card style={styles.barListCard}>
            {bySubject.map((s, i) => (
              <View key={i} style={[styles.barRow, i < bySubject.length - 1 ? styles.barRowDivider : null]}>
                <View style={styles.barRowHead}>
                  <Text style={styles.barRowName} numberOfLines={1}>{s.name}</Text>
                  <Text style={styles.barRowCount}>{fmtNum(s.count)}</Text>
                </View>
                <ProgressBar progress={Math.round(((Number(s.count) || 0) / maxSubject) * 100)} height={7} />
              </View>
            ))}
          </Card>
        )}

        {/* Savol manbalari */}
        <Text style={styles.sectionTitle}>Savol manbalari</Text>
        <Text style={styles.sectionSub}>Qo'lda / AI / import nisbati</Text>
        {bySource.length === 0 ? (
          emptyCard()
        ) : (
          <Card style={styles.barListCard}>
            {bySource.map((s, i) => (
              <View key={i} style={[styles.srcRow, i < bySource.length - 1 ? styles.barRowDivider : null]}>
                <Text style={styles.barRowName} numberOfLines={1}>{s.label || s.name}</Text>
                <Badge label={fmtNum(s.count)} color={colors.purpleLight} background={tints.purple16} size={10.5} />
              </View>
            ))}
          </Card>
        )}

        {/* Viloyat bo'yicha markazlar */}
        <Text style={styles.sectionTitle}>Viloyat bo'yicha markazlar</Text>
        <Text style={styles.sectionSub}>Tasdiqlangan markazlar soni</Text>
        {byRegion.length === 0 ? (
          emptyCard()
        ) : (
          <Card style={styles.barListCard}>
            {byRegion.map((r, i) => (
              <View key={i} style={[styles.srcRow, i < byRegion.length - 1 ? styles.barRowDivider : null]}>
                <View style={styles.regionName}>
                  <BuildingIcon size={15} color={colors.textSecondary} />
                  <Text style={styles.barRowName} numberOfLines={1}>{r.name}</Text>
                </View>
                <Badge label={`${fmtNum(r.count)} ta`} color={colors.blueLight} background={tints.blue14} size={10.5} />
              </View>
            ))}
          </Card>
        )}

        {/* Premium vs Bepul markaz faolligi */}
        {premiumVsFree.length && (pvfPremium || pvfFree) ? (
          <>
            <Text style={styles.sectionTitle}>Premium vs Bepul faollik</Text>
            <Text style={styles.sectionSub}>So'nggi 6 oy olimpiadalar soni</Text>
            <View style={styles.statsRow}>
              <StatCard label="Premium markaz" value={fmtNum(pvfPremium)} valueColor={colors.gold} valueSize={20} />
              <StatCard label="Bepul markaz" value={fmtNum(pvfFree)} valueColor={colors.blueLight} valueSize={20} />
            </View>
          </>
        ) : null}

        {/* Diskvalifikatsiya dinamikasi */}
        <Text style={styles.sectionTitle}>Diskvalifikatsiya dinamikasi</Text>
        <Text style={styles.sectionSub}>So'nggi 8 hafta cheating/DQ holatlari</Text>
        {dqEmpty ? (
          emptyCard('DQ holatlari qayd etilmagan')
        ) : (
          <Card style={styles.chartCard}>
            <View style={styles.dqHead}>
              <WarningIcon size={15} color={colors.red} />
              <Text style={styles.dqTotal}>{fmtNum(dqTrend.reduce((s, r) => s + (Number(r.count) || 0), 0))} ta jami</Text>
            </View>
            <ActivityBarChart data={dqBars} height={100} gap={9} style={{ marginTop: 12 }} />
          </Card>
        )}

        {/* Top markazlar reytingi */}
        <Text style={styles.sectionTitle}>Top markazlar reytingi</Text>
        <Text style={styles.sectionSub}>Eng yuqori reytingli 5 markaz</Text>
        {topCenters.length === 0 ? (
          emptyCard()
        ) : (
          <View style={styles.list}>
            {topCenters.map((c, i) => {
              const points = asArray(c.points);
              const latest = points.length ? points[points.length - 1].score : null;
              return (
                <Card key={c.center_id ?? i} style={styles.rowCard}>
                  <TrophyIcon size={18} color={colors.gold} full={i === 0} strokeWidth={2} />
                  <View style={styles.rowText}>
                    <Text style={styles.rowName} numberOfLines={1}>{c.name || "Noma'lum markaz"}</Text>
                    <Text style={styles.rowSub}>{points.length ? `${points.length} ta o'lchov` : "Reyting tarixi yo'q"}</Text>
                  </View>
                  <Badge
                    label={latest != null ? `${Math.round(latest)}` : '—'}
                    color={colors.gold}
                    background={tints.gold14}
                    size={11}
                  />
                </Card>
              );
            })}
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </Wrapper>
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
    content: { paddingHorizontal: 20, paddingBottom: 40 },
    statsRow: { flexDirection: 'row', gap: 9, marginBottom: 4 },
    sectionTitle: { fontSize: 15, fontFamily: FONTS.extrabold, color: colors.text, marginTop: 22 },
    sectionSub: { fontSize: 11.5, fontFamily: FONTS.semibold, color: colors.textMuted, marginTop: 2, marginBottom: 11 },
    chartCard: { paddingVertical: 16, paddingHorizontal: 16 },
    emptyCard: { padding: 20, alignItems: 'center' },
    emptyText: { fontSize: 12.5, fontFamily: FONTS.semibold, color: colors.textMuted },
    list: { gap: 8 },
    rowCard: { paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
    rowText: { flex: 1 },
    rowName: { fontSize: 13.5, fontFamily: FONTS.extrabold, color: colors.text },
    rowSub: { fontSize: 11, fontFamily: FONTS.semibold, color: colors.textSecondary, marginTop: 2 },
    rankBadge: {
      width: 30,
      height: 30,
      borderRadius: 9,
      backgroundColor: tints.blue14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rankText: { fontSize: 13, fontFamily: FONTS.extrabold, color: colors.blueLight },
    barListCard: { paddingVertical: 6, paddingHorizontal: 16 },
    barRow: { paddingVertical: 11, gap: 7 },
    barRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
    barRowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    barRowName: { flex: 1, fontSize: 12.5, fontFamily: FONTS.bold, color: colors.textBody, marginRight: 10 },
    barRowCount: { fontSize: 12.5, fontFamily: FONTS.extrabold, color: colors.text },
    srcRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
    regionName: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 10 },
    dqHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    dqTotal: { fontSize: 12.5, fontFamily: FONTS.extrabold, color: colors.red },
  });
