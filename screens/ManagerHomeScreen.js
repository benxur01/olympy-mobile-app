import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Avatar from '../components/Avatar';
import IconBox from '../components/IconBox';
import Fab from '../components/Fab';
import QuickMenu from '../components/QuickMenu';
import SectionHeader from '../components/SectionHeader';
import Button from '../components/Button';
import StatCard from '../components/StatCard';
import ActivityBarChart from '../components/ActivityBarChart';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import useFetch from '../services/useFetch';
import { managerApi, notificationsApi } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { centerIdForUser } from '../services/roles';
import {
  BellIcon,
  PlusIcon,
  CalendarIcon,
  ClockIcon,
  QuestionCircleIcon,
  MenuIcon,
  BookIcon,
  SettingsIcon,
  ProfileBadgeIcon,
  UsersIcon,
  TrophyIcon,
  EyeIcon,
  EditIcon,
  CheckIcon,
} from '../components/icons/Icons';

const asArray = (data) => (Array.isArray(data) ? data : data?.results || []);
const initialOf = (name) => (name || '?').trim()[0]?.toUpperCase() || '?';

const makeSTATUS_META = (colors, tints) => ({
  active: { label: 'Faol', color: colors.greenLight, bg: tints.green14, icon: 'trophy' },
  finished: { label: 'Tugagan', color: colors.slate, bg: tints.slate14, icon: 'check' },
  inactive: { label: 'Nofaol', color: colors.orange, bg: tints.orange14, icon: 'clock' },
  draft: { label: 'Qoralama', color: colors.textMuted, bg: tints.slate14, icon: 'edit' },
});

