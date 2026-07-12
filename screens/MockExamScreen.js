import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Button from '../components/Button';
import ProgressBar from '../components/ProgressBar';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { studentApi } from '../services/api';
import { OlympyLogo, AlarmIcon, BackIcon, CheckIcon } from '../components/icons/Icons';

// ─── Mashq (mock) imtihon ekrani ────────────────────────────────────────────
// O'tib ketgan olimpiadani reytingga ta'sir qilmasdan qayta ishlash uchun
// YENGIL ekran. Atayin ExamScreen'dan ALOHIDA: mashqda savollar birato'la
// yuklanadi (bitta-bitta EMAS), submit payload boshqacha, va proktoring/
// anti-cheat (AppState kuzatuvi, ping, ekrandan chiqish, diskvalifikatsiya)
// UMUMAN yo'q. Vaqt tugasa — yumshoq avto-submit. Web'dagi MockTestPage bilan
// bir xil oqim. ExamScreen'dan faqat VIZUAL konvensiyalar (header, timer pill,
// variantlar, natija) olingan — kod/holat ulashilmagan.
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const fmtTime = (secs) => {
  const s = Math.max(0, Math.floor(secs));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
};

// Savol turini uch guruhga ajratamiz. Tanib bo'lmagan tur → xavfsiz zaxira
// sifatida erkin matn (free-text) ko'rsatiladi (crash bo'lmaydi).
const isMultiType = (t) => t === 'multiple_select';
const isSingleType = (t) => t === 'mcq' || t === 'yes_no';

