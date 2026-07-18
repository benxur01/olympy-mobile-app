import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Card from '../components/Card';
import Badge from '../components/Badge';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useFetch from '../services/useFetch';
import { studentApi } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { BackIcon, CheckIcon, CloseIcon, SparkleIcon, LockIcon, RepeatIcon } from '../components/icons/Icons';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const asArray = (data) => (Array.isArray(data) ? data : data?.results || []);

// correct_answer / chosen_answer mcq'da indeks (int) bo'ladi. Boshqa turlarda
// (essay/fill) matn/list bo'lishi mumkin — o'shanda matn ko'rinishida beramiz.
const asIndex = (v) => (typeof v === 'number' ? v : null);
const answerText = (v, options) => {
  const idx = asIndex(v);
  if (idx !== null && Array.isArray(options) && options[idx] !== undefined) {
    return `${LETTERS[idx] || idx + 1}) ${options[idx]}`;
  }
  if (Array.isArray(v)) return v.join(', ');
  if (v && typeof v === 'object') return v.text || JSON.stringify(v);
  return v === undefined || v === null || v === '' ? "Bo'sh qoldirilgan" : String(v);
};

export default function MistakesScreen({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const { user } = useAuth();
  const isPremium = user?.is_premium || user?.is_premium_active;
  const [explaining, setExplaining] = useState(false);
  const { data, loading, refreshing, error, reload, refresh } = useFetch(
    () => studentApi.mistakes().then((r) => asArray(r.data)),
    []
  );

  if (loading && !data) return <LoadingState message="Xatolar yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  const mistakes = data || [];

  const explainAll = async () => {
    if (!isPremium) {
      navigation.navigate('Premium');
      return;
    }
    if (explaining) return;
    setExplaining(true);
    try {
      const { data: res } = await studentApi.explainAllMistakes();
      const advice = res?.advice || res?.explanation || res?.detail;
      Alert.alert(
        'AI tahlili tayyor',
        advice || 'Barcha xatolaringiz tahlil qilindi. Izohlar quyida yangilandi.',
        [{ text: 'Yaxshi', onPress: () => refresh() }]
      );
    } catch (e) {
      const detail = e?.response?.data?.detail;
      Alert.alert('Xatolik', detail || "Hozircha bajarib bo'lmadi. Keyinroq urinib ko'ring.");
    } finally {
      setExplaining(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()} style={styles.backBtn}>
          <BackIcon size={16} />
        </TouchableOpacity>
        <Text style={styles.title}>Xatolar sandig'i</Text>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{mistakes.length}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.blue} />}
      >
        {mistakes.length === 0 ? (
          <EmptyState
            icon={<RepeatIcon size={24} color={colors.blueLight} />}
            title="Xatolar yo'q"
            message="Ajoyib! Hali noto'g'ri javob bermagansiz. Musobaqalarda qatnashishda davom eting."
          />
        ) : (
          <>
            <TouchableOpacity activeOpacity={0.8} style={styles.aiButton} onPress={explainAll} disabled={explaining}>
              {isPremium ? <SparkleIcon size={14} color={colors.gold} /> : <LockIcon size={14} />}
              <Text style={styles.aiButtonText}>
                {explaining ? 'Tahlil qilinmoqda…' : 'AI bilan barchasini tushuntirish'}
              </Text>
            </TouchableOpacity>

            <View style={styles.list}>
              {mistakes.map((m, i) => {
                const correctIdx = asIndex(m.correct_answer);
                const chosenIdx = asIndex(m.chosen_answer);
                const options = Array.isArray(m.options) ? m.options : [];
                return (
                  <Card key={m.question_id || i} style={styles.card}>
                    {m.subject ? (
                      <Badge label={m.subject} color={colors.blueLight} background={tints.blue14} size={10.5} style={styles.subjBadge} />
                    ) : null}
                    <Text style={styles.qText}>{m.text}</Text>

                    {options.length ? (
                      <View style={styles.options}>
                        {options.map((opt, oi) => {
                          const isCorrect = correctIdx === oi;
                          const isChosen = chosenIdx === oi;
                          return (
                            <View
                              key={oi}
                              style={[
                                styles.optionRow,
                                isCorrect ? styles.optionCorrect : null,
                                isChosen && !isCorrect ? styles.optionWrong : null,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.optionText,
                                  isCorrect ? { color: colors.greenLight, fontFamily: FONTS.extrabold } : null,
                                  isChosen && !isCorrect ? { color: colors.redSoftText, fontFamily: FONTS.extrabold } : null,
                                ]}
                              >
                                {LETTERS[oi] || oi + 1}) {String(opt)}
                              </Text>
                              {isCorrect ? <CheckIcon size={13} color={colors.greenLight} /> : null}
                              {isChosen && !isCorrect ? <CloseIcon size={11} color={colors.red} /> : null}
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      <View style={styles.textAnswers}>
                        <Text style={styles.answerLine}>
                          <Text style={styles.answerLabel}>Sizning javobingiz: </Text>
                          <Text style={{ color: colors.redSoftText }}>{answerText(m.chosen_answer, options)}</Text>
                        </Text>
                        <Text style={styles.answerLine}>
                          <Text style={styles.answerLabel}>To'g'ri javob: </Text>
                          <Text style={{ color: colors.greenLight }}>{answerText(m.correct_answer, options)}</Text>
                        </Text>
                      </View>
                    )}

                    {m.explanation ? (
                      <View style={styles.explainBox}>
                        <SparkleIcon size={12} color={colors.blue} />
                        <Text style={styles.explainText}>{m.explanation}</Text>
                      </View>
                    ) : null}
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
  countPill: {
    minWidth: 30,
    height: 26,
    paddingHorizontal: 9,
    borderRadius: 13,
    backgroundColor: tints.red12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 12.5,
    fontFamily: FONTS.extrabold,
    color: colors.red,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 30,
    flexGrow: 1,
  },
  aiButton: {
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
    marginBottom: 12,
  },
  aiButtonText: {
    fontSize: 13,
    fontFamily: FONTS.extrabold,
    color: colors.gold,
  },
  list: {
    gap: 10,
  },
  card: {
    padding: 16,
  },
  subjBadge: {
    marginBottom: 8,
  },
  qText: {
    fontSize: 14.5,
    fontFamily: FONTS.bold,
    color: colors.text,
    lineHeight: 21,
  },
  options: {
    gap: 7,
    marginTop: 12,
  },
  optionRow: {
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
  optionText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: colors.textBody,
  },
  textAnswers: {
    marginTop: 12,
    gap: 6,
  },
  answerLine: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    lineHeight: 19,
  },
  answerLabel: {
    color: colors.textSecondary,
    fontFamily: FONTS.semibold,
  },
  explainBox: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: tints.blue06,
    borderWidth: 1,
    borderColor: tints.blueBorder30,
    padding: 12,
    flexDirection: 'row',
    gap: 8,
  },
  explainText: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: FONTS.semibold,
    color: colors.blueSoftText,
    lineHeight: 18,
  },
});
