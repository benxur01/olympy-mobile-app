import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Share, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Card from '../components/Card';
import Badge from '../components/Badge';
import ProgressBar from '../components/ProgressBar';
import DonutProgress from '../components/DonutProgress';
import IconBox from '../components/IconBox';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import useFetch from '../services/useFetch';
import { studentApi } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { ShareIcon, CheckIcon, CloseIcon, LockIcon, SparkleIcon, RepeatIcon } from '../components/icons/Icons';

const makeSECTION_COLORS = (colors, tints) => ([colors.blue, colors.green, colors.purple, colors.orange, colors.blueLight]);
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const asArray = (data) => (Array.isArray(data) ? data : data?.results || []);

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
  const SECTION_COLORS = makeSECTION_COLORS(colors, tints);
  const { user } = useAuth();
  const isPremium = user?.is_premium || user?.is_premium_active;
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [expanded, setExpanded] = useState({});
  // Mashq (mock) rejimi: tugagan olimpiadani reytingga ta'sir qilmasdan qayta
  // ishlash. Backend MockOlympiad nusxasini get-or-create qiladi, so'ng mashq
  // ekraniga o'tamiz. practicingId — bosilgan natija qatorining id'si (spinner).
  const [practicingId, setPracticingId] = useState(null);

  const { data, loading, refreshing, error, reload, refresh } = useFetch(async () => {
    const [results, stats] = await Promise.all([
      studentApi.myResults({ page_size: 20 }).then((r) => r.data).catch(() => null),
      studentApi.myStats().then((r) => r.data).catch(() => null),
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
    return { results: arr, stats, detail };
  }, []);

  if (loading) return <LoadingState message="Natijalar yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  const results = data?.results || [];
  const stats = data?.stats || {};
  const latest = results[0] || null;
  const subjects = stats.subjects || [];
  const scorePct = latest ? latest.score : Math.round(stats.average_score || 0);

  const analysis = extractQuestionAnalysis(data?.detail);
  const hasAnalysis = analysis.some((q) => q.isCorrect !== null);

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

  const handlePractice = async (r) => {
    if (practicingId != null) return;
    // Attempt serializer `olympiad` FK id (int) qaytaradi; ba'zi javoblarda
    // olympiad obyekt bo'lishi mumkin — ikkalasini ham qo'llaymiz.
    const olympiadId = typeof r.olympiad === 'number' ? r.olympiad : r.olympiad?.id;
    if (olympiadId == null) return;
    setPracticingId(r.id);
    try {
      const { data: mock } = await studentApi.createPracticeMock(olympiadId);
      if (mock?.mock_id != null) {
        navigation.navigate('MockExam', {
          mockId: mock.mock_id,
          title: mock.title || r.olympiad_title || r.olympiad?.title,
          subject: r.olympiad?.subject,
          duration: r.time_limit_minutes || 30,
        });
      } else {
        Alert.alert('Xatolik', "Mashq rejimini ochib bo'lmadi.");
      }
    } catch (e) {
      const detail = e?.response?.data?.detail;
      Alert.alert('Xatolik', detail || "Mashq rejimini ochib bo'lmadi.");
    } finally {
      setPracticingId(null);
    }
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
        contentContainerStyle={styles.content}
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

        {subjects.length ? (
          <>
            <Text style={styles.sectionTitle}>Fanlar bo'yicha o'rtacha</Text>
            <Card radius={18} style={styles.sectionsCard}>
              {subjects.map((s, i) => (
                <View key={s.subject || i}>
                  <View style={styles.sectionRow}>
                    <Text style={styles.sectionName}>{s.subject || 'Fan'}</Text>
                    <Text style={styles.sectionValue}>{Math.round(s.average_score || 0)}%</Text>
                  </View>
                  <ProgressBar
                    progress={s.average_score || 0}
                    height={8}
                    color={SECTION_COLORS[i % SECTION_COLORS.length]}
                    style={styles.sectionBar}
                  />
                </View>
              ))}
            </Card>
          </>
        ) : null}

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

        {results.length ? (
          <>
            <Text style={styles.sectionTitle}>So'nggi natijalar</Text>
            <View style={styles.historyList}>
              {results.slice(0, 8).map((r) => (
                <Card key={r.id} style={styles.historyCard}>
                  <IconBox size={30} radius={15} background={tints.green14}>
                    <CheckIcon size={14} />
                  </IconBox>
                  <View style={styles.historyText}>
                    <Text style={styles.historyTitle} numberOfLines={1}>
                      {r.olympiad_title || r.olympiad?.title || 'Tadbir'}
                    </Text>
                    <Text style={styles.historySub}>
                      {r.score} ball · {r.correct_count}/{r.total_questions} to'g'ri
                    </Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.practiceBtn}
                    disabled={practicingId != null}
                    onPress={() => handlePractice(r)}
                  >
                    {practicingId === r.id ? (
                      <ActivityIndicator size="small" color={colors.blue} />
                    ) : (
                      <>
                        <RepeatIcon size={14} color={colors.blue} />
                        <Text style={styles.practiceBtnText}>Mashq</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </Card>
              ))}
            </View>
          </>
        ) : null}
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
  },
  scoreMax: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
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
  sectionsCard: {
    padding: 16,
    gap: 12,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionName: {
    fontSize: 12.5,
    fontFamily: FONTS.bold,
    color: colors.textBody,
  },
  sectionValue: {
    fontSize: 12.5,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  sectionBar: {
    marginTop: 6,
  },
  historyList: {
    gap: 8,
  },
  historyCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyText: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 13.5,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  historySub: {
    fontSize: 11.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
  },
  practiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minWidth: 78,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 11,
    backgroundColor: tints.blue10,
    borderWidth: 1,
    borderColor: tints.blueBorder30,
  },
  practiceBtnText: {
    fontSize: 12,
    fontFamily: FONTS.extrabold,
    color: colors.blue,
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
