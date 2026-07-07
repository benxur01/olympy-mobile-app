import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Avatar from '../components/Avatar';
import StatCard from '../components/StatCard';
import IconBox from '../components/IconBox';
import Button from '../components/Button';
import DonutProgress from '../components/DonutProgress';
import ActivityBarChart from '../components/ActivityBarChart';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import useFetch from '../services/useFetch';
import { parentApi } from '../services/api';
import {
  FlameIcon,
  ChevronRightIcon,
  BellIcon,
  SparkleIcon,
  UsersIcon,
} from '../components/icons/Icons';

const WEEK_LABELS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

// Farzandni telefon raqami orqali ulash formasi (bo'sh holatda va mavjud
// bo'lganda "boshqa farzand qo'shish" uchun ishlatiladi).
function LinkChildForm({ phone, setPhone, onSubmit, linking, compact }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  return (
    <View style={compact ? styles.linkFormCompact : styles.linkForm}>
      <Text style={styles.linkLabel}>FARZAND TELEFON RAQAMI</Text>
      <View style={styles.linkRow}>
        <View style={styles.codeBox}>
          <Text style={styles.codeText}>+998</Text>
        </View>
        <TextInput
          style={styles.linkInput}
          placeholder="90 123 45 67"
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
      </View>
      <Button
        title={linking ? 'Yuborilmoqda…' : 'Ulash so\'rovini yuborish'}
        height={48}
        radius={12}
        fontSize={14}
        style={{ marginTop: 10 }}
        disabled={linking}
        onPress={onSubmit}
      />
      <Text style={styles.linkHint}>
        Farzandingiz o'z ilovasida so'rovni tasdiqlagach, uning natijalari shu yerda ko'rinadi.
      </Text>
    </View>
  );
}

// Sizni "farzand" sifatida kuzatmoqchi bo'lgan ota-ona so'rovlari (backend
// `list_parent_requests` — websaytda StudentDashboard'da ko'rinadi). Tasdiqlash
// yoki rad etish tugmalari bilan.
function ParentRequestsSection({ requests, respondingId, onRespond }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  return (
    <View style={styles.requestsSection}>
      <View style={styles.requestsHeaderRow}>
        <UsersIcon size={16} color={colors.gold} />
        <Text style={styles.requestsTitle}>Ota-ona kuzatuv so'rovlari</Text>
      </View>
      <Text style={styles.requestsDesc}>
        Quyidagi shaxslar sizni "farzand" sifatida kuzatmoqchi. Tasdiqlasangiz,
        ular natijalaringiz va faolligingizni ko'ra oladi.
      </Text>
      {requests.map((req) => {
        const busy = respondingId === req.link_id;
        return (
          <Card key={req.link_id} radius={14} style={styles.requestRow} background={colors.surfaceDeep}>
            <View style={styles.requestTop}>
              <Avatar
                letter={initialOf(req.parent_name)}
                uri={req.avatar_url || undefined}
                size={40}
                fontSize={16}
                background={tints.gold14}
                color={colors.gold}
              />
              <View style={styles.requestInfo}>
                <Text style={styles.requestName} numberOfLines={1}>
                  {req.parent_name || 'Foydalanuvchi'}
                </Text>
                {req.parent_username ? (
                  <Text style={styles.requestUser} numberOfLines={1}>@{req.parent_username}</Text>
                ) : null}
              </View>
            </View>
            <View style={styles.requestBtns}>
              <Button
                title="Tasdiqlash"
                variant="success"
                height={40}
                radius={11}
                fontSize={13}
                style={styles.requestBtn}
                disabled={busy}
                onPress={() => onRespond(req.link_id, true)}
              />
              <Button
                title="Rad etish"
                variant="muted"
                height={40}
                radius={11}
                fontSize={13}
                style={styles.requestBtn}
                disabled={busy}
                onPress={() => onRespond(req.link_id, false)}
              />
            </View>
          </Card>
        );
      })}
    </View>
  );
}

