import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Card from '../components/Card';
import Chip from '../components/Chip';
import Button from '../components/Button';
import IconBox from '../components/IconBox';
import EmptyState from '../components/EmptyState';
import { teacherApi } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { centerIdForUser } from '../services/roles';
import { SparkleIcon, CheckIcon, CloseIcon, InboxIcon } from '../components/icons/Icons';

const MODES = ['AI generatsiya', "Qo'lda"];
const IMPORT_MODES = ['PDF import', 'Word', 'Excel'];
const DIFFICULTIES = [
  { label: 'Oson', value: 'easy' },
  { label: "O'rta", value: 'medium' },
  { label: 'Qiyin', value: 'hard' },
];
const SUBJECTS = ['Matematika', 'Fizika', 'Kimyo', 'Biologiya', 'Ingliz tili', 'Tarix', 'Informatika'];
const LETTERS = ['A', 'B', 'C', 'D'];

export default function QuestionCreatorScreen({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const { user } = useAuth();
  const centerId = centerIdForUser(user);

  const [mode, setMode] = useState('AI generatsiya');
  const [subjectIdx, setSubjectIdx] = useState(0);
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [count, setCount] = useState(10);

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generated, setGenerated] = useState([]);
  // Har bir generatsiya qilingan savol uchun rad etilganlar (indeks → true).
  const [rejected, setRejected] = useState({});

  // Qo'lda yaratish uchun forma holati.
  const [mText, setMText] = useState('');
  const [mOptions, setMOptions] = useState(['', '', '', '']);
  const [mCorrect, setMCorrect] = useState(0);

  const subject = SUBJECTS[subjectIdx];

  const noCenter = !centerId;

  const generate = async () => {
    if (noCenter) return;
    if (!topic.trim()) {
      Alert.alert('Mavzu kerak', 'Iltimos, mavzu kiriting (masalan: Kvadrat tenglamalar).');
      return;
    }
    if (generating) return;
    setGenerating(true);
    setGenerated([]);
    setRejected({});
    try {
      const { data } = await teacherApi.generateAiQuestions({
        center: centerId,
        subject,
        topic: topic.trim(),
        difficulty,
        count,
        question_type: 'mcq',
      });
      const list = Array.isArray(data?.questions) ? data.questions : [];
      setGenerated(list);
      if (!list.length) Alert.alert('Natija yo\'q', 'AI savol yarata olmadi. Boshqa mavzu bilan urinib ko\'ring.');
    } catch (e) {
      if (e?.response?.data?.upgrade_required) {
        Alert.alert(
          'Premium kerak',
          "AI savol generatsiyasi markaz premium obunasini talab qiladi.",
          [
            { text: 'Bekor' },
            { text: 'Premium', onPress: () => navigation.navigate('Premium') },
          ]
        );
      } else {
        const detail = e?.response?.data?.detail;
        Alert.alert('Xatolik', detail || "Generatsiya qilib bo'lmadi. Qayta urinib ko'ring.");
      }
    } finally {
      setGenerating(false);
    }
  };

  const approvedCount = generated.filter((_, i) => !rejected[i]).length;
  const toggleReject = (i, value) => setRejected((prev) => ({ ...prev, [i]: value }));

  const saveGenerated = async () => {
    if (saving) return;
    if (!approvedCount) {
      Alert.alert('Savol tanlanmagan', "Saqlash uchun kamida bitta savolni tasdiqlang (✓).");
      return;
    }
    setSaving(true);
    let ok = 0;
    for (let i = 0; i < generated.length; i += 1) {
      if (rejected[i]) continue; // faqat tasdiqlangan savollar saqlanadi
      const q = generated[i];
      try {
        await teacherApi.createQuestion({
          center: centerId,
          subject: q.subject || subject,
          text: q.text,
          options: q.options || [],
          correct_answer: q.correct_answer ?? 0,
          difficulty: q.difficulty || difficulty,
          question_type: 'mcq',
        });
        ok += 1;
      } catch (e) {
        // Bitta savol saqlanmasa qolganini davom ettiramiz.
      }
    }
    setSaving(false);
    setGenerated([]);
    setRejected({});
    Alert.alert('Saqlandi', `${ok} ta savol savollar bankiga qo'shildi.`);
  };

  const saveManual = async () => {
    if (noCenter || saving) return;
    if (!mText.trim()) {
      Alert.alert('Savol matni kerak', 'Iltimos, savol matnini kiriting.');
      return;
    }
    const opts = mOptions.map((o) => o.trim());
    if (opts.filter(Boolean).length < 2) {
      Alert.alert('Variantlar kerak', "Kamida 2 ta variant kiriting.");
      return;
    }
    setSaving(true);
    try {
      await teacherApi.createQuestion({
        center: centerId,
        subject,
        text: mText.trim(),
        options: opts,
        correct_answer: mCorrect,
        difficulty,
        question_type: 'mcq',
      });
      setMText('');
      setMOptions(['', '', '', '']);
      setMCorrect(0);
      Alert.alert('Saqlandi', "Savol savollar bankiga qo'shildi.");
    } catch (e) {
      const detail = e?.response?.data?.detail;
      Alert.alert('Xatolik', detail || "Saqlab bo'lmadi. Qayta urinib ko'ring.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Savol yaratish</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.modesScroll}
          contentContainerStyle={styles.modesRow}
        >
          {MODES.map((m) => (
            <Chip
              key={m}
              label={m}
              active={mode === m}
              radius={11}
              onPress={() => setMode(m)}
              icon={mode === m && m === 'AI generatsiya' ? <SparkleIcon size={12} /> : null}
            />
          ))}
          {IMPORT_MODES.map((m) => (
            <Chip key={m} label={m} active={mode === m} radius={11} onPress={() => setMode(m)} />
          ))}
        </ScrollView>

        {noCenter ? (
          <View style={styles.noCenter}>
            <EmptyState
              compact
              icon={<InboxIcon size={22} color={colors.blueLight} />}
              title="Markaz topilmadi"
              message="Savol yaratish uchun sizga biriktirilgan o'quv markazi kerak."
            />
          </View>
        ) : IMPORT_MODES.includes(mode) ? (
          <Card radius={18} style={styles.infoCard}>
            <Text style={styles.infoTitle}>{mode}</Text>
            <Text style={styles.infoText}>
              Fayldan ommaviy import (PDF / Word / Excel) hozircha veb-versiyada mavjud. Mobil
              ilovada AI generatsiya yoki qo'lda kiritishdan foydalaning.
            </Text>
          </Card>
        ) : mode === 'AI generatsiya' ? (
          <>
            <Card radius={18} style={styles.formCard}>
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.fieldLabel}>FAN</Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.select}
                    onPress={() => setSubjectIdx((i) => (i + 1) % SUBJECTS.length)}
                  >
                    <Text style={styles.selectText}>{subject}</Text>
                    <Text style={styles.selectHint}>o'zgartirish ›</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.countCol}>
                  <Text style={styles.fieldLabel}>SONI</Text>
                  <View style={styles.stepper}>
                    <TouchableOpacity onPress={() => setCount((c) => Math.max(1, c - 1))} style={styles.stepBtn}>
                      <Text style={styles.stepText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.countText}>{count}</Text>
                    <TouchableOpacity onPress={() => setCount((c) => Math.min(20, c + 1))} style={styles.stepBtn}>
                      <Text style={styles.stepText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>MAVZU</Text>
              <TextInput
                style={styles.input}
                value={topic}
                onChangeText={setTopic}
                placeholder="Masalan: Kvadrat tenglamalar"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>QIYINLIK</Text>
              <View style={styles.difficultyRow}>
                {DIFFICULTIES.map((d) => {
                  const active = difficulty === d.value;
                  return (
                    <TouchableOpacity
                      key={d.value}
                      activeOpacity={0.8}
                      onPress={() => setDifficulty(d.value)}
                      style={[
                        styles.difficultyOption,
                        {
                          borderColor: active ? colors.blue : colors.borderStrong,
                          backgroundColor: active ? tints.blue14 : colors.surfaceDeep,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: active ? FONTS.extrabold : FONTS.bold,
                          color: active ? colors.blueLight : colors.textSecondary,
                        }}
                      >
                        {d.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Button
                title={generating ? 'Generatsiya qilinmoqda…' : 'Generatsiya qilish'}
                height={46}
                radius={12}
                fontSize={14}
                style={styles.generateBtn}
                disabled={generating}
                onPress={generate}
              />
            </Card>

            {generated.length > 0 ? (
              <>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultTitle}>Natija: {generated.length} ta savol</Text>
                  <Text style={styles.resultSub}>{approvedCount} tasdiqlangan</Text>
                </View>
                {generated.map((q, qi) => {
                  const isRejected = !!rejected[qi];
                  return (
                    <Card key={qi} style={[styles.questionCard, isRejected ? styles.questionRejected : null]}>
                      <View style={styles.qHead}>
                        <Text style={styles.qNum}>{qi + 1}-savol{isRejected ? ' · rad etildi' : ''}</Text>
                        <View style={styles.qActions}>
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => toggleReject(qi, false)}
                            style={[styles.qActBtn, !isRejected ? styles.qApproveOn : null]}
                          >
                            <CheckIcon size={13} color={!isRejected ? colors.white : colors.textMuted} strokeWidth={3} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => toggleReject(qi, true)}
                            style={[styles.qActBtn, isRejected ? styles.qRejectOn : null]}
                          >
                            <CloseIcon size={11} color={isRejected ? colors.white : colors.textMuted} strokeWidth={3} />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <Text style={styles.questionText}>{q.text}</Text>
                      <View style={styles.optionsRow}>
                        {(q.options || []).map((opt, oi) => {
                          const correct = (q.correct_answer ?? -1) === oi;
                          return (
                            <View key={oi} style={correct ? styles.optionCorrect : styles.optionPill}>
                              <Text style={correct ? styles.optionCorrectText : styles.optionText}>
                                {LETTERS[oi] || oi + 1}) {String(opt)}{correct ? ' ✓' : ''}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </Card>
                  );
                })}
                <Button
                  title={saving ? 'Saqlanmoqda…' : `Tasdiqlanganlarni saqlash (${approvedCount} ta)`}
                  variant="success"
                  height={50}
                  radius={13}
                  fontSize={15}
                  style={styles.saveBtn}
                  disabled={saving || approvedCount === 0}
                  onPress={saveGenerated}
                />
              </>
            ) : null}
          </>
        ) : (
          // Qo'lda kiritish
          <Card radius={18} style={styles.formCard}>
            <View style={styles.formRow}>
              <View style={styles.formCol}>
                <Text style={styles.fieldLabel}>FAN</Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.select}
                  onPress={() => setSubjectIdx((i) => (i + 1) % SUBJECTS.length)}
                >
                  <Text style={styles.selectText}>{subject}</Text>
                  <Text style={styles.selectHint}>o'zgartirish ›</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>SAVOL MATNI</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={mText}
              onChangeText={setMText}
              placeholder="Savol matnini kiriting…"
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
            />

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>VARIANTLAR (to'g'risini belgilang)</Text>
            {mOptions.map((opt, oi) => (
              <View key={oi} style={styles.optionInputRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setMCorrect(oi)}
                  style={[styles.correctToggle, mCorrect === oi ? styles.correctToggleOn : null]}
                >
                  {mCorrect === oi ? <CheckIcon size={12} color={colors.white} /> : (
                    <Text style={styles.correctToggleText}>{LETTERS[oi]}</Text>
                  )}
                </TouchableOpacity>
                <TextInput
                  style={styles.optionInput}
                  value={opt}
                  onChangeText={(t) => setMOptions((prev) => prev.map((x, i) => (i === oi ? t : x)))}
                  placeholder={`${LETTERS[oi]} varianti`}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            ))}

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>QIYINLIK</Text>
            <View style={styles.difficultyRow}>
              {DIFFICULTIES.map((d) => {
                const active = difficulty === d.value;
                return (
                  <TouchableOpacity
                    key={d.value}
                    activeOpacity={0.8}
                    onPress={() => setDifficulty(d.value)}
                    style={[
                      styles.difficultyOption,
                      {
                        borderColor: active ? colors.blue : colors.borderStrong,
                        backgroundColor: active ? tints.blue14 : colors.surfaceDeep,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: active ? FONTS.extrabold : FONTS.bold,
                        color: active ? colors.blueLight : colors.textSecondary,
                      }}
                    >
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Button
              title={saving ? 'Saqlanmoqda…' : 'Savolni saqlash'}
              variant="success"
              height={48}
              radius={12}
              fontSize={14.5}
              style={styles.generateBtn}
              disabled={saving}
              onPress={saveManual}
            />
          </Card>
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
  content: {
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 19,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  modesScroll: {
    marginTop: 14,
  },
  modesRow: {
    gap: 7,
    paddingBottom: 4,
  },
  noCenter: {
    marginTop: 30,
  },
  infoCard: {
    marginTop: 14,
    padding: 18,
  },
  infoTitle: {
    fontSize: 15,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  infoText: {
    fontSize: 13,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    lineHeight: 19.5,
    marginTop: 6,
  },
  formCard: {
    marginTop: 12,
    padding: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 9,
  },
  formCol: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 10.5,
    fontFamily: FONTS.extrabold,
    color: colors.textSecondary,
    marginBottom: 5,
  },
  select: {
    height: 42,
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
  countCol: {
    width: 120,
  },
  stepper: {
    height: 42,
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
    width: 30,
    height: 30,
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
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 11,
    backgroundColor: colors.surface,
    paddingHorizontal: 13,
    height: 44,
    fontSize: 13.5,
    fontFamily: FONTS.semibold,
    color: colors.text,
  },
  inputMulti: {
    height: 90,
    paddingTop: 12,
    paddingBottom: 12,
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: 7,
  },
  difficultyOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
  },
  generateBtn: {
    marginTop: 16,
  },
  optionInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 8,
  },
  correctToggle: {
    width: 38,
    height: 44,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  correctToggleOn: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  correctToggleText: {
    fontSize: 13,
    fontFamily: FONTS.extrabold,
    color: colors.textSecondary,
  },
  optionInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 11,
    backgroundColor: colors.surface,
    paddingHorizontal: 13,
    height: 44,
    fontSize: 13,
    fontFamily: FONTS.semibold,
    color: colors.text,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  resultTitle: {
    fontSize: 13.5,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  resultSub: {
    fontSize: 11.5,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
  },
  questionCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  questionRejected: {
    opacity: 0.5,
  },
  qHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  qNum: {
    fontSize: 11,
    fontFamily: FONTS.extrabold,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  qActions: {
    flexDirection: 'row',
    gap: 7,
  },
  qActBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.surfaceDeep,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qApproveOn: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  qRejectOn: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  questionText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: colors.text,
    lineHeight: 19.5,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 9,
  },
  optionPill: {
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 7,
    backgroundColor: colors.surfaceDeep,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  optionText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
  },
  optionCorrect: {
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 7,
    backgroundColor: tints.green14,
    borderWidth: 1,
    borderColor: tints.greenBorder40,
  },
  optionCorrectText: {
    fontSize: 11,
    fontFamily: FONTS.extrabold,
    color: colors.greenLight,
  },
  saveBtn: {
    marginTop: 14,
  },
});
