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
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import useFetch from '../services/useFetch';
import { teacherApi, notificationsApi } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { centerIdForUser } from '../services/roles';
import {
  BellIcon,
  PlusIcon,
  CalendarIcon,
  ClockIcon,
  QuestionCircleIcon,
  ChevronRightIcon,
  StarIcon,
  MenuIcon,
  BookIcon,
  BarsIcon,
  SettingsIcon,
  ProfileBadgeIcon,
  UserIcon,
} from '../components/icons/Icons';

const asArray = (data) => (Array.isArray(data) ? data : data?.results || []);
const makeSTATUS_LABEL = (colors, tints) => ({
  active: { label: 'Faol', color: colors.greenLight, bg: tints.green14 },
  finished: { label: 'Tugagan', color: colors.slate, bg: tints.slate14 },
  draft: { label: 'Qoralama', color: colors.orange, bg: tints.orange14 },
});
const makeSUBJECT_BADGE = (colors, tints) => ([
  { color: colors.blueLight, bg: tints.blue14 },
  { color: colors.purpleLight, bg: tints.purple16 },
  { color: colors.greenLight, bg: tints.green14 },
  { color: colors.orange, bg: tints.orange14 },
  { color: colors.gold, bg: tints.gold14 },
]);

const formatWhen = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export default function TeacherHomeScreen({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const STATUS_LABEL = makeSTATUS_LABEL(colors, tints);
  const SUBJECT_BADGE = makeSUBJECT_BADGE(colors, tints);
  const { user, logout } = useAuth();
  const centerId = centerIdForUser(user);
  const [menuOpen, setMenuOpen] = useState(false);
  const { data, loading, refreshing, error, reload, refresh } = useFetch(async () => {
    const [olympiads, questions, notifs] = await Promise.all([
      teacherApi.myOlympiads().then((r) => r.data).catch(() => null),
      // GET /api/questions/ `center` parametrini talab qiladi — usiz 400 qaytardi
      // va savollar soni doim 0 ko'rinardi. Fan bo'yicha taqsimotni chiqarish
      // uchun kattaroq sahifa so'raymiz (client-side guruhlash).
      centerId
        ? teacherApi.questions({ center: centerId, page_size: 500 }).then((r) => r.data).catch(() => null)
        : Promise.resolve(null),
      notificationsApi.list().then((r) => r.data).catch(() => null),
    ]);
    if (olympiads === null && questions === null) {
      throw new Error('teacher_home_load_failed');
    }
    const notifList = Array.isArray(notifs) ? notifs : notifs?.results || [];
    return {
      olympiads: asArray(olympiads),
      questions,
      unread: notifList.filter((n) => !n.is_read).length,
    };
  }, [centerId]);

  if (loading) return <LoadingState message="Panel yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  const olympiads = data?.olympiads || [];
  const active = olympiads.filter((o) => o.status === 'active').length;
  const questionItems = Array.isArray(data?.questions) ? data.questions : data?.questions?.results || [];
  const questionsCount = data?.questions?.count ?? questionItems.length;
  const unread = data?.unread || 0;
  const firstName = (user?.full_name || 'O\'qituvchi').split(' ')[0];
  const initial = (user?.full_name || 'N')[0].toUpperCase();

  // Fan bo'yicha taqsimot — yuklab olingan savollar to'liq bankni qamrasagina
  // aniq ko'rsatamiz (aks holda son chalg'ituvchi bo'ladi).
  const distCovers = questionItems.length > 0 && questionItems.length >= questionsCount;
  const subjectBadges = distCovers
    ? Object.entries(
        questionItems.reduce((acc, q) => {
          const s = q.subject || 'Boshqa';
          acc[s] = (acc[s] || 0) + 1;
          return acc;
        }, {})
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
    : [];

  const menuItems = [
    { label: 'Tadbir yaratish', icon: <PlusIcon size={16} color={colors.blue} />, onPress: () => navigation.navigate('CreateOlympiad') },
    { label: 'Barcha tadbirlar', icon: <CalendarIcon size={18} color={colors.textSecondary} strokeWidth={2} />, onPress: () => navigation.navigate('TeacherOlympiads') },
    { label: 'Savol banki', icon: <BookIcon size={18} color={colors.textSecondary} />, onPress: () => navigation.navigate('Savollar') },
    { label: 'Kod javoblari', icon: <BookIcon size={18} color={colors.textSecondary} />, onPress: () => navigation.navigate('CodeReview') },
    { label: 'Savollar tahlili', icon: <BarsIcon size={18} color={colors.textSecondary} />, onPress: () => navigation.navigate('QuestionDifficulty') },
    { label: 'Profil', icon: <UserIcon size={18} color={colors.textSecondary} />, onPress: () => navigation.navigate('Profile') },
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
            <Text style={styles.greeting}>Salom, {firstName}!</Text>
            <Text style={styles.center}>O'qituvchi · {user?.center_name || 'Olympy'}</Text>
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

        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <IconBox size={28} radius={9} background={tints.blue14}>
              <CalendarIcon size={14} color={colors.blue} strokeWidth={2} />
            </IconBox>
            <Text style={styles.statValue}>{olympiads.length}</Text>
            <Text style={styles.statLabel}>Jami tadbir</Text>
          </Card>
          <Card style={styles.statCard}>
            <IconBox size={28} radius={9} background={tints.green14}>
              <ClockIcon size={14} />
            </IconBox>
            <Text style={styles.statValue}>{active}</Text>
            <Text style={styles.statLabel}>Faol tadbir</Text>
          </Card>
          <Card style={styles.statCard}>
            <IconBox size={28} radius={9} background={tints.purple16}>
              <QuestionCircleIcon size={14} color={colors.purple} r={9} strokeWidth={2} />
            </IconBox>
            <Text style={styles.statValue}>{questionsCount}</Text>
            <Text style={styles.statLabel}>Savollar</Text>
          </Card>
        </View>

        <SectionHeader title="So'nggi tadbirlar" action="Barchasi" onAction={() => navigation.navigate('TeacherOlympiads')} />
        {olympiads.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Hali tadbir yaratilmagan</Text>
          </Card>
        ) : (
          <View style={styles.events}>
            {olympiads.slice(0, 6).map((e) => {
              const st = STATUS_LABEL[e.status] || STATUS_LABEL.draft;
              return (
                <Card key={e.id} style={styles.eventCard}>
                  <View style={styles.eventBody}>
                    <View style={styles.badgeRow}>
                      <Badge label={e.subject || 'Fan'} color={colors.blueLight} background={tints.blue14} style={styles.badgeSm} />
                      <Badge label={st.label} color={st.color} background={st.bg} style={styles.badgeSm} />
                    </View>
                    <Text style={styles.eventTitle} numberOfLines={1}>{e.title}</Text>
                    <Text style={styles.eventSub}>
                      {e.duration_minutes || 0} daqiqa · {e.participants || 0} ishtirokchi
                    </Text>
                    {e.start_datetime ? (
                      <View style={styles.eventDateRow}>
                        <CalendarIcon size={11} color={colors.blue} strokeWidth={2} />
                        <Text style={styles.eventDate}>{formatWhen(e.start_datetime)}</Text>
                      </View>
                    ) : null}
                  </View>
                  <ChevronRightIcon size={14} />
                </Card>
              );
            })}
          </View>
        )}

        <SectionHeader title="Savol banki" action="Ochish" onAction={() => navigation.navigate('Savollar')} />
        <Card style={styles.bankCard}>
          {subjectBadges.length ? (
            <View style={styles.bankBadges}>
              {subjectBadges.map(([subject, cnt], i) => {
                const c = SUBJECT_BADGE[i % SUBJECT_BADGE.length];
                return (
                  <Badge
                    key={subject}
                    label={`${subject} · ${cnt}`}
                    color={c.color}
                    background={c.bg}
                    size={11}
                    style={styles.bankBadge}
                  />
                );
              })}
            </View>
          ) : null}
          <View style={styles.bankFooter}>
            <StarIcon size={13} color={colors.gold} />
            <Text style={styles.bankNote}>Bankda jami {questionsCount} ta savol</Text>
          </View>
        </Card>
      </ScrollView>
      <Fab onPress={() => navigation.navigate('AiChat')} />
      <QuickMenu visible={menuOpen} onClose={() => setMenuOpen(false)} title="MENYU" items={menuItems} />
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
    paddingBottom: 84,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    fontSize: 19,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  center: {
    fontSize: 12,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
  },
  bellBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.red,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  createBtn: {
    marginTop: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 14,
  },
  statCard: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 12,
  },
  statValue: {
    fontSize: 19,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    marginTop: 7,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
  },
  events: {
    gap: 8,
  },
  emptyCard: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
  },
  eventCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  eventBody: {
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
  eventTitle: {
    fontSize: 14,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    marginTop: 7,
  },
  eventSub: {
    fontSize: 11,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 2,
  },
  eventDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
  },
  eventDate: {
    fontSize: 11,
    fontFamily: FONTS.extrabold,
    color: colors.blue,
  },
  bankCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  bankBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 12,
  },
  bankBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  bankFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bankNote: {
    fontSize: 11.5,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
  },
});
