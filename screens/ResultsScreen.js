import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Share } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import { useTabBarSpacing, TAB_BAR_CONTENT_HEIGHT } from '../components/TabBar';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Avatar from '../components/Avatar';
import Chip from '../components/Chip';
import SegmentedControl from '../components/SegmentedControl';
import DonutProgress from '../components/DonutProgress';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import useFetch from '../services/useFetch';
import { studentApi, extractLeaderboardEntries } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { ShareIcon, CheckIcon, CloseIcon, LockIcon, SparkleIcon, CrownIcon } from '../components/icons/Icons';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const asArray = (data) => (Array.isArray(data) ? data : data?.results || []);
const initialOf = (name) => (name || '?').trim()[0]?.toUpperCase() || '?';
const minutes = (sec) => (sec ? `${Math.round(sec / 60)} daq` : '');

// Dushanbadan boshlanadigan joriy hafta boshi (ms).
const weekStartMs = () => {
  const now = new Date();
  const day = now.getDay(); // 0 = yakshanba
  const mondayOffset = day === 0 ? 6 : day - 1;
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - mondayOffset);
  return d.getTime();
};

// Umumiy reyting: "Bu hafta" — submitted_at bo'yicha filtr + o'rinni qayta.
// Backend `?period=week` ni qo'llab-quvvatlasa ham, production hali
// e'tiborsiz qoldirishi mumkin — klient filtr har doim ishonchli zaxira.
const applyPeriodFilter = (entries, period) => {
  const list = Array.isArray(entries) ? entries : [];
  if (period !== 1) {
    return list.map((e, i) => ({ ...e, rank: e.rank != null ? e.rank : i + 1 }));
  }
  const from = weekStartMs();
  const filtered = list.filter((e) => {
    if (!e?.submitted_at) return false;
    const t = new Date(e.submitted_at).getTime();
    return !Number.isNaN(t) && t >= from;
  });
  // Ball bo'yicha tartib (backend tartibini saqlashga urinamiz).
  filtered.sort((a, b) => {
    const scoreDiff = (Number(b.score) || 0) - (Number(a.score) || 0);
    if (scoreDiff !== 0) return scoreDiff;
    return (Number(a.time_spent) || 0) - (Number(b.time_spent) || 0);
  });
  return filtered.map((e, i) => ({ ...e, rank: i + 1 }));
};

const filterByCenterName = (entries, centerName) => {
  if (!centerName) return [];
  const name = String(centerName).trim().toLowerCase();
  return (Array.isArray(entries) ? entries : [])
    .filter((e) => String(e.center || '').trim().toLowerCase() === name)
    .map((e, i) => ({ ...e, rank: i + 1 }));
};

// O'quvchi a'zo bo'lgan tashkilotlar — backend shakllari farq qilishi mumkin
// (centers[], centerName, center_name, user.center_name).
function studentJoinedCenters(user) {
  const out = [];
  const seen = new Set();
  const push = (raw) => {
    if (!raw || typeof raw !== 'object') return;
    const centerName = String(
      raw.centerName || raw.center_name || raw.name || ''
    ).trim();
    if (!centerName) return;
    const key = centerName.toLowerCase();
    if (seen.has(key)) return;
    const status = String(raw.status || 'approved').toLowerCase();
    // Faqat tasdiqlangan / active a'zolik
    if (status && !['approved', 'active', 'accepted'].includes(status)) return;
    seen.add(key);
    out.push({
      centerId: raw.centerId ?? raw.center_id ?? raw.id ?? null,
      centerName,
      status,
    });
  };

  const rd = user?.roles_detail || {};
  const student = rd.student || {};
  const lists = [
    student.centers,
    student.center_list,
    Array.isArray(rd.centers) ? rd.centers : null,
  ];
  for (const list of lists) {
    if (Array.isArray(list)) list.forEach(push);
  }
  // Bitta asosiy markaz maydonlari
  if (student.centerName || student.center_name) {
    push({
      centerId: student.centerId ?? student.center_id,
      centerName: student.centerName || student.center_name,
      status: student.status || 'approved',
    });
  }
  if (user?.center_name || user?.centerName) {
    push({
      centerId: user.center_id ?? user.centerId,
      centerName: user.center_name || user.centerName,
      status: 'approved',
    });
  }
  return out;
}

