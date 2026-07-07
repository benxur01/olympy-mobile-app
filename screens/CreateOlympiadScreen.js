import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useFetch from '../services/useFetch';
import { teacherApi } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { centerIdForUser } from '../services/roles';
import { BackIcon, CheckIcon } from '../components/icons/Icons';

const SUBJECTS = ['Matematika', 'Fizika', 'Kimyo', 'Biologiya', 'Ingliz tili', 'Tarix', 'Informatika', 'IT'];
const asArray = (data) => (Array.isArray(data) ? data : data?.results || []);

export default function CreateOlympiadScreen({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const { user } = useAuth();
  const centerId = centerIdForUser(user);

  const [title, setTitle] = useState('');
  const [subjectIdx, setSubjectIdx] = useState(0);
  const [duration, setDuration] = useState(30);
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);

  const subject = SUBJECTS[subjectIdx];

  const { data, loading, error, reload } = useFetch(async () => {
    if (!centerId) return [];
    return teacherApi.questions({ center: centerId, page_size: 100 }).then((r) => asArray(r.data));
  }, [centerId]);

  const questions = data || [];
  // Tanlangan fanga mos savollar tepada; qolganlari ham ko'rinadi (aralash
  // tadbir), lekin fan bo'yicha ajratib ko'rsatamiz.
  const sortedQuestions = useMemo(() => {
    return [...questions].sort((a, b) => {
      const am = a.subject === subject ? 0 : 1;
      const bm = b.subject === subject ? 0 : 1;
      return am - bm;
    });
  }, [questions, subject]);

  if (!centerId) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.topBar}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()} style={styles.backBtn}>
            <BackIcon size={16} />
          </TouchableOpacity>
        </View>
        <EmptyState
          title="Markaz topilmadi"
          message="Tadbir yaratish uchun sizga biriktirilgan o'quv markazi kerak."
        />
      </SafeAreaView>
    );
  }

  if (loading && !data) return <LoadingState message="Savol banki yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  const toggle = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const create = async () => {
    if (saving) return;
    if (!title.trim()) {
      Alert.alert('Nom kerak', 'Tadbir nomini kiriting.');
      return;
    }
    if (selected.length === 0) {
      Alert.alert('Savol tanlang', "Kamida bitta savol tanlang. Nashr qilish uchun savollar shart.");
      return;
    }
    setSaving(true);
    try {
      await teacherApi.createOlympiad({
        center: centerId,
        title: title.trim(),
        subject,
        duration_minutes: duration,
        test_type: 'mixed',
        question_ids: selected,
      });
      Alert.alert('Yaratildi', "Tadbir qoralama sifatida saqlandi. Uni nashr qilish uchun tadbirlar ro'yxatidan ochib 'Nashr qilish'ni bosing.", [
        { text: 'Yaxshi', onPress: () => navigation.navigate('TeacherOlympiads') },
      ]);
    } catch (e) {
      if (e?.response?.data?.upgrade_required) {
        Alert.alert('Limit', e.response.data.detail || 'Bepul limit tugadi.', [
          { text: 'Bekor' },
          { text: 'Premium', onPress: () => navigation.navigate('Premium') },
        ]);
      } else {
        const detail =
          e?.response?.data?.detail ||
          e?.response?.data?.title?.[0] ||
          e?.response?.data?.question_ids?.[0];
        Alert.alert('Xatolik', detail || "Tadbir yaratib bo'lmadi. Qayta urinib ko'ring.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()} style={styles.backBtn}>
          <BackIcon size={16} />
        </TouchableOpacity>
        <Text style={styles.title}>Tadbir yaratish</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Card radius={18} style={styles.formCard}>
          <Text style={styles.fieldLabel}>TADBIR NOMI</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Masalan: Matematika kuzgi olimpiadasi"
            placeholderTextColor={colors.textMuted}
          />

          <View style={styles.row}>
            <View style={styles.rowCol}>
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>FAN</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.select}
                onPress={() => setSubjectIdx((i) => (i + 1) % SUBJECTS.length)}
              >
                <Text style={styles.selectText}>{subject}</Text>
                <Text style={styles.selectHint}>o'zgartirish ›</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.durationCol}>
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>DAVOMIYLIK (DAQ)</Text>
              <View style={styles.stepper}>
                <TouchableOpacity onPress={() => setDuration((d) => Math.max(5, d - 5))} style={styles.stepBtn}>
                  <Text style={styles.stepText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.countText}>{duration}</Text>
                <TouchableOpacity onPress={() => setDuration((d) => Math.min(1440, d + 5))} style={styles.stepBtn}>
                  <Text style={styles.stepText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Card>

        <View style={styles.selectHeader}>
          <Text style={styles.sectionTitle}>Savollarni tanlang</Text>
          <Text style={styles.selectedCount}>{selected.length} ta tanlandi</Text>
        </View>

        {questions.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Savol bankida savol yo'q</Text>
            <Button
              title="Savol yaratishga o'tish"
              variant="dark"
              height={44}
              radius={12}
              fontSize={13.5}
              style={{ marginTop: 12 }}
              onPress={() => navigation.navigate('TeacherTabs', { screen: 'Savollar' })}
            />
          </Card>
        ) : (
          <View style={styles.qList}>
            {sortedQuestions.map((q) => {
              const active = selected.includes(q.id);
              return (
                <TouchableOpacity key={q.id} activeOpacity={0.85} onPress={() => toggle(q.id)}>
                  <Card style={[styles.qCard, active ? styles.qCardActive : null]}>
                    <View style={[styles.checkBox, active ? styles.checkBoxOn : null]}>
                      {active ? <CheckIcon size={13} color={colors.white} /> : null}
                    </View>
                    <View style={styles.qText}>
                      <Text style={styles.qTitle} numberOfLines={2}>{q.text}</Text>
                      <View style={styles.qMeta}>
                        {q.subject ? (
                          <Badge label={q.subject} color={colors.blueLight} background={tints.blue14} size={10} />
                        ) : null}
                        {q.difficulty ? (
                          <Text style={styles.qDifficulty}>{q.difficulty}</Text>
                        ) : null}
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={saving ? 'Saqlanmoqda…' : `Qoralama saqlash (${selected.length})`}
          variant="success"
          height={52}
          radius={14}
          fontSize={15}
          shadow
          disabled={saving}
          onPress={create}
        />
      </View>
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  formCard: {
    padding: 16,
  },
  fieldLabel: {
    fontSize: 10.5,
    fontFamily: FONTS.extrabold,
    color: colors.textSecondary,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 11,
    backgroundColor: colors.surface,
    paddingHorizontal: 13,
    height: 46,
    fontSize: 14,
    fontFamily: FONTS.semibold,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    gap: 9,
  },
  rowCol: {
    flex: 1,
  },
  durationCol: {
    width: 150,
  },
  select: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 11,
    backgroundColor: colors.surfaceDeep,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  selectText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: colors.text,
  },
  selectHint: {
    fontSize: 10.5,
    fontFamily: FONTS.bold,
    color: colors.blueLight,
  },
  stepper: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 11,
    backgroundColor: colors.surfaceDeep,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontSize: 17,
    fontFamily: FONTS.extrabold,
    color: colors.blue,
  },
  countText: {
    fontSize: 15,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  selectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  selectedCount: {
    fontSize: 12,
    fontFamily: FONTS.extrabold,
    color: colors.blue,
  },
  emptyCard: {
    padding: 22,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
  },
  qList: {
    gap: 8,
  },
  qCard: {
    paddingVertical: 13,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qCardActive: {
    borderColor: colors.blue,
    backgroundColor: tints.blue06,
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxOn: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  qText: {
    flex: 1,
  },
  qTitle: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: colors.text,
    lineHeight: 18,
  },
  qMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  qDifficulty: {
    fontSize: 10.5,
    fontFamily: FONTS.bold,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.bg,
  },
});
