import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Button from '../components/Button';
import CodeQuestion from '../components/CodeQuestion';
import ProgressBar from '../components/ProgressBar';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { studentApi } from '../services/api';
import { OlympyLogo, AlarmIcon, BackIcon, CheckIcon, WarningIcon } from '../components/icons/Icons';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const fmtTime = (secs) => {
  const s = Math.max(0, Math.floor(secs));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
};

const isTextType = (t) => t === 'essay' || t === 'fill_blank' || t === 'fill_blanks';

export default function ExamScreen({ route, navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const params = route?.params || {};
  const { olympiadId, title, durationMinutes } = params;

  const [phase, setPhase] = useState('loading'); // loading | error | blocked | exam | result
  const [blockedMsg, setBlockedMsg] = useState('');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  // Kod (IT) savollari uchun tanlangan dasturlash tili: { [qid]: 'python' }.
  // Kod matni `answers[qid]`da (string), til alohida saqlanadi.
  const [codeLangs, setCodeLangs] = useState({});
  const [index, setIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  // Ekrandan chiqishlar sonini ekranda ko'rsatish uchun (ref re-render bermaydi).
  const [escapeCount, setEscapeCount] = useState(0);

  const startedAtRef = useRef(Date.now());
  const submittedRef = useRef(false);

  // Anti-cheat: ekrandan chiqishlar sonini va qurilma ID'sini kuzatamiz.
  // Qurilma ID sessiya davomida barqaror — backend parallel-qurilma
  // tekshiruvi shu ID orqali ishlaydi.
  const tabEscapesRef = useRef(0);
  const answeredCountRef = useRef(0);
  const deviceIdRef = useRef(null);
  if (!deviceIdRef.current) {
    deviceIdRef.current = `rn-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }
  const MAX_TAB_ESCAPES = 3;

  const load = useCallback(async () => {
    setPhase('loading');
    try {
      const { data } = await studentApi.olympiadQuestions(olympiadId);
      const list = Array.isArray(data?.questions) ? data.questions : [];
      if (!list.length) {
        setBlockedMsg("Bu tadbirda savollar yo'q.");
        setPhase('blocked');
        return;
      }
      setQuestions(list);
      // Timer: server expires_at bilan sinxron; bo'lmasa duration_seconds yoki
      // ekranga uzatilgan daqiqalar.
      const session = data?.session || {};
      let secs = null;
      if (session.expires_at) {
        const end = new Date(session.expires_at).getTime();
        const now = session.server_now ? new Date(session.server_now).getTime() : Date.now();
        secs = Math.round((end - now) / 1000);
      } else if (session.duration_seconds) {
        secs = session.duration_seconds;
      } else if (durationMinutes) {
        secs = durationMinutes * 60;
      }
      setTimeLeft(secs && secs > 0 ? secs : null);
      startedAtRef.current = Date.now();
      setPhase('exam');
    } catch (e) {
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail;
      if (status === 403 || status === 400) {
        setBlockedMsg(detail || 'Bu tadbirga hozir kira olmaysiz.');
        setPhase('blocked');
      } else {
        setPhase('error');
      }
    }
  }, [olympiadId, durationMinutes]);

  useEffect(() => {
    load();
  }, [load]);

  const answeredCount = useMemo(
    () => questions.filter((q) => answers[q.id] !== undefined && answers[q.id] !== '').length,
    [questions, answers]
  );

  const buildPayload = useCallback(() => {
    const ans = {};
    const codeAns = {};
    questions.forEach((q) => {
      const v = answers[q.id];
      if (v === undefined || v === null || v === '') return;
      const t = q.question_type;
      if (t === 'code') {
        codeAns[q.id] = {
          code: String(v),
          language: codeLangs[q.id] || q.programming_language || 'python',
        };
      } else if (t === 'multiple_select') {
        if (Array.isArray(v) && v.length) ans[q.id] = { selected: v };
      } else if (isTextType(t)) {
        if (String(v).trim()) ans[q.id] = { text: String(v) };
      } else {
        ans[q.id] = v; // mcq / yes_no → ko'rinadigan variant indeksi
      }
    });
    const timeSpent = Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000));
    const payload = { olympiad: olympiadId, answers: ans, time_spent: timeSpent };
    if (Object.keys(codeAns).length) payload.code_answers = codeAns;
    return payload;
  }, [answers, questions, olympiadId, codeLangs]);

  const doSubmit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const { data } = await studentApi.submitAttempt(buildPayload());
      setResult(data || {});
      setPhase('result');
    } catch (e) {
      const detail = e?.response?.data?.detail;
      submittedRef.current = false;
      Alert.alert(
        'Yuborilmadi',
        detail || "Natijani yuborishda xatolik. Internet aloqasini tekshiring.",
        [{ text: 'Yopish' }]
      );
    } finally {
      setSubmitting(false);
    }
  }, [buildPayload]);

  // Timer countdown + vaqt tugaganda avtomatik yuborish.
  useEffect(() => {
    if (phase !== 'exam' || timeLeft === null) return undefined;
    if (timeLeft <= 0) {
      doSubmit();
      return undefined;
    }
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return prev;
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

  // answeredCount'ni ref'da yangilab boramiz — ping/interval closure'lari
  // eng so'nggi qiymatni o'qishi uchun.
  useEffect(() => {
    answeredCountRef.current = answeredCount;
  }, [answeredCount]);

  // Server bilan sinxron ping: o'quvchi holati (nechta javob berildi, nechta
  // marta ekrandan chiqdi) cache'ga yoziladi va manager jonli nazorat panelida
  // ko'rinadi. 409 — boshqa qurilmadan kirilgani aniqlandi.
  const sendPing = useCallback(async () => {
    if (submittedRef.current) return;
    try {
      await studentApi.sessionPing({
        olympiad: olympiadId,
        answered_count: answeredCountRef.current,
        tab_escapes: tabEscapesRef.current,
        device_id: deviceIdRef.current,
      });
    } catch (e) {
      if (e?.response?.status === 409) {
        submittedRef.current = true;
        setBlockedMsg(
          e?.response?.data?.detail || 'Boshqa qurilmadan kirilgani aniqlandi. Olimpiada yakunlandi.'
        );
        setPhase('blocked');
      }
    }
  }, [olympiadId]);

  // Ekrandan chiqishlar chegaradan oshsa — cheating signal yuborib, sessiyani
  // diskvalifikatsiya qilamiz.
  const reportEscape = useCallback(
    async (reason) => {
      if (submittedRef.current) return;
      try {
        const { data } = await studentApi.reportCheating({ olympiad: olympiadId, reason });
        if (data?.disqualified) {
          submittedRef.current = true;
          setBlockedMsg(
            data.detail || 'Imtihon vaqtida ilovadan chiqib ketganingiz uchun olimpiada yakunlandi.'
          );
          setPhase('blocked');
        }
      } catch (e) {
        // Session yo'q (400) yoki throttle (429) — e'tibor bermaymiz.
      }
    },
    [olympiadId]
  );

  // AppState: ilova fonga o'tsa (o'quvchi boshqa ilovaga o'tdi/uy tugmasi) —
  // bu "ekrandan chiqish" hisoblanadi. Har safar ping bilan xabar beramiz,
  // chegaradan (3) oshganda diskvalifikatsiya qilamiz.
  useEffect(() => {
    if (phase !== 'exam') return undefined;
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background') {
        tabEscapesRef.current += 1;
        setEscapeCount(tabEscapesRef.current);
        sendPing();
        if (tabEscapesRef.current >= MAX_TAB_ESCAPES) {
          reportEscape('test_window_left');
        }
      }
    });
    return () => sub.remove();
  }, [phase, sendPing, reportEscape]);

  // Davriy ping (20 soniyada bir) — jonli nazorat "online" holatini yangilaydi.
  useEffect(() => {
    if (phase !== 'exam') return undefined;
    sendPing();
    const id = setInterval(sendPing, 20000);
    return () => clearInterval(id);
  }, [phase, sendPing]);

  const confirmFinish = () => {
    Alert.alert(
      'Yakunlash',
      `${answeredCount}/${questions.length} savolga javob berdingiz. Yakunlaysizmi?`,
      [
        { text: 'Bekor qilish', style: 'cancel' },
        { text: 'Yakunlash', style: 'destructive', onPress: doSubmit },
      ]
    );
  };

  const setAnswer = (qid, value) => setAnswers((prev) => ({ ...prev, [qid]: value }));

  const toggleMulti = (qid, optIdx) =>
    setAnswers((prev) => {
      const cur = Array.isArray(prev[qid]) ? prev[qid] : [];
      return {
        ...prev,
        [qid]: cur.includes(optIdx) ? cur.filter((x) => x !== optIdx) : [...cur, optIdx],
      };
    });

  if (phase === 'loading') return <LoadingState message="Tadbir yuklanmoqda…" />;
  if (phase === 'error') return <ErrorState onRetry={load} />;

  if (phase === 'blocked') {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.blockedWrap}>
          <View style={styles.blockedIcon}>
            <AlarmIcon size={26} color={colors.orange} />
          </View>
          <Text style={styles.blockedTitle}>Tadbir ochilmadi</Text>
          <Text style={styles.blockedText}>{blockedMsg}</Text>
          <Button
            title="Ortga"
            variant="dark"
            height={48}
            radius={12}
            fontSize={14.5}
            style={styles.blockedBtn}
            onPress={() => navigation.goBack()}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'result') {
    const score = result?.score ?? 0;
    const correct = result?.correct_count ?? result?.correct ?? 0;
    const total = result?.total_questions ?? questions.length;
    const rank = result?.rank;
    const already = result?.detail;
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.resultWrap}>
          <View style={styles.resultBadge}>
            <CheckIcon size={30} color={colors.white} />
          </View>
          <Text style={styles.resultTitle}>{already || 'Tadbir yakunlandi'}</Text>
          <Text style={styles.resultScore}>{score}</Text>
          <Text style={styles.resultScoreLabel}>ball</Text>
          <View style={styles.resultStats}>
            <View style={styles.resultStat}>
              <Text style={styles.resultStatValue}>{correct}/{total}</Text>
              <Text style={styles.resultStatLabel}>To'g'ri javob</Text>
            </View>
            {rank ? (
              <View style={styles.resultStat}>
                <Text style={styles.resultStatValue}>#{rank}</Text>
                <Text style={styles.resultStatLabel}>Reyting o'rni</Text>
              </View>
            ) : null}
          </View>
          <Button
            title="Yakunlash"
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
  const progress = questions.length ? ((index + 1) / questions.length) * 100 : 0;
  const timerLow = timeLeft !== null && timeLeft <= 60;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()} style={styles.backBtn}>
          <BackIcon size={15} />
        </TouchableOpacity>
        <OlympyLogo size={22} strokeWidth={4} showHand={false} />
        <Text style={styles.title} numberOfLines={1}>{title || 'Tadbir'}</Text>
        {timeLeft !== null ? (
          <View style={[styles.timerPill, timerLow ? styles.timerPillLow : null]}>
            <AlarmIcon size={13} color={timerLow ? colors.red : colors.blue} />
            <Text style={[styles.timerText, timerLow ? { color: colors.red } : null]}>
              {fmtTime(timeLeft)}
            </Text>
          </View>
        ) : null}
      </View>

      <ProgressBar progress={progress} height={5} style={styles.progress} />

      {escapeCount >= 1 && escapeCount < MAX_TAB_ESCAPES ? (
        <View style={styles.escapeBanner}>
          <WarningIcon size={16} color={colors.orange} />
          <Text style={styles.escapeText}>
            Ekrandan chiqdingiz! Yana {MAX_TAB_ESCAPES - escapeCount} marta chiqsangiz diskvalifikatsiya bo'lasiz.
          </Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.qLabel}>{index + 1}-SAVOL / {questions.length}</Text>
        <Text style={styles.qText}>{q.text}</Text>

        {isTextType(qType) ? (
          <TextInput
            style={styles.textAnswer}
            placeholder="Javobingizni yozing…"
            placeholderTextColor={colors.textMuted}
            value={answers[q.id] != null ? String(answers[q.id]) : ''}
            onChangeText={(t) => setAnswer(q.id, t)}
            multiline
            textAlignVertical="top"
          />
        ) : qType === 'code' ? (
          <CodeQuestion
            key={q.id}
            question={q}
            code={answers[q.id] != null ? String(answers[q.id]) : ''}
            onChangeCode={(t) => setAnswer(q.id, t)}
            language={codeLangs[q.id] || q.programming_language || 'python'}
            onChangeLanguage={(lng) => setCodeLangs((prev) => ({ ...prev, [q.id]: lng }))}
          />
        ) : (
          <View style={styles.options}>
            {options.map((opt, oi) => {
              const active =
                qType === 'multiple_select'
                  ? Array.isArray(answers[q.id]) && answers[q.id].includes(oi)
                  : answers[q.id] === oi;
              return (
                <TouchableOpacity
                  key={oi}
                  activeOpacity={0.8}
                  onPress={() =>
                    qType === 'multiple_select' ? toggleMulti(q.id, oi) : setAnswer(q.id, oi)
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

        <View style={styles.navigator}>
          {questions.map((qq, i) => {
            const answered = answers[qq.id] !== undefined && answers[qq.id] !== '';
            const current = i === index;
            return (
              <TouchableOpacity
                key={qq.id}
                activeOpacity={0.8}
                onPress={() => setIndex(i)}
                style={[
                  styles.navCell,
                  answered && !current ? styles.navDone : null,
                  !answered && !current ? styles.navIdle : null,
                  current ? styles.navCurrent : null,
                ]}
              >
                <Text
                  style={[
                    styles.navCellText,
                    answered && !current ? { color: colors.white } : null,
                    current ? { color: colors.gold } : null,
                  ]}
                >
                  {i + 1}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
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
        {index < questions.length - 1 ? (
          <Button
            title="Keyingi"
            variant="dark"
            height={48}
            radius={13}
            fontSize={14}
            style={styles.footerBtn}
            onPress={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
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
  escapeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 12,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderRadius: 12,
    backgroundColor: tints.orange10,
    borderWidth: 1,
    borderColor: tints.orangeBorder40,
  },
  escapeText: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONTS.extrabold,
    color: colors.orangeSoftText,
    lineHeight: 17,
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
  codeAnswer: {
    marginTop: 18,
    minHeight: 160,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 14,
    backgroundColor: colors.surfaceDeep,
    padding: 14,
    fontSize: 13,
    fontFamily: FONTS.semibold,
    color: colors.text,
    lineHeight: 20,
  },
  navigator: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 24,
  },
  navCell: {
    flexBasis: '8.5%',
    flexGrow: 1,
    aspectRatio: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navDone: {
    backgroundColor: colors.blue,
  },
  navIdle: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  navCurrent: {
    backgroundColor: colors.surfaceDeep,
    borderWidth: 1.5,
    borderColor: colors.gold,
  },
  navCellText: {
    fontSize: 11,
    fontFamily: FONTS.extrabold,
    color: colors.textSecondary,
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
  blockedWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  blockedIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: tints.orange10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  blockedTitle: {
    fontSize: 18,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  blockedText: {
    fontSize: 13.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  blockedBtn: {
    alignSelf: 'stretch',
    marginTop: 14,
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
  resultBtn: {
    alignSelf: 'stretch',
    marginTop: 30,
  },
});
