import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Button from '../components/Button';
import ProgressBar from '../components/ProgressBar';
import Avatar from '../components/Avatar';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { duelApi } from '../services/api';
import { useAuth } from '../services/AuthContext';
import {
  OlympyLogo,
  BackIcon,
  CheckIcon,
  CloseIcon,
  LightningIcon,
} from '../components/icons/Icons';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const POLL_MS = 3000;

export default function DuelPlayScreen({ route, navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const { user } = useAuth();
  const duelId = route?.params?.duelId;

  const [phase, setPhase] = useState('loading'); // loading | error | blocked | play | waiting
  const [blockedMsg, setBlockedMsg] = useState('');
  const [questions, setQuestions] = useState([]);
  const [opponentName, setOpponentName] = useState('Raqib');
  const [subject, setSubject] = useState('');
  const [index, setIndex] = useState(0);
  // answers: { [question_id]: { selected, is_correct, correct_answer } } — shu
  // sessiyada berilgan javoblar (feedback ko'rsatish uchun).
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const mountedRef = useRef(true);
  const pollRef = useRef(null);
  // Oxirgi answer javobidagi duel holati — o'yin oxirida raqib allaqachon
  // tugatgan bo'lsa (status 'completed') darhol natijaga o'tamiz.
  const lastStatusRef = useRef('pending');

  useEffect(() => () => {
    mountedRef.current = false;
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  const goToResult = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    navigation.replace('DuelResult', { duelId });
  }, [navigation, duelId]);

  const applyDetail = useCallback(
    (detail) => {
      if (detail.status === 'completed') {
        goToResult();
        return;
      }
      const qs = Array.isArray(detail.questions) ? detail.questions : [];
      const myId = user?.id;
      // Raqib ismi — men challenger bo'lsam opponent, aks holda challenger.
      const opp =
        detail.challenger && myId === detail.challenger.id ? detail.opponent : detail.challenger;
      setOpponentName((opp && opp.full_name) || 'Raqib');
      setSubject(detail.subject || '');
      setQuestions(qs);
      if (detail.my_finished) {
        // Men tugatganman, raqib hali emas — kutish + polling.
        setPhase('waiting');
      } else {
        const firstUnanswered = qs.findIndex((q) => !q.answered);
        setIndex(firstUnanswered >= 0 ? firstUnanswered : 0);
        setPhase('play');
      }
    },
    [user?.id, goToResult]
  );

  const load = useCallback(async () => {
    setPhase('loading');
    try {
      const { data } = await duelApi.detail(duelId);
      if (!mountedRef.current) return;
      if (!Array.isArray(data?.questions) || data.questions.length === 0) {
        setBlockedMsg('Bu duelda savollar topilmadi.');
        setPhase('blocked');
        return;
      }
      applyDetail(data);
    } catch (e) {
      if (!mountedRef.current) return;
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail;
      if (status === 403 || status === 404) {
        setBlockedMsg(detail || 'Bu duelga kira olmaysiz.');
        setPhase('blocked');
      } else {
        setPhase('error');
      }
    }
  }, [duelId, applyDetail]);

  useEffect(() => {
    load();
  }, [load]);

  const total = questions.length;
  const answeredCount = useMemo(
    () => questions.filter((q) => answers[q.id ?? q.question_id] || q.answered).length,
    [questions, answers]
  );
  const myCorrect = useMemo(
    () => Object.values(answers).filter((a) => a.is_correct).length,
    [answers]
  );

  // ── Polling: "kutish" bosqichida har POLL_MS da holatni tekshiramiz ──
  useEffect(() => {
    if (phase !== 'waiting') {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return undefined;
    }
    const tick = async () => {
      try {
        const { data } = await duelApi.detail(duelId);
        if (!mountedRef.current) return;
        if (data.status === 'completed') goToResult();
      } catch (e) {
        // tarmoq tebranishi — keyingi tick'da qayta urinamiz.
      }
    };
    pollRef.current = setInterval(tick, POLL_MS);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [phase, duelId, goToResult]);

  const submitAnswer = useCallback(
    async (qid, optionIndex) => {
      if (submitting) return;
      setSubmitting(true);
      try {
        const { data } = await duelApi.answer(duelId, {
          question_id: qid,
          selected_option: optionIndex,
        });
        if (!mountedRef.current) return;
        lastStatusRef.current = data.duel_status || 'pending';
        setAnswers((prev) => ({
          ...prev,
          [qid]: {
            selected: optionIndex,
            is_correct: !!data.is_correct,
            correct_answer: data.correct_answer,
          },
        }));
      } catch (e) {
        // Allaqachon javob berilgan bo'lsa (400) — savolni javob berilgan deb
        // belgilaymiz, oldinga o'tishga to'sqinlik qilmaymiz.
        if (mountedRef.current) {
          setAnswers((prev) => ({
            ...prev,
            [qid]: prev[qid] || { selected: optionIndex, is_correct: false, correct_answer: -1 },
          }));
        }
      } finally {
        if (mountedRef.current) setSubmitting(false);
      }
    },
    [duelId, submitting]
  );

  const goNext = useCallback(() => {
    if (index < total - 1) {
      // Keyingi javob berilmagan savolga o'tamiz (bo'lmasa keyingisiga).
      const nextUnanswered = questions.findIndex(
        (q, i) => i > index && !(answers[q.id ?? q.question_id] || q.answered)
      );
      setIndex(nextUnanswered >= 0 ? nextUnanswered : index + 1);
    } else {
      // Oxirgi savol — men tugatdim. Raqib allaqachon tugatgan bo'lsa (duel
      // yakunlangan) darhol natijaga o'tamiz, aks holda kutamiz (polling).
      if (lastStatusRef.current === 'completed') goToResult();
      else setPhase('waiting');
    }
  }, [index, total, questions, answers, goToResult]);

  if (phase === 'loading') return <LoadingState message="Duel yuklanmoqda…" />;
  if (phase === 'error') return <ErrorState onRetry={load} />;

  if (phase === 'blocked') {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.centerWrap}>
          <View style={styles.blockedIcon}>
            <CloseIcon size={24} color={colors.red} />
          </View>
          <Text style={styles.centerTitle}>Duel ochilmadi</Text>
          <Text style={styles.centerText}>{blockedMsg}</Text>
          <Button title="Ortga" variant="dark" height={48} radius={12} fontSize={14.5} style={styles.centerBtn} onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'waiting') {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.centerWrap}>
          <View style={styles.waitBadge}>
            <ActivityIndicator size="large" color={colors.blue} />
          </View>
          <Text style={styles.centerTitle}>Raqib javob berishini kutmoqda</Text>
          <Text style={styles.centerText}>
            Siz duelni yakunladingiz. {opponentName} javoblarni tugatishi bilan natija chiqadi.
          </Text>
          <View style={styles.waitStat}>
            <Avatar letter={(user?.full_name || 'S')[0].toUpperCase()} size={40} fontSize={15} background={colors.blueDeep} />
            <View style={styles.waitStatText}>
              <Text style={styles.waitStatValue}>{myCorrect}/{total}</Text>
              <Text style={styles.waitStatLabel}>Sizning to'g'ri javoblaringiz</Text>
            </View>
          </View>
          <Button title="Natijani tekshirish" height={48} radius={12} fontSize={14.5} style={styles.centerBtn} onPress={goToResult} />
          <Button title="Keyinroq ko'rish" variant="muted" height={46} radius={12} fontSize={14} style={styles.centerBtnSecondary} onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  // ── play ──
  const q = questions[index] || {};
  const qid = q.id ?? q.question_id;
  const options = Array.isArray(q.options) ? q.options : [];
  const localAns = answers[qid];
  const isAnswered = !!localAns || q.answered;
  const progress = total ? (answeredCount / total) * 100 : 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()} style={styles.backBtn}>
          <BackIcon size={15} />
        </TouchableOpacity>
        <OlympyLogo size={22} strokeWidth={4} showHand={false} />
        <View style={styles.headerMid}>
          <Text style={styles.headerTitle} numberOfLines={1}>Duel · {opponentName}</Text>
          {subject ? <Text style={styles.headerSub} numberOfLines={1}>{subject}</Text> : null}
        </View>
        <View style={styles.scorePill}>
          <LightningIcon size={13} color={colors.blue} />
          <Text style={styles.scoreText}>{myCorrect}</Text>
        </View>
      </View>

      <ProgressBar progress={progress} height={5} style={styles.progress} />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.qLabel}>{index + 1}-SAVOL / {total}</Text>
        <Text style={styles.qText}>{q.text}</Text>

        {options.length === 0 ? (
          <View style={styles.noOptWrap}>
            <Text style={styles.noOptText}>Bu savol turi ilovada ko'rsatilmaydi.</Text>
            {!isAnswered ? (
              <Button title="O'tkazib yuborish" variant="muted" height={46} radius={12} fontSize={14} onPress={() => submitAnswer(qid, -1)} disabled={submitting} />
            ) : null}
          </View>
        ) : (
          <View style={styles.options}>
            {options.map((opt, oi) => {
              const chosen = localAns && localAns.selected === oi;
              const isRight = localAns && localAns.correct_answer === oi;
              let optStyle = null;
              let keyStyle = null;
              let keyTextColor = null;
              if (localAns) {
                if (isRight) {
                  optStyle = styles.optionCorrect;
                  keyStyle = styles.optionKeyCorrect;
                  keyTextColor = colors.white;
                } else if (chosen) {
                  optStyle = styles.optionWrong;
                  keyStyle = styles.optionKeyWrong;
                  keyTextColor = colors.white;
                }
              }
              return (
                <TouchableOpacity
                  key={oi}
                  activeOpacity={0.85}
                  disabled={isAnswered || submitting}
                  onPress={() => submitAnswer(qid, oi)}
                  style={[styles.option, optStyle]}
                >
                  <View style={[styles.optionKey, keyStyle]}>
                    <Text style={[styles.optionKeyText, keyTextColor ? { color: keyTextColor } : null]}>
                      {LETTERS[oi] || oi + 1}
                    </Text>
                  </View>
                  <Text style={styles.optionText}>{String(opt)}</Text>
                  {localAns && isRight ? <CheckIcon size={16} color={colors.green} /> : null}
                  {localAns && chosen && !isRight ? <CloseIcon size={15} color={colors.red} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {localAns ? (
          <View style={[styles.feedback, localAns.is_correct ? styles.feedbackOk : styles.feedbackBad]}>
            <Text style={[styles.feedbackText, { color: localAns.is_correct ? colors.greenLight : colors.redSoftText }]}>
              {localAns.is_correct ? "To'g'ri javob!" : "Noto'g'ri. To'g'ri javob belgilandi."}
            </Text>
          </View>
        ) : q.answered ? (
          <View style={[styles.feedback, styles.feedbackNeutral]}>
            <Text style={[styles.feedbackText, { color: colors.textSecondary }]}>Bu savolga javob bergansiz.</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={index < total - 1 ? 'Keyingi savol' : 'Yakunlash'}
          height={50}
          radius={13}
          fontSize={15}
          disabled={!isAnswered}
          style={!isAnswered ? styles.footerDisabled : null}
          onPress={goNext}
        />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors, tints) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMid: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 13,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  headerSub: {
    fontSize: 10.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 1,
  },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: tints.blue10,
    borderWidth: 1,
    borderColor: tints.blueBorder30,
  },
  scoreText: {
    fontSize: 14,
    fontFamily: FONTS.extrabold,
    color: colors.blue,
    fontVariant: ['tabular-nums'],
  },
  progress: {
    marginTop: 12,
  },
  body: {
    paddingBottom: 16,
  },
  qLabel: {
    fontSize: 11.5,
    fontFamily: FONTS.extrabold,
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginTop: 18,
  },
  qText: {
    fontSize: 17.5,
    fontFamily: FONTS.bold,
    color: colors.text,
    lineHeight: 26.25,
    marginTop: 8,
  },
  options: {
    gap: 9,
    marginTop: 18,
  },
  option: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 14,
    backgroundColor: colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionCorrect: {
    borderWidth: 1.5,
    borderColor: colors.green,
    backgroundColor: tints.green14,
  },
  optionWrong: {
    borderWidth: 1.5,
    borderColor: colors.red,
    backgroundColor: tints.red12,
  },
  optionKey: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: colors.surfaceDeep,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionKeyCorrect: {
    backgroundColor: colors.green,
    borderWidth: 0,
  },
  optionKeyWrong: {
    backgroundColor: colors.red,
    borderWidth: 0,
  },
  optionKeyText: {
    fontSize: 12,
    fontFamily: FONTS.extrabold,
    color: colors.textSecondary,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: colors.textBody,
  },
  noOptWrap: {
    marginTop: 18,
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  noOptText: {
    fontSize: 13,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  feedback: {
    marginTop: 16,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  feedbackOk: {
    backgroundColor: tints.green14,
    borderColor: tints.greenBorder30,
  },
  feedbackBad: {
    backgroundColor: tints.red12,
    borderColor: tints.redBorder35,
  },
  feedbackNeutral: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  feedbackText: {
    fontSize: 13,
    fontFamily: FONTS.extrabold,
  },
  footer: {
    marginTop: 10,
  },
  footerDisabled: {
    opacity: 0.5,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  blockedIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: tints.red13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  waitBadge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: tints.blue10,
    borderWidth: 1,
    borderColor: tints.blueBorder30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  centerTitle: {
    fontSize: 18,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    textAlign: 'center',
  },
  centerText: {
    fontSize: 13.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  waitStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  waitStatText: {
    alignItems: 'flex-start',
  },
  waitStatValue: {
    fontSize: 18,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  waitStatLabel: {
    fontSize: 11,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 1,
  },
  centerBtn: {
    alignSelf: 'stretch',
    marginTop: 22,
  },
  centerBtnSecondary: {
    alignSelf: 'stretch',
    marginTop: 10,
  },
});
