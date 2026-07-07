import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Badge from '../components/Badge';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useFetch from '../services/useFetch';
import { teacherApi, managerApi } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { EditIcon } from '../components/icons/Icons';

const asResults = (data) => (Array.isArray(data) ? data : data?.results || []);
const firstLetter = (name) => ((name || '?')[0] || '?').toUpperCase();

export default function EssayGradingScreen() {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const { user } = useAuth();
  // Sof menejerda teacher olimpiadalari bo'sh — bunday holda markaz
  // statistikasidagi natijasi bor tadbirlarni ishlatamiz (so'rovlar sonini
  // cheklab). Teacher oqimiga ta'sir qilmaydi.
  const isManager = (user?.roles || []).includes('manager');
  const { data, loading, error, reload } = useFetch(async () => {
    const olyData = await teacherApi.myOlympiads().then((r) => r.data).catch(() => null);
    let olympiads = asResults(olyData);
    if (!olympiads.length && isManager) {
      const events = await managerApi
        .stats(undefined, { page_size: 200 })
        .then((r) => (Array.isArray(r.data?.events) ? r.data.events : []))
        .catch(() => []);
      olympiads = events
        .filter((e) => (e.participants || 0) > 0)
        .slice(0, 20)
        .map((e) => ({ id: e.olympiad_id, title: e.title }));
    }
    if (!olympiads.length) return [];
    const lists = await Promise.all(
      olympiads.map((o) =>
        managerApi
          .olympiadEssayAnswers(o.id, { only_ungraded: 1 })
          .then((r) => (Array.isArray(r.data) ? r.data.map((e) => ({ ...e, olympiad_title: o.title })) : []))
          .catch(() => [])
      )
    );
    return lists.flat();
  }, [isManager]);

  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setQueue(data);
      setIndex(0);
    }
  }, [data]);

  const current = queue[index] || null;

  useEffect(() => {
    setScore(current?.score != null ? String(current.score) : '');
    setFeedback(current?.feedback || '');
  }, [current]);

  if (loading) return <LoadingState message="Yozma javoblar yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  if (!current) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <EmptyState
          icon={<EditIcon size={22} color={colors.blueLight} />}
          title="Baholash tugadi"
          message="Baholanmagan yozma javoblar yo'q. Hammasi baholab bo'lindi."
          actionLabel="Yangilash"
          onAction={reload}
        />
      </SafeAreaView>
    );
  }

  const maxScore = current.max_score || 10;

  const save = async () => {
    const num = Number(score);
    if (score === '' || Number.isNaN(num) || num < 0 || num > maxScore) {
      Alert.alert('Ball xato', `Ball 0 dan ${maxScore} gacha bo'lishi kerak.`);
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      await managerApi.gradeEssayAnswer(current.attempt_id, current.question_id, {
        score: num,
        feedback: feedback.trim(),
      });
      // Baholangan javobni navbatdan olib tashlaymiz.
      const next = queue.filter((_, i) => i !== index);
      setQueue(next);
      setIndex((i) => Math.min(i, Math.max(0, next.length - 1)));
    } catch (e) {
      const detail = e?.response?.data?.detail;
      Alert.alert('Xatolik', detail || "Baholashni saqlab bo'lmadi. Qayta urinib ko'ring.");
    } finally {
      setSaving(false);
    }
  };

  const gradedCount = (data?.length || 0) - queue.length;
  const totalCount = data?.length || 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Yozma javobni baholash</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {current.olympiad_title || 'Essay'} · {gradedCount}/{totalCount} baholandi
            </Text>
          </View>
        </View>

        <View style={styles.studentCard}>
          <Avatar letter={firstLetter(current.student_name)} size={36} fontSize={14} background={colors.green} />
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{current.student_name}</Text>
            <Text style={styles.studentSub}>Maksimal ball: {maxScore}</Text>
          </View>
          <Badge label="Kutilmoqda" color={colors.orange} background={tints.orange14} />
        </View>

        <Text style={styles.sectionLabel}>SAVOL</Text>
        <View style={styles.questionBox}>
          <Text style={styles.questionText}>{current.question_text}</Text>
        </View>

        <Text style={styles.sectionLabel}>O'QUVCHI JAVOBI</Text>
        <ScrollView style={styles.answerBox} contentContainerStyle={styles.answerContent}>
          <Text style={[styles.answerText, !current.answer_text ? styles.answerEmpty : null]}>
            {current.answer_text || 'Javob berilmagan'}
          </Text>
        </ScrollView>

        <View style={styles.gradeRow}>
          <View style={styles.scoreCol}>
            <Text style={styles.fieldLabel}>BALL (0–{maxScore})</Text>
            <TextInput
              style={styles.scoreBox}
              value={score}
              onChangeText={setScore}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              maxLength={4}
            />
          </View>
          <View style={styles.commentCol}>
            <Text style={styles.fieldLabel}>IZOH</Text>
            <TextInput
              style={styles.commentBox}
              value={feedback}
              onChangeText={setFeedback}
              placeholder="Izoh (ixtiyoriy)…"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        <Button
          title={saving ? 'Saqlanmoqda…' : 'Baholashni saqlash'}
          variant="success"
          height={50}
          radius={13}
          fontSize={15}
          style={styles.saveBtn}
          disabled={saving}
          onPress={save}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors, tints) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  subtitle: {
    fontSize: 11.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
  },
  studentCard: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 13.5,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  studentSub: {
    fontSize: 11,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: FONTS.extrabold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 7,
  },
  questionBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
    paddingVertical: 13,
    paddingHorizontal: 15,
  },
  questionText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: colors.textBody,
    lineHeight: 19.5,
  },
  answerBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surfaceDeep,
  },
  answerContent: {
    paddingVertical: 14,
    paddingHorizontal: 15,
  },
  answerText: {
    fontSize: 13,
    fontFamily: FONTS.semibold,
    color: colors.textBody,
    lineHeight: 22.1,
  },
  answerEmpty: {
    fontStyle: 'italic',
    color: colors.textMuted,
  },
  gradeRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  scoreCol: {
    width: 110,
  },
  commentCol: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 10.5,
    fontFamily: FONTS.extrabold,
    color: colors.textSecondary,
    marginBottom: 5,
  },
  scoreBox: {
    height: 46,
    borderWidth: 1,
    borderColor: colors.blue,
    borderRadius: 12,
    backgroundColor: colors.surface,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  commentBox: {
    height: 46,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 13,
    fontSize: 12.5,
    fontFamily: FONTS.semibold,
    color: colors.text,
  },
  saveBtn: {
    marginTop: 14,
  },
});
