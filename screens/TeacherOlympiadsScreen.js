import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, Modal, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Avatar from '../components/Avatar';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useFetch from '../services/useFetch';
import { teacherApi, downloadOlympiadResults } from '../services/api';
import { BackIcon, PlusIcon, ChevronRightIcon, CalendarIcon, EditIcon, DownloadIcon, CloseIcon } from '../components/icons/Icons';

const SUBJECTS = ['Matematika', 'Fizika', 'Kimyo', 'Biologiya', 'Ingliz tili', 'Tarix', 'Informatika', 'IT'];
const RESULTS_PAGE_SIZE = 200;
const EXPORT_FORMATS = [
  { key: 'csv', label: 'CSV' },
  { key: 'xlsx', label: 'Excel' },
  { key: 'pdf', label: 'PDF' },
];
const asArray = (data) => (Array.isArray(data) ? data : data?.results || []);
const initialOf = (name) => (name || '?').trim()[0]?.toUpperCase() || '?';
// Reyting javobi: { entries } | { results } | oddiy massiv.
const asEntries = (data) =>
  Array.isArray(data?.entries)
    ? data.entries
    : Array.isArray(data?.results)
      ? data.results
      : Array.isArray(data)
        ? data
        : [];

// Variantlar massividan indeks bo'yicha matnni oladi (mcq/yes_no uchun).
const optAt = (options, idx) => {
  if (!Array.isArray(options) || idx == null) return null;
  const o = options[idx];
  if (o == null) return null;
  return typeof o === 'object' ? o.text ?? o.label ?? String(o) : String(o);
};

// O'quvchining javobini savol turiga qarab matnga aylantiradi. Backend shakli
// oldindan tekshirilmagan — mavjud maydonlarni himoyalab o'qiymiz.
const renderChosen = (q) => {
  const t = q.question_type;
  if (t === 'mcq' || t === 'yes_no') {
    const c = optAt(q.options, q.chosen_answer);
    return c || 'Javob berilmagan';
  }
  if (t === 'essay') return q.chosen_answer ? String(q.chosen_answer) : 'Javob berilmagan';
  if (t === 'code') return q.submitted_code ? String(q.submitted_code) : 'Javob berilmagan';
  if (q.chosen_answer != null) return String(q.chosen_answer);
  return "—";
};

// To'g'ri javobni savol turiga qarab matnga aylantiradi (bo'lmasa null).
const renderCorrect = (q) => {
  const t = q.question_type;
  if (t === 'mcq' || t === 'yes_no') return optAt(q.options, q.correct_answer);
  if (t === 'multiple_select') {
    const arr = Array.isArray(q.correct_answer_set) ? q.correct_answer_set : [];
    return arr.map((i) => optAt(q.options, i)).filter(Boolean).join(', ') || null;
  }
  if (t === 'fill_blank') return q.correct_text ? String(q.correct_text) : null;
  if (t === 'fill_blanks' && q.correct_text && typeof q.correct_text === 'object') {
    return Object.values(q.correct_text).map(String).filter(Boolean).join(', ') || null;
  }
  if (q.correct_text != null) return String(q.correct_text);
  return null;
};
const makeSTATUS = (colors, tints) => ({
  active: { label: 'Faol', color: colors.greenLight, bg: tints.green14 },
  finished: { label: 'Tugagan', color: colors.slate, bg: tints.slate14 },
  draft: { label: 'Qoralama', color: colors.orange, bg: tints.orange14 },
  inactive: { label: 'Nofaol', color: colors.textMuted, bg: tints.slate14 },
});