export default function MockExamScreen({ route, navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const params = route?.params || {};
  const { mockId } = params;

  const [phase, setPhase] = useState('loading'); // loading | error | empty | exam | result
  const [questions, setQuestions] = useState([]);
  const [title, setTitle] = useState(params.title || 'Mashq');
  // answers: { [questionId]: payload } — submit_mock kutgan formatda:
  //   mcq/yes_no → { chosen_idx }, multiple_select → { selected: [...] },
  //   erkin matn → { text }.
  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(
    (Number(params.duration) || 30) * 60
  );
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  // Timer'ni server soatiga tayanib hisoblaymiz — ekran background'da uzoq
  // qolsa ham drift bo'lmaydi. serverExpiresAtMs yo'q bo'lsa (eski backend)
  // oddiy teskari sanashga qaytamiz.
  const serverExpiresAtRef = useRef(null);
  const serverSkewRef = useRef(0);
  const submittedRef = useRef(false);
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const load = useCallback(async () => {
    if (mockId == null) {
      setPhase('error');
      return;
    }
    setPhase('loading');
    try {
      const { data } = await studentApi.startMockOlympiad(mockId, {});
      const list = Array.isArray(data?.questions) ? data.questions : [];
      if (!list.length) {
        setPhase('empty');
        return;
      }
      setQuestions(list);
      if (data?.title) setTitle(data.title);
      const mins = Number(data?.time_limit_minutes) || Number(params.duration) || 30;
      // Server soati bilan qurilma soati orasidagi farq (drift'ni yo'qotish).
      let skewMs = 0;
      if (data?.server_now) {
        skewMs = Date.now() - new Date(data.server_now).getTime();
      }
      serverSkewRef.current = skewMs;
      if (data?.started_at) {
        const expiresAtMs = new Date(data.started_at).getTime() + mins * 60000;
        serverExpiresAtRef.current = expiresAtMs;
        const remaining = Math.max(
          0,
          Math.floor((expiresAtMs - (Date.now() - skewMs)) / 1000)
        );
        setTimeLeft(remaining);
      } else {
        serverExpiresAtRef.current = null;
        setTimeLeft(mins * 60);
      }
      setPhase('exam');
    } catch (e) {
      setPhase('error');
    }
  }, [mockId, params.duration]);

  useEffect(() => {
    load();
  }, [load]);

  const doSubmit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const { data } = await studentApi.submitMockOlympiad(mockId, {
        answers: answersRef.current || {},
      });
      setResult(data || {});
      setPhase('result');
    } catch (e) {
      const detail = e?.response?.data?.detail;
      submittedRef.current = false;
      Alert.alert(
        'Yuborilmadi',
        detail || 'Javoblarni yuborishda xatolik. Internet aloqasini tekshiring.',
        [{ text: 'Yopish' }]
      );
    } finally {
      setSubmitting(false);
    }
  }, [mockId]);

  // Timer — mashqda yumshoq cheklov: vaqt tugaganda avto-submit. serverExpiresAt
  // bo'lsa har tikda undan qayta hisoblaymiz (background drift'siz), aks holda
  // oddiy teskari sanash.
  useEffect(() => {
    if (phase !== 'exam') return undefined;
    if (timeLeft <= 0) {
      doSubmit();
      return undefined;
    }
    const id = setInterval(() => {
      if (serverExpiresAtRef.current) {
        const remaining = Math.max(
          0,
          Math.floor(
            (serverExpiresAtRef.current - (Date.now() - serverSkewRef.current)) / 1000
          )
        );
        setTimeLeft(remaining);
        if (remaining <= 0) {
          clearInterval(id);
          doSubmit();
        }
        return;
      }
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          doSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, timeLeft, doSubmit]);

  const total = questions.length;

  const answeredCount = useMemo(
    () =>
      questions.filter((q) => {
        const v = answers[q.id];
        if (!v) return false;
        if (Array.isArray(v.selected)) return v.selected.length > 0;
        if (typeof v.text === 'string') return v.text.trim().length > 0;
        if (typeof v.chosen_idx === 'number') return true;
        return false;
      }).length,
    [questions, answers]
  );

  const setAnswer = (qid, payload) =>
    setAnswers((prev) => ({ ...prev, [qid]: payload }));

  const toggleMulti = (qid, optIdx) =>
    setAnswers((prev) => {
      const cur = Array.isArray(prev[qid]?.selected) ? prev[qid].selected : [];
      const next = cur.includes(optIdx)
        ? cur.filter((x) => x !== optIdx)
        : [...cur, optIdx];
      return { ...prev, [qid]: { selected: next } };
    });

  const confirmFinish = () => {
    Alert.alert(
      'Yakunlash',
      `${answeredCount}/${total} savolga javob berdingiz. Yakunlaysizmi? Natija reytingga ta'sir qilmaydi.`,
      [
        { text: 'Bekor qilish', style: 'cancel' },
        { text: 'Yakunlash', style: 'destructive', onPress: doSubmit },
      ]
    );
  };

  if (phase === 'loading') return <LoadingState message="Mashq yuklanmoqda…" />;
  if (phase === 'error') return <ErrorState onRetry={load} />;
  if (phase === 'empty') {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <EmptyState
          title="Mashqda savollar yo'q"
          message="Bu olimpiada uchun savollar topilmadi."
          actionLabel="Ortga"
          onAction={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  if (phase === 'result') {
    const score = result?.score ?? 0;
    const correct = result?.correct_count ?? 0;
    const totalQ = result?.total_questions ?? total;
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.resultWrap}>
          <View style={styles.resultBadge}>
            <CheckIcon size={30} color={colors.white} />
          </View>
          <Text style={styles.resultTitle}>Mashq yakunlandi</Text>
          <Text style={styles.resultScore}>{score}</Text>
          <Text style={styles.resultScoreLabel}>ball</Text>
          <View style={styles.resultStats}>
            <View style={styles.resultStat}>
              <Text style={styles.resultStatValue}>{correct}/{totalQ}</Text>
              <Text style={styles.resultStatLabel}>To'g'ri javob</Text>
            </View>
          </View>
          <Text style={styles.resultNote}>Mashq natijasi reytingga ta'sir qilmaydi.</Text>
          <Button
            title="Ortga"
            height={50}
            radius={13}
            fontSize={15}
            style={styles.resultBtn}
            onPress={() => navigation.goBack()}
          />
        </View>
      </SafeAreaView>
    );
  }

  const q = questions[index] || {};
  const qType = q.question_type || 'mcq';
  const options = Array.isArray(q.options) ? q.options : [];
  const curVal = answers[q.id];
  const progress = total ? ((index + 1) / total) * 100 : 0;
  const timerLow = timeLeft <= 60;
  const showFreeText = !isMultiType(qType) && !isSingleType(qType);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()} style={styles.backBtn}>
          <BackIcon size={15} />
        </TouchableOpacity>
        <OlympyLogo size={22} strokeWidth={4} showHand={false} />
        <View style={styles.mashqBadge}>
          <Text style={styles.mashqBadgeText}>MASHQ</Text>
        </View>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <View style={[styles.timerPill, timerLow ? styles.timerPillLow : null]}>
          <AlarmIcon size={13} color={timerLow ? colors.red : colors.blue} />
          <Text style={[styles.timerText, timerLow ? { color: colors.red } : null]}>
            {fmtTime(timeLeft)}
          </Text>
        </View>
      </View>

      <ProgressBar progress={progress} height={5} style={styles.progress} />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.qMetaRow}>
          <Text style={styles.qLabel}>{index + 1}-SAVOL / {total}</Text>
          <Text style={styles.answeredLabel}>{answeredCount} ta belgilangan</Text>
        </View>

        <Text style={styles.qText}>{q.text}</Text>

        {showFreeText ? (
          <TextInput
            style={styles.textAnswer}
            placeholder="Javobingizni yozing…"
            placeholderTextColor={colors.textMuted}
            value={curVal?.text != null ? String(curVal.text) : ''}
            onChangeText={(t) => setAnswer(q.id, { text: t })}
            multiline
            textAlignVertical="top"
          />
        ) : (
          <View style={styles.options}>
            {options.map((opt, oi) => {
              const active = isMultiType(qType)
                ? Array.isArray(curVal?.selected) && curVal.selected.includes(oi)
                : curVal?.chosen_idx === oi;
              return (
                <TouchableOpacity
                  key={oi}
                  activeOpacity={0.8}
                  onPress={() =>
                    isMultiType(qType)
                      ? toggleMulti(q.id, oi)
                      : setAnswer(q.id, { chosen_idx: oi })
                  }
                  style={[styles.option, active ? styles.optionActive : null]}
                >
                  <View style={[styles.optionKey, active ? styles.optionKeyActive : null]}>
                    <Text style={[styles.optionKeyText, active ? { color: colors.white } : null]}>
                      {LETTERS[oi] || oi + 1}
                    </Text>
                  </View>
                  <Text style={[styles.optionText, active ? styles.optionTextActive : null]}>
                    {String(opt)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Oldingi"
          variant="muted"
          height={48}
          radius={13}
          fontSize={14}
          style={styles.footerBtn}
          disabled={index === 0}
          onPress={() => setIndex((i) => Math.max(0, i - 1))}
        />
        {index < total - 1 ? (
          <Button
            title="Keyingi"
            variant="dark"
            height={48}
            radius={13}
            fontSize={14}
            style={styles.footerBtn}
            onPress={() => setIndex((i) => Math.min(total - 1, i + 1))}
          />
        ) : null}
        <Button
          title={submitting ? 'Yuborilmoqda…' : 'Yakunlash'}
          variant="success"
          height={48}
          radius={13}
          fontSize={14}
          style={styles.finishBtn}
          disabled={submitting}
          onPress={confirmFinish}
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
  mashqBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: tints.blue14,
  },
  mashqBadgeText: {
    fontSize: 9.5,
    fontFamily: FONTS.extrabold,
    color: colors.blueLight,
    letterSpacing: 0.6,
  },
  title: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  timerPill: {
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
  timerPillLow: {
    backgroundColor: tints.red14,
    borderColor: tints.redBorder35,
  },
  timerText: {
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
  qMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  qLabel: {
    fontSize: 11.5,
    fontFamily: FONTS.extrabold,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  answeredLabel: {
    fontSize: 11.5,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
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
  optionActive: {
    borderWidth: 1.5,
    borderColor: colors.blue,
    backgroundColor: tints.blue10,
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
  optionKeyActive: {
    backgroundColor: colors.blue,
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
  optionTextActive: {
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  textAnswer: {
    marginTop: 18,
    minHeight: 140,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 14,
    backgroundColor: colors.surface,
    padding: 14,
    fontSize: 14,
    fontFamily: FONTS.semibold,
    color: colors.text,
    lineHeight: 21,
  },
  footer: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 10,
  },
  footerBtn: {
    flex: 1,
  },
  finishBtn: {
    flex: 1.2,
  },
  resultWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  resultBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  resultTitle: {
    fontSize: 18,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    textAlign: 'center',
  },
  resultScore: {
    fontSize: 52,
    fontFamily: FONTS.extrabold,
    color: colors.blue,
    marginTop: 12,
  },
  resultScoreLabel: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
    marginTop: -4,
  },
  resultStats: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 20,
  },
  resultStat: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultStatValue: {
    fontSize: 18,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  resultStatLabel: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
    marginTop: 2,
  },
  resultNote: {
    fontSize: 12,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
  },
  resultBtn: {
    alignSelf: 'stretch',
    marginTop: 22,
  },
});
