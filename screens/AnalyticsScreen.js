import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Card from '../components/Card';
import Badge from '../components/Badge';
import IconBox from '../components/IconBox';
import ProgressBar from '../components/ProgressBar';
import DonutProgress from '../components/DonutProgress';
import StatCard from '../components/StatCard';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import useFetch from '../services/useFetch';
import { analyticsApi } from '../services/api';
import { useAuth } from '../services/AuthContext';
import {
  BackIcon,
  SparkleIcon,
  LockIcon,
  StarIcon,
  FlameIcon,
  TrophyIcon,
  MedalIcon,
  CalendarIcon,
  TargetIcon,
  BookIcon,
  WarningIcon,
  CheckIcon,
  CloseIcon,
  ChevronRightIcon,
  CrownIcon,
} from '../components/icons/Icons';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

// Xato daftarchada ko'rsatiladigan savollar soni (birinchi sahifadan).
const NOTEBOOK_PREVIEW = 5;

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Promise.allSettled natijasini o'qish: muvaffaqiyat → { ok, data }, xato →
// { ok:false, code, detail }. Premium endpointlar 403 qaytaradi (upgrade_required).
const readSection = (settled) => {
  if (settled?.status === 'fulfilled') {
    return { ok: true, data: settled.value?.data };
  }
  const err = settled?.reason;
  const code = err?.response?.status || 0;
  const body = err?.response?.data || {};
  return { ok: false, code, detail: body.detail, locked: code === 403 };
};

const pctColor = (colors, pct) => (pct >= 70 ? colors.green : pct >= 45 ? colors.orange : colors.red);

