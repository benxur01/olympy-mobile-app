import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Card from '../components/Card';
import StatCard from '../components/StatCard';
import ProgressBar from '../components/ProgressBar';
import IconBox from '../components/IconBox';
import Chip from '../components/Chip';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import SvgLineChart from '../components/SvgLineChart';
import ActivityBarChart from '../components/ActivityBarChart';
import useFetch from '../services/useFetch';
import { studentApi } from '../services/api';
import {
  BackIcon,
  BarsIcon,
  TrophyIcon,
  StarIcon,
  FlameIcon,
  SparkleIcon,
  WarningIcon,
  CheckIcon,
} from '../components/icons/Icons';

const PERIODS = [
  { label: '30 kun', value: 30 },
  { label: '3 oy', value: 90 },
  { label: '6 oy', value: 180 },
];

// Fan progress-bar palitrasi (websaytdagi SUBJECT_BAR_COLORS bilan bir xil).
const SUBJECT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#a855f7', '#84cc16', '#f43f5e'];

export default function ProgressScreen({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const [period, setPeriod] = useState(30);

  // getProgress davrga bog'liq — toggle o'zgarganda qayta yuklanadi. AI tavsiya
  // davrdan mustaqil, lekin bitta so'rovda birga olinadi (Promise.allSettled —
  // bittasi xato bersa ikkinchisi ishlashda davom etadi).
  const { data, loading, refreshing, error, reload, refresh } = useFetch(async () => {
    const [prog, advice, monthly] = await Promise.allSettled([
      studentApi.getProgress(period),
      studentApi.getAiAdvice(),
      // 6 oylik o'rtacha ball dinamikasi — davrdan mustaqil (har doim 6 oy).
      studentApi.monthlyStats(6),
    ]);
    return {
      progress: prog.status === 'fulfilled' ? prog.value?.data : null,
      advice: advice.status === 'fulfilled' ? advice.value?.data : null,
      monthly: monthly.status === 'fulfilled' ? monthly.value?.data : null,
    };
  }, [period]);

  if (loading && !data) return <LoadingState message="O'sish tahlili yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  const prog = data?.progress || {};
  const stats = prog.stats || {};
  const trend = prog.trend || {};
  const timeline = Array.isArray(prog.timeline) ? prog.timeline : [];
  const subjects = Array.isArray(prog.subjects) ? prog.subjects : [];
  const advices = Array.isArray(data?.advice?.advices) ? data.advice.advices : [];

  const chartPoints = timeline.map((p) => ({ value: p.score || 0 }));

  // 6 oylik ustunli grafik uchun ma'lumot: { months: [{ label|month,
  // average_score }] }. Oxirgi oy urg'ulanadi.
  const monthlyRows = Array.isArray(data?.monthly?.months) ? data.monthly.months : [];
  const monthlyBars = monthlyRows.map((m, i) => ({
    value: Math.max(3, Math.round(m.average_score || 0)),
    label: m.label || (m.month != null ? `${m.month}` : '—'),
    color: colors.blue,
    active: i === monthlyRows.length - 1,
    glow: i === monthlyRows.length - 1,
  }));

  const trendMeta = {
    "o'sish": { color: colors.green, icon: '↗', label: "O'sish" },
    pasayish: { color: colors.red, icon: '↘', label: 'Pasayish' },
    barqaror: { color: colors.orange, icon: '→', label: 'Barqaror' },
  }[trend.direction] || { color: colors.textMuted, icon: '→', label: '—' };

  const activePeriodLabel = PERIODS.find((p) => p.value === period)?.label;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()} style={styles.backBtn}>
          <BackIcon size={16} />
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>O'sishim</Text>
          <Text style={styles.subtitle}>Natijalar dinamikasi va tavsiyalar</Text>
        </View>
        <IconBox size={36} radius={12} background={tints.blue14}>
          <BarsIcon size={16} color={colors.blue} />
        </IconBox>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.blue} />}
      >
        {/* ─── Davr toggle ─────────────────────────────────────────────────── */}
        <View style={styles.periodRow}>
          {PERIODS.map((p) => (
            <Chip
              key={p.value}
              label={p.label}
              active={period === p.value}
              radius={12}
              onPress={() => setPeriod(p.value)}
            />
          ))}
        </View>

        {/* ─── Umumiy statistika ───────────────────────────────────────────── */}
        <View style={styles.statRow}>
          <StatCard
            label="Jami olimpiada"
            value={stats.total_olympiads ?? 0}
            icon={<IconBox size={30} radius={9} background={tints.blue14}><TrophyIcon size={15} color={colors.blue} strokeWidth={1.8} full /></IconBox>}
          />
          <StatCard
            label="O'rtacha ball"
            value={`${stats.avg_score ?? 0}%`}
            valueColor={colors.green}
            icon={<IconBox size={30} radius={9} background={tints.green14}><BarsIcon size={15} color={colors.green} /></IconBox>}
          />
        </View>
        <View style={styles.statRow}>
          <StatCard
            label="Eng yaxshi"
            value={`${stats.best_score ?? 0}%`}
            valueColor={colors.gold}
            icon={<IconBox size={30} radius={9} background={tints.gold14}><StarIcon size={15} color={colors.gold} /></IconBox>}
          />
          <StatCard
            label="Streak"
            value={`${stats.streak ?? 0} kun`}
            valueColor={colors.orange}
            note={stats.streak ? 'Ketma-ket' : 'Bugun boshlang'}
            icon={<IconBox size={30} radius={9} background={tints.orange14}><FlameIcon size={15} color={colors.orange} /></IconBox>}
          />
        </View>

        {/* ─── Ball dinamikasi ─────────────────────────────────────────────── */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Ball dinamikasi</Text>
          <Text style={styles.sectionNote}>{activePeriodLabel} davri</Text>
        </View>
        <Card style={styles.card}>
          {chartPoints.length === 0 ? (
            <EmptyState
              compact
              title="Bu davrda natija yo'q"
              message="Boshqa davrni tanlang yoki yangi tadbirda qatnashing."
            />
          ) : (
            <>
              {timeline.length > 0 ? (
                <View style={styles.chartHead}>
                  <View style={[styles.trendBadge, { backgroundColor: `${trendMeta.color}1a` }]}>
                    <Text style={[styles.trendIcon, { color: trendMeta.color }]}>{trendMeta.icon}</Text>
                    <Text style={[styles.trendLabel, { color: trendMeta.color }]}>{trendMeta.label}</Text>
                  </View>
                </View>
              ) : null}
              <SvgLineChart points={chartPoints} stroke={colors.blue} />
              <Text style={styles.chartFoot}>
                Oxirgi natija: <Text style={styles.chartFootStrong}>{trend.last ?? 0}%</Text>
                {`  ·  ${timeline.length} ta urinish`}
              </Text>
            </>
          )}
        </Card>

        {/* ─── 6 oylik dinamika (ustunli grafik) ───────────────────────────── */}
        {monthlyBars.length > 0 ? (
          <>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>6 oylik dinamika</Text>
              <Text style={styles.sectionNote}>Oylik o'rtacha ball</Text>
            </View>
            <Card style={styles.card}>
              <ActivityBarChart data={monthlyBars} height={110} />
            </Card>
          </>
        ) : null}

        {/* ─── Fanlar bo'yicha ─────────────────────────────────────────────── */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Fanlar bo'yicha</Text>
          <Text style={styles.sectionNote}>O'rtacha ball</Text>
        </View>
        <Card style={styles.card}>
          {subjects.length === 0 ? (
            <Text style={styles.emptyText}>Hali fan bo'yicha ma'lumot yo'q.</Text>
          ) : (
            <View style={styles.list}>
              {subjects.map((s, i) => {
                const color = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
                const pct = Math.max(0, Math.min(100, s.pct ?? 0));
                return (
                  <View key={s.subject || i} style={styles.subjectRow}>
                    <View style={styles.subjectHead}>
                      <Text style={styles.subjectName} numberOfLines={1}>{s.subject}</Text>
                      <Text style={[styles.subjectPct, { color }]}>{s.pct ?? 0}%</Text>
                    </View>
                    <ProgressBar progress={pct} height={8} color={color} />
                  </View>
                );
              })}
            </View>
          )}
        </Card>

        {/* ─── AI tavsiyalar ───────────────────────────────────────────────── */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>AI tavsiyalar</Text>
          <Text style={styles.sectionNote}>Shaxsiy</Text>
        </View>
        {advices.length === 0 ? (
          <Card style={styles.card}>
            <Text style={styles.emptyText}>Hozircha tavsiya yo'q. Bir nechta tadbirda qatnashing.</Text>
          </Card>
        ) : (
          <View style={styles.adviceWrap}>
            {advices.map((a, i) => {
              const isWarn = a.tone === 'warning';
              const accent = isWarn ? colors.orange : colors.green;
              return (
                <Card key={i} style={[styles.adviceCard, { borderLeftColor: accent, borderLeftWidth: 3 }]}>
                  <View style={styles.adviceHead}>
                    {isWarn ? <WarningIcon size={14} color={accent} /> : <CheckIcon size={14} color={accent} />}
                    <Text style={[styles.adviceTitle, { color: accent }]} numberOfLines={2}>{a.title}</Text>
                  </View>
                  {a.text ? <Text style={styles.adviceText}>{a.text}</Text> : null}
                </Card>
              );
            })}
          </View>
        )}

        <View style={styles.footerNote}>
          <SparkleIcon size={13} color={colors.textMuted} />
          <Text style={styles.footerText}>
            Tahlil sizning tadbirdagi natijalaringizga asoslanadi. Ko'proq qatnashsangiz — aniqroq bo'ladi.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors, tints) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  subtitle: {
    fontSize: 11.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 22,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  sectionNote: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
  },
  card: {
    padding: 16,
  },
  emptyText: {
    fontSize: 12.5,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
    lineHeight: 18,
  },
  // ── Chart ──
  chartHead: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  trendIcon: {
    fontSize: 13,
    fontFamily: FONTS.extrabold,
  },
  trendLabel: {
    fontSize: 11,
    fontFamily: FONTS.extrabold,
  },
  chartFoot: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 11.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
  },
  chartFootStrong: {
    fontFamily: FONTS.extrabold,
    color: colors.blue,
  },
  // ── Fanlar ──
  list: {
    gap: 14,
  },
  subjectRow: {
    gap: 7,
  },
  subjectHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  subjectName: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: colors.text,
  },
  subjectPct: {
    fontSize: 13,
    fontFamily: FONTS.extrabold,
  },
  // ── Tavsiyalar ──
  adviceWrap: {
    gap: 10,
  },
  adviceCard: {
    padding: 14,
    gap: 6,
  },
  adviceHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adviceTitle: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.extrabold,
  },
  adviceText: {
    fontSize: 12.5,
    fontFamily: FONTS.semibold,
    color: colors.textBody,
    lineHeight: 18,
  },
  // ── Footer ──
  footerNote: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 22,
    paddingHorizontal: 4,
  },
  footerText: {
    flex: 1,
    fontSize: 11,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
    lineHeight: 16,
  },
});