// Urinish tafsilotidan (attemptDetail) savol-javob ro'yxatini turli mumkin
// bo'lgan javob shakllaridan normallashtirib chiqaramiz. Aniqlab bo'lmasa
// (correctness noaniq) — bo'lim ko'rsatilmaydi.
const extractQuestionAnalysis = (detail) => {
  if (!detail) return [];
  const raw = Array.isArray(detail)
    ? detail
    : detail.questions || detail.answers || detail.question_results || detail.details || detail.items || [];
  if (!Array.isArray(raw)) return [];
  return raw.map((q, i) => {
    const inner = q.question && typeof q.question === 'object' ? q.question : q;
    const text = q.text || q.question_text || inner.text || inner.question_text || '';
    const subject = q.subject || inner.subject || '';
    const options = Array.isArray(q.options)
      ? q.options
      : Array.isArray(inner.options)
      ? inner.options
      : [];
    const userAnswer =
      q.user_answer ?? q.selected_answer ?? q.given_answer ?? q.selected ?? q.answer ?? q.chosen_index;
    const correctAnswer =
      q.correct_answer ?? q.correct_option ?? q.correct_index ?? inner.correct_answer ?? inner.correct_option;
    let isCorrect = null;
    if (typeof q.is_correct === 'boolean') isCorrect = q.is_correct;
    else if (userAnswer != null && correctAnswer != null) isCorrect = String(userAnswer) === String(correctAnswer);
    return {
      id: q.id ?? q.question_id ?? inner.id ?? i,
      index: i,
      text,
      subject,
      options,
      userAnswer,
      correctAnswer,
      isCorrect,
    };
  });
};

const optionLabel = (options, val) => {
  if (val == null || val === '') return "javob berilmagan";
  const idx = Number(val);
  if (options.length && Number.isInteger(idx) && idx >= 0 && idx < options.length) {
    return `${LETTERS[idx] || idx + 1}) ${options[idx]}`;
  }
  return String(val);
};

