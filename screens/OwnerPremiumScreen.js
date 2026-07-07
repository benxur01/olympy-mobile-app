import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Card from '../components/Card';
import Badge from '../components/Badge';
import StatCard from '../components/StatCard';
import SegmentedControl from '../components/SegmentedControl';
import ActivityBarChart from '../components/ActivityBarChart';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import useFetch from '../services/useFetch';
import { ownerApi } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { centerIdForUser } from '../services/roles';
import {
  BackIcon, TrophyIcon, BuildingIcon, WarningIcon, UsersIcon,
  QuestionCircleIcon, ClockIcon, FileIcon, CrownIcon,
} from '../components/icons/Icons';

// Promise.allSettled natijasini bo'lim holatiga aylantirish. Muvaffaqiyat →
// { ok, data }; xato → { ok:false, code, upgrade }. `upgrade` (403 +
// upgrade_required) bo'lsa bo'lim "Premium" qulf kartasini ko'rsatadi, boshqa
// xatolarda "Ma'lumot yuklab bo'lmadi" — butun ekran qulamaydi.
const readSection = (settled) => {
  if (settled?.status === 'fulfilled') return { ok: true, data: settled.value?.data };
  const resp = settled?.reason?.response;
  return { ok: false, code: resp?.status || 0, upgrade: !!resp?.data?.upgrade_required };
};

const asArray = (v) => (Array.isArray(v) ? v : []);

const fmtNum = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