export default function AnalyticsScreen({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const { user } = useAuth();
  const isPremium = !!(user?.is_premium_active ?? user?.is_premium);

  // Har bir bo'lim MUSTAQIL yuklanadi — bittasi xato bersa boshqalari
  // ishlashda davom etadi (Promise.allSettled hech qachon reject bo'lmaydi).
  const { data, loading, refreshing, error, reload, refresh } = useFetch(async () => {
    const results = await Promise.allSettled([
      analyticsApi.getWeeklySummary(),
      analyticsApi.getWeakestTopics(),
      analyticsApi.getSubjectReadiness(),
      analyticsApi.getStrengthCard(),
      analyticsApi.getCompetitorAnalysis(),
      analyticsApi.getErrorNotebook({ page: 1 }),
      analyticsApi.getRecommendedOlympiads(),
    ]);
    return {
      weekly: results[0],
      weakest: results[1],
      readiness: results[2],
      strength: results[3],
      competitor: results[4],
      notebook: results[5],
      recommended: results[6],
    };
  }, []);

  // O'quv rejasi (study-plan) — AI POST, tugma bilan ishga tushadi.
  const [plan, setPlan] = useState({ loading: false, data: null, error: null, locked: false });
  // Olimpiada tayyorgarlik rejasi (olympiad-prep-plan) — har olimpiada uchun alohida.
  const [prep, setPrep] = useState({}); // { [olympiadId]: { loading, data, error, locked } }

  const onUpgrade = () => navigation.navigate('Premium');

  const generatePlan = async () => {
    if (!isPremium) return onUpgrade();
    if (plan.loading) return;
    setPlan({ loading: true, data: null, error: null, locked: false });
    try {
      const { data: res } = await analyticsApi.getStudyPlan();
      setPlan({ loading: false, data: res, error: null, locked: false });
    } catch (e) {
      const code = e?.response?.status;
      if (code === 403) return setPlan({ loading: false, data: null, error: null, locked: true });
      const msg = code === 429
        ? "Kunlik AI limiti tugadi. Ertaga qayta urinib ko'ring."
        : "Rejani tuzib bo'lmadi. Keyinroq urinib ko'ring.";
      setPlan({ loading: false, data: null, error: msg, locked: false });
    }
  };

  const generatePrep = async (olympiadId) => {
    if (!isPremium) return onUpgrade();
    if (prep[olympiadId]?.loading) return;
    setPrep((p) => ({ ...p, [olympiadId]: { loading: true } }));
    try {
      const { data: res } = await analyticsApi.getOlympiadPrepPlan(olympiadId);
      setPrep((p) => ({ ...p, [olympiadId]: { loading: false, data: res } }));
    } catch (e) {
      const code = e?.response?.status;
      if (code === 403) return setPrep((p) => ({ ...p, [olympiadId]: { loading: false, locked: true } }));
      const msg = code === 429 ? 'Kunlik AI limiti tugadi.' : "Rejani tuzib bo'lmadi.";
      setPrep((p) => ({ ...p, [olympiadId]: { loading: false, error: msg } }));
    }
  };

  if (loading && !data) return <LoadingState message="Tahlil yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  const weekly = readSection(data?.weekly);
  const weakest = readSection(data?.weakest);
  const readiness = readSection(data?.readiness);
  const strength = readSection(data?.strength);
  const competitor = readSection(data?.competitor);
  const notebook = readSection(data?.notebook);
  const recommended = readSection(data?.recommended);

  // ── Kichik yordamchi renderlar ────────────────────────────────────────────
  const InlineError = ({ text }) => (
    <Text style={styles.inlineError}>{text || "Ma'lumotni yuklab bo'lmadi."}</Text>
  );
  const InlineEmpty = ({ text }) => <Text style={styles.inlineEmpty}>{text}</Text>;
  const PremiumLock = ({ text }) => (
    <View style={styles.lockBox}>
      <IconBox size={40} radius={12} background={tints.gold14}>
        <LockIcon size={18} color={colors.gold} />
      </IconBox>
      <Text style={styles.lockTitle}>Premium funksiya</Text>
      <Text style={styles.lockText}>{text || "Bu tahlil premium o'quvchilar uchun."}</Text>
      <TouchableOpacity activeOpacity={0.85} style={styles.lockBtn} onPress={onUpgrade}>
        <CrownIcon size={15} color={colors.goldText} />
        <Text style={styles.lockBtnText}>Premiumga o'tish</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Ma'lumotlar ────────────────────────────────────────────────────────────
  const w = weekly.ok ? weekly.data || {} : {};
  const weakestTopics = weakest.ok ? (weakest.data?.topics || []) : [];
  const weakestLocked = weakest.ok && weakest.data?.locked;
  const readinessRows = readiness.ok && Array.isArray(readiness.data) ? readiness.data : [];
  const readinessAvg = readinessRows.length
    ? Math.round(readinessRows.reduce((s, r) => s + (r.readiness_percent || 0), 0) / readinessRows.length)
    : 0;
  const strengthData = strength.ok ? (strength.data || {}) : {};
  const topSubjects = Array.isArray(strengthData.top_subjects) ? strengthData.top_subjects : [];
  const comp = competitor.ok ? (competitor.data || {}) : {};
  const notebookRows = notebook.ok ? (notebook.data?.results || []) : [];
  const notebookCount = notebook.ok ? (notebook.data?.count || 0) : 0;
  const recommendedList = recommended.ok && Array.isArray(recommended.data) ? recommended.data : [];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()} style={styles.backBtn}>
          <BackIcon size={16} />
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>AI Tahlil</Text>
          <Text style={styles.subtitle}>Shaxsiy tahlil va tavsiyalar</Text>
        </View>
        <IconBox size={36} radius={12} background={tints.purple16}>
          <SparkleIcon size={16} color={colors.purple} />
        </IconBox>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.blue} />}
      >
        {/* ─── Haftalik xulosa ─────────────────────────────────────────────── */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Haftalik xulosa</Text>
          <Text style={styles.sectionNote}>Oxirgi 7 kun</Text>
        </View>
        {!weekly.ok ? (
          <Card style={styles.card}><InlineError text={weekly.detail} /></Card>
        ) : (
          <>
            <View style={styles.statRow}>
              <StatCard
                label="Tadbirlar"
                value={w.olympiads_count ?? 0}
                icon={<IconBox size={30} radius={9} background={tints.blue14}><CalendarIcon size={15} color={colors.blue} strokeWidth={1.9} /></IconBox>}
              />
              <StatCard
                label="O'rtacha ball"
                value={Math.round(w.average_score ?? 0)}
                valueColor={pctColor(colors, Math.round(w.average_score ?? 0))}
                icon={<IconBox size={30} radius={9} background={tints.green14}><StarIcon size={15} color={colors.green} /></IconBox>}
              />
            </View>
            <View style={styles.statRow}>
              <StatCard
                label="Eng yaxshi ball"
                value={Math.round(w.best_score ?? 0)}
                icon={<IconBox size={30} radius={9} background={tints.gold14}><TrophyIcon size={15} color={colors.gold} strokeWidth={1.8} full /></IconBox>}
              />
              <StatCard
                label="Streak"
                value={`${w.streak ?? 0} kun`}
                valueColor={colors.orange}
                icon={<IconBox size={30} radius={9} background={tints.orange14}><FlameIcon size={15} color={colors.orange} /></IconBox>}
              />
            </View>
          </>
        )}

        {/* ─── Zaif mavzular ───────────────────────────────────────────────── */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Zaif mavzular</Text>
          <Text style={styles.sectionNote}>Eng past 3 fan</Text>
        </View>
        <Card style={styles.card}>
          {!weakest.ok ? (
            <InlineError text={weakest.detail} />
          ) : weakestLocked ? (
            <PremiumLock text="Zaif mavzular tahlili premium o'quvchilar uchun." />
          ) : weakestTopics.length === 0 ? (
            <InlineEmpty text="Hali yetarli natija yo'q. Bir nechta tadbirda qatnashing." />
          ) : (
            <View style={styles.list}>
              {weakestTopics.map((t, i) => {
                const pct = t.pct ?? 0;
                return (
                  <View key={`${t.subject}-${i}`} style={styles.topicRow}>
                    <View style={styles.topicHead}>
                      <Text style={styles.topicSubject} numberOfLines={1}>{t.subject}</Text>
                      <Text style={[styles.topicPct, { color: pctColor(colors, pct) }]}>{pct}%</Text>
                    </View>
                    <ProgressBar progress={pct} height={8} color={pctColor(colors, pct)} />
                    <View style={styles.topicFoot}>
                      <Text style={styles.topicMeta}>{t.correct}/{t.total} to'g'ri</Text>
                      <Text style={styles.topicRec} numberOfLines={1}>{t.recommendation}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Card>

        {/* ─── Tayyorgarlik darajasi ───────────────────────────────────────── */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Tayyorgarlik darajasi</Text>
          <Text style={styles.sectionNote}>Fan kesimida</Text>
        </View>
        <Card style={styles.card}>
          {!readiness.ok ? (
            <InlineError text={readiness.detail} />
          ) : readinessRows.length === 0 ? (
            <InlineEmpty text="Fan bo'yicha tayyorlikni ko'rsatish uchun natija yetarli emas." />
          ) : (
            <>
              <View style={styles.readinessTop}>
                <DonutProgress size={78} strokeWidth={9} radius={32} progress={readinessAvg} color={pctColor(colors, readinessAvg)}>
                  <Text style={styles.donutValue}>{readinessAvg}%</Text>
                </DonutProgress>
                <View style={styles.readinessTopText}>
                  <Text style={styles.readinessTitle}>Umumiy tayyorlik</Text>
                  <Text style={styles.readinessSub}>{readinessRows.length} ta fan bo'yicha o'rtacha</Text>
                </View>
              </View>
              <View style={[styles.list, { marginTop: 14 }]}>
                {readinessRows.map((r, i) => {
                  const pct = r.readiness_percent ?? 0;
                  return (
                    <View key={`${r.subject}-${i}`} style={styles.topicRow}>
                      <View style={styles.topicHead}>
                        <Text style={styles.topicSubject} numberOfLines={1}>{r.subject}</Text>
                        <Text style={[styles.topicPct, { color: pctColor(colors, pct) }]}>{pct}%</Text>
                      </View>
                      <ProgressBar progress={pct} height={8} color={pctColor(colors, pct)} />
                      <View style={styles.topicFoot}>
                        <Text style={styles.topicMeta}>{r.attempts_count} urinish</Text>
                        <Text style={styles.topicRec} numberOfLines={1}>{r.recommendation}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </Card>

        {/* ─── Kuchli tomonlar ─────────────────────────────────────────────── */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Kuchli tomonlaringiz</Text>
        </View>
        <Card style={styles.card}>
          {!strength.ok ? (
            <InlineError text={strength.detail} />
          ) : topSubjects.length === 0 ? (
            <InlineEmpty text="Kuchli fanlar aniqlanmadi. Tadbirlarda qatnashishda davom eting." />
          ) : (
            <>
              <View style={styles.strengthRow}>
                {topSubjects.map((s, i) => (
                  <View key={`${s.subject}-${i}`} style={styles.strengthChip}>
                    <MedalIcon size={16} color={i === 0 ? colors.gold : i === 1 ? colors.silver : colors.bronze} />
                    <Text style={styles.strengthSubject} numberOfLines={1}>{s.subject}</Text>
                    <Text style={styles.strengthScore}>{s.avg_score}%</Text>
                  </View>
                ))}
              </View>
              {strengthData.share_text ? (
                <View style={styles.shareBox}>
                  <SparkleIcon size={13} color={colors.blue} />
                  <Text style={styles.shareText}>{strengthData.share_text}</Text>
                </View>
              ) : null}
            </>
          )}
        </Card>

        {/* ─── Raqobatchi tahlili ──────────────────────────────────────────── */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Raqobatchi tahlili</Text>
          <Text style={styles.sectionNote}>Siz vs raqib</Text>
        </View>
        <Card style={styles.card}>
          {!competitor.ok ? (
            competitor.locked ? (
              <PremiumLock text="Raqobatchi tahlili premium o'quvchilar uchun." />
            ) : (
              <InlineError text={competitor.detail} />
            )
          ) : !comp.my_rank ? (
            <InlineEmpty text="Hali natija yo'q. Bir tadbirda qatnashsangiz, o'rningizni ko'rasiz." />
          ) : (
            <>
              <Text style={styles.compOlympiad} numberOfLines={1}>{comp.olympiad_name || '—'}</Text>
              <View style={styles.compRankRow}>
                <View style={styles.compRankBox}>
                  <Text style={styles.compRankValue}>#{comp.my_rank}</Text>
                  <Text style={styles.compRankLabel}>Sizning o'rningiz</Text>
                </View>
                <View style={styles.compRankDivider} />
                <View style={styles.compRankBox}>
                  <Text style={styles.compRankValue}>{comp.total ?? 0}</Text>
                  <Text style={styles.compRankLabel}>Ishtirokchi</Text>
                </View>
                <View style={styles.compRankDivider} />
                <View style={styles.compRankBox}>
                  <Text style={[styles.compRankValue, { color: colors.green }]}>{comp.my_score ?? 0}</Text>
                  <Text style={styles.compRankLabel}>Ballingiz</Text>
                </View>
              </View>
              {comp.percentile != null ? (
                <View style={styles.percentileBox}>
                  <TrophyIcon size={13} color={colors.gold} strokeWidth={1.8} full />
                  <Text style={styles.percentileText}>
                    Siz ishtirokchilarning <Text style={styles.percentileStrong}>{comp.percentile}%</Text> dan yuqoridasiz
                  </Text>
                </View>
              ) : null}
              {comp.above_me ? (
                <View style={styles.rivalBox}>
                  <Text style={styles.rivalLabel}>Sizdan yuqorida:</Text>
                  <View style={styles.rivalRow}>
                    <Text style={styles.rivalName} numberOfLines={1}>{comp.above_me.name}</Text>
                    <Text style={styles.rivalScore}>{comp.above_me.score} ball</Text>
                  </View>
                  <Text style={styles.rivalDiff}>Farq: {comp.above_me.diff} ball — biroz mashq bilan o'zib ketasiz!</Text>
                </View>
              ) : (
                <View style={styles.rivalBox}>
                  <Text style={styles.rivalDiff}>Tabriklaymiz — bu tadbirda 1-o'rindasiz!</Text>
                </View>
              )}
            </>
          )}
        </Card>

        {/* ─── O'quv rejasi (AI) ───────────────────────────────────────────── */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>AI o'quv rejasi</Text>
          <Text style={styles.sectionNote}>Zaif fanlar bo'yicha</Text>
        </View>
        <Card style={styles.card}>
          {plan.locked ? (
            <PremiumLock text="AI o'quv rejasi premium o'quvchilar uchun." />
          ) : plan.data ? (
            <>
              {Array.isArray(plan.data.weak_subjects) && plan.data.weak_subjects.length > 0 ? (
                <View style={styles.chipsRow}>
                  {plan.data.weak_subjects.map((s, i) => (
                    <View key={`${s}-${i}`} style={styles.weakChip}>
                      <Text style={styles.weakChipText}>{s}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {Array.isArray(plan.data.plan) && plan.data.plan.length > 0 ? (
                <View style={[styles.list, { marginTop: 4 }]}>
                  {plan.data.plan.map((step, i) => (
                    <View key={i} style={styles.planStep}>
                      <View style={styles.planDot}><Text style={styles.planDotText}>{i + 1}</Text></View>
                      <Text style={styles.planStepText}>{String(step).replace(/^\s*\d+[.)]\s*/, '')}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <InlineEmpty text={plan.data.detail || "Reja tuzib bo'lmadi."} />
              )}
              <TouchableOpacity activeOpacity={0.8} style={styles.regenBtn} onPress={generatePlan} disabled={plan.loading}>
                <Text style={styles.regenText}>{plan.loading ? 'Tuzilmoqda…' : 'Qayta tuzish'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.planCta}>
              <IconBox size={40} radius={12} background={tints.blue14}>
                <BookIcon size={20} color={colors.blue} strokeWidth={1.9} />
              </IconBox>
              <Text style={styles.planCtaText}>
                AI zaif fanlaringizni tahlil qilib, haftalik o'quv rejasini tuzadi.
              </Text>
              <TouchableOpacity activeOpacity={0.85} style={styles.aiButton} onPress={generatePlan} disabled={plan.loading}>
                {isPremium ? <SparkleIcon size={14} color={colors.gold} /> : <LockIcon size={14} color={colors.gold} />}
                <Text style={styles.aiButtonText}>{plan.loading ? 'Reja tuzilmoqda…' : "AI o'quv rejasini tuzish"}</Text>
              </TouchableOpacity>
              {plan.error ? <InlineError text={plan.error} /> : null}
            </View>
          )}
        </Card>

        {/* ─── Xato daftarcha ──────────────────────────────────────────────── */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Xato daftarcha</Text>
          {notebook.ok && notebookCount > 0 ? (
            <Text style={styles.sectionNote}>Jami {notebookCount} ta</Text>
          ) : null}
        </View>
        <Card style={styles.card}>
          {!notebook.ok ? (
            notebook.locked ? (
              <PremiumLock text="Xato daftarcha premium o'quvchilar uchun." />
            ) : (
              <InlineError text={notebook.detail} />
            )
          ) : notebookRows.length === 0 ? (
            <InlineEmpty text="Ajoyib! Noto'g'ri javob berilgan savollar yo'q." />
          ) : (
            <View style={styles.list}>
              {notebookRows.slice(0, NOTEBOOK_PREVIEW).map((q, i) => (
                <View key={q.question_id || i} style={styles.errorItem}>
                  <View style={styles.errorItemHead}>
                    {q.subject ? (
                      <Badge label={q.subject} color={colors.blueLight} background={tints.blue14} size={10} />
                    ) : <View />}
                    <Text style={styles.errorOlympiad} numberOfLines={1}>{q.olympiad_name}</Text>
                  </View>
                  <Text style={styles.errorQuestion}>{q.question_text}</Text>
                  <View style={styles.errorAnswers}>
                    <View style={styles.errorAnswerRow}>
                      <CloseIcon size={11} color={colors.red} />
                      <Text style={[styles.errorAnswerText, { color: colors.redSoftText }]} numberOfLines={2}>
                        {q.wrong_answer_text != null
                          ? `${LETTERS[q.wrong_answer] || ''} ${q.wrong_answer_text}`.trim()
                          : "Bo'sh qoldirilgan"}
                      </Text>
                    </View>
                    <View style={styles.errorAnswerRow}>
                      <CheckIcon size={12} color={colors.greenLight} />
                      <Text style={[styles.errorAnswerText, { color: colors.greenLight }]} numberOfLines={2}>
                        {q.correct_answer_text != null
                          ? `${LETTERS[q.correct_answer] || ''} ${q.correct_answer_text}`.trim()
                          : '—'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
              {notebookCount > NOTEBOOK_PREVIEW ? (
                <Text style={styles.notebookMore}>
                  Yana {notebookCount - NOTEBOOK_PREVIEW} ta xato — "Xatolar sandig'i" bo'limida ko'ring.
                </Text>
              ) : null}
            </View>
          )}
        </Card>

        {/* ─── Tavsiya etilgan olimpiadalar ────────────────────────────────── */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Tavsiya etilgan olimpiadalar</Text>
        </View>
        <View style={styles.recommendWrap}>
          {!recommended.ok ? (
            <Card style={styles.card}>
              {recommended.locked ? (
                <PremiumLock text="Shaxsiy olimpiada tavsiyalari premium o'quvchilar uchun." />
              ) : (
                <InlineError text={recommended.detail} />
              )}
            </Card>
          ) : recommendedList.length === 0 ? (
            <Card style={styles.card}>
              <InlineEmpty text="Hozircha tavsiya etiladigan yangi olimpiada yo'q." />
            </Card>
          ) : (
            recommendedList.map((o) => {
              const p = prep[o.olympiad_id] || {};
              return (
                <Card key={o.olympiad_id} style={styles.recommendCard}>
                  <View style={styles.recommendHead}>
                    <View style={styles.recommendTitleWrap}>
                      <Text style={styles.recommendName} numberOfLines={2}>{o.name}</Text>
                      <View style={styles.recommendMeta}>
                        {o.subject ? (
                          <Badge label={o.subject} color={colors.blueLight} background={tints.blue14} size={10} />
                        ) : null}
                        {o.starts_at ? (
                          <View style={styles.recommendDate}>
                            <CalendarIcon size={11} color={colors.textSecondary} strokeWidth={1.9} />
                            <Text style={styles.recommendDateText}>{fmtDate(o.starts_at)}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <IconBox size={34} radius={11} background={tints.purple16}>
                      <TargetIcon size={17} color={colors.purple} />
                    </IconBox>
                  </View>
                  {o.reason ? (
                    <View style={styles.reasonRow}>
                      <SparkleIcon size={12} color={colors.blue} />
                      <Text style={styles.reasonText}>{o.reason}</Text>
                    </View>
                  ) : null}
                  {o.center_name ? (
                    <Text style={styles.recommendCenter} numberOfLines={1}>{o.center_name}</Text>
                  ) : null}

                  {p.locked ? (
                    <PremiumLock text="AI tayyorgarlik rejasi premium uchun." />
                  ) : p.data ? (
                    <View style={styles.prepBox}>
                      <Text style={styles.prepTitle}>
                        {p.data.days_left != null ? `${p.data.days_left} kun qoldi` : 'Tayyorgarlik rejasi'}
                      </Text>
                      {(p.data.daily_plan || []).map((d, di) => (
                        <View key={di} style={styles.prepDay}>
                          <Text style={styles.prepDayLabel}>{d.day}-kun</Text>
                          <View style={styles.prepTasks}>
                            {(d.tasks || []).map((task, ti) => (
                              <Text key={ti} style={styles.prepTask}>• {task}</Text>
                            ))}
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.prepBtn}
                      onPress={() => generatePrep(o.olympiad_id)}
                      disabled={p.loading}
                    >
                      {isPremium ? <SparkleIcon size={13} color={colors.blue} /> : <LockIcon size={13} color={colors.blue} />}
                      <Text style={styles.prepBtnText}>{p.loading ? 'Reja tuzilmoqda…' : 'AI tayyorgarlik rejasi'}</Text>
                      <ChevronRightIcon size={13} color={colors.blue} />
                    </TouchableOpacity>
                  )}
                  {p.error ? <InlineError text={p.error} /> : null}
                </Card>
              );
            })
          )}
        </View>

        <View style={styles.footerNote}>
          <WarningIcon size={13} color={colors.textMuted} />
          <Text style={styles.footerText}>
            Tahlillar sizning tadbirdagi natijalaringizga asoslanadi. Ko'proq qatnashsangiz — aniqroq bo'ladi.
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
  list: {
    gap: 14,
  },
  // ── Inline holatlar ──
  inlineError: {
    fontSize: 12.5,
    fontFamily: FONTS.semibold,
    color: colors.redSoftText,
    lineHeight: 18,
  },
  inlineEmpty: {
    fontSize: 12.5,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
    lineHeight: 18,
  },
  // ── Premium lock ──
  lockBox: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  lockTitle: {
    fontSize: 14,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    marginTop: 2,
  },
  lockText: {
    fontSize: 12,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
  },
  lockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.gold,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 16,
    marginTop: 6,
  },
  lockBtnText: {
    fontSize: 12.5,
    fontFamily: FONTS.extrabold,
    color: colors.goldText,
  },
  // ── Haftalik xulosa ──
  statRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  // ── Zaif mavzular / tayyorlik satri ──
  topicRow: {
    gap: 7,
  },
  topicHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  topicSubject: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: colors.text,
  },
  topicPct: {
    fontSize: 13,
    fontFamily: FONTS.extrabold,
  },
  topicFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  topicMeta: {
    fontSize: 10.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
  },
  topicRec: {
    flex: 1,
    textAlign: 'right',
    fontSize: 10.5,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
  },
  // ── Tayyorlik donut ──
  readinessTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  readinessTopText: {
    flex: 1,
  },
  donutValue: {
    fontSize: 16,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  readinessTitle: {
    fontSize: 14,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  readinessSub: {
    fontSize: 11.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 2,
  },
  // ── Kuchli tomonlar ──
  strengthRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  strengthChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceDeep,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  strengthSubject: {
    fontSize: 12.5,
    fontFamily: FONTS.bold,
    color: colors.text,
    maxWidth: 120,
  },
  strengthScore: {
    fontSize: 12.5,
    fontFamily: FONTS.extrabold,
    color: colors.green,
  },
  shareBox: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: tints.blue06,
    borderWidth: 1,
    borderColor: tints.blueBorder30,
  },
  shareText: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: FONTS.semibold,
    color: colors.blueSoftText,
    lineHeight: 18,
  },
  // ── Raqobatchi tahlili ──
  compOlympiad: {
    fontSize: 13.5,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    marginBottom: 12,
  },
  compRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceDeep,
    borderRadius: 14,
    paddingVertical: 14,
  },
  compRankBox: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  compRankDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  compRankValue: {
    fontSize: 19,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  compRankLabel: {
    fontSize: 10.5,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
  },
  percentileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 11,
    borderRadius: 12,
    backgroundColor: tints.gold08,
    borderWidth: 1,
    borderColor: tints.goldBorder30,
  },
  percentileText: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONTS.semibold,
    color: colors.goldSoftText,
    lineHeight: 17,
  },
  percentileStrong: {
    fontFamily: FONTS.extrabold,
    color: colors.gold,
  },
  rivalBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.surfaceDeep,
    gap: 4,
  },
  rivalLabel: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
  },
  rivalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  rivalName: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  rivalScore: {
    fontSize: 13,
    fontFamily: FONTS.extrabold,
    color: colors.blue,
  },
  rivalDiff: {
    fontSize: 11.5,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
    lineHeight: 16,
  },
  // ── O'quv rejasi ──
  planCta: {
    alignItems: 'center',
    gap: 10,
  },
  planCtaText: {
    fontSize: 12.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  aiButton: {
    alignSelf: 'stretch',
    height: 46,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: tints.goldBorder45,
    borderRadius: 12,
    backgroundColor: tints.gold07,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  aiButtonText: {
    fontSize: 13,
    fontFamily: FONTS.extrabold,
    color: colors.gold,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 12,
  },
  weakChip: {
    backgroundColor: tints.red10,
    borderWidth: 1,
    borderColor: tints.redBorder35,
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  weakChipText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: colors.redSoftText,
  },
  planStep: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  planDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: tints.blue14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  planDotText: {
    fontSize: 11,
    fontFamily: FONTS.extrabold,
    color: colors.blue,
  },
  planStepText: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: FONTS.semibold,
    color: colors.textBody,
    lineHeight: 18,
  },
  regenBtn: {
    alignSelf: 'flex-start',
    marginTop: 14,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceDeep,
  },
  regenText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
  },
  // ── Xato daftarcha ──
  errorItem: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.surfaceDeep,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  errorItemHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  errorOlympiad: {
    flex: 1,
    textAlign: 'right',
    fontSize: 10.5,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
  },
  errorQuestion: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: colors.text,
    lineHeight: 19,
  },
  errorAnswers: {
    gap: 6,
  },
  errorAnswerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
  },
  errorAnswerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONTS.bold,
    lineHeight: 17,
  },
  notebookMore: {
    fontSize: 11.5,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
    marginTop: 2,
  },
  // ── Tavsiya etilgan olimpiadalar ──
  recommendWrap: {
    gap: 10,
  },
  recommendCard: {
    padding: 14,
  },
  recommendHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  recommendTitleWrap: {
    flex: 1,
    gap: 8,
  },
  recommendName: {
    fontSize: 14.5,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    lineHeight: 20,
  },
  recommendMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  recommendDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recommendDateText: {
    fontSize: 11,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 12,
  },
  reasonText: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONTS.semibold,
    color: colors.blueSoftText,
  },
  recommendCenter: {
    fontSize: 11,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
    marginTop: 8,
  },
  prepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 12,
    height: 42,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: tints.blueBorder30,
    backgroundColor: tints.blue08,
  },
  prepBtnText: {
    fontSize: 12.5,
    fontFamily: FONTS.extrabold,
    color: colors.blue,
  },
  prepBox: {
    marginTop: 12,
    gap: 10,
  },
  prepTitle: {
    fontSize: 12.5,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  prepDay: {
    borderLeftWidth: 2,
    borderLeftColor: tints.blueBorder30,
    paddingLeft: 10,
    gap: 4,
  },
  prepDayLabel: {
    fontSize: 12,
    fontFamily: FONTS.extrabold,
    color: colors.blue,
  },
  prepTasks: {
    gap: 3,
  },
  prepTask: {
    fontSize: 12,
    fontFamily: FONTS.semibold,
    color: colors.textBody,
    lineHeight: 17,
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