// Bitta farzandning AI muvaffaqiyat bashorati (3 ta yo'nalish foizi + AI tavsiya).
function PredictionBlock({ state }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  if (!state || state.loading) {
    return (
      <View style={styles.predLoadingRow}>
        <ActivityIndicator size="small" color={colors.blue} />
        <Text style={styles.predLoadingText}>Bashorat hisoblanmoqda…</Text>
      </View>
    );
  }
  if (state.error) {
    return <Text style={styles.predLoadingText}>Bashoratni yuklab bo'lmadi</Text>;
  }
  const p = state.data?.predictions || {};
  const items = [
    { key: 'presidential_school', label: 'Prezident\nmaktabi', value: p.presidential_school ?? 0, color: colors.blue },
    { key: 'al_xorazmiy', label: 'Al-Xorazmiy', value: p.al_xorazmiy ?? 0, color: colors.purple },
    { key: 'dtm', label: 'DTM testlari', value: p.dtm ?? 0, color: colors.green },
  ];
  const tip = state.data?.ai_analysis;
  return (
    <View>
      <View style={styles.predRow}>
        {items.map((it) => (
          <View key={it.key} style={styles.predItem}>
            <DonutProgress size={58} strokeWidth={6} progress={it.value} color={it.color}>
              <Text style={[styles.predPct, { color: it.color }]}>{it.value}%</Text>
            </DonutProgress>
            <Text style={styles.predLabel}>{it.label}</Text>
          </View>
        ))}
      </View>
      {tip ? (
        <View style={styles.aiTip}>
          <SparkleIcon size={12} color={colors.blueLight} />
          <Text style={styles.aiTipText}>{tip}</Text>
        </View>
      ) : null}
    </View>
  );
}

