import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Button from '../components/Button';
import ProgressBar from '../components/ProgressBar';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { studentApi } from '../services/api';
import { BackIcon, CheckIcon, RepeatIcon } from '../components/icons/Icons';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export default function PracticeRunnerScreen({ route, navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  // mode: 'wrong' → xato javoblarni takrorlash; 'topic' → mavzu/fan bo'yicha yangi mashq.
  const { subject, mode = 'wrong', topic, sessionTitle } = route?.params || {};
  const isTopic = mode === 'topic';
  const [phase, setPhase] = useState('loading'); // loading | error | empty | practice | result
  const [practiceId, setPracticeId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const submittedRef = useRef(false);

  const load = useCallback(async () => {
    setPhase('loading');
    try {
      const req = isTopic
        ? studentApi.practiceStart({ subject, ...(topic ? { topic } : {}), question_count: 10 })
        : studentApi.wrongAnswerStart({ subject, question_count: 10 });
      const { data } = await req;
      const list = Array.isArray(data?.questions) ? data.questions : [];
      if (!list.length) {
        setPhase('empty');
        return;
      }
      setPracticeId(data.practice_id ?? data.id ?? data.session_id);
      setQuestions(list);
      setPhase('practice');
    } catch (e) {
      if (e?.response?.status === 404) setPhase('empty');
      else setPhase('error');
    }
  }, [subject, isTopic, topic]);

  useEffect(() => {
    load();
  }, [load]);

  const answeredCount = useMemo(
    () => questions.filter((q) => answers[q.id] !== undefined).length,
    [questions, answers]
  );

  const submit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const payload = { practice_id: practiceId, answers };
      const { data } = await studentApi.practiceSubmit(payload);
      setResult(data || {});
      setPhase('result');
    } catch (e) {
      submittedRef.current = false;
      setPhase('error');
    } finally {
      setSubmitting(false);
    }
  }, [practiceId, answers]);

  if (phase === 'loading') return <LoadingState message="Mashq tayyorlanmoqda…" />;
  if (phase === 'error') return <ErrorState onRetry={load} />;

  if (phase === 'empty') {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <EmptyState
          icon={<RepeatIcon size={24} color={colors.blueLight} />}
          title={isTopic ? 'Savol topilmadi' : "Xato savollar yo'q"}
          message={
            isTopic
              ? `${subject || 'Bu mavzu'} bo'yicha hozircha mashq savoli topilmadi. Boshqa fan/mavzu tanlab ko'ring.`
              : `${subject || 'Bu fan'} bo'yicha takrorlash uchun xato javob topilmadi. Ajoyib!`
          }
          actionLabel="Ortga"
          onAction={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  if (phase === 'result') {
    const score = result?.score ?? 0;
    const correct = result?.correct_count ?? 0;
    const total = result?.total ?? questions.length;
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.resultWrap}>
          <View style={styles.resultBadge}>
            <CheckIcon size={30} color={colors.white} />
          </View>
          <Text style={styles.resultTitle}>Mashq yakunlandi</Text>
          <Text style={styles.resultScore}>{score}%</Text>
          <Text style={styles.resultStatLabel}>{correct}/{total} to'g'ri javob</Text>
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
  const options = Array.isArray(q.options) ? q.options : [];
  const progress = questions.length ? ((index + 1) / questions.length) * 100 : 0;
  const isLast = index === questions.length - 1;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()} style={styles.backBtn}>
          <BackIcon size={15} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {sessionTitle || `${subject || 'Mashq'} · ${isTopic ? 'mashq' : 'takrorlash'}`}
        </Text>
        <Text style={styles.counter}>{index + 1}/{questions.length}</Text>
      </View>
      <ProgressBar progress={progress} height={5} style={styles.progress} />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.qText}>{q.text}</Text>
        <View style={styles.options}>
          {options.map((opt, oi) => {
            const active = answers[q.id] === oi;
            return (
              <TouchableOpacity
                key={oi}
                activeOpacity={0.8}
                onPress={() => setAnswers((prev) => ({ ...prev, [q.id]: oi }))}
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
        {isLast ? (
          <Button
            title={submitting ? 'Yuborilmoqda…' : `Yakunlash (${answeredCount}/${questions.length})`}
            variant="success"
            height={48}
            radius={13}
            fontSize={14}
            style={styles.footerBtn}
            disabled={submitting}
            onPress={submit}
          />
        ) : (
          <Button
            title="Keyingi"
            variant="dark"
            height={48}
            radius={13}
            fontSize={14}
            style={styles.footerBtn}
            onPress={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
          />
        )}
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
    gap: 10,
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
    fontSize: 14,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  counter: {
    fontSize: 13,
    fontFamily: FONTS.extrabold,
    color: colors.textSecondary,
  },
  progress: {
    marginTop: 12,
  },
  body: {
    paddingBottom: 16,
  },
  qText: {
    fontSize: 17,
    fontFamily: FONTS.bold,
    color: colors.text,
    lineHeight: 25.5,
    marginTop: 18,
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
  footer: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 10,
  },
  footerBtn: {
    flex: 1,
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
  },
  resultScore: {
    fontSize: 52,
    fontFamily: FONTS.extrabold,
    color: colors.blue,
    marginTop: 12,
  },
  resultStatLabel: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
    marginTop: 2,
  },
  resultBtn: {
    alignSelf: 'stretch',
    marginTop: 30,
  },
});