export default function ResultsScreen({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const tabBarSpacing = useTabBarSpacing();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isPremium = user?.is_premium || user?.is_premium_active;
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [expanded, setExpanded] = useState({});
  // Reyting: 0 = Umumiy (platforma), 1 = Markazim (a'zo markazlar).
  const [scope, setScope] = useState(0);
  // Faqat Umumiy uchun: 0 = Barcha vaqt, 1 = Bu hafta.
  const [period, setPeriod] = useState(0);

  const { data, loading, refreshing, error, reload, refresh } = useFetch(async () => {
    const [results, stats, peer] = await Promise.all([
      studentApi.myResults({ page_size: 20 }).then((r) => r.data).catch(() => null),
      studentApi.myStats().then((r) => r.data).catch(() => null),
      studentApi.peerComparison().then((r) => r.data).catch(() => null),
    ]);
    if (results === null && stats === null) {
      throw new Error('results_load_failed');
    }
    const arr = asArray(results);
    const latestId = arr[0]?.attempt_id ?? arr[0]?.id;
    let detail = null;
    if (latestId) {
      detail = await studentApi.attemptDetail(latestId).then((r) => r.data).catch(() => null);
    }
    return { results: arr, stats, detail, peer };
  }, []);

  // O'quvchi qo'shilgan tashkilotlar — Markazim tabida nomlari chip bo'ladi
  // (Barcha vaqt / Bu hafta FAQAT Umumiyda qoladi).
  const approvedCenters = useMemo(() => studentJoinedCenters(user), [user]);
  const hasCenters = approvedCenters.length > 0;
  const [selectedCenterName, setSelectedCenterName] = useState(null);
  const activeCenterName =
    (selectedCenterName &&
      approvedCenters.some((c) => c.centerName === selectedCenterName) &&
      selectedCenterName) ||
    approvedCenters[0]?.centerName ||
    null;

  // Umumiy reyting — top 100. period o'zgarganda qayta so'rov (backend
  // ?period=week ni qo'llab-quvvatlasa to'g'ridan-to'g'ri; aks holda klient filtr).
  const {
    data: lbData,
    loading: lbLoading,
    error: lbError,
    reload: lbReload,
  } = useFetch(
    () =>
      studentApi
        .leaderboard({
          page_size: 100,
          ...(period === 1 ? { period: 'week' } : {}),
        })
        .then((r) => r.data),
    [period]
  );

  // Markaz reytingi uchun kattaroq ro'yxat (max 500) — markaz nomi bo'yicha
  // client-side filtr. Markazimda period filtri YO'Q.
  const centerLb = useFetch(
    () => studentApi.leaderboard({ page_size: 500 }).then((r) => r.data),
    []
  );

  if (loading) return <LoadingState message="Natijalar yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  const results = data?.results || [];
  const stats = data?.stats || {};
  const peer = data?.peer || null;
  const latest = results[0] || null;
  const subjects = stats.subjects || [];
  const scorePct = latest ? latest.score : Math.round(stats.average_score || 0);

  const analysis = extractQuestionAnalysis(data?.detail);
  const hasAnalysis = analysis.some((q) => q.isCorrect !== null);

  const isMeEntry = (entry) =>
    user != null && entry?.user_id != null && Number(entry.user_id) === Number(user.id);

  // ── Umumiy ──────────────────────────────────────────────────────────
  const lbRaw = extractLeaderboardEntries(lbData);
  // Backend period ishlamasa ham "Bu hafta" to'g'ri ishlashi uchun:
  // - period=all: server tartibi/rank
  // - period=week: agar server allaqachon filtrlgan bo'lsa (hammasi shu hafta),
  //   qayta filtr no-op; aks holda klient filtr + qayta rank.
  const lbAllEntries = applyPeriodFilter(lbRaw, period);
  const lbTop3 = lbAllEntries.slice(0, 3);
  const lbRest = lbAllEntries.slice(3);
  const lbPodiumDisplay = [lbTop3[1], lbTop3[0], lbTop3[2]];
  const myLbEntry = lbAllEntries.find(isMeEntry) || null;
  // Global o'rin (Nav Bar tepasida va matnda). Top-100 ichida bo'lmasa —
  // best_rank yoki "100+".
  const globalRank =
    myLbEntry?.rank ??
    (period === 0 ? stats.best_rank : null) ??
    null;
  const globalRankLabel = globalRank
    ? String(globalRank)
    : (stats.total_attempts || 0) > 0 && period === 0
      ? '100+'
      : null;

  // ── Markazim ────────────────────────────────────────────────────────
  // entry.center = olimpiada o'tkazgan markaz nomi (public tadbirda bo'sh).
  const centerRaw = extractLeaderboardEntries(centerLb.data);
  const centerEntries = filterByCenterName(centerRaw, activeCenterName);
  const centerTop3 = centerEntries.slice(0, 3);
  const centerRest = centerEntries.slice(3);
  const centerPodiumDisplay = [centerTop3[1], centerTop3[0], centerTop3[2]];
  const myCenterEntry = centerEntries.find(isMeEntry) || null;

  const rankDockBottom = TAB_BAR_CONTENT_HEIGHT + Math.max(insets.bottom, 14) + 10;

  const PODIUM_META = [
    { border: colors.silver, height: 62, rankColor: colors.silver },
    { border: colors.gold, height: 82, rankColor: colors.gold },
    { border: colors.bronze, height: 48, rankColor: colors.bronze },
  ];
  const AVATAR_COLORS = [colors.purple, colors.blueDeep, colors.green, colors.red, colors.orange];

  // Bitta savol uchun AI izohini (matnini) topamiz — turli shakllarni sinaymiz.
  const aiExplanationFor = (q) => {
    if (!aiData) return '';
    const arr = Array.isArray(aiData)
      ? aiData
      : aiData.questions || aiData.analysis || aiData.explanations || aiData.items;
    if (Array.isArray(arr)) {
      const match =
        arr.find((a) => a && (a.question_id === q.id || a.id === q.id)) || arr[q.index];
      if (match) return match.explanation || match.text || match.ai_explanation || (typeof match === 'string' ? match : '');
    }
    if (typeof aiData === 'string') return aiData;
    return aiData.explanation || aiData.text || aiData.summary || '';
  };

  const toggleExplain = async (q) => {
    if (!isPremium) {
      navigation.navigate('Premium');
      return;
    }
    const latestAttemptId = latest?.attempt_id ?? latest?.id;
    if (!aiData && !aiLoading && latestAttemptId) {
      setAiLoading(true);
      try {
        const { data: ai } = await studentApi.attemptAiAnalysis(latestAttemptId);
        setAiData(ai || {});
      } catch (e) {
        setAiData({});
      } finally {
        setAiLoading(false);
      }
    }
    setExpanded((prev) => ({ ...prev, [q.id]: !prev[q.id] }));
  };

  const onShare = async () => {
    const title = latest?.olympiad_title || latest?.olympiad?.title || 'Olympy';
    const message = latest
      ? `Men "${title}" tadbirida ${latest.score} ball to'pladim (${latest.correct_count}/${latest.total_questions} to'g'ri)! — Olympy`
      : `O'rtacha natijam ${Math.round(stats.average_score || 0)} ball. Olympy platformasida bilimlarimni sinayapman!`;
    try {
      await Share.share({ message });
    } catch (e) {}
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarSpacing + 44 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.blue} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Natijangiz</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {latest?.olympiad_title || latest?.olympiad?.title || 'Umumiy statistika'}
            </Text>
          </View>
          <TouchableOpacity activeOpacity={0.7} style={styles.shareBox} onPress={onShare}>
            <ShareIcon size={17} />
          </TouchableOpacity>
        </View>

        {latest || subjects.length ? (
          <Card radius={20} style={styles.scoreCard}>
            <DonutProgress size={130} strokeWidth={11} progress={scorePct} color={colors.blue} radius={54}>
              <Text style={styles.scoreValue}>{scorePct}</Text>
              <Text style={styles.scoreMax}>/ 100 ball</Text>
            </DonutProgress>
            <View style={styles.scoreStats}>
              <View>
                <Text style={[styles.statValue, { color: colors.greenLight }]}>
                  {latest?.correct_count ?? '—'}
                </Text>
                <Text style={styles.statLabel}>To'g'ri javob</Text>
              </View>
              <View>
                <Text style={[styles.statValue, { color: colors.red }]}>
                  {latest?.wrong_count ?? '—'}
                </Text>
                <Text style={styles.statLabel}>Xato javob</Text>
              </View>
              <View>
                <Text style={styles.statValue}>
                  {latest?.time_spent ? `${Math.round(latest.time_spent / 60)} daq` : '—'}
                </Text>
                <Text style={styles.statLabel}>Sarflangan vaqt</Text>
              </View>
            </View>
          </Card>
        ) : (
          <Card radius={18} style={styles.emptyCard}>
            <Text style={styles.emptyText}>Hali natijalar yo'q — birinchi tadbirda qatnashing</Text>
          </Card>
        )}

        <Text style={styles.sectionTitle}>Reyting</Text>
        {peer && (peer.total_peers || 0) > 1 ? (
          <Text style={styles.rankCompare}>
            Sizning o'rtacha: <Text style={styles.rankCompareStrong}>{peer.my_avg}</Text>
            {'  ·  '}O'quvchilar o'rtacha: <Text style={styles.rankCompareStrong}>{peer.peer_avg}</Text>
          </Text>
        ) : null}

        {/* Umumiy / Markazim — Markazim doim ko'rinadi; markaz bo'lmasa ichida CTA */}
        <SegmentedControl
          segments={['Umumiy', 'Markazim']}
          activeIndex={scope}
          onChange={setScope}
          fontSize={11.5}
          style={styles.scopeControl}
        />

        {scope === 0 ? (
          <>
            {/* FAQAT Umumiy: Barcha vaqt / Bu hafta */}
            <View style={styles.periodRow}>
              <Chip label="Barcha vaqt" active={period === 0} onPress={() => setPeriod(0)} />
              <Chip label="Bu hafta" active={period === 1} onPress={() => setPeriod(1)} />
            </View>
            {globalRankLabel ? (
              <Text style={styles.myRankText}>
                Global reytingdagi o'rningiz:{' '}
                <Text style={styles.myRankStrong}>#{globalRankLabel}</Text>
                {!myLbEntry && lbAllEntries.length > 0 ? (
                  <Text style={styles.myRankText}> · top {lbAllEntries.length} tadan tashqarida</Text>
                ) : null}
              </Text>
            ) : lbAllEntries.length > 0 ? (
              <Text style={styles.myRankText}>
                Siz hozircha top-{lbAllEntries.length} da yo'q — olimpiadada qatnashib ball to'plang
              </Text>
            ) : null}

            {lbLoading && !lbData ? (
              <LoadingState message="Reyting yuklanmoqda…" />
            ) : lbError && !lbData ? (
              <ErrorState onRetry={lbReload} />
            ) : lbAllEntries.length === 0 ? (
              <View style={styles.lbEmptyWrap}>
                <Text style={styles.emptyText}>
                  {period === 1
                    ? "Bu hafta hali reyting ma'lumoti yo'q"
                    : "Hozircha reyting ma'lumoti yo'q"}
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.lbPodium}>
                  {lbPodiumDisplay.map((entry, i) => {
                    if (!entry) return <View key={i} style={styles.lbPodiumCol} />;
                    const meta = PODIUM_META[i];
                    const isWinner = i === 1;
                    return (
                      <View key={entry.attempt_id || entry.user_id || i} style={styles.lbPodiumCol}>
                        {isWinner ? (
                          <View style={styles.lbWinnerWrap}>
                            <Avatar
                              letter={initialOf(entry.name)}
                              uri={entry.avatar_url || entry.avatarUrl}
                              size={54}
                              fontSize={19}
                              background={colors.blueDeep}
                              borderColor={meta.border}
                              style={styles.lbWinnerAvatar}
                            />
                            <View style={styles.lbCrown}>
                              <CrownIcon size={19} />
                            </View>
                          </View>
                        ) : (
                          <Avatar
                            letter={initialOf(entry.name)}
                            uri={entry.avatar_url || entry.avatarUrl}
                            size={46}
                            fontSize={16}
                            background={AVATAR_COLORS[i % AVATAR_COLORS.length]}
                            borderColor={meta.border}
                          />
                        )}
                        <Text style={styles.lbPodiumName} numberOfLines={1}>
                          {(entry.name || '').split(' ')[0]}
                        </Text>
                        <View style={[styles.lbPodiumBlock, { height: meta.height }, isWinner ? styles.lbWinnerBlock : null]}>
                          <Text style={[styles.lbPodiumRank, { color: meta.rankColor }, isWinner ? { fontSize: 21 } : null]}>
                            {entry.rank}
                          </Text>
                          <Text style={[styles.lbPodiumScore, isWinner ? { color: colors.goldMuted } : null]}>{entry.score}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.lbList}>
                  {lbRest.map((entry, i) => {
                    const me = isMeEntry(entry);
                    return (
                      <View key={entry.attempt_id || `${entry.user_id}-${i}`} style={[styles.lbRow, me ? styles.lbMeRow : null]}>
                        <Text style={[styles.lbRank, me ? { color: colors.blueLight } : null]}>{entry.rank}</Text>
                        <Avatar
                          letter={initialOf(entry.name)}
                          uri={entry.avatar_url || entry.avatarUrl}
                          size={34}
                          fontSize={13}
                          background={AVATAR_COLORS[i % AVATAR_COLORS.length]}
                        />
                        <View style={styles.lbRowText}>
                          <Text style={styles.lbRowName} numberOfLines={1}>
                            {entry.name}
                            {me ? <Text style={styles.lbMeTag}> · Siz</Text> : null}
                          </Text>
                          <Text style={styles.lbRowSub} numberOfLines={1}>
                            {[entry.center, minutes(entry.time_spent)].filter(Boolean).join(' · ')}
                          </Text>
                        </View>
                        <Text style={[styles.lbRowScore, me ? { color: colors.text } : null]}>{entry.score}</Text>
                      </View>
                    );
                  })}
                  {!myLbEntry && user && (globalRankLabel || (stats.total_attempts || 0) > 0) ? (
                    <>
                      <Text style={styles.lbEllipsis}>···</Text>
                      <View style={[styles.lbRow, styles.lbMeRow]}>
                        <Text style={[styles.lbRank, { color: colors.blueLight }]}>
                          {globalRankLabel || '—'}
                        </Text>
                        <Avatar
                          letter={initialOf(user?.full_name || user?.name)}
                          uri={user?.avatar_url}
                          size={34}
                          fontSize={13}
                          background={colors.blueDeep}
                        />
                        <View style={styles.lbRowText}>
                          <Text style={styles.lbRowName} numberOfLines={1}>
                            {user?.full_name || user?.name || 'Siz'}
                            <Text style={styles.lbMeTag}> · Siz</Text>
                          </Text>
                          <Text style={styles.lbRowSub} numberOfLines={1}>
                            Top {Math.max(lbAllEntries.length, 100)} tadan tashqarida
                          </Text>
                        </View>
                        <Text style={[styles.lbRowScore, { color: colors.text }]}>
                          {stats.best_score || stats.average_score || '—'}
                        </Text>
                      </View>
                    </>
                  ) : null}
                </View>
              </>
            )}
          </>
        ) : (
          <>
            {/* MARKAZIM: period YO'Q — o'rniga qo'shilgan tashkilot nomlari */}
            <Text style={styles.centerSectionHint}>Tashkilotlaringiz</Text>
            {!hasCenters ? (
              <View style={styles.lbEmptyWrap}>
                <Text style={styles.emptyText}>
                  Siz hali hech qaysi o'quv markaziga qo'shilmagansiz
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.joinCenterBtn}
                  onPress={() => navigation.navigate('JoinCenter')}
                >
                  <Text style={styles.joinCenterBtnText}>Markazga qo'shilish</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.centerChipWrap}>
                  {approvedCenters.map((c) => {
                    const name = c.centerName;
                    const active = name === activeCenterName;
                    return (
                      <TouchableOpacity
                        key={c.centerId ?? name}
                        activeOpacity={0.8}
                        onPress={() => setSelectedCenterName(name)}
                        style={[
                          styles.centerNameChip,
                          active ? styles.centerNameChipActive : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.centerNameChipText,
                            active ? styles.centerNameChipTextActive : null,
                          ]}
                          numberOfLines={1}
                        >
                          {name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {activeCenterName ? (
                  <Text style={styles.myRankText}>
                    <Text style={styles.myRankStrong}>{activeCenterName}</Text>
                    {" · shu markaz o'quvchilari reytingi"}
                    {myCenterEntry ? (
                      <>
                        {' · siz: '}
                        <Text style={styles.myRankStrong}>#{myCenterEntry.rank}</Text>
                      </>
                    ) : null}
                  </Text>
                ) : null}

                {centerLb.loading && !centerLb.data ? (
                  <LoadingState message="Reyting yuklanmoqda…" />
                ) : centerLb.error && !centerLb.data ? (
                  <ErrorState onRetry={centerLb.reload} />
                ) : centerEntries.length === 0 ? (
                  <View style={styles.lbEmptyWrap}>
                    <Text style={styles.emptyText}>
                      {`"${activeCenterName || 'Markaz'}" bo'yicha reyting ma'lumoti yo'q`}
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.lbPodium}>
                      {centerPodiumDisplay.map((entry, i) => {
                        if (!entry) return <View key={i} style={styles.lbPodiumCol} />;
                        const meta = PODIUM_META[i];
                        const isWinner = i === 1;
                        return (
                          <View key={entry.attempt_id || entry.user_id || i} style={styles.lbPodiumCol}>
                            {isWinner ? (
                              <View style={styles.lbWinnerWrap}>
                                <Avatar
                                  letter={initialOf(entry.name)}
                                  uri={entry.avatar_url || entry.avatarUrl}
                                  size={54}
                                  fontSize={19}
                                  background={colors.blueDeep}
                                  borderColor={meta.border}
                                  style={styles.lbWinnerAvatar}
                                />
                                <View style={styles.lbCrown}>
                                  <CrownIcon size={19} />
                                </View>
                              </View>
                            ) : (
                              <Avatar
                                letter={initialOf(entry.name)}
                                uri={entry.avatar_url || entry.avatarUrl}
                                size={46}
                                fontSize={16}
                                background={AVATAR_COLORS[i % AVATAR_COLORS.length]}
                                borderColor={meta.border}
                              />
                            )}
                            <Text style={styles.lbPodiumName} numberOfLines={1}>
                              {(entry.name || '').split(' ')[0]}
                            </Text>
                            <View style={[styles.lbPodiumBlock, { height: meta.height }, isWinner ? styles.lbWinnerBlock : null]}>
                              <Text style={[styles.lbPodiumRank, { color: meta.rankColor }, isWinner ? { fontSize: 21 } : null]}>
                                {entry.rank}
                              </Text>
                              <Text style={[styles.lbPodiumScore, isWinner ? { color: colors.goldMuted } : null]}>{entry.score}</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>

                    <View style={styles.lbList}>
                      {centerRest.map((entry, i) => {
                        const me = isMeEntry(entry);
                        return (
                          <View key={entry.attempt_id || `${entry.user_id}-${i}`} style={[styles.lbRow, me ? styles.lbMeRow : null]}>
                            <Text style={[styles.lbRank, me ? { color: colors.blueLight } : null]}>{entry.rank}</Text>
                            <Avatar
                              letter={initialOf(entry.name)}
                              uri={entry.avatar_url || entry.avatarUrl}
                              size={34}
                              fontSize={13}
                              background={AVATAR_COLORS[i % AVATAR_COLORS.length]}
                            />
                            <View style={styles.lbRowText}>
                              <Text style={styles.lbRowName} numberOfLines={1}>
                                {entry.name}
                                {me ? <Text style={styles.lbMeTag}> · Siz</Text> : null}
                              </Text>
                              <Text style={styles.lbRowSub} numberOfLines={1}>
                                {minutes(entry.time_spent)}
                              </Text>
                            </View>
                            <Text style={[styles.lbRowScore, me ? { color: colors.text } : null]}>{entry.score}</Text>
                          </View>
                        );
                      })}
                      {!myCenterEntry && user && (stats.total_attempts || 0) > 0 ? (
                        <>
                          <Text style={styles.lbEllipsis}>···</Text>
                          <View style={[styles.lbRow, styles.lbMeRow]}>
                            <Text style={[styles.lbRank, { color: colors.blueLight }]}>—</Text>
                            <Avatar
                              letter={initialOf(user?.full_name || user?.name)}
                              uri={user?.avatar_url}
                              size={34}
                              fontSize={13}
                              background={colors.blueDeep}
                            />
                            <View style={styles.lbRowText}>
                              <Text style={styles.lbRowName} numberOfLines={1}>
                                {user?.full_name || user?.name || 'Siz'}
                                <Text style={styles.lbMeTag}> · Siz</Text>
                              </Text>
                              <Text style={styles.lbRowSub} numberOfLines={1}>
                                Markaz reytingida hali yo'q
                              </Text>
                            </View>
                            <Text style={[styles.lbRowScore, { color: colors.text }]}>
                              {stats.best_score || stats.average_score || '—'}
                            </Text>
                          </View>
                        </>
                      ) : null}
                    </View>
                  </>
                )}
              </>
            )}
          </>
        )}

        {hasAnalysis ? (
          <>
            <Text style={styles.sectionTitle}>Savollar tahlili</Text>
            <View style={styles.analysisList}>
              {analysis.map((q) => {
                const wrong = q.isCorrect === false;
                const open = !!expanded[q.id];
                const explanation = aiExplanationFor(q);
                return (
                  <Card key={q.id} style={styles.analysisCard}>
                    <View style={styles.analysisHead}>
                      <View style={styles.analysisHeadLeft}>
                        <Text style={styles.analysisNum}>{q.index + 1}-savol</Text>
                        {q.subject ? (
                          <Badge label={q.subject} color={colors.blueLight} background={tints.blue14} size={10} style={styles.analysisSubject} />
                        ) : null}
                      </View>
                      <View style={[styles.markBox, wrong ? styles.markWrong : styles.markCorrect]}>
                        {wrong ? <CloseIcon size={11} color={colors.white} /> : <CheckIcon size={12} color={colors.white} strokeWidth={3} />}
                      </View>
                    </View>
                    {q.text ? (
                      <Text style={styles.analysisText} numberOfLines={3}>{q.text}</Text>
                    ) : null}
                    {wrong ? (
                      q.userAnswer != null || q.correctAnswer != null ? (
                        <View style={styles.answerRow}>
                          <Text style={styles.wrongAnswer}>
                            {q.userAnswer != null
                              ? `Javobingiz: ${optionLabel(q.options, q.userAnswer)} — xato`
                              : 'Xato javob'}
                          </Text>
                          {q.correctAnswer != null ? (
                            <Text style={styles.rightAnswer}>To'g'ri: {optionLabel(q.options, q.correctAnswer)}</Text>
                          ) : null}
                        </View>
                      ) : (
                        <Text style={styles.wrongOnlyLabel}>Xato javob bergansiz</Text>
                      )
                    ) : (
                      <Text style={styles.correctLabel}>To'g'ri javob bergansiz</Text>
                    )}
                    {wrong ? (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={styles.aiBtn}
                        onPress={() => toggleExplain(q)}
                      >
                        {isPremium ? <SparkleIcon size={13} color={colors.gold} /> : <LockIcon size={13} />}
                        <Text style={styles.aiBtnText}>
                          {!isPremium
                            ? 'AI yechim · Premiumga o\'tish'
                            : aiLoading && open
                            ? 'Tahlil qilinmoqda…'
                            : open
                            ? 'Yechimni yashirish'
                            : 'AI yechim tushuntirishi'}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                    {wrong && open && isPremium ? (
                      <Text style={styles.aiExplanation}>
                        {explanation || (aiLoading ? '' : "Bu savol uchun AI izohi topilmadi.")}
                      </Text>
                    ) : null}
                  </Card>
                );
              })}
            </View>
          </>
        ) : null}

      </ScrollView>

      {/* Nav Bar tepasida global reyting o'rni — doim ko'rinadi */}
      <View style={[styles.rankDock, { bottom: rankDockBottom }]} pointerEvents="none">
        <View style={styles.rankDockInner}>
          <CrownIcon size={14} />
          <Text style={styles.rankDockText} numberOfLines={1}>
            Global reyting{' '}
            <Text style={styles.rankDockStrong}>
              {globalRankLabel ? `#${globalRankLabel}` : '—'}
            </Text>
            {period === 1 ? ' · bu hafta' : ''}
          </Text>
        </View>
      </View>
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
    paddingBottom: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 19,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    maxWidth: 260,
  },
  shareBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreCard: {
    marginTop: 18,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
  },
  scoreValue: {
    fontSize: 32,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    lineHeight: 32,
    textAlign: 'center',
  },
  scoreMax: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  scoreStats: {
    gap: 10,
  },
  statValue: {
    fontSize: 18,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
  },
  emptyCard: {
    marginTop: 18,
    padding: 24,
    alignItems: 'center',
  },
  rankCompare: {
    fontSize: 11.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 6,
    lineHeight: 16,
  },
  rankCompareStrong: {
    color: colors.text,
    fontFamily: FONTS.bold,
  },
  scopeControl: {
    marginTop: 10,
  },
  periodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  centerSectionHint: {
    marginTop: 12,
    fontSize: 11.5,
    fontFamily: FONTS.extrabold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  centerChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  centerNameChip: {
    maxWidth: '100%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  centerNameChipActive: {
    borderColor: colors.blue,
    backgroundColor: tints.blue14,
  },
  centerNameChipText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
  },
  centerNameChipTextActive: {
    fontFamily: FONTS.extrabold,
    color: colors.blueLight,
  },
  joinCenterBtn: {
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: tints.blue14,
    borderWidth: 1,
    borderColor: colors.blue,
  },
  joinCenterBtnText: {
    fontSize: 13,
    fontFamily: FONTS.extrabold,
    color: colors.blueLight,
    textAlign: 'center',
  },
  myRankText: {
    fontSize: 12,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 12,
  },
  myRankStrong: {
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  rankDock: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 20,
  },
  rankDockInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: tints.goldBorder35 || colors.borderStrong,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 12,
    maxWidth: '100%',
  },
  rankDockText: {
    fontSize: 12.5,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  rankDockStrong: {
    fontFamily: FONTS.extrabold,
    color: colors.gold,
    fontSize: 13.5,
  },
  lbEmptyWrap: {
    marginTop: 30,
    alignItems: 'center',
  },
  lbPodium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 10,
    marginTop: 20,
  },
  lbPodiumCol: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  lbWinnerWrap: {
    marginTop: 14,
  },
  lbWinnerAvatar: {
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  lbCrown: {
    position: 'absolute',
    top: -14,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  lbPodiumName: {
    fontSize: 12,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  lbPodiumBlock: {
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
  lbWinnerBlock: {
    backgroundColor: tints.gold10,
    borderColor: tints.goldBorder35,
  },
  lbPodiumRank: {
    fontSize: 20,
    fontFamily: FONTS.extrabold,
  },
  lbPodiumScore: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
  },
  lbList: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: 14,
    marginTop: 20,
  },
  lbRow: {
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
  lbMeRow: {
    borderWidth: 1.5,
    borderColor: colors.blue,
    backgroundColor: tints.blue08,
  },
  lbRank: {
    width: 24,
    textAlign: 'center',
    fontSize: 13,
    fontFamily: FONTS.extrabold,
    color: colors.textSecondary,
  },
  lbRowText: {
    flex: 1,
  },
  lbRowName: {
    fontSize: 13.5,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  lbMeTag: {
    fontSize: 10,
    fontFamily: FONTS.extrabold,
    color: colors.blueLight,
  },
  lbRowSub: {
    fontSize: 11,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
  },
  lbRowScore: {
    fontSize: 13,
    fontFamily: FONTS.extrabold,
    color: colors.textBody,
  },
  lbEllipsis: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: colors.textMuted,
    paddingVertical: 2,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    marginTop: 22,
    marginBottom: 10,
  },
  analysisList: {
    gap: 8,
  },
  analysisCard: {
    padding: 15,
  },
  analysisHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  analysisHeadLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  analysisNum: {
    fontSize: 12,
    fontFamily: FONTS.extrabold,
    color: colors.textSecondary,
  },
  analysisSubject: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 7,
  },
  markBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markCorrect: {
    backgroundColor: colors.green,
  },
  markWrong: {
    backgroundColor: colors.red,
  },
  analysisText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: colors.text,
    lineHeight: 19,
    marginTop: 9,
  },
  answerRow: {
    marginTop: 9,
    gap: 3,
  },
  wrongAnswer: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: colors.redSoftText,
  },
  rightAnswer: {
    fontSize: 12,
    fontFamily: FONTS.extrabold,
    color: colors.greenLight,
  },
  correctLabel: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: colors.greenLight,
    marginTop: 9,
  },
  wrongOnlyLabel: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: colors.redSoftText,
    marginTop: 9,
  },
  aiBtn: {
    marginTop: 11,
    height: 40,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: tints.goldBorder45,
    borderRadius: 11,
    backgroundColor: tints.gold07,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  aiBtnText: {
    fontSize: 12,
    fontFamily: FONTS.extrabold,
    color: colors.gold,
  },
  aiExplanation: {
    marginTop: 10,
    fontSize: 12.5,
    fontFamily: FONTS.semibold,
    color: colors.textBody,
    lineHeight: 19,
    backgroundColor: colors.surfaceDeep,
    borderRadius: 11,
    padding: 12,
  },
});
