import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Card from '../components/Card';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useFetch from '../services/useFetch';
import { studentApi } from '../services/api';
import { BackIcon, CheckIcon, CloseIcon, ClockIcon, CalendarIcon } from '../components/icons/Icons';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

// ends_at (bugun yarim tunga) gacha qolgan vaqtni HH:MM:SS ko'rinishida qaytaradi.
const fmtLeft = (endsAt) => {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (!endsAt || Number.isNaN(diff) || diff <= 0) return '00:00:00';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export default function DailyQuestionsScreen({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const { data, loading, refreshing, error, reload, refresh } = useFetch(
    () => studentApi.dailyQuestions().then((r) => r.data),
    []
  );
  const [answering, setAnswering] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');

  const endsAt = data?.ends_at;
  useEffect(() => {
    if (!endsAt) return undefined;
    setTimeLeft(fmtLeft(endsAt));
    const id = setInterval(() => setTimeLeft(fmtLeft(endsAt)), 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  const handleAnswer = async (dq, idx) => {
    if (dq.answered || answering != null) return;
    setAnswering(dq.id);
    try {
      await studentApi.answerDailyQuestion(dq.id, { selected_option: idx });
      await reload();
    } catch (e) {
      // jim — keyingi urinishda yoki refresh'da qayta yuklanadi
    } finally {
      setAnswering(null);
    }
  };

  if (loading && !data) return <LoadingState message="Bugungi savollar yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  const questions = Array.isArray(data?.questions) ? data.questions : [];
  const answeredCount = questions.filter((q) => q.answered).length;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()} style={styles.backBtn}>
          <BackIcon size={16} />
        </TouchableOpacity>
        <Text style={styles.title}>Bugungi savollar</Text>
        {questions.length ? (
          <View style={styles.timerPill}>
            <ClockIcon size={12} color={colors.blue} />
            <Text style={styles.timerText}>{timeLeft}</Text>
          </View>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.blue} />}
      >
        {questions.length === 0 ? (
          <EmptyState
            icon={<CalendarIcon size={24} color={colors.blueLight} />}
            title="Bugun savol yo'q"
            message="Bugungi savollar hali tayyor emas. Ertaga yangi savollar bilan qaytib keling."
          />
        ) : (
          <>
            <Text style={styles.progressLine}>{answeredCount}/{questions.length} javob berildi</Text>
            <View style={styles.list}>
              {questions.map((dq, qi) => {
                const options = Array.isArray(dq.options) ? dq.options : [];
                return (
                  <Card key={dq.id} style={styles.card}>
                    <View style={styles.qHead}>
                      <Text style={styles.qIndex}>{qi + 1}.</Text>
                      <Text style={styles.qText}>{dq.text}</Text>
                      {dq.answered ? (
                        dq.is_correct ? (
                          <CheckIcon size={16} color={colors.greenLight} />
                        ) : (
                          <CloseIcon size={14} color={colors.red} />
                        )
                      ) : null}
                    </View>
                    <View style={styles.options}>
                      {options.map((opt, idx) => {
                        const isCorrect = dq.answered && idx === dq.correct_answer;
                        const isWrongPick =
                          dq.answered && idx === dq.selected_option && idx !== dq.correct_answer;
                        const isDimmed = dq.answered && !isCorrect && !isWrongPick;
                        return (
                          <TouchableOpacity
                            key={idx}
                            activeOpacity={0.8}
                            disabled={dq.answered || answering != null}
                            onPress={() => handleAnswer(dq, idx)}
                            style={[
                              styles.option,
                              isCorrect ? styles.optionCorrect : null,
                              isWrongPick ? styles.optionWrong : null,
                              isDimmed ? styles.optionDimmed : null,
                            ]}
                          >
                            <Text
                              style={[
                                styles.optionText,
                                isCorrect ? { color: colors.greenLight, fontFamily: FONTS.extrabold } : null,
                                isWrongPick ? { color: colors.redSoftText, fontFamily: FONTS.extrabold } : null,
                                isDimmed ? { color: colors.textMuted } : null,
                              ]}
                            >
                              {LETTERS[idx] || idx + 1}) {String(opt)}
                            </Text>
                            {isCorrect ? <CheckIcon size={13} color={colors.greenLight} /> : null}
                            {isWrongPick ? <CloseIcon size={11} color={colors.red} /> : null}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </Card>
                );
              })}
            </View>
          </>
        )}
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
  title: {
    flex: 1,
    fontSize: 18,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 28,
    paddingHorizontal: 11,
    borderRadius: 13,
    backgroundColor: tints.blue14,
  },
  timerText: {
    fontSize: 12.5,
    fontFamily: FONTS.extrabold,
    color: colors.blue,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 30,
    flexGrow: 1,
  },
  progressLine: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  list: {
    gap: 10,
  },
  card: {
    padding: 16,
  },
  qHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  qIndex: {
    fontSize: 14.5,
    fontFamily: FONTS.bold,
    color: colors.textMuted,
    lineHeight: 21,
  },
  qText: {
    flex: 1,
    fontSize: 14.5,
    fontFamily: FONTS.bold,
    color: colors.text,
    lineHeight: 21,
  },
  options: {
    gap: 7,
    marginTop: 12,
  },
  option: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 11,
    backgroundColor: colors.surfaceDeep,
    paddingVertical: 11,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  optionCorrect: {
    borderColor: tints.greenBorder40,
    backgroundColor: tints.green14,
  },
  optionWrong: {
    borderColor: tints.redBorder35,
    backgroundColor: tints.red07,
  },
  optionDimmed: {
    opacity: 0.5,
  },
  optionText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: colors.textBody,
  },
});
