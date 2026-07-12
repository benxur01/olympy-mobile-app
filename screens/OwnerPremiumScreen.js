import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import StatCard from '../components/StatCard';
import SegmentedControl from '../components/SegmentedControl';
import ActivityBarChart from '../components/ActivityBarChart';
import ProgressBar from '../components/ProgressBar';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import useFetch from '../services/useFetch';
import { ownerApi } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { centerIdForUser } from '../services/roles';
import {
  BackIcon, TrophyIcon, BuildingIcon, WarningIcon, UsersIcon,
  QuestionCircleIcon, ClockIcon, FileIcon, CrownIcon, PlusIcon, CheckIcon, CloseIcon,
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
const DIFFICULTIES = [
  { label: 'Oson', value: 'easy' },
  { label: "O'rta", value: 'medium' },
  { label: 'Qiyin', value: 'hard' },
];
const LETTERS = ['A', 'B', 'C', 'D'];

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

    const [regionRank, ratingHistory, churn, comparison, dynamics, mocks, questionBank, logs, groups] =
      await Promise.allSettled([
        ownerApi.regionRank(centerId),
        ownerApi.ratingHistory(centerId),
        ownerApi.churnRisk(centerId),
        ownerApi.memberComparison(centerId),
        ownerApi.studentDynamics(centerId),
        ownerApi.mockOlympiads(centerId),
        ownerApi.questionBank(centerId),
        ownerApi.managerLogs(centerId),
        ownerApi.groupStats(centerId),
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
      groups: readSection(groups),
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

  // ── Savollar bankiga qo'shish / o'chirish ──────────────────────────
  const [qbAddOpen, setQbAddOpen] = useState(false);
  const [qbText, setQbText] = useState('');
  const [qbSubject, setQbSubject] = useState('');
  const [qbDifficulty, setQbDifficulty] = useState('medium');
  const [qbOptions, setQbOptions] = useState(['', '', '', '']);
  const [qbCorrect, setQbCorrect] = useState(0);
  const [qbSaving, setQbSaving] = useState(false);
  const [qbDeleting, setQbDeleting] = useState(null);

  const openQbAdd = () => {
    setQbText('');
    setQbSubject('');
    setQbDifficulty('medium');
    setQbOptions(['', '', '', '']);
    setQbCorrect(0);
    setQbAddOpen(true);
  };

  const submitQbQuestion = async () => {
    if (qbSaving) return;
    if (!qbText.trim()) {
      Alert.alert('Savol matni kerak', 'Iltimos, savol matnini kiriting.');
      return;
    }
    const opts = qbOptions.map((o) => o.trim());
    if (opts.filter(Boolean).length < 2) {
      Alert.alert('Variantlar kerak', 'Kamida 2 ta variant kiriting.');
      return;
    }
    if (!opts[qbCorrect]) {
      Alert.alert("To'g'ri javob", "To'g'ri deb belgilangan variant bo'sh bo'lmasligi kerak.");
      return;
    }
    setQbSaving(true);
    try {
      await ownerApi.addCenterQuestion(centerId, {
        text: qbText.trim(),
        subject: qbSubject.trim(),
        difficulty: qbDifficulty,
        options: opts
          .map((text, i) => ({ text, correct: i === qbCorrect }))
          .filter((o) => o.text),
      });
      setQbAddOpen(false);
      Alert.alert('Qo\'shildi', "Savol bankiga qo'shildi.");
      reload();
    } catch (e) {
      const err = e?.response?.data;
      if (err?.upgrade_required) {
        Alert.alert('Premium kerak', err.detail || 'Savollar banki premium markazlar uchun.');
      } else {
        Alert.alert('Xatolik', err?.detail || "Savolni qo'shib bo'lmadi.");
      }
    } finally {
      setQbSaving(false);
    }
  };

  const deleteQbQuestion = (q) => {
    const qId = q.id;
    if (qId == null) return;
    Alert.alert("Savolni o'chirish", "Bu savol bankdan o'chirilsinmi?", [
      { text: 'Bekor', style: 'cancel' },
      {
        text: "O'chirish",
        style: 'destructive',
        onPress: async () => {
          setQbDeleting(qId);
          try {
            await ownerApi.deleteCenterQuestion(centerId, qId);
            reload();
          } catch (e) {
            Alert.alert('Xatolik', e?.response?.data?.detail || "Savolni o'chirib bo'lmadi.");
          } finally {
            setQbDeleting(null);
          }
        },
      },
    ]);
  };

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

  const groups = data?.groups;
  const groupRows = groups?.ok ? asArray(groups.data?.groups) : [];

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

        {/* ── Guruhlar (sinflar) analitikasi (group-stats) ──────────── */}
        <View style={styles.sectionHead}>
          <UsersIcon size={16} color={colors.purpleLight} />
          <Text style={styles.sectionTitle}>Guruhlar analitikasi</Text>
        </View>
        <Text style={styles.sectionSub}>Sinf/guruh bo'yicha natija va yordam kerak bo'lganlar</Text>
        {!groups?.ok ? (
          fallback(groups)
        ) : groupRows.length === 0 ? (
          emptyCard("O'quvchilarga guruh tegi qo'shilmagan")
        ) : (
          <View style={styles.list}>
            {groupRows.map((g, i) => {
              const avg = Math.max(0, Math.min(100, Number(g.avg_score) || 0));
              const barColor = avg >= 70 ? colors.green : avg >= 50 ? colors.orange : colors.red;
              const weak = asArray(g.weak_students).slice(0, 3);
              return (
                <Card key={g.group_tag ?? i} style={styles.groupCard}>
                  <View style={styles.groupHead}>
                    <View style={styles.rowText}>
                      <Text style={styles.rowName} numberOfLines={1}>{g.group_tag || 'Guruhsiz'}</Text>
                      <Text style={styles.rowSub}>
                        {fmtNum(g.student_count)} o'quvchi · {fmtNum(g.olympiad_participations)} qatnashuv
                      </Text>
                    </View>
                    <Text style={[styles.avgScore, { color: barColor }]}>{g.avg_score ?? 0}%</Text>
                  </View>
                  <ProgressBar progress={avg} color={barColor} height={7} style={{ marginTop: 10 }} />
                  {g.top_student ? (
                    <View style={styles.groupTop}>
                      <TrophyIcon size={13} color={colors.gold} />
                      <Text style={styles.groupTopName} numberOfLines={1}>{g.top_student.name || "O'quvchi"}</Text>
                      <Text style={styles.groupTopScore}>{g.top_student.score ?? 0}%</Text>
                    </View>
                  ) : null}
                  {weak.length ? (
                    <View style={styles.weakWrap}>
                      <Text style={styles.weakLabel}>Yordam kerak</Text>
                      {weak.map((w, wi) => (
                        <View key={w.user_id ?? wi} style={styles.weakRow}>
                          <Text style={styles.weakName} numberOfLines={1}>{w.name || "O'quvchi"}</Text>
                          <Text style={styles.weakScore}>{w.score ?? 0}%</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </Card>
              );
            })}
          </View>
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
          {questionBank?.ok ? (
            <TouchableOpacity activeOpacity={0.8} style={styles.qbAddBtn} onPress={openQbAdd}>
              <PlusIcon size={13} color={colors.blueLight} strokeWidth={2.6} />
              <Text style={styles.qbAddText}>Qo'shish</Text>
            </TouchableOpacity>
          ) : null}
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
                <View style={styles.qTopRow}>
                  <Text style={[styles.qText, { flex: 1 }]} numberOfLines={2}>{q.text || '—'}</Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.qDeleteBtn}
                    disabled={qbDeleting === q.id}
                    onPress={() => deleteQbQuestion(q)}
                  >
                    {qbDeleting === q.id ? (
                      <ActivityIndicator size="small" color={colors.red} />
                    ) : (
                      <CloseIcon size={13} color={colors.red} strokeWidth={2.6} />
                    )}
                  </TouchableOpacity>
                </View>
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

      {/* Savol qo'shish modal */}
      <Modal visible={qbAddOpen} transparent animationType="slide" onRequestClose={() => (qbSaving ? null : setQbAddOpen(false))}>
        <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={() => (qbSaving ? null : setQbAddOpen(false))} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Savol qo'shish</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={styles.qbScroll}>
            <TextInput
              style={[styles.sheetInput, styles.sheetInputMulti]}
              placeholder="Savol matni"
              placeholderTextColor={colors.textMuted}
              value={qbText}
              onChangeText={setQbText}
              multiline
              textAlignVertical="top"
            />
            <TextInput
              style={styles.sheetInput}
              placeholder="Fan (masalan: Matematika)"
              placeholderTextColor={colors.textMuted}
              value={qbSubject}
              onChangeText={setQbSubject}
            />
            <Text style={styles.qbFieldLabel}>QIYINLIK</Text>
            <View style={styles.difficultyRow}>
              {DIFFICULTIES.map((d) => {
                const active = qbDifficulty === d.value;
                return (
                  <TouchableOpacity
                    key={d.value}
                    activeOpacity={0.8}
                    onPress={() => setQbDifficulty(d.value)}
                    style={[
                      styles.difficultyOption,
                      { borderColor: active ? colors.blue : colors.borderStrong, backgroundColor: active ? tints.blue14 : colors.surfaceDeep },
                    ]}
                  >
                    <Text style={{ fontSize: 12, fontFamily: active ? FONTS.extrabold : FONTS.bold, color: active ? colors.blueLight : colors.textSecondary }}>
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.qbFieldLabel}>VARIANTLAR (to'g'risini belgilang)</Text>
            {qbOptions.map((opt, oi) => (
              <View key={oi} style={styles.optionInputRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setQbCorrect(oi)}
                  style={[styles.correctToggle, qbCorrect === oi ? styles.correctToggleOn : null]}
                >
                  {qbCorrect === oi ? (
                    <CheckIcon size={12} color={colors.white} strokeWidth={3} />
                  ) : (
                    <Text style={styles.correctToggleText}>{LETTERS[oi]}</Text>
                  )}
                </TouchableOpacity>
                <TextInput
                  style={styles.optionInput}
                  value={opt}
                  onChangeText={(t) => setQbOptions((prev) => prev.map((x, i) => (i === oi ? t : x)))}
                  placeholder={`${LETTERS[oi]} varianti`}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            ))}
          </ScrollView>
          <Button
            title={qbSaving ? 'Saqlanmoqda…' : 'Savolni saqlash'}
            variant="success"
            height={50}
            radius={13}
            fontSize={15}
            style={{ marginTop: 14 }}
            disabled={qbSaving}
            onPress={submitQbQuestion}
          />
          <TouchableOpacity activeOpacity={0.7} onPress={() => (qbSaving ? null : setQbAddOpen(false))}>
            <Text style={styles.cancel}>Bekor qilish</Text>
          </TouchableOpacity>
        </View>
      </Modal>
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

    groupCard: { paddingVertical: 13, paddingHorizontal: 14 },
    groupHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    groupTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 11 },
    groupTopName: { flex: 1, fontSize: 12, fontFamily: FONTS.bold, color: colors.goldSoftText },
    groupTopScore: { fontSize: 12, fontFamily: FONTS.extrabold, color: colors.gold },
    weakWrap: { marginTop: 11, gap: 6 },
    weakLabel: { fontSize: 10, fontFamily: FONTS.extrabold, color: colors.redSoftText, letterSpacing: 0.4, textTransform: 'uppercase' },
    weakRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      backgroundColor: tints.red10,
      borderRadius: 9,
      paddingVertical: 7,
      paddingHorizontal: 10,
    },
    weakName: { flex: 1, fontSize: 11.5, fontFamily: FONTS.semibold, color: colors.redSoftText },
    weakScore: { fontSize: 12, fontFamily: FONTS.extrabold, color: colors.red },

    lockCard: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 9 },
    lockText: { fontSize: 12.5, fontFamily: FONTS.bold, color: colors.goldSoftText },
    emptyCard: { padding: 20, alignItems: 'center' },
    emptyText: { fontSize: 12.5, fontFamily: FONTS.semibold, color: colors.textMuted, textAlign: 'center' },
    moreNote: { fontSize: 11.5, fontFamily: FONTS.bold, color: colors.textMuted, textAlign: 'center', marginTop: 4 },

    qbAddBtn: {
      marginLeft: 'auto',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 6,
      paddingHorizontal: 11,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: tints.blue14,
    },
    qbAddText: { fontSize: 12, fontFamily: FONTS.extrabold, color: colors.blueLight },
    qTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    qDeleteBtn: {
      width: 28,
      height: 28,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: tints.redBorder40,
      backgroundColor: tints.red10,
      alignItems: 'center',
      justifyContent: 'center',
    },

    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 14,
      paddingHorizontal: 22,
      paddingBottom: 34,
    },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderDashed, alignSelf: 'center' },
    sheetTitle: { fontSize: 17, fontFamily: FONTS.extrabold, color: colors.text, marginTop: 16, marginBottom: 12 },
    qbScroll: { maxHeight: 400 },
    sheetInput: {
      minHeight: 48,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: 12,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      fontSize: 14,
      fontFamily: FONTS.bold,
      color: colors.text,
      marginBottom: 9,
    },
    sheetInputMulti: { minHeight: 84, paddingTop: 12, paddingBottom: 12 },
    qbFieldLabel: { fontSize: 10.5, fontFamily: FONTS.extrabold, color: colors.textSecondary, marginTop: 4, marginBottom: 7 },
    difficultyRow: { flexDirection: 'row', gap: 7, marginBottom: 4 },
    difficultyOption: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 10, borderWidth: 1 },
    optionInputRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 },
    correctToggle: {
      width: 38,
      height: 44,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surfaceDeep,
      alignItems: 'center',
      justifyContent: 'center',
    },
    correctToggleOn: { backgroundColor: colors.green, borderColor: colors.green },
    correctToggleText: { fontSize: 13, fontFamily: FONTS.extrabold, color: colors.textSecondary },
    optionInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: 11,
      backgroundColor: colors.surface,
      paddingHorizontal: 13,
      height: 44,
      fontSize: 13,
      fontFamily: FONTS.semibold,
      color: colors.text,
    },
    cancel: { textAlign: 'center', marginTop: 14, fontSize: 13, fontFamily: FONTS.bold, color: colors.textMuted },
  });