// ISO sanani lokalizatsiyasiz (Hermes-safe) 'YYYY-MM-DD HH:MM' ko'rinishiga.
const fmtDateTime = (iso) => {
  if (!iso || typeof iso !== 'string') return '—';
  const date = iso.slice(0, 10);
  const time = iso.slice(11, 16);
  return time ? `${date} ${time}` : date;
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

const ACTION_LABELS = {
  send_plan: 'Reja yuborish',
  send_analysis: 'Tahlil yuborish',
  export_data: "Ma'lumot eksporti",
  import_results: 'Natija importi',
  view_report: "Hisobot ko'rish",
};

const DIFFICULTY_LABELS = { easy: 'Oson', medium: "O'rta", hard: 'Qiyin' };

export default function OwnerPremiumScreen({ navigation, route }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const { user } = useAuth();

  const paramCenterId = route.params?.centerId;
  const paramCenterName = route.params?.centerName;

  const { data, loading, refreshing, error, reload, refresh } = useFetch(async () => {
    // Markazni aniqlaymiz: navigatsiya paramlari → user roli → myCenters.
    let centerId = paramCenterId || centerIdForUser(user) || null;
    let centerName = paramCenterName || null;
    if (!centerId) {
      const centers = await ownerApi.myCenters().then((r) => r.data).catch(() => null);
      const c = asArray(Array.isArray(centers) ? centers : centers?.results || centers?.members)[0];
      centerId = c?.id || null;
      centerName = centerName || c?.name || null;
    }
    if (!centerId) throw new Error('no_center');

    const [regionRank, ratingHistory, churn, comparison, dynamics, mocks, questionBank, logs] =
      await Promise.allSettled([
        ownerApi.regionRank(centerId),
        ownerApi.ratingHistory(centerId),
        ownerApi.churnRisk(centerId),
        ownerApi.memberComparison(centerId),
        ownerApi.studentDynamics(centerId),
        ownerApi.mockOlympiads(centerId),
        ownerApi.questionBank(centerId),
        ownerApi.managerLogs(centerId),
      ]);
    return {
      centerId,
      centerName,
      regionRank: readSection(regionRank),
      ratingHistory: readSection(ratingHistory),
      churn: readSection(churn),
      comparison: readSection(comparison),
      dynamics: readSection(dynamics),
      mocks: readSection(mocks),
      questionBank: readSection(questionBank),
      logs: readSection(logs),
    };
  }, []);

  const centerId = data?.centerId;

  // ── Hisobot (report-json) — davr almashtirgichi bilan alohida yuklanadi ──
  const [reportPeriod, setReportPeriod] = useState('week');
  const [report, setReport] = useState(null);
  // Boshlanishida true — data tayyor bo'lgach effekt report-json'ni yuklaguncha
  // birinchi kadrda xato kartasi chaqnamasligi uchun (spinner ko'rinadi).
  const [reportLoading, setReportLoading] = useState(true);

  const loadReport = useCallback(async (cid, period) => {
    if (!cid) return;
    setReportLoading(true);
    try {
      const r = await ownerApi.reportJson(cid, period);
      setReport({ ok: true, data: r.data });
    } catch (e) {
      const resp = e?.response;
      setReport({ ok: false, code: resp?.status || 0, upgrade: !!resp?.data?.upgrade_required });
    } finally {
      setReportLoading(false);
    }
  }, []);

  useEffect(() => {
    if (centerId) loadReport(centerId, reportPeriod);
  }, [centerId, reportPeriod, loadReport]);

  const onRefresh = useCallback(() => {
    refresh();
    if (centerId) loadReport(centerId, reportPeriod);
  }, [refresh, centerId, reportPeriod, loadReport]);

  if (loading) return <LoadingState message="Premium tahlil yuklanmoqda…" />;
  if (error && !data) return <ErrorState message="Markaz ma'lumotini yuklab bo'lmadi." onRetry={reload} />;

  // ── Umumiy holat kartalari ──────────────────────────────────────────
  const lockCard = (
    <Card style={styles.lockCard} borderColor={tints.goldBorder30} background={tints.gold06}>
      <CrownIcon size={17} color={colors.gold} />
      <Text style={styles.lockText}>Bu bo'lim premium markazlar uchun</Text>
    </Card>
  );
  const errCard = (
    <Card style={styles.emptyCard}>
      <Text style={styles.emptyText}>Ma'lumot yuklab bo'lmadi</Text>
    </Card>
  );
  const emptyCard = (text) => (
    <Card style={styles.emptyCard}>
      <Text style={styles.emptyText}>{text || "Ma'lumot yo'q"}</Text>
    </Card>
  );
  // Bo'lim OK bo'lmasa: premium qulfi yoki xato kartasini tanlaydi.
  const fallback = (section) => (section?.upgrade ? lockCard : errCard);

  const regionRank = data?.regionRank;
  const ratingHistory = data?.ratingHistory;
  const churn = data?.churn;
  const comparison = data?.comparison;
  const dynamics = data?.dynamics;
  const mocks = data?.mocks;
  const questionBank = data?.questionBank;
  const logs = data?.logs;

  const rr = regionRank?.ok ? regionRank.data || {} : null;

  const ratingRows = ratingHistory?.ok ? asArray(ratingHistory.data) : [];
  const ratingBars = ratingRows.length
    ? toBars(ratingRows.map((r) => ({ value: r.score, label: String(r.month || '').slice(5) })), colors, colors.gold)
    : [];
  const latestRating = ratingRows.length ? ratingRows[ratingRows.length - 1] : null;

  const churnRows = churn?.ok ? asArray(churn.data) : [];

  const compRows = comparison?.ok ? asArray(comparison.data) : [];
  const compShown = compRows.slice(0, 20);

  const dynRows = dynamics?.ok ? asArray(dynamics.data) : [];
  const dynBars = dynRows.length
    ? toBars(dynRows.map((r) => ({ value: r.joined, label: String(r.month || '').slice(5) })), colors, colors.blue)
    : [];
  const latestDyn = dynRows.length ? dynRows[dynRows.length - 1] : null;

  const mockRows = mocks?.ok ? asArray(mocks.data) : [];
  const qbRows = questionBank?.ok ? asArray(questionBank.data) : [];
  const logRows = logs?.ok ? asArray(logs.data) : [];

  const rep = report?.ok ? report.data || {} : null;
  const repTop = asArray(rep?.top_students);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()} style={styles.backBtn}>
          <BackIcon size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Premium tahlil</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {data?.centerName || 'Markaz hisobotlari'}
          </Text>
        </View>
        <View style={styles.crownWrap}>
          <CrownIcon size={18} color={colors.gold} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}
      >
        {/* ── Markaz hisoboti (report-json) ─────────────────────────── */}
        <View style={styles.sectionHead}>
          <FileIcon size={16} color={colors.blueLight} />
          <Text style={styles.sectionTitle}>Markaz hisoboti</Text>
        </View>
        <SegmentedControl
          segments={['Hafta', 'Oy']}
          activeIndex={reportPeriod === 'week' ? 0 : 1}
          onChange={(i) => setReportPeriod(i === 0 ? 'week' : 'month')}
          style={{ marginBottom: 12 }}
        />
        {reportLoading ? (
          <Card style={styles.emptyCard}>
            <ActivityIndicator color={colors.blue} />
          </Card>
        ) : !rep ? (
          report?.upgrade ? lockCard : errCard
        ) : (
          <>
            <View style={styles.statsRow}>
              <StatCard label="O'quvchilar" value={fmtNum(rep.students_count)} valueSize={20} />
              <StatCard label="Olimpiadalar" value={fmtNum(rep.olympiads_count)} valueSize={20} />
              <StatCard label="O'rtacha ball" value={rep.average_score ?? 0} valueColor={colors.gold} valueSize={20} />
            </View>
            <Text style={styles.metaLine}>
              {rep.period_label} · {rep.date} · Jami {fmtNum(rep.total_attempts)} urinish
            </Text>
            {repTop.length ? (
              <View style={styles.list}>
                {repTop.map((s, i) => (
                  <Card key={i} style={styles.rowCard}>
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankText}>{s.rank || i + 1}</Text>
                    </View>
                    <View style={styles.rowText}>
                      <Text style={styles.rowName} numberOfLines={1}>{s.full_name || "O'quvchi"}</Text>
                      <Text style={styles.rowSub}>{fmtNum(s.attempts)} urinish</Text>
                    </View>
                    <Text style={styles.avgScore}>{s.avg_score ?? 0}</Text>
                  </Card>
                ))}
              </View>
            ) : (
              emptyCard('Hozircha natija yo\'q')
            )}
          </>
        )}

        {/* ── Hudud reytingi (region-rank) ──────────────────────────── */}
        <View style={styles.sectionHead}>
          <TrophyIcon size={16} color={colors.gold} />
          <Text style={styles.sectionTitle}>Reyting o'rni</Text>
        </View>
        <Text style={styles.sectionSub}>Markazning hudud va respublika bo'yicha o'rni (anonim)</Text>
        {!rr ? (
          fallback(regionRank)
        ) : (
          <View style={styles.statsRow}>
            <StatCard
              label={rr.region ? `Hududda (${rr.region})` : 'Hududda'}
              value={rr.region_rank != null ? `${rr.region_rank}/${rr.region_total}` : '—'}
              valueColor={colors.gold}
              valueSize={18}
            />
            <StatCard
              label="Respublikada"
              value={rr.global_rank != null ? `${rr.global_rank}/${rr.global_total}` : '—'}
              valueColor={colors.blueLight}
              valueSize={18}
            />
            <StatCard label="O'rtacha ball" value={rr.average_score ?? 0} valueSize={18} />
          </View>
        )}

        {/* ── Reyting tarixi (rating-history) ───────────────────────── */}
        <View style={styles.sectionHead}>
          <BuildingIcon size={16} color={colors.blueLight} />
          <Text style={styles.sectionTitle}>Reyting tarixi</Text>
        </View>
        <Text style={styles.sectionSub}>Oylar bo'yicha markaz balli dinamikasi</Text>
        {!ratingHistory?.ok ? (
          fallback(ratingHistory)
        ) : ratingRows.length === 0 ? (
          emptyCard('Reyting tarixi hali yig\'ilmagan')
        ) : (
          <Card style={styles.chartCard}>
            {latestRating ? (
              <View style={styles.chartHead}>
                <Text style={styles.chartHeadLabel}>So'nggi ball</Text>
                <Text style={styles.chartHeadValue}>
                  {Math.round(latestRating.score || 0)}
                  {latestRating.rank != null ? (
                    <Text style={styles.chartHeadRank}>  ·  {latestRating.rank}-o'rin</Text>
                  ) : null}
                </Text>
              </View>
            ) : null}
            <ActivityBarChart data={ratingBars} height={110} gap={9} style={{ marginTop: 12 }} />
          </Card>
        )}

        {/* ── Xavf ostidagi o'quvchilar (churn-risk) ────────────────── */}
        <View style={styles.sectionHead}>
          <WarningIcon size={16} color={colors.red} />
          <Text style={styles.sectionTitle}>Xavf ostidagi o'quvchilar</Text>
        </View>
        <Text style={styles.sectionSub}>Faolligi keskin pasaygan o'quvchilar</Text>
        {!churn?.ok ? (
          fallback(churn)
        ) : churnRows.length === 0 ? (
          emptyCard('Xavf ostidagi o\'quvchi yo\'q — a\'lo!')
        ) : (
          <View style={styles.list}>
            {churnRows.map((s, i) => {
              const high = s.risk_level === 'high';
              return (
                <Card key={s.user_id ?? i} style={styles.rowCard}>
                  <View style={[styles.dot, { backgroundColor: high ? colors.red : colors.orange }]} />
                  <View style={styles.rowText}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {s.full_name || "O'quvchi"}
                      {s.group_tag ? <Text style={styles.tagInline}>  {s.group_tag}</Text> : null}
                    </Text>
                    <Text style={styles.rowSub}>
                      {s.phone_masked || '—'} · faollik {s.prev_activity} → {s.recent_activity}/kun
                    </Text>
                  </View>
                  <Badge
                    label={high ? 'Yuqori' : "O'rta"}
                    color={high ? colors.redSoftText : colors.orangeSoftText}
                    background={high ? tints.red12 : tints.orange13}
                    size={10.5}
                  />
                </Card>
              );
            })}
          </View>
        )}

        {/* ── O'quvchilar reytingi (member-comparison) ──────────────── */}
        <View style={styles.sectionHead}>
          <UsersIcon size={16} color={colors.blueLight} />
          <Text style={styles.sectionTitle}>O'quvchilar reytingi</Text>
        </View>
        <Text style={styles.sectionSub}>O'rtacha ball bo'yicha to'liq solishtiruv</Text>
        {!comparison?.ok ? (
          fallback(comparison)
        ) : compShown.length === 0 ? (
          emptyCard()
        ) : (
          <>
            <View style={styles.list}>
              {compShown.map((s, i) => (
                <Card key={s.user_id ?? i} style={styles.rowCard}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>{s.rank || i + 1}</Text>
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {s.full_name || "O'quvchi"}
                      {s.group_tag ? <Text style={styles.tagInline}>  {s.group_tag}</Text> : null}
                    </Text>
                    <Text style={styles.rowSub}>{fmtNum(s.attempt_count)} urinish · jami {fmtNum(s.total_score)} ball</Text>
                  </View>
                  <Text style={styles.avgScore}>{s.avg_score ?? 0}</Text>
                </Card>
              ))}
            </View>
            {compRows.length > compShown.length ? (
              <Text style={styles.moreNote}>va yana {compRows.length - compShown.length} ta o'quvchi</Text>
            ) : null}
          </>
        )}

        {/* ── O'quvchilar dinamikasi (student-dynamics) ─────────────── */}
        <View style={styles.sectionHead}>
          <UsersIcon size={16} color={colors.green} />
          <Text style={styles.sectionTitle}>O'quvchilar dinamikasi</Text>
        </View>
        <Text style={styles.sectionSub}>Oyma-oy qo'shilgan yangi o'quvchilar</Text>
        {!dynamics?.ok ? (
          fallback(dynamics)
        ) : dynRows.length === 0 ? (
          emptyCard()
        ) : (
          <Card style={styles.chartCard}>
            {latestDyn ? (
              <View style={styles.chartHead}>
                <Text style={styles.chartHeadLabel}>Jami o'quvchilar</Text>
                <Text style={styles.chartHeadValue}>{fmtNum(latestDyn.total)}</Text>
              </View>
            ) : null}
            <ActivityBarChart data={dynBars} height={110} gap={9} style={{ marginTop: 12 }} />
          </Card>
        )}

        {/* ── Mock olimpiadalar (mock-olympiads) ────────────────────── */}
        <View style={styles.sectionHead}>
          <FileIcon size={16} color={colors.purpleLight} />
          <Text style={styles.sectionTitle}>Mock olimpiadalar</Text>
        </View>
        <Text style={styles.sectionSub}>Markaz mashq olimpiadalari</Text>
        {!mocks?.ok ? (
          fallback(mocks)
        ) : mockRows.length === 0 ? (
          emptyCard('Mock olimpiada yaratilmagan')
        ) : (
          <View style={styles.list}>
            {mockRows.map((m, i) => (
              <Card key={m.id ?? i} style={styles.rowCard}>
                <View style={styles.rowText}>
                  <Text style={styles.rowName} numberOfLines={1}>{m.title || "Mock olimpiada"}</Text>
                  <Text style={styles.rowSub}>
                    {[m.subject, `${fmtNum(m.question_count)} savol`, `${fmtNum(m.time_limit_minutes)} daq`]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
                <Badge
                  label={m.is_active ? 'Faol' : 'Nofaol'}
                  color={m.is_active ? colors.greenLight : colors.textMuted}
                  background={m.is_active ? tints.green14 : colors.surfaceDeep}
                  size={10.5}
                />
              </Card>
            ))}
          </View>
        )}

        {/* ── Savollar banki (question-bank) ────────────────────────── */}
        <View style={styles.sectionHead}>
          <QuestionCircleIcon size={16} color={colors.blueLight} />
          <Text style={styles.sectionTitle}>Savollar banki</Text>
        </View>
        <Text style={styles.sectionSub}>Markazda saqlangan savollar</Text>
        {!questionBank?.ok ? (
          fallback(questionBank)
        ) : qbRows.length === 0 ? (
          emptyCard('Savollar banki bo\'sh')
        ) : (
          <View style={styles.list}>
            {qbRows.slice(0, 30).map((q, i) => (
              <Card key={q.id ?? i} style={styles.qCard}>
                <Text style={styles.qText} numberOfLines={2}>{q.text || '—'}</Text>
                <View style={styles.qMeta}>
                  {q.subject ? (
                    <Badge label={q.subject} color={colors.blueLight} background={tints.blue14} size={10} />
                  ) : null}
                  <Badge
                    label={DIFFICULTY_LABELS[q.difficulty] || q.difficulty || "O'rta"}
                    color={colors.purpleLight}
                    background={tints.purple16}
                    size={10}
                  />
                  <Text style={styles.qOpts}>{asArray(q.options).length} variant</Text>
                </View>
              </Card>
            ))}
            {qbRows.length > 30 ? (
              <Text style={styles.moreNote}>va yana {qbRows.length - 30} ta savol</Text>
            ) : null}
          </View>
        )}

        {/* ── Menejer amallari (manager-logs) ───────────────────────── */}
        <View style={styles.sectionHead}>
          <ClockIcon size={16} color={colors.textSecondary} />
          <Text style={styles.sectionTitle}>Menejer amallari</Text>
        </View>
        <Text style={styles.sectionSub}>Menejerlar faoliyati tarixi (audit)</Text>
        {!logs?.ok ? (
          logs?.code === 403 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>Bu bo'lim faqat markaz egasi uchun</Text>
            </Card>
          ) : (
            errCard
          )
        ) : logRows.length === 0 ? (
          emptyCard('Amallar tarixi bo\'sh')
        ) : (
          <View style={styles.list}>
            {logRows.slice(0, 40).map((log, i) => (
              <Card key={log.id ?? i} style={styles.logCard}>
                <View style={styles.logHead}>
                  <Text style={styles.logManager} numberOfLines={1}>{log.manager_name || 'Menejer'}</Text>
                  <Text style={styles.logDate}>{fmtDateTime(log.created_at)}</Text>
                </View>
                <Text style={styles.logAction}>
                  {ACTION_LABELS[log.action_type] || log.action_type || 'Amal'}
                  {log.target_name ? <Text style={styles.logTarget}>  →  {log.target_name}</Text> : null}
                </Text>
                {log.description ? (
                  <Text style={styles.logDesc} numberOfLines={2}>{log.description}</Text>
                ) : null}
              </Card>
            ))}
            {logRows.length > 40 ? (
              <Text style={styles.moreNote}>va yana {logRows.length - 40} ta amal</Text>
            ) : null}
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
    crownWrap: {
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

    sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24 },
    sectionTitle: { fontSize: 15, fontFamily: FONTS.extrabold, color: colors.text },
    sectionSub: { fontSize: 11.5, fontFamily: FONTS.semibold, color: colors.textMuted, marginTop: 3, marginBottom: 11 },

    statsRow: { flexDirection: 'row', gap: 9 },
    metaLine: { fontSize: 11.5, fontFamily: FONTS.semibold, color: colors.textSecondary, marginTop: 10, marginBottom: 4 },

    list: { gap: 8, marginTop: 10 },
    rowCard: { paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
    rowText: { flex: 1 },
    rowName: { fontSize: 13.5, fontFamily: FONTS.extrabold, color: colors.text },
    rowSub: { fontSize: 11, fontFamily: FONTS.semibold, color: colors.textSecondary, marginTop: 2 },
    tagInline: { fontSize: 11, fontFamily: FONTS.bold, color: colors.blueLight },
    avgScore: { fontSize: 16, fontFamily: FONTS.extrabold, color: colors.gold },
    rankBadge: {
      width: 30,
      height: 30,
      borderRadius: 9,
      backgroundColor: tints.blue14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rankText: { fontSize: 13, fontFamily: FONTS.extrabold, color: colors.blueLight },
    dot: { width: 10, height: 10, borderRadius: 5 },

    chartCard: { paddingVertical: 16, paddingHorizontal: 16 },
    chartHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    chartHeadLabel: { fontSize: 12, fontFamily: FONTS.bold, color: colors.textSecondary },
    chartHeadValue: { fontSize: 18, fontFamily: FONTS.extrabold, color: colors.gold },
    chartHeadRank: { fontSize: 12.5, fontFamily: FONTS.bold, color: colors.textSecondary },

    qCard: { paddingVertical: 12, paddingHorizontal: 14, gap: 9 },
    qText: { fontSize: 13, fontFamily: FONTS.bold, color: colors.textBody, lineHeight: 18 },
    qMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    qOpts: { fontSize: 10.5, fontFamily: FONTS.bold, color: colors.textMuted },

    logCard: { paddingVertical: 12, paddingHorizontal: 14, gap: 5 },
    logHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
    logManager: { flex: 1, fontSize: 12.5, fontFamily: FONTS.extrabold, color: colors.text },
    logDate: { fontSize: 10.5, fontFamily: FONTS.bold, color: colors.textMuted },
    logAction: { fontSize: 12.5, fontFamily: FONTS.bold, color: colors.blueLight },
    logTarget: { fontSize: 12, fontFamily: FONTS.semibold, color: colors.textSecondary },
    logDesc: { fontSize: 11.5, fontFamily: FONTS.semibold, color: colors.textSecondary, lineHeight: 16 },

    lockCard: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 9 },
    lockText: { fontSize: 12.5, fontFamily: FONTS.bold, color: colors.goldSoftText },
    emptyCard: { padding: 20, alignItems: 'center' },
    emptyText: { fontSize: 12.5, fontFamily: FONTS.semibold, color: colors.textMuted, textAlign: 'center' },
    moreNote: { fontSize: 11.5, fontFamily: FONTS.bold, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
  });