export default function TeacherOlympiadsScreen({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const STATUS = makeSTATUS(colors, tints);
  const { data, loading, refreshing, error, reload, refresh } = useFetch(
    () => teacherApi.myOlympiads().then((r) => asArray(r.data)),
    []
  );

  const [selected, setSelected] = useState(null);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(null); // format kaliti yoki null

  // Tahrirlash formasi
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSubjectIdx, setEditSubjectIdx] = useState(0);
  const [editDuration, setEditDuration] = useState(30);

  // To'liq natijalar (ishtirokchilar reytingi)
  const [results, setResults] = useState({ open: false, loading: false, page: 1, total: 0, entries: [] });

  // Bitta o'quvchi javoblari
  const [review, setReview] = useState({ open: false, loading: false, name: '', error: '', data: null });

  // Tadbir yaratib qaytilganda ro'yxat yangilansin.
  useEffect(() => navigation.addListener('focus', reload), [navigation, reload]);

  const olympiads = data || [];

  const openDetail = async (o) => {
    setSelected(o);
    setStats(null);
    setStatsLoading(true);
    try {
      const { data: s } = await teacherApi.olympiadStats(o.id);
      setStats(s);
    } catch (e) {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  };

  const closeDetail = () => {
    setSelected(null);
    setStats(null);
  };

  const publish = async () => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      await teacherApi.publishOlympiad(selected.id);
      Alert.alert('Nashr qilindi', `"${selected.title}" endi faol.`);
      closeDetail();
      reload();
    } catch (e) {
      const err = e?.response?.data;
      const msg = err?.errors ? `${err.detail}: ${err.errors.join(', ')}` : err?.detail;
      Alert.alert('Nashr qilinmadi', msg || "Tadbirni nashr qilib bo'lmadi.");
    } finally {
      setBusy(false);
    }
  };

  const finish = () => {
    if (!selected) return;
    Alert.alert('Yakunlash', `"${selected.title}" tadbirini yakunlaysizmi? Bundan keyin o'quvchilar kira olmaydi.`, [
      { text: 'Bekor', style: 'cancel' },
      {
        text: 'Yakunlash',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await teacherApi.finishOlympiad(selected.id);
            closeDetail();
            reload();
          } catch (e) {
            Alert.alert('Xatolik', e?.response?.data?.detail || "Yakunlab bo'lmadi.");
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  // ── To'xtatib turish (pauza / deactivate) ───────────────────────────
  const deactivate = () => {
    if (!selected) return;
    Alert.alert(
      "To'xtatib turish",
      `"${selected.title}" tadbirini vaqtincha to'xtatib turasizmi? O'quvchilar qayta ochilgunicha kira olmaydi.`,
      [
        { text: 'Bekor', style: 'cancel' },
        {
          text: "To'xtatish",
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await teacherApi.deactivateOlympiad(selected.id);
              closeDetail();
              reload();
            } catch (e) {
              Alert.alert('Xatolik', e?.response?.data?.detail || "To'xtatib bo'lmadi.");
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  // ── Eksport (CSV / Excel / PDF) — umumiy helper orqali ──────────────
  const exportResults = async (format) => {
    if (!selected || exporting) return;
    setExporting(format);
    try {
      await downloadOlympiadResults(selected.id, format);
    } catch (e) {
      const status = e?.response?.status;
      Alert.alert(
        'Yuklab bo\'lmadi',
        status === 403
          ? 'Bu format uchun Plus/Pro obuna kerak.'
          : "Natijalarni yuklab bo'lmadi. Qayta urinib ko'ring."
      );
    } finally {
      setExporting(null);
    }
  };

  // ── Tahrirlash ──────────────────────────────────────────────────────
  const openEdit = () => {
    if (!selected) return;
    setEditTitle(selected.title || '');
    const idx = SUBJECTS.indexOf(selected.subject);
    setEditSubjectIdx(idx >= 0 ? idx : 0);
    setEditDuration(selected.duration_minutes || 30);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!selected || busy) return;
    if (!editTitle.trim()) {
      Alert.alert('Nom kerak', 'Tadbir nomini kiriting.');
      return;
    }
    setBusy(true);
    try {
      await teacherApi.updateOlympiad(selected.id, {
        title: editTitle.trim(),
        subject: SUBJECTS[editSubjectIdx],
        duration_minutes: editDuration,
      });
      setEditOpen(false);
      closeDetail();
      reload();
    } catch (e) {
      const d = e?.response?.data;
      Alert.alert('Xatolik', d?.detail || d?.title?.[0] || "Tadbirni tahrirlab bo'lmadi.");
    } finally {
      setBusy(false);
    }
  };

  // ── O'chirish ───────────────────────────────────────────────────────
  const remove = () => {
    if (!selected) return;
    Alert.alert(
      "O'chirish",
      `"${selected.title}" tadbirini butunlay o'chirasizmi? Bu amalni ortga qaytarib bo'lmaydi.`,
      [
        { text: 'Bekor', style: 'cancel' },
        {
          text: "O'chirish",
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await teacherApi.deleteOlympiad(selected.id);
              closeDetail();
              reload();
            } catch (e) {
              Alert.alert('Xatolik', e?.response?.data?.detail || "O'chirib bo'lmadi.");
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  // ── To'liq natijalar (ishtirokchilar reytingi) ──────────────────────
  const loadResultsPage = async (page) => {
    if (!selected) return;
    setResults((r) => ({ ...r, loading: true }));
    try {
      const { data: res } = await teacherApi.leaderboardForOlympiad(selected.id, page, RESULTS_PAGE_SIZE);
      const entries = asEntries(res);
      setResults((r) => ({
        ...r,
        entries,
        total: res?.pagination?.total ?? entries.length,
        page,
        loading: false,
      }));
    } catch (e) {
      setResults((r) => ({ ...r, loading: false }));
      Alert.alert('Xatolik', "Natijalarni yuklab bo'lmadi.");
    }
  };

  const openResults = () => {
    setResults({ open: true, loading: true, page: 1, total: 0, entries: [] });
    loadResultsPage(1);
  };

  // ── Bitta o'quvchi javoblari ────────────────────────────────────────
  const openReview = async (row) => {
    if (!selected || !row?.user_id) return;
    setReview({ open: true, loading: true, name: row.name || "O'quvchi", error: '', data: null });
    try {
      const { data: res } = await teacherApi.eventUserAnswers(selected.id, row.user_id);
      setReview((m) => ({ ...m, loading: false, data: res || null, name: res?.student_name || m.name }));
    } catch (e) {
      setReview((m) => ({ ...m, loading: false, error: "Javoblarni yuklab bo'lmadi." }));
    }
  };

  if (loading && !data) return <LoadingState message="Tadbirlar yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  const st = selected ? STATUS[selected.status] || STATUS.draft : null;
  const canPublish = selected && (selected.status === 'draft' || selected.status === 'inactive');
  const canFinish = selected && selected.status === 'active';
  const canDeactivate = selected && selected.status === 'active';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()} style={styles.backBtn}>
          <BackIcon size={16} />
        </TouchableOpacity>
        <Text style={styles.title}>Tadbirlar</Text>
        <TouchableOpacity activeOpacity={0.8} style={styles.addBtn} onPress={() => navigation.navigate('CreateOlympiad')}>
          <PlusIcon size={15} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.blue} />}
      >
        {olympiads.length === 0 ? (
          <EmptyState
            icon={<CalendarIcon size={24} color={colors.blueLight} />}
            title="Tadbir yo'q"
            message="Hali tadbir yaratmagansiz. Yuqoridagi + tugma orqali yangi tadbir yarating."
            actionLabel="Tadbir yaratish"
            onAction={() => navigation.navigate('CreateOlympiad')}
          />
        ) : (
          <View style={styles.list}>
            {olympiads.map((o) => {
              const s = STATUS[o.status] || STATUS.draft;
              return (
                <TouchableOpacity key={o.id} activeOpacity={0.85} onPress={() => openDetail(o)}>
                  <Card style={styles.card}>
                    <View style={styles.cardBody}>
                      <View style={styles.badgeRow}>
                        <Badge label={o.subject || 'Fan'} color={colors.blueLight} background={tints.blue14} size={10.5} style={styles.badgeSm} />
                        <Badge label={s.label} color={s.color} background={s.bg} size={10.5} style={styles.badgeSm} />
                      </View>
                      <Text style={styles.cardTitle} numberOfLines={1}>{o.title}</Text>
                      <Text style={styles.cardSub}>
                        {o.duration_minutes || 0} daqiqa · {o.participants || 0} ishtirokchi
                      </Text>
                    </View>
                    <ChevronRightIcon size={14} />
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={closeDetail}>
        <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={closeDetail} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          {selected ? (
            <>
              <View style={styles.sheetBadges}>
                <Badge label={selected.subject || 'Fan'} color={colors.blueLight} background={tints.blue14} size={11} />
                {st ? <Badge label={st.label} color={st.color} background={st.bg} size={11} /> : null}
              </View>
              <Text style={styles.sheetTitle}>{selected.title}</Text>

              {statsLoading ? (
                <ActivityIndicator color={colors.blue} style={{ marginVertical: 24 }} />
              ) : stats ? (
                <View style={styles.statsGrid}>
                  <View style={styles.statCell}>
                    <Text style={styles.statValue}>{stats.participants ?? 0}</Text>
                    <Text style={styles.statLabel}>Ishtirokchi</Text>
                  </View>
                  <View style={styles.statCell}>
                    <Text style={styles.statValue}>{stats.average_score ?? 0}</Text>
                    <Text style={styles.statLabel}>O'rtacha ball</Text>
                  </View>
                  <View style={styles.statCell}>
                    <Text style={styles.statValue}>{stats.max_score ?? 0}</Text>
                    <Text style={styles.statLabel}>Eng yuqori</Text>
                  </View>
                  <View style={styles.statCell}>
                    <Text style={styles.statValue}>{stats.full_complete_percent ?? 0}%</Text>
                    <Text style={styles.statLabel}>To'liq yechgan</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.noStats}>Statistika hozircha mavjud emas</Text>
              )}

              <TouchableOpacity activeOpacity={0.85} style={styles.resultsBtn} onPress={openResults}>
                <Text style={styles.resultsBtnText}>Natijalarni ko'rish</Text>
                <ChevronRightIcon size={14} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.resultsBtn}
                onPress={() => {
                  const id = selected.id;
                  closeDetail();
                  navigation.navigate('CodeReview', { olympiadId: id });
                }}
              >
                <Text style={styles.resultsBtnText}>Kod javoblari</Text>
                <ChevronRightIcon size={14} />
              </TouchableOpacity>

              <Text style={styles.exportLabel}>NATIJALARNI YUKLAB OLISH</Text>
              <View style={styles.exportRow}>
                {EXPORT_FORMATS.map((f) => (
                  <TouchableOpacity
                    key={f.key}
                    activeOpacity={0.8}
                    style={styles.exportBtn}
                    disabled={!!exporting}
                    onPress={() => exportResults(f.key)}
                  >
                    {exporting === f.key ? (
                      <ActivityIndicator size="small" color={colors.blueLight} />
                    ) : (
                      <>
                        <DownloadIcon size={14} color={colors.blueLight} />
                        <Text style={styles.exportBtnText}>{f.label}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.editDeleteRow}>
                <TouchableOpacity activeOpacity={0.85} style={styles.editBtn} disabled={busy} onPress={openEdit}>
                  <EditIcon size={13} color={colors.text} />
                  <Text style={styles.editBtnText}>Tahrirlash</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.85} style={styles.deleteBtn} disabled={busy} onPress={remove}>
                  <Text style={styles.deleteBtnText}>O'chirish</Text>
                </TouchableOpacity>
              </View>

              {canPublish ? (
                <Button
                  title={busy ? 'Nashr qilinmoqda…' : 'Nashr qilish'}
                  variant="success"
                  height={50}
                  radius={13}
                  fontSize={15}
                  style={styles.actionBtn}
                  disabled={busy}
                  onPress={publish}
                />
              ) : null}
              {canDeactivate ? (
                <Button
                  title="To'xtatib turish"
                  variant="dark"
                  height={50}
                  radius={13}
                  fontSize={15}
                  style={styles.actionBtn}
                  disabled={busy}
                  onPress={deactivate}
                />
              ) : null}
              {canFinish ? (
                <Button
                  title="Tadbirni yakunlash"
                  variant="danger"
                  height={50}
                  radius={13}
                  fontSize={15}
                  style={styles.actionBtn}
                  disabled={busy}
                  onPress={finish}
                />
              ) : null}
              <TouchableOpacity activeOpacity={0.7} onPress={closeDetail}>
                <Text style={styles.closeText}>Yopish</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </Modal>

      {/* ── Tahrirlash modali ── */}
      <Modal visible={editOpen} transparent animationType="fade" onRequestClose={() => setEditOpen(false)}>
        <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={() => setEditOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Tadbirni tahrirlash</Text>

          <Text style={styles.fieldLabel}>TADBIR NOMI</Text>
          <TextInput
            style={styles.input}
            value={editTitle}
            onChangeText={setEditTitle}
            placeholder="Tadbir nomi"
            placeholderTextColor={colors.textMuted}
          />

          <View style={styles.editFormRow}>
            <View style={styles.editFormCol}>
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>FAN</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.select}
                onPress={() => setEditSubjectIdx((i) => (i + 1) % SUBJECTS.length)}
              >
                <Text style={styles.selectText}>{SUBJECTS[editSubjectIdx]}</Text>
                <Text style={styles.selectHint}>o'zgartirish ›</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.durationCol}>
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>DAVOMIYLIK (DAQ)</Text>
              <View style={styles.stepper}>
                <TouchableOpacity onPress={() => setEditDuration((d) => Math.max(5, d - 5))} style={styles.stepBtn}>
                  <Text style={styles.stepText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.countText}>{editDuration}</Text>
                <TouchableOpacity onPress={() => setEditDuration((d) => Math.min(1440, d + 5))} style={styles.stepBtn}>
                  <Text style={styles.stepText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <Button
            title={busy ? 'Saqlanmoqda…' : 'Saqlash'}
            variant="primary"
            height={50}
            radius={13}
            fontSize={15}
            style={styles.actionBtn}
            disabled={busy}
            onPress={saveEdit}
          />
          <TouchableOpacity activeOpacity={0.7} onPress={() => setEditOpen(false)}>
            <Text style={styles.closeText}>Bekor qilish</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── To'liq natijalar (ishtirokchilar reytingi) ── */}
      <Modal visible={results.open} animationType="slide" onRequestClose={() => setResults((r) => ({ ...r, open: false }))}>
        <SafeAreaView style={styles.screen} edges={['top']}>
          <View style={styles.topBar}>
            <TouchableOpacity activeOpacity={0.7} onPress={() => setResults((r) => ({ ...r, open: false }))} style={styles.backBtn}>
              <BackIcon size={16} />
            </TouchableOpacity>
            <Text style={styles.title}>Natijalar</Text>
          </View>
          {results.loading && results.entries.length === 0 ? (
            <ActivityIndicator color={colors.blue} style={{ marginTop: 40 }} />
          ) : results.entries.length === 0 ? (
            <EmptyState title="Natija yo'q" message="Bu tadbirda hali ishtirokchi natijalari yo'q." />
          ) : (
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              <Text style={styles.resultsCount}>{results.total} ishtirokchi</Text>
              <View style={styles.rankList}>
                {results.entries.map((row, idx) => {
                  const total = row.total_questions ?? ((row.correct_count || 0) + (row.wrong_count || 0));
                  const dq = row.disqualified;
                  return (
                    <TouchableOpacity
                      key={row.attempt_id ?? row.user_id ?? idx}
                      activeOpacity={0.85}
                      onPress={() => openReview(row)}
                    >
                      <Card style={[styles.rankRow, dq ? styles.rankRowDq : null]}>
                        <Text style={styles.rankNum}>{dq ? '—' : row.rank}</Text>
                        <Avatar letter={initialOf(row.name)} size={34} fontSize={13} background={colors.blueDeep} />
                        <View style={styles.rankText}>
                          <Text style={[styles.rankName, dq ? styles.rankNameDq : null]} numberOfLines={1}>{row.name || '—'}</Text>
                          <Text style={styles.rankSub}>{`${row.correct_count ?? 0}/${total} to'g'ri`}{dq ? ' · DQ' : ''}</Text>
                        </View>
                        <Text style={styles.rankScore}>{typeof row.score === 'number' ? `${row.score}%` : '—'}</Text>
                        <ChevronRightIcon size={13} />
                      </Card>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {results.total > RESULTS_PAGE_SIZE ? (
                <View style={styles.pager}>
                  <Button
                    title="‹ Oldingi"
                    variant="dark"
                    height={42}
                    radius={11}
                    fontSize={13}
                    style={styles.pagerBtn}
                    disabled={results.loading || results.page <= 1}
                    onPress={() => loadResultsPage(results.page - 1)}
                  />
                  <Text style={styles.pagerText}>{results.page} / {Math.max(1, Math.ceil(results.total / RESULTS_PAGE_SIZE))}</Text>
                  <Button
                    title="Keyingi ›"
                    variant="dark"
                    height={42}
                    radius={11}
                    fontSize={13}
                    style={styles.pagerBtn}
                    disabled={results.loading || results.page >= Math.ceil(results.total / RESULTS_PAGE_SIZE)}
                    onPress={() => loadResultsPage(results.page + 1)}
                  />
                </View>
              ) : null}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* ── Bitta o'quvchi javoblari ── */}
      <Modal visible={review.open} transparent animationType="fade" onRequestClose={() => setReview((m) => ({ ...m, open: false }))}>
        <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={() => setReview((m) => ({ ...m, open: false }))} />
        <View style={[styles.sheet, styles.reviewSheet]}>
          <View style={styles.handle} />
          <View style={styles.reviewHead}>
            <Avatar letter={initialOf(review.name)} size={38} fontSize={15} background={colors.blueDeep} />
            <View style={styles.reviewHeadText}>
              <Text style={styles.reviewName} numberOfLines={1}>{review.name}</Text>
              {review.data ? (
                <Text style={styles.reviewMeta}>
                  {`To'g'ri: ${review.data.correct_count ?? 0} · Xato: ${review.data.wrong_count ?? 0} · Ball: ${review.data.score ?? 0}%`}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={() => setReview((m) => ({ ...m, open: false }))} style={styles.reviewClose}>
              <CloseIcon size={12} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {review.loading ? (
            <ActivityIndicator color={colors.blue} style={{ marginVertical: 30 }} />
          ) : review.error ? (
            <Text style={styles.noStats}>{review.error}</Text>
          ) : (review.data?.questions || []).length === 0 ? (
            <Text style={styles.noStats}>Bu tadbirda savollar topilmadi.</Text>
          ) : (
            <ScrollView style={styles.reviewList} showsVerticalScrollIndicator={false}>
              {(review.data.questions || []).map((q, i) => {
                const correct = q.is_correct === true;
                const wrong = q.is_correct === false;
                const chosen = renderChosen(q);
                const correctTxt = renderCorrect(q);
                return (
                  <View
                    key={q.id ?? i}
                    style={[styles.qRow, correct ? styles.qRowOk : wrong ? styles.qRowBad : null]}
                  >
                    <View style={styles.qRowHead}>
                      <Text style={styles.qIndex}>{i + 1}</Text>
                      <Text style={styles.qMark}>{correct ? '✅' : wrong ? '❌' : '⏳'}</Text>
                    </View>
                    <Text style={styles.qText}>{q.text || '—'}</Text>
                    <Text style={styles.qAnsLabel}>
                      Javobi: <Text style={[styles.qAnsVal, correct ? { color: colors.greenLight } : wrong ? { color: colors.red } : null]}>{chosen}</Text>
                    </Text>
                    {wrong && correctTxt ? (
                      <Text style={styles.qAnsLabel}>
                        To'g'ri javob: <Text style={[styles.qAnsVal, { color: colors.greenLight }]}>{correctTxt}</Text>
                      </Text>
                    ) : null}
                    {q.is_correct === null ? (
                      <Text style={styles.qPending}>
                        {q.question_type === 'essay' ? "Qo'lda baholanadi" : q.question_type === 'code' ? 'Kod tekshirilmoqda' : 'Baholanmagan'}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </ScrollView>
          )}
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
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 30,
    flexGrow: 1,
  },
  list: {
    gap: 8,
  },
  card: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardBody: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  badgeSm: {
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 7,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    marginTop: 7,
  },
  cardSub: {
    fontSize: 11,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 2,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 14,
    paddingHorizontal: 22,
    paddingBottom: 36,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderDashed,
    alignSelf: 'center',
  },
  sheetBadges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    marginTop: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  statCell: {
    flexBasis: '47%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surfaceDeep,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  statLabel: {
    fontSize: 10.5,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
    marginTop: 2,
  },
  noStats: {
    fontSize: 13,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
    textAlign: 'center',
    marginVertical: 22,
  },
  actionBtn: {
    marginTop: 16,
  },
  closeText: {
    textAlign: 'center',
    marginTop: 14,
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: colors.textMuted,
  },

  // ── Detal varag'idagi yangi amallar ──
  resultsBtn: {
    marginTop: 16,
    height: 48,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceDeep,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  resultsBtnText: {
    fontSize: 14,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  exportLabel: {
    fontSize: 10.5,
    fontFamily: FONTS.extrabold,
    color: colors.textSecondary,
    marginTop: 16,
    marginBottom: 7,
  },
  exportRow: {
    flexDirection: 'row',
    gap: 8,
  },
  exportBtn: {
    flex: 1,
    height: 42,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: tints.blue14,
    backgroundColor: tints.blue06,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  exportBtnText: {
    fontSize: 12.5,
    fontFamily: FONTS.extrabold,
    color: colors.blueLight,
  },
  editDeleteRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  editBtn: {
    flex: 1,
    height: 50,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  editBtnText: {
    fontSize: 14,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  deleteBtn: {
    flex: 1,
    height: 50,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: tints.redBorder40,
    backgroundColor: tints.red10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    fontSize: 14,
    fontFamily: FONTS.extrabold,
    color: colors.red,
  },

  // ── Tahrirlash formasi ──
  fieldLabel: {
    fontSize: 10.5,
    fontFamily: FONTS.extrabold,
    color: colors.textSecondary,
    marginTop: 16,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 11,
    backgroundColor: colors.surfaceDeep,
    paddingHorizontal: 13,
    height: 46,
    fontSize: 14,
    fontFamily: FONTS.semibold,
    color: colors.text,
  },
  editFormRow: {
    flexDirection: 'row',
    gap: 9,
  },
  editFormCol: {
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

  // ── To'liq natijalar ro'yxati ──
  resultsCount: {
    fontSize: 12,
    fontFamily: FONTS.extrabold,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  rankList: {
    gap: 8,
  },
  rankRow: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  rankRowDq: {
    opacity: 0.6,
  },
  rankNum: {
    width: 22,
    textAlign: 'center',
    fontSize: 13,
    fontFamily: FONTS.extrabold,
    color: colors.textSecondary,
  },
  rankText: {
    flex: 1,
  },
  rankName: {
    fontSize: 13.5,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  rankNameDq: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  rankSub: {
    fontSize: 11,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rankScore: {
    fontSize: 14,
    fontFamily: FONTS.extrabold,
    color: colors.textBody,
  },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
  },
  pagerBtn: {
    flex: 1,
  },
  pagerText: {
    fontSize: 12,
    fontFamily: FONTS.extrabold,
    color: colors.textSecondary,
  },

  // ── O'quvchi javoblari ──
  reviewSheet: {
    maxHeight: '85%',
  },
  reviewHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginTop: 16,
  },
  reviewHeadText: {
    flex: 1,
  },
  reviewName: {
    fontSize: 15,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  reviewMeta: {
    fontSize: 11.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 2,
  },
  reviewClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewList: {
    marginTop: 14,
  },
  qRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    backgroundColor: colors.surfaceDeep,
    padding: 13,
    marginBottom: 8,
  },
  qRowOk: {
    borderColor: tints.green14,
    backgroundColor: tints.green14,
  },
  qRowBad: {
    borderColor: tints.redBorder40,
    backgroundColor: tints.red10,
  },
  qRowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  qIndex: {
    fontSize: 11,
    fontFamily: FONTS.extrabold,
    color: colors.textMuted,
  },
  qMark: {
    fontSize: 14,
  },
  qText: {
    fontSize: 13,
    fontFamily: FONTS.semibold,
    color: colors.text,
    lineHeight: 18,
  },
  qAnsLabel: {
    fontSize: 12,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 5,
  },
  qAnsVal: {
    fontFamily: FONTS.bold,
    color: colors.textBody,
  },
  qPending: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: colors.orange,
    marginTop: 5,
  },
});