export default function ManagerHomeScreen({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const STATUS_META = makeSTATUS_META(colors, tints);
  const { user, logout } = useAuth();
  const centerId = centerIdForUser(user);
  const [menuOpen, setMenuOpen] = useState(false);

  const { data, loading, refreshing, error, reload, refresh } = useFetch(async () => {
    const [stats, students, pending, notifs] = await Promise.all([
      // Barcha tadbirlarni bitta sahifada olish uchun page_size=200.
      managerApi.stats(centerId, { page_size: 200 }).then((r) => r.data).catch(() => null),
      centerId
        ? managerApi.studentsMemberships(centerId).then((r) => r.data).catch(() => null)
        : Promise.resolve(null),
      centerId
        ? managerApi.pendingMemberships(centerId).then((r) => r.data).catch(() => null)
        : Promise.resolve(null),
      notificationsApi.list().then((r) => r.data).catch(() => null),
    ]);
    if (stats === null && students === null && pending === null) {
      throw new Error('manager_home_load_failed');
    }
    const notifList = asArray(notifs);
    return {
      stats: stats || null,
      students: asArray(students),
      pending: asArray(pending),
      unread: notifList.filter((n) => !n.is_read).length,
    };
  }, [centerId]);

  if (loading) return <LoadingState message="Panel yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  const stats = data?.stats || {};
  const students = data?.students || [];
  const pending = data?.pending || [];
  const unread = data?.unread || 0;
  const events = Array.isArray(stats.events) ? stats.events : [];

  const centerName = stats.center_name || user?.center_name || 'Markaz';
  const firstName = (user?.full_name || 'Menejer').split(' ')[0];
  const initial = initialOf(user?.full_name);

  const activeEvents = events.filter((e) => e.status === 'active');
  const totalEvents = stats.events_total ?? events.length;
  const pendingCount = pending.length;
  const studentsCount = students.length;
  const avgScore = Math.round(stats.average_score || 0);

  // Eng yaxshi o'quvchilar — tasdiqlangan a'zolar o'rtacha ball bo'yicha (premium
  // top-students endpoint'iga bog'liq emas, har doim ishlaydi).
  const topStudents = [...students]
    .sort((a, b) => (b.avg_score || 0) - (a.avg_score || 0))
    .slice(0, 5);

  // Faollik grafigi — eng ko'p ishtirokchili tadbirlar bo'yicha o'rtacha ball
  // (haqiqiy ma'lumot; websitedagi soxta "haftalik faollik" o'rniga).
  const chartEvents = events
    .filter((e) => (e.participants || 0) > 0)
    .sort((a, b) => (b.participants || 0) - (a.participants || 0))
    .slice(0, 7);
  const chartData = chartEvents.map((e, i) => ({
    value: Math.max(4, Math.round(e.average_score || 0)),
    label: (e.subject || e.title || '—').slice(0, 4),
    color: colors.blue,
    active: i === 0,
    glow: i === 0,
  }));

  const menuItems = [
    { label: 'Tadbir yaratish', icon: <PlusIcon size={16} color={colors.blue} />, onPress: () => navigation.navigate('CreateOlympiad') },
    { label: 'Barcha tadbirlar', icon: <CalendarIcon size={18} color={colors.textSecondary} strokeWidth={2} />, onPress: () => navigation.navigate('TeacherOlympiads') },
    { label: 'Savol banki', icon: <BookIcon size={18} color={colors.textSecondary} />, onPress: () => navigation.navigate('QuestionCreator') },
    { label: 'Essay baholash', icon: <EditIcon size={17} color={colors.textSecondary} />, onPress: () => navigation.navigate('EssayGrading') },
    { label: 'Reyting', icon: <TrophyIcon size={17} color={colors.gold} />, onPress: () => navigation.navigate('Leaderboard') },
    { label: 'Parolni o\'zgartirish', icon: <SettingsIcon size={18} color={colors.textSecondary} />, onPress: () => navigation.navigate('ChangePassword') },
    { label: 'Hisobdan chiqish', icon: <ProfileBadgeIcon size={18} color={colors.red} />, danger: true, onPress: async () => { await logout(); navigation.reset({ index: 0, routes: [{ name: 'Splash' }] }); } },
  ];

  const confirmLogout = () => {
    Alert.alert('Chiqish', 'Hisobdan chiqmoqchimisiz?', [
      { text: 'Bekor qilish', style: 'cancel' },
      {
        text: 'Chiqish',
        style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.reset({ index: 0, routes: [{ name: 'Splash' }] });
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.blue} />}
      >
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.8} style={styles.menuBox} onPress={() => setMenuOpen(true)}>
            <MenuIcon size={22} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.greeting} numberOfLines={1}>Salom, {firstName}!</Text>
            <Text style={styles.center} numberOfLines={1}>Menejer · {centerName}</Text>
          </View>
          <TouchableOpacity activeOpacity={0.8} style={styles.bellBox} onPress={() => navigation.navigate('Notifications')}>
            <BellIcon size={18} />
            {unread > 0 ? <View style={styles.bellDot} /> : null}
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8} onPress={confirmLogout}>
            <Avatar letter={initial} size={38} fontSize={15} background={colors.purple} />
          </TouchableOpacity>
        </View>

        <Button
          title="Tadbir yaratish"
          height={50}
          radius={14}
          fontSize={15}
          shadow
          icon={<PlusIcon size={16} />}
          style={styles.createBtn}
          onPress={() => navigation.navigate('CreateOlympiad')}
        />

        {/* Markaz KPI'lari */}
        <View style={styles.kpiGrid}>
          <StatCard
            label="Kutilayotgan arizalar"
            value={pendingCount}
            note={pendingCount > 0 ? 'Yangi' : 'Yo\'q'}
            noteColor={pendingCount > 0 ? colors.orange : colors.textSecondary}
            valueColor={pendingCount > 0 ? colors.orange : colors.text}
            style={styles.kpi}
          />
          <StatCard
            label="O'quvchilar"
            value={studentsCount}
            note="Tasdiqlangan"
            noteColor={colors.greenLight}
            style={styles.kpi}
          />
          <StatCard
            label="Faol tadbirlar"
            value={activeEvents.length}
            note={`${totalEvents} jami`}
            style={styles.kpi}
          />
          <StatCard
            label="O'rtacha ball"
            value={avgScore}
            valueColor={colors.gold}
            note={`${stats.participants || 0} qatnashuvchi`}
            borderColor={tints.goldBorder30}
            background={tints.gold06}
            style={styles.kpi}
          />
        </View>

        {/* Faollik grafigi */}
        {chartData.length > 0 ? (
          <Card style={styles.chartCard}>
            <Text style={styles.cardHeading}>Tadbirlar bo'yicha o'rtacha ball</Text>
            <ActivityBarChart style={{ marginTop: 14 }} height={96} data={chartData} />
          </Card>
        ) : null}

        {/* O'quvchi arizalari */}
        <SectionHeader title="O'quvchi arizalari" action="Barchasi" onAction={() => navigation.navigate('MArizalar')} />
        {pendingCount === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Yangi arizalar yo'q</Text>
          </Card>
        ) : (
          <View style={styles.list}>
            {pending.slice(0, 3).map((m, i) => {
              const u = m.user || {};
              const name = u.full_name || u.username || u.phone || "O'quvchi";
              return (
                <Card key={m.membership_id || i} style={styles.rowCard}>
                  <Avatar letter={initialOf(name)} size={36} fontSize={14} background={colors.blue} />
                  <View style={styles.rowText}>
                    <Text style={styles.rowName} numberOfLines={1}>{name}</Text>
                    <Text style={styles.rowSub} numberOfLines={1}>{u.phone || m.subject || '—'}</Text>
                  </View>
                  <Badge label="Kutilmoqda" color={colors.orange} background={tints.orange14} />
                </Card>
              );
            })}
            {pendingCount > 3 ? (
              <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('MArizalar')}>
                <Text style={styles.moreLink}>Yana {pendingCount - 3} ta ariza →</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* Tadbirlar */}
        <SectionHeader title="Tadbirlar" action="Ko'rish" onAction={() => navigation.navigate('MNatijalar')} />
        {events.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Hali tadbir yaratilmagan</Text>
          </Card>
        ) : (
          <View style={styles.list}>
            {events.slice(0, 4).map((e) => {
              const st = STATUS_META[e.status] || STATUS_META.draft;
              return (
                <Card key={e.olympiad_id} style={styles.rowCard}>
                  <IconBox size={36} radius={11} background={st.bg}>
                    {st.icon === 'trophy' ? <TrophyIcon size={16} color={st.color} />
                      : st.icon === 'check' ? <CheckIcon size={16} color={st.color} />
                      : st.icon === 'clock' ? <ClockIcon size={15} color={st.color} />
                      : <EditIcon size={15} color={st.color} />}
                  </IconBox>
                  <View style={styles.rowText}>
                    <Text style={styles.rowName} numberOfLines={1}>{e.title}</Text>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {[e.subject, `${e.participants || 0} ishtirokchi`].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  {e.status === 'active' ? (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.liveBtn}
                      onPress={() => navigation.navigate('MNazorat')}
                    >
                      <EyeIcon size={12} color={colors.greenLight} />
                      <Text style={styles.liveBtnText}>Jonli</Text>
                    </TouchableOpacity>
                  ) : (
                    <Badge label={st.label} color={st.color} background={st.bg} />
                  )}
                </Card>
              );
            })}
          </View>
        )}

        {/* Eng yaxshi o'quvchilar */}
        <SectionHeader title="Eng yaxshi o'quvchilar" action="Barchasi" onAction={() => navigation.navigate('MOquvchilar')} />
        {topStudents.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Hali tasdiqlangan o'quvchilar yo'q</Text>
          </Card>
        ) : (
          <Card style={styles.topCard}>
            {topStudents.map((s, i) => {
              const u = s.user || {};
              const name = u.full_name || u.username || u.phone || "O'quvchi";
              const score = Math.round(s.avg_score || 0);
              return (
                <View key={s.membership_id || i} style={[styles.topRow, i > 0 ? styles.topRowBorder : null]}>
                  <View style={[
                    styles.rankBadge,
                    i === 0 ? { backgroundColor: tints.gold14 } : i === 1 ? { backgroundColor: tints.slate14 } : i === 2 ? { backgroundColor: tints.orange14 } : null,
                  ]}>
                    <Text style={[
                      styles.rankText,
                      i === 0 ? { color: colors.gold } : i === 1 ? { color: colors.slate } : i === 2 ? { color: colors.orange } : null,
                    ]}>{i + 1}</Text>
                  </View>
                  <Avatar letter={initialOf(name)} size={30} fontSize={12} background={i === 0 ? colors.gold : colors.purple} color={i === 0 ? colors.goldText : undefined} />
                  <Text style={styles.topName} numberOfLines={1}>{name}</Text>
                  <Text style={styles.topScore}>{score}%</Text>
                </View>
              );
            })}
          </Card>
        )}

        {/* Tez amallar */}
        <SectionHeader title="Tez amallar" />
        <View style={styles.actionsGrid}>
          <TouchableOpacity activeOpacity={0.85} style={styles.actionCard} onPress={() => navigation.navigate('QuestionCreator')}>
            <IconBox size={38} radius={12} background={tints.blue14}><BookIcon size={18} color={colors.blue} /></IconBox>
            <Text style={styles.actionLabel}>Savol banki</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.85} style={styles.actionCard} onPress={() => navigation.navigate('MOquvchilar')}>
            <IconBox size={38} radius={12} background={tints.green14}><UsersIcon size={18} color={colors.greenLight} /></IconBox>
            <Text style={styles.actionLabel}>O'quvchilar</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.85} style={styles.actionCard} onPress={() => navigation.navigate('Leaderboard')}>
            <IconBox size={38} radius={12} background={tints.gold14}><TrophyIcon size={18} color={colors.gold} /></IconBox>
            <Text style={styles.actionLabel}>Reyting</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.85} style={styles.actionCard} onPress={() => navigation.navigate('MNatijalar')}>
            <IconBox size={38} radius={12} background={tints.purple16}><QuestionCircleIcon size={18} color={colors.purple} r={9} strokeWidth={2} /></IconBox>
            <Text style={styles.actionLabel}>Analitika</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <Fab onPress={() => navigation.navigate('AiChat')} />
      <QuickMenu visible={menuOpen} onClose={() => setMenuOpen(false)} title="MENYU" items={menuItems} />
    </SafeAreaView>
  );
}

