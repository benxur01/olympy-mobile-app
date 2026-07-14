import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import { useTabBarSpacing } from '../components/TabBar';
import Card from '../components/Card';
import Chip from '../components/Chip';
import Badge from '../components/Badge';
import Button from '../components/Button';
import IconBox from '../components/IconBox';
import EmptyState from '../components/EmptyState';
import { teacherApi } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { centerIdForUser } from '../services/roles';
import { SparkleIcon, CheckIcon, CloseIcon, InboxIcon, FileIcon, WarningIcon, EditIcon } from '../components/icons/Icons';

const MODES = ['AI generatsiya', "Qo'lda"];
const BANK_MODE = 'Bank';
// Qiyinlik kaliti → o'qiladigan yorliq (bank ro'yxatidagi badge uchun).
const DIFFICULTY_LABELS = { easy: 'Oson', medium: "O'rta", hard: 'Qiyin' };
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
  const tabBarSpacing = useTabBarSpacing();
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

  // Fayldan import (PDF / Word / Excel) holati. PDF va Word AI-preview'lari
  // AI generatsiya bilan bir xil ko'rib-tasdiqlash oqimini ishlatadi (importResult
  // + importRejected). Excel esa sinxron — natija xulosasi excelSummary'da.
  const [importLoading, setImportLoading] = useState(false);
  const [importSaving, setImportSaving] = useState(false);
  const [importResult, setImportResult] = useState([]);
  const [importRejected, setImportRejected] = useState({});
  const [importWarning, setImportWarning] = useState('');
  const [excelSummary, setExcelSummary] = useState(null);

  // Qo'lda yaratish uchun forma holati.
  const [mText, setMText] = useState('');
  const [mOptions, setMOptions] = useState(['', '', '', '']);
  const [mCorrect, setMCorrect] = useState(0);

  // ── Savollar banki (ro'yxat + tahrirlash/o'chirish) ────────────────
  const [bankQuestions, setBankQuestions] = useState([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankError, setBankError] = useState(false);
  const [bankDeleting, setBankDeleting] = useState(null);
  // Tahrirlash formasi holati (qo'lda yaratish formasi bilan bir xil UX, lekin
  // alohida — POST o'rniga PATCH qiladi va tanlangan savolni to'ldiradi).
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editType, setEditType] = useState('mcq');
  const [editText, setEditText] = useState('');
  const [editSubjectIdx, setEditSubjectIdx] = useState(0);
  const [editDifficulty, setEditDifficulty] = useState('medium');
  const [editOptions, setEditOptions] = useState(['', '', '', '']);
  const [editCorrect, setEditCorrect] = useState(0);
  const [editSaving, setEditSaving] = useState(false);

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

  // Rejim almashtirilganda oldingi import natijalarini tozalaymiz (chalkashmaslik
  // uchun — masalan PDF natijasi Excel rejimida ko'rinib qolmasin).
  const switchMode = (m) => {
    setMode(m);
    setImportResult([]);
    setImportRejected({});
    setImportWarning('');
    setExcelSummary(null);
  };

  // Import xatolarini AI generatsiya bilan bir xil ko'rsatamiz: 403 +
  // upgrade_required bo'lsa Premium prompt, aks holda backend `detail`i.
  const importError = (e, fallback) => {
    if (e?.response?.data?.upgrade_required) {
      Alert.alert(
        'Premium kerak',
        e?.response?.data?.detail || 'Bu funksiya markaz premium obunasini talab qiladi.',
        [
          { text: 'Bekor' },
          { text: 'Premium', onPress: () => navigation.navigate('Premium') },
        ]
      );
    } else {
      const detail = e?.response?.data?.detail || e?.message;
      Alert.alert('Xatolik', detail || fallback);
    }
  };

  // PDF / Word AI-preview: fayl tanlab, backendga yuborib, natija tayyor
  // bo'lguncha polling qiladi (extractPdfQuestions / extractWordAiQuestions
  // ichida). `kind` — 'pdf' | 'word'.
  const pickAndExtract = async (kind) => {
    if (noCenter || importLoading) return;
    const types = kind === 'pdf'
      ? ['application/pdf']
      : ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/pdf'];
    let picked;
    try {
      picked = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: true });
    } catch (e) {
      Alert.alert('Xatolik', "Faylni ochib bo'lmadi.");
      return;
    }
    if (picked?.canceled) return;
    const asset = picked?.assets?.[0];
    if (!asset) return;

    setImportResult([]);
    setImportRejected({});
    setImportWarning('');
    setImportLoading(true);
    try {
      const fd = new FormData();
      const fileKey = kind === 'pdf' ? 'pdf' : 'word';
      const fallbackType = kind === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      fd.append(fileKey, { uri: asset.uri, name: asset.name, type: asset.mimeType || fallbackType });
      fd.append('center', String(centerId));
      fd.append('subject', subject);
      fd.append('difficulty', difficulty);
      fd.append('question_type', 'mcq');
      const data = kind === 'pdf'
        ? await teacherApi.extractPdfQuestions(fd)
        : await teacherApi.extractWordAiQuestions(fd);
      const list = Array.isArray(data?.questions) ? data.questions : [];
      setImportResult(list);
      setImportWarning(
        data?.warning ||
        (data?.complete === false
          ? "Fayl qisman ajratildi. Saqlashdan oldin asl fayl bilan solishtirib tekshiring."
          : '')
      );
      if (!list.length) Alert.alert('Natija yo\'q', "Fayldan savol topilmadi. Boshqa fayl bilan urinib ko'ring.");
    } catch (e) {
      importError(e, "Faylni tahlil qilib bo'lmadi. Qayta urinib ko'ring.");
    } finally {
      setImportLoading(false);
    }
  };

  // Excel/CSV import — sinxron (polling yo'q). Natija: { created, errors, error_count }.
  const pickAndImportExcel = async () => {
    if (noCenter || importLoading) return;
    let picked;
    try {
      picked = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
        ],
        copyToCacheDirectory: true,
      });
    } catch (e) {
      Alert.alert('Xatolik', "Faylni ochib bo'lmadi.");
      return;
    }
    if (picked?.canceled) return;
    const asset = picked?.assets?.[0];
    if (!asset) return;

    setExcelSummary(null);
    setImportLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const { data } = await teacherApi.importExcel(fd, { center: centerId, subject });
      const errors = Array.isArray(data?.errors) ? data.errors : [];
      setExcelSummary({
        created: data?.created || 0,
        errors,
        errorCount: data?.error_count ?? errors.length,
      });
    } catch (e) {
      importError(e, "Import qilib bo'lmadi. Qayta urinib ko'ring.");
    } finally {
      setImportLoading(false);
    }
  };

  const importApprovedCount = importResult.filter((_, i) => !importRejected[i]).length;
  const toggleImportReject = (i, value) => setImportRejected((prev) => ({ ...prev, [i]: value }));

  const saveImportResult = async () => {
    if (importSaving) return;
    if (!importApprovedCount) {
      Alert.alert('Savol tanlanmagan', "Saqlash uchun kamida bitta savolni tasdiqlang (✓).");
      return;
    }
    setImportSaving(true);
    let ok = 0;
    for (let i = 0; i < importResult.length; i += 1) {
      if (importRejected[i]) continue;
      const q = importResult[i];
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
    setImportSaving(false);
    setImportResult([]);
    setImportRejected({});
    setImportWarning('');
    Alert.alert('Saqlandi', `${ok} ta savol savollar bankiga qo'shildi.`);
  };

  // AI generatsiya va PDF/Word import uchun umumiy ko'rib-tasdiqlash bloki.
  const renderReview = (list, rejectedMap, onToggle, savingFlag, onSave) => {
    const approved = list.filter((_, i) => !rejectedMap[i]).length;
    return (
      <>
        <View style={styles.resultHeader}>
          <Text style={styles.resultTitle}>Natija: {list.length} ta savol</Text>
          <Text style={styles.resultSub}>{approved} tasdiqlangan</Text>
        </View>
        {list.map((q, qi) => {
          const isRejected = !!rejectedMap[qi];
          return (
            <Card key={qi} style={[styles.questionCard, isRejected ? styles.questionRejected : null]}>
              <View style={styles.qHead}>
                <Text style={styles.qNum}>{qi + 1}-savol{isRejected ? ' · rad etildi' : ''}</Text>
                <View style={styles.qActions}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => onToggle(qi, false)}
                    style={[styles.qActBtn, !isRejected ? styles.qApproveOn : null]}
                  >
                    <CheckIcon size={13} color={!isRejected ? colors.white : colors.textMuted} strokeWidth={3} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => onToggle(qi, true)}
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
          title={savingFlag ? 'Saqlanmoqda…' : `Tasdiqlanganlarni saqlash (${approved} ta)`}
          variant="success"
          height={50}
          radius={13}
          fontSize={15}
          style={styles.saveBtn}
          disabled={savingFlag || approved === 0}
          onPress={onSave}
        />
      </>
    );
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

  // ── Savollar bankini yuklash ────────────────────────────────────────
  const loadBank = useCallback(async () => {
    if (!centerId) return;
    setBankLoading(true);
    setBankError(false);
    try {
      const { data } = await teacherApi.questions({ center: centerId, page_size: 500 });
      const list = Array.isArray(data) ? data : data?.results || [];
      setBankQuestions(list);
    } catch (e) {
      setBankError(true);
    } finally {
      setBankLoading(false);
    }
  }, [centerId]);

  // Bank rejimiga o'tilganda ro'yxatni yuklaymiz.
  useEffect(() => {
    if (mode === BANK_MODE) loadBank();
  }, [mode, loadBank]);

  const openEdit = (q) => {
    setEditId(q.id);
    setEditType(q.question_type || 'mcq');
    setEditText(q.text || '');
    const idx = SUBJECTS.indexOf(q.subject);
    setEditSubjectIdx(idx >= 0 ? idx : 0);
    setEditDifficulty(q.difficulty || 'medium');
    const opts = Array.isArray(q.options) ? q.options.map((o) => String(o)) : [];
    while (opts.length < 4) opts.push('');
    setEditOptions(opts.slice(0, 4));
    setEditCorrect(typeof q.correct_answer === 'number' ? q.correct_answer : 0);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (editSaving || editId == null) return;
    if (!editText.trim()) {
      Alert.alert('Savol matni kerak', 'Iltimos, savol matnini kiriting.');
      return;
    }
    const opts = editOptions.map((o) => o.trim());
    if (opts.filter(Boolean).length < 2) {
      Alert.alert('Variantlar kerak', 'Kamida 2 ta variant kiriting.');
      return;
    }
    setEditSaving(true);
    const payload = {
      subject: SUBJECTS[editSubjectIdx],
      text: editText.trim(),
      options: opts,
      correct_answer: editCorrect,
      difficulty: editDifficulty,
      question_type: editType || 'mcq',
    };
    try {
      const { data } = await teacherApi.updateQuestion(editId, payload);
      setBankQuestions((prev) =>
        prev.map((x) => (x.id === editId ? { ...x, ...payload, ...(data || {}) } : x))
      );
      setEditOpen(false);
      Alert.alert('Saqlandi', 'Savol yangilandi.');
    } catch (e) {
      const detail = e?.response?.data?.detail;
      Alert.alert('Xatolik', detail || "Saqlab bo'lmadi. Qayta urinib ko'ring.");
    } finally {
      setEditSaving(false);
    }
  };

  const deleteBankQuestion = (q) => {
    if (q.id == null) return;
    Alert.alert("Savolni o'chirish", "Bu savolni bankdan o'chirasizmi? Bu amalni ortga qaytarib bo'lmaydi.", [
      { text: 'Bekor', style: 'cancel' },
      {
        text: "O'chirish",
        style: 'destructive',
        onPress: async () => {
          setBankDeleting(q.id);
          try {
            await teacherApi.deleteQuestion(q.id);
            setBankQuestions((prev) => prev.filter((x) => x.id !== q.id));
          } catch (e) {
            Alert.alert('Xatolik', e?.response?.data?.detail || "O'chirib bo'lmadi.");
          } finally {
            setBankDeleting(null);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarSpacing }]} showsVerticalScrollIndicator={false}>
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
              onPress={() => switchMode(m)}
              icon={mode === m && m === 'AI generatsiya' ? <SparkleIcon size={12} /> : null}
            />
          ))}
          {IMPORT_MODES.map((m) => (
            <Chip key={m} label={m} active={mode === m} radius={11} onPress={() => switchMode(m)} />
          ))}
          <Chip
            label="Savollar banki"
            active={mode === BANK_MODE}
            radius={11}
            onPress={() => switchMode(BANK_MODE)}
          />
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
              </View>

              {mode !== 'Excel' ? (
                <>
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
                </>
              ) : null}

              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.uploadArea, { marginTop: 16 }]}
                disabled={importLoading}
                onPress={() =>
                  mode === 'PDF import'
                    ? pickAndExtract('pdf')
                    : mode === 'Word'
                    ? pickAndExtract('word')
                    : pickAndImportExcel()
                }
              >
                <FileIcon size={30} color={colors.blueLight} />
                <Text style={styles.uploadTitle}>
                  {importLoading
                    ? mode === 'Excel'
                      ? 'Import qilinmoqda…'
                      : 'Tahlil qilinmoqda…'
                    : 'Fayl tanlash'}
                </Text>
                <Text style={styles.uploadHint}>
                  {mode === 'PDF import'
                    ? "PDF faylni AI tahlil qiladi va savollarni ajratadi"
                    : mode === 'Word'
                    ? "Word (.docx) yoki PDF matnidan AI savol ajratadi"
                    : "Excel (.xlsx) yoki CSV faylni to'g'ridan-to'g'ri import qiladi"}
                </Text>
              </TouchableOpacity>
            </Card>

            {importWarning ? (
              <Card radius={14} style={styles.warningCard}>
                <WarningIcon size={16} color={colors.orange} />
                <Text style={styles.warningText}>{importWarning}</Text>
              </Card>
            ) : null}

            {mode === 'Excel' && excelSummary ? (
              <Card radius={14} style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>{excelSummary.created} ta savol qo'shildi</Text>
                {excelSummary.errorCount > 0 ? (
                  <>
                    <Text style={styles.summaryText}>{excelSummary.errorCount} ta qatorda xatolik bor:</Text>
                    {excelSummary.errors.slice(0, 10).map((err, ei) => (
                      <Text key={ei} style={styles.errorLine}>• {String(err)}</Text>
                    ))}
                    {excelSummary.errors.length > 10 ? (
                      <Text style={styles.errorLine}>… va yana {excelSummary.errors.length - 10} ta</Text>
                    ) : null}
                  </>
                ) : null}
              </Card>
            ) : null}

            {mode !== 'Excel' && importResult.length > 0
              ? renderReview(importResult, importRejected, toggleImportReject, importSaving, saveImportResult)
              : null}
          </>
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

            {generated.length > 0
              ? renderReview(generated, rejected, toggleReject, saving, saveGenerated)
              : null}
          </>
        ) : mode === BANK_MODE ? (
          // Savollar banki — mavjud savollar ro'yxati (tahrirlash / o'chirish)
          bankLoading ? (
            <ActivityIndicator color={colors.blue} style={{ marginTop: 40 }} />
          ) : bankError ? (
            <View style={styles.noCenter}>
              <EmptyState
                compact
                icon={<WarningIcon size={22} color={colors.orange} />}
                title="Yuklab bo'lmadi"
                message="Savollar bankini yuklab bo'lmadi."
                actionLabel="Qayta urinish"
                onAction={loadBank}
              />
            </View>
          ) : bankQuestions.length === 0 ? (
            <View style={styles.noCenter}>
              <EmptyState
                compact
                icon={<InboxIcon size={22} color={colors.blueLight} />}
                title="Savollar banki bo'sh"
                message="Hali savol qo'shilmagan. Yuqoridagi rejimlar orqali savol yarating."
              />
            </View>
          ) : (
            <>
              <View style={styles.resultHeader}>
                <Text style={styles.resultTitle}>{bankQuestions.length} ta savol</Text>
                <TouchableOpacity activeOpacity={0.7} onPress={loadBank}>
                  <Text style={styles.resultSub}>yangilash ↻</Text>
                </TouchableOpacity>
              </View>
              {bankQuestions.map((q, qi) => (
                <TouchableOpacity key={q.id ?? qi} activeOpacity={0.85} onPress={() => openEdit(q)}>
                  <Card style={styles.bankCard}>
                    <View style={styles.bankRow}>
                      <View style={styles.bankTextCol}>
                        <View style={styles.bankMeta}>
                          {q.subject ? (
                            <Badge label={q.subject} color={colors.blueLight} background={tints.blue14} size={10} />
                          ) : null}
                          <Badge
                            label={DIFFICULTY_LABELS[q.difficulty] || q.difficulty || "O'rta"}
                            color={colors.purpleLight}
                            background={tints.purple16}
                            size={10}
                          />
                        </View>
                        <Text style={styles.bankText} numberOfLines={2}>{q.text || '—'}</Text>
                      </View>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={styles.bankDeleteBtn}
                        disabled={bankDeleting === q.id}
                        onPress={() => deleteBankQuestion(q)}
                      >
                        {bankDeleting === q.id ? (
                          <ActivityIndicator size="small" color={colors.red} />
                        ) : (
                          <CloseIcon size={13} color={colors.red} strokeWidth={2.6} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </>
          )
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

      {/* Savolni tahrirlash modali — banka ro'yxatidagi savolga bosilganda ochiladi. */}
      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={() => setEditOpen(false)} />
        <View style={styles.sheet}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Savolni tahrirlash</Text>

            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>FAN</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.select}
              onPress={() => setEditSubjectIdx((i) => (i + 1) % SUBJECTS.length)}
            >
              <Text style={styles.selectText}>{SUBJECTS[editSubjectIdx]}</Text>
              <Text style={styles.selectHint}>o'zgartirish ›</Text>
            </TouchableOpacity>

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>SAVOL MATNI</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={editText}
              onChangeText={setEditText}
              placeholder="Savol matnini kiriting…"
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
            />

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>VARIANTLAR (to'g'risini belgilang)</Text>
            {editOptions.map((opt, oi) => (
              <View key={oi} style={styles.optionInputRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setEditCorrect(oi)}
                  style={[styles.correctToggle, editCorrect === oi ? styles.correctToggleOn : null]}
                >
                  {editCorrect === oi ? <CheckIcon size={12} color={colors.white} /> : (
                    <Text style={styles.correctToggleText}>{LETTERS[oi]}</Text>
                  )}
                </TouchableOpacity>
                <TextInput
                  style={styles.optionInput}
                  value={opt}
                  onChangeText={(t) => setEditOptions((prev) => prev.map((x, i) => (i === oi ? t : x)))}
                  placeholder={`${LETTERS[oi]} varianti`}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            ))}

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>QIYINLIK</Text>
            <View style={styles.difficultyRow}>
              {DIFFICULTIES.map((d) => {
                const active = editDifficulty === d.value;
                return (
                  <TouchableOpacity
                    key={d.value}
                    activeOpacity={0.8}
                    onPress={() => setEditDifficulty(d.value)}
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
              title={editSaving ? 'Saqlanmoqda…' : 'Saqlash'}
              variant="success"
              height={48}
              radius={12}
              fontSize={14.5}
              style={styles.generateBtn}
              disabled={editSaving}
              onPress={saveEdit}
            />
            <TouchableOpacity activeOpacity={0.7} onPress={() => setEditOpen(false)} style={styles.editCancel}>
              <Text style={styles.editCancelText}>Bekor qilish</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
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
  uploadArea: {
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderStyle: 'dashed',
    borderRadius: 14,
    backgroundColor: colors.surfaceDeep,
    alignItems: 'center',
    paddingVertical: 22,
    paddingHorizontal: 16,
  },
  uploadTitle: {
    fontSize: 14,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    marginTop: 10,
  },
  uploadHint: {
    fontSize: 11.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 4,
  },
  warningCard: {
    marginTop: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    lineHeight: 17.5,
  },
  summaryCard: {
    marginTop: 12,
    padding: 16,
  },
  summaryTitle: {
    fontSize: 14.5,
    fontFamily: FONTS.extrabold,
    color: colors.greenLight,
  },
  summaryText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
    marginTop: 8,
  },
  errorLine: {
    fontSize: 11.5,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
    lineHeight: 17,
    marginTop: 3,
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    zIndex: 8,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '85%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.borderStrong,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 14,
    paddingHorizontal: 22,
    paddingBottom: 30,
    zIndex: 9,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderDashed,
    alignSelf: 'center',
  },
  sheetTitle: {
    fontSize: 16,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    marginTop: 16,
  },
  editCancel: {
    marginTop: 12,
    marginBottom: 4,
  },
  editCancelText: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: colors.textMuted,
  },
});
