import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import { useTabBarSpacing } from '../components/TabBar';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Avatar from '../components/Avatar';
import SearchBar from '../components/SearchBar';
import ProgressBar from '../components/ProgressBar';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useFetch from '../services/useFetch';
import { teacherApi, managerApi } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { EyeIcon } from '../components/icons/Icons';

const asResults = (data) => (Array.isArray(data) ? data : data?.results || []);
const nameOf = (s) => s?.student_name || "O'quvchi";
const firstLetter = (s) => (nameOf(s)[0] || '?').toUpperCase();

const makeAVATAR_COLORS = (colors, tints) => ([colors.blue, colors.purple, colors.green, colors.blueDeep, colors.orange]);

const makeBADGE = (colors, tints) => ({
  completed: { label: 'Tugatdi', color: colors.blueLight, bg: tints.blue14 },
  disqualified: { label: 'Diskval.', color: colors.red, bg: tints.red16 },
  offline: { label: 'Offline', color: colors.gray, bg: tints.slate14 },
});

const fmtRemain = (secs) => {
  const s = Math.max(0, Math.floor(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(r)}` : `${pad(m)}:${pad(r)}`;
};

export default function ProctoringScreen() {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const AVATAR_COLORS = makeAVATAR_COLORS(colors, tints);
  const BADGE = makeBADGE(colors, tints);
  const tabBarSpacing = useTabBarSpacing();
  const { user } = useAuth();
  // Sof menejer/direktor (teacher a'zoligisiz) uchun /api/me/teacher/olympiads/
  // bo'sh qaytaradi — bunday holda faol tadbirni markaz statistikasidan topamiz.
  const isManager = ['manager', 'owner', 'director'].some((r) =>
    Array.isArray(user?.roles) ? user.roles.includes(r) : false
  );
  const [query, setQuery] = useState('');
  // Faol tadbir countdown'i uchun soat — faqat active topilgach yoqiladi.
  const [now, setNow] = useState(Date.now());
  const [clockOn, setClockOn] = useState(false);
  useEffect(() => {
    if (!clockOn) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [clockOn]);
  const { data, loading, refreshing, error, reload, refresh } = useFetch(async () => {
    const olyData = await teacherApi.myOlympiads().then((r) => r.data).catch(() => null);
    const olympiads = olyData === null ? [] : asResults(olyData);
    let active = olympiads.find((o) => o.status === 'active') || null;
    // Menejer uchun fallback: teacher olimpiadalari bo'sh bo'lsa, markaz
    // statistikasidagi faol tadbirni ishlatamiz. Teacher oqimiga ta'sir
    // qilmaydi (u yerda `active` allaqachon topilgan bo'ladi).
    if (!active && isManager) {
      const events = await managerApi
        .stats(undefined, { page_size: 200 })
        .then((r) => (Array.isArray(r.data?.events) ? r.data.events : []))
        .catch(() => []);
      const ev = events.find((e) => e.status === 'active');
      if (ev) {
        active = { id: ev.olympiad_id, title: ev.title, subject: ev.subject, status: 'active' };
      }
    }
    if (olyData === null && !active) {
      throw new Error('proctoring_load_failed');
    }
    if (!active) return { active: null, students: [] };
    const students = await managerApi
      .liveProctoring(active.id)
      .then((r) => (Array.isArray(r.data) ? r.data : []))
      .catch(() => []);
    return { active, students };
  }, [isManager]);

  const active = data?.active || null;
  useEffect(() => {
    setClockOn(!!active);
  }, [active]);
  const students = data?.students || [];

  // Faol tadbir tugashigacha qolgan vaqt (expires_at / end_datetime, aks holda
  // boshlanish + davomiylik).
  const eventEndTs = (() => {
    if (!active) return null;
    const iso = active.expires_at || active.end_datetime || active.ends_at;
    if (iso) {
      const t = new Date(iso).getTime();
      return Number.isNaN(t) ? null : t;
    }
    if (active.start_datetime && active.duration_minutes) {
      const t = new Date(active.start_datetime).getTime();
      return Number.isNaN(t) ? null : t + active.duration_minutes * 60000;
    }
    return null;
  })();
  const remainSec = eventEndTs != null ? Math.max(0, Math.floor((eventEndTs - now) / 1000)) : null;

  const stats = useMemo(() => {
    let online = 0;
    let finished = 0;
    let disq = 0;
    students.forEach((s) => {
      if (s.status === 'disqualified') disq += 1;
      else if (s.status === 'completed') finished += 1;
      else if (s.is_online) online += 1;
    });
    return { online, finished, disq };
  }, [students]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => nameOf(s).toLowerCase().includes(q));
  }, [students, query]);

  if (loading) return <LoadingState message="Nazorat yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  if (!active) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <EmptyState
          icon={<EyeIcon size={24} color={colors.blueLight} />}
          title="Faol nazorat yo'q"
          message="Hozircha jonli kuzatiladigan faol tadbir yo'q. Tadbir boshlanganda o'quvchilar shu yerda ko'rinadi."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarSpacing }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.blue} />}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <View style={styles.titleRow}>
              <View style={styles.liveDot} />
              <Text style={styles.title}>Jonli nazorat</Text>
            </View>
            <Text style={styles.subtitle} numberOfLines={1}>
              {active.title}
              {remainSec != null && remainSec > 0 ? ` · ${fmtRemain(remainSec)} qoldi` : ''}
            </Text>
          </View>
          <Badge
            label="Faol"
            color={colors.greenLight}
            background={tints.green14}
            borderColor={tints.greenBorder30}
            size={11.5}
            style={styles.statusBadge}
          />
        </View>

        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.greenLight }]}>{stats.online}</Text>
            <Text style={styles.statLabel}>Faol / online</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.blue }]}>{stats.finished}</Text>
            <Text style={styles.statLabel}>Tugatganlar</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.red }]}>{stats.disq}</Text>
            <Text style={styles.statLabel}>Diskvalifikatsiya</Text>
          </Card>
        </View>

        <SearchBar
          placeholder="O'quvchini qidirish"
          value={query}
          onChangeText={setQuery}
          style={styles.search}
        />

        {students.length === 0 ? (
          <EmptyState
            compact
            icon={<EyeIcon size={24} color={colors.blueLight} />}
            title="Ishtirokchi yo'q"
            message="Bu tadbirda hali test boshlagan o'quvchi yo'q."
          />
        ) : (
          <View style={styles.list}>
            {filtered.map((s, i) => {
              const total = s.total_questions || 0;
              const answered = s.answered_count || 0;
              const progress = total ? Math.round((answered / total) * 100) : 0;
              const isDisq = s.status === 'disqualified';
              // Offline: tugatmagan, diskval bo'lmagan, online bo'lmagan o'quvchi.
              const badgeKey = isDisq
                ? 'disqualified'
                : s.status === 'completed'
                ? 'completed'
                : !s.is_online
                ? 'offline'
                : null;
              const badge = badgeKey ? BADGE[badgeKey] : null;
              const dotColor = isDisq
                ? colors.red
                : s.status === 'completed'
                ? colors.blue
                : s.is_online
                ? colors.greenLight
                : colors.gray;
              const sub = isDisq
                ? s.cheating_reason || `Ekrandan ${s.tab_escapes || 0} marta chiqdi`
                : `${answered}/${total} savol · ${s.is_online ? 'faol' : 'offline'}`;
              return (
                <View
                  key={s.student_id}
                  style={[styles.studentCard, isDisq ? styles.dangerCard : null]}
                >
                  <View>
                    <Avatar
                      letter={firstLetter(s)}
                      size={36}
                      fontSize={13}
                      background={AVATAR_COLORS[i % AVATAR_COLORS.length]}
                    />
                    <View style={[styles.presenceDot, { backgroundColor: dotColor }]} />
                  </View>
                  <View style={styles.studentText}>
                    <Text style={styles.studentName} numberOfLines={1}>{nameOf(s)}</Text>
                    <Text
                      style={[styles.studentSub, isDisq ? { color: colors.redSoftText } : null]}
                      numberOfLines={1}
                    >
                      {sub}
                    </Text>
                  </View>
                  {badge ? (
                    <Badge
                      label={badge.label}
                      color={badge.color}
                      background={badge.bg}
                      size={10}
                      style={styles.miniBadge}
                    />
                  ) : (
                    <ProgressBar progress={progress} height={6} color={colors.greenLight} style={styles.progress} />
                  )}
                </View>
              );
            })}
          </View>
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
    paddingBottom: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.red,
  },
  title: {
    fontSize: 17,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontFamily: FONTS.extrabold,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
  },
  search: {
    marginTop: 12,
  },
  list: {
    gap: 7,
    marginTop: 12,
  },
  studentCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
    paddingVertical: 11,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  dangerCard: {
    borderColor: tints.redBorder35,
    backgroundColor: tints.red07,
  },
  presenceDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  studentText: {
    flex: 1,
  },
  studentName: {
    fontSize: 13,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  studentSub: {
    fontSize: 10.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
  },
  progress: {
    width: 60,
  },
  miniBadge: {
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 7,
  },
});