// Bitta farzand kartasi: profil, statistika, AI bashorat, so'nggi natijalar,
// haftalik hisobot toggli va bog'lanishni bekor qilish tugmasi.
function ChildCard({ child, predState, digestOn, onToggleDigest, onUnlink, unlinking }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const RESULT_TINTS = makeRESULT_TINTS(colors, tints);
  const RESULT_COLORS = makeRESULT_COLORS(colors, tints);

  const attempts = child.attempts || [];
  const avg = attempts.length
    ? Math.round(attempts.reduce((s, a) => s + (a.score || 0), 0) / attempts.length)
    : 0;
  const bestScore = attempts.reduce((m, a) => ((a.score || 0) > m ? a.score : m), 0);
  const childSub = child.username ? `@${child.username}` : "Olympy o'quvchisi";
  const weeklyActivity = buildWeeklyActivity(child, colors);

  return (
    <Card radius={20} style={styles.childCard}>
      <View style={styles.childHeader}>
        <Avatar
          letter={initialOf(child.full_name)}
          uri={child.avatar_url || undefined}
          size={52}
          fontSize={20}
        />
        <View style={styles.childInfo}>
          <Text style={styles.childName} numberOfLines={1}>{child.full_name}</Text>
          <Text style={styles.childSub} numberOfLines={1}>{childSub}</Text>
          <View style={styles.childBadges}>
            <Badge
              label={`${child.streak_count ?? 0} kun`}
              color={colors.orange}
              background={tints.orange14}
              icon={<FlameIcon size={10} />}
              style={styles.childBadge}
            />
            <Badge
              label={`${attempts.length} tadbir`}
              color={colors.blueLight}
              background={tints.blue14}
              style={styles.childBadge}
            />
          </View>
        </View>
        <TouchableOpacity
          onPress={() => onUnlink(child)}
          disabled={unlinking}
          activeOpacity={0.7}
          style={styles.unlinkBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {unlinking ? (
            <ActivityIndicator size="small" color={colors.red} />
          ) : (
            <Text style={styles.unlinkText}>Uzish</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <StatCard label="Jami tadbirlar" value={attempts.length} valueSize={20} radius={14} />
        <StatCard label="O'rtacha" value={avg || '—'} valueSize={20} radius={14} />
        <StatCard label="Eng yaxshi" value={bestScore || '—'} valueSize={20} radius={14} />
      </View>

      <View style={styles.predHeaderRow}>
        <SparkleIcon size={12} color={colors.blueLight} />
        <Text style={styles.blockTitle}>AI muvaffaqiyat bashorati</Text>
      </View>
      <PredictionBlock state={predState} />

      {weeklyActivity ? (
        <>
          <Text style={styles.blockTitle}>Haftalik faollik</Text>
          <View style={styles.chartCard}>
            <ActivityBarChart data={weeklyActivity} height={100} />
          </View>
        </>
      ) : null}

      <Text style={styles.blockTitle}>So'nggi natijalar</Text>
      {attempts.length === 0 ? (
        <Text style={styles.emptyInline}>Hali natija yo'q</Text>
      ) : (
        <View style={styles.results}>
          {attempts.slice(0, 5).map((a, i) => (
            <View key={a.attempt_id || i} style={styles.resultCard}>
              <IconBox size={38} radius={11} background={RESULT_TINTS[i % RESULT_TINTS.length]}>
                <Text style={[styles.resultScore, { color: RESULT_COLORS[i % RESULT_COLORS.length] }]}>
                  {a.score}
                </Text>
              </IconBox>
              <View style={styles.resultText}>
                <Text style={styles.resultTitle} numberOfLines={1}>{a.olympiad_title || 'Tadbir'}</Text>
                <Text style={styles.resultSub}>
                  {[a.subject, a.rank ? `${a.rank}-o'rin` : null].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <ChevronRightIcon size={13} />
            </View>
          ))}
        </View>
      )}

      <View style={styles.reportRow}>
        <BellIcon size={16} color={colors.blue} />
        <Text style={styles.reportText}>
          Haftalik hisobot har yakshanba Telegram orqali yuboriladi
        </Text>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onToggleDigest(child)}
          style={[styles.toggle, digestOn ? null : styles.toggleOff]}
        >
          <View style={[styles.toggleKnob, digestOn ? null : styles.toggleKnobOff]} />
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const makeRESULT_TINTS = (colors, tints) => ([tints.blue13, tints.green13, tints.gold13]);
const makeRESULT_COLORS = (colors, tints) => ([colors.blueLight, colors.greenLight, colors.gold]);
const asArray = (data) => (Array.isArray(data) ? data : data?.results || data?.children || []);
const initialOf = (name) => (name || '?').trim()[0]?.toUpperCase() || '?';

// Backend `weekly_activity` maydonini yuborsa grafik chizamiz — hozircha
// yuborilmaydi, shuning uchun bu odatda null qaytaradi (grafik ko'rinmaydi).
function buildWeeklyActivity(child, colors) {
  const raw = Array.isArray(child.weekly_activity) ? child.weekly_activity : null;
  if (!raw || !raw.length) return null;
  const vals = raw.map((d) =>
    typeof d === 'number' ? d : Number(d.value ?? d.count ?? d.questions ?? 0)
  );
  const max = Math.max(1, ...vals);
  return raw.map((d, i) => ({
    value: Math.max(4, Math.round((vals[i] / max) * 100)),
    label: (typeof d === 'object' && (d.label || d.day)) || WEEK_LABELS[i] || '',
    color: colors.blue,
    active: i === raw.length - 1,
    glow: i === raw.length - 1,
  }));
}

export default function ParentScreen() {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);

  const { data, loading, error, reload } = useFetch(
    () => parentApi.children().then((r) => asArray(r.data)),
    []
  );
  // Ota-ona kuzatuv so'rovlari alohida yuklanadi — asosiy ekranni bloklamaydi.
  const requestsFetch = useFetch(
    () => parentApi.parentRequests().then((r) => asArray(r.data)),
    []
  );

  const [phone, setPhone] = useState('');
  const [linking, setLinking] = useState(false);
  const [digestOverride, setDigestOverride] = useState({}); // { [studentId]: bool }
  const [predMap, setPredMap] = useState({}); // { [studentId]: { loading|data|error } }
  const [respondingId, setRespondingId] = useState(null);
  const [unlinkingId, setUnlinkingId] = useState(null);
  const requestedPreds = useRef(new Set());

  const children = data || [];
  const requests = requestsFetch.data || [];

  // Har bir farzand uchun bashoratni bir marta (fon rejimida) yuklaymiz.
  useEffect(() => {
    children.forEach((c) => {
      if (c && c.student_id != null && !requestedPreds.current.has(c.student_id)) {
        requestedPreds.current.add(c.student_id);
        loadPrediction(c.student_id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const loadPrediction = async (studentId) => {
    setPredMap((m) => ({ ...m, [studentId]: { loading: true } }));
    try {
      const { data: res } = await parentApi.childPredictions(studentId);
      setPredMap((m) => ({ ...m, [studentId]: { loading: false, data: res } }));
    } catch (e) {
      setPredMap((m) => ({ ...m, [studentId]: { loading: false, error: true } }));
    }
  };

  const linkChild = async () => {
    const raw = phone.trim();
    if (!raw || linking) return;
    const full = raw.startsWith('+') ? raw : `+998${raw.replace(/\D/g, '')}`;
    setLinking(true);
    try {
      const { data: res } = await parentApi.linkChild({ student_phone: full });
      Alert.alert(
        "So'rov yuborildi",
        res?.detail || "Farzand so'rovni tasdiqlagach ma'lumotlari ko'rinadi.",
        [{ text: 'Yaxshi' }]
      );
      setPhone('');
      reload();
    } catch (e) {
      const detail = e?.response?.data?.detail;
      Alert.alert('Xatolik', detail || "Farzandni ulab bo'lmadi. Telefon raqamni tekshiring.");
    } finally {
      setLinking(false);
    }
  };

  const toggleDigest = async (child) => {
    const id = child.student_id;
    const current = digestOverride[id] ?? child.weekly_digest_enabled;
    const next = !current;
    setDigestOverride((m) => ({ ...m, [id]: next }));
    try {
      await parentApi.toggleWeeklyDigest(id, next);
    } catch (e) {
      setDigestOverride((m) => ({ ...m, [id]: current })); // xatoda qaytaramiz
      Alert.alert('Xatolik', "Sozlamani o'zgartirib bo'lmadi.");
    }
  };

  const respondRequest = async (linkId, accept) => {
    if (respondingId) return;
    setRespondingId(linkId);
    try {
      await parentApi.respondParentRequest(linkId, accept);
      requestsFetch.reload();
    } catch (e) {
      Alert.alert('Xatolik', "So'rovni qayta ishlab bo'lmadi. Keyinroq urinib ko'ring.");
    } finally {
      setRespondingId(null);
    }
  };

  // Bog'lanishni bekor qilish — tasodifan bosilmasligi uchun tasdiqlash bilan.
  const confirmUnlink = (child) => {
    Alert.alert(
      "Bog'lanishni bekor qilish",
      `${child.full_name || 'Farzand'}ni ro'yxatdan olib tashlaysizmi? Uning natijalari endi sizga ko'rinmaydi.`,
      [
        { text: 'Bekor qilish', style: 'cancel' },
        { text: 'Olib tashlash', style: 'destructive', onPress: () => doUnlink(child.student_id) },
      ]
    );
  };

  const doUnlink = async (studentId) => {
    setUnlinkingId(studentId);
    try {
      await parentApi.unlinkChild(studentId);
      requestedPreds.current.delete(studentId);
      setPredMap((m) => {
        const next = { ...m };
        delete next[studentId];
        return next;
      });
      reload();
    } catch (e) {
      Alert.alert('Xatolik', "Bog'lanishni bekor qilib bo'lmadi. Keyinroq urinib ko'ring.");
    } finally {
      setUnlinkingId(null);
    }
  };

  if (loading) return <LoadingState message="Yuklanmoqda…" />;
  if (error) return <ErrorState onRetry={reload} />;

  const hasChildren = children.length > 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Farzandlaringiz</Text>
            <Text style={styles.subtitle}>Ota-ona rejimi · faqat kuzatish</Text>
          </View>
          {hasChildren ? (
            <Badge
              label={`${children.length} ta`}
              color={colors.greenLight}
              background={tints.green14}
              borderColor={tints.greenBorder30}
              size={11.5}
              style={styles.connectedBadge}
            />
          ) : null}
        </View>

        {requests.length > 0 ? (
          <ParentRequestsSection
            requests={requests}
            respondingId={respondingId}
            onRespond={respondRequest}
          />
        ) : null}

        {!hasChildren ? (
          <Card radius={20} style={styles.emptyLinkCard}>
            <Text style={styles.emptyText}>Hali farzand ulanmagan</Text>
            <LinkChildForm phone={phone} setPhone={setPhone} onSubmit={linkChild} linking={linking} />
          </Card>
        ) : (
          <>
            {children.map((child) => (
              <ChildCard
                key={child.student_id}
                child={child}
                predState={predMap[child.student_id]}
                digestOn={digestOverride[child.student_id] ?? child.weekly_digest_enabled}
                onToggleDigest={toggleDigest}
                onUnlink={confirmUnlink}
                unlinking={unlinkingId === child.student_id}
              />
            ))}

            <Text style={styles.sectionTitle}>Boshqa farzand ulash</Text>
            <Card radius={18} style={styles.addChildCard}>
              <LinkChildForm phone={phone} setPhone={setPhone} onSubmit={linkChild} linking={linking} compact />
            </Card>
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
  content: {
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 19,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
  },
  connectedBadge: {
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 10,
  },

  // ── Ota-ona kuzatuv so'rovlari ──────────────────────────────────
  requestsSection: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: tints.goldBorder30,
    borderRadius: 18,
    backgroundColor: tints.gold06,
    padding: 15,
    gap: 10,
  },
  requestsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requestsTitle: {
    fontSize: 14.5,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  requestsDesc: {
    fontSize: 11.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  requestRow: {
    padding: 12,
    gap: 11,
  },
  requestTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 13.5,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  requestUser: {
    fontSize: 11.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 1,
  },
  requestBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  requestBtn: {
    flex: 1,
  },

  // ── Farzand kartasi ─────────────────────────────────────────────
  childCard: {
    marginTop: 14,
    padding: 16,
  },
  childHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 16,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  childSub: {
    fontSize: 11.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 2,
  },
  childBadges: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 6,
  },
  childBadge: {
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 8,
  },
  unlinkBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: tints.redBorder40,
    backgroundColor: tints.red10,
  },
  unlinkText: {
    fontSize: 11.5,
    fontFamily: FONTS.extrabold,
    color: colors.red,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },

  // ── AI bashorat ─────────────────────────────────────────────────
  predHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
    marginBottom: 12,
  },
  predRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  predItem: {
    alignItems: 'center',
    flex: 1,
  },
  predPct: {
    fontSize: 13,
    fontFamily: FONTS.extrabold,
  },
  predLabel: {
    fontSize: 10.5,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 7,
    lineHeight: 13,
  },
  predLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  predLoadingText: {
    fontSize: 12,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
    paddingVertical: 6,
  },
  aiTip: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tints.blueBorder30,
    backgroundColor: tints.blue06,
  },
  aiTipText: {
    flex: 1,
    fontSize: 11.5,
    fontFamily: FONTS.semibold,
    color: colors.blueSoftText,
    lineHeight: 17,
  },

  // ── Umumiy blok sarlavhasi ──────────────────────────────────────
  blockTitle: {
    fontSize: 13.5,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    marginTop: 20,
    marginBottom: 10,
  },
  chartCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surfaceDeep,
    padding: 16,
  },

  // ── Natijalar ───────────────────────────────────────────────────
  results: {
    gap: 8,
  },
  resultCard: {
    paddingVertical: 11,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceDeep,
  },
  resultScore: {
    fontSize: 14,
    fontFamily: FONTS.extrabold,
  },
  resultText: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 13,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  resultSub: {
    fontSize: 10.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
  },
  emptyInline: {
    fontSize: 12,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
    paddingVertical: 8,
  },

  // ── Haftalik hisobot toggli ─────────────────────────────────────
  reportRow: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: tints.blueBorder30,
    borderRadius: 14,
    backgroundColor: tints.blue06,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  reportText: {
    flex: 1,
    fontSize: 11.5,
    fontFamily: FONTS.bold,
    color: colors.blueSoftText,
    lineHeight: 16,
  },
  toggle: {
    width: 40,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.blue,
    justifyContent: 'center',
  },
  toggleOff: {
    backgroundColor: colors.borderStrong,
  },
  toggleKnob: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.white,
  },
  toggleKnobOff: {
    right: undefined,
    left: 2,
  },

  // ── Bo'sh holat / farzand ulash ─────────────────────────────────
  emptyLinkCard: {
    marginTop: 18,
    padding: 20,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
    textAlign: 'center',
  },
  addChildCard: {
    padding: 16,
    marginBottom: 8,
  },
  linkForm: {
    marginTop: 14,
  },
  linkFormCompact: {
    marginTop: 0,
  },
  linkLabel: {
    fontSize: 11,
    fontFamily: FONTS.extrabold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  linkRow: {
    flexDirection: 'row',
    gap: 8,
  },
  codeBox: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    backgroundColor: colors.surfaceDeep,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  codeText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: colors.text,
  },
  linkInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: colors.text,
  },
  linkHint: {
    fontSize: 11.5,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
    lineHeight: 16.5,
    marginTop: 10,
  },
});