const makeStyles = (colors, tints) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 100 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuBox: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center',
  },
  headerText: { flex: 1 },
  greeting: { fontSize: 19, fontFamily: FONTS.extrabold, color: colors.text },
  center: { fontSize: 12, fontFamily: FONTS.semibold, color: colors.textSecondary },
  bellBox: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute', top: 7, right: 8, width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.red, borderWidth: 2, borderColor: colors.bg,
  },
  createBtn: { marginTop: 16 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  kpi: { flexBasis: '47%', flexGrow: 1 },
  chartCard: { padding: 16, marginTop: 12 },
  cardHeading: { fontSize: 13.5, fontFamily: FONTS.extrabold, color: colors.text },
  list: { gap: 8 },
  emptyCard: { padding: 18, alignItems: 'center' },
  emptyText: { fontSize: 13, fontFamily: FONTS.semibold, color: colors.textMuted },
  rowCard: { paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { flex: 1 },
  rowName: { fontSize: 13.5, fontFamily: FONTS.extrabold, color: colors.text },
  rowSub: { fontSize: 11.5, fontFamily: FONTS.semibold, color: colors.textSecondary, marginTop: 2 },
  moreLink: { fontSize: 12, fontFamily: FONTS.bold, color: colors.blue, paddingVertical: 6, textAlign: 'center' },
  liveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: tints.greenBorder30, backgroundColor: tints.green14,
    paddingVertical: 5, paddingHorizontal: 10, borderRadius: 9,
  },
  liveBtnText: { fontSize: 11, fontFamily: FONTS.extrabold, color: colors.greenLight },
  topCard: { paddingVertical: 4, paddingHorizontal: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11 },
  topRowBorder: { borderTopWidth: 1, borderTopColor: colors.divider },
  rankBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surfaceDeep, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 12, fontFamily: FONTS.extrabold, color: colors.textSecondary },
  topName: { flex: 1, fontSize: 13, fontFamily: FONTS.bold, color: colors.text },
  topScore: { fontSize: 14, fontFamily: FONTS.extrabold, color: colors.text },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: {
    flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 16, paddingVertical: 16, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  actionLabel: { fontSize: 13, fontFamily: FONTS.extrabold, color: colors.text },
});
