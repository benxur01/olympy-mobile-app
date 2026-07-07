import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Avatar from '../components/Avatar';
import IconBox from '../components/IconBox';
import Fab from '../components/Fab';
import QuickMenu from '../components/QuickMenu';
import SectionHeader from '../components/SectionHeader';
import DonutProgress from '../components/DonutProgress';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import useFetch from '../services/useFetch';
import { studentApi, notificationsApi } from '../services/api';
import { useAuth } from '../services/AuthContext';
import {
  BellIcon,
  FlameIcon,
  StarIcon,
  TrophyIcon,
  CalendarIcon,
  MedalIcon,
  LightningIcon,
  PhysicsIcon,
  MenuIcon,
  CoinIcon,
  CrownIcon,
  SettingsIcon,
  ProfileBadgeIcon,
  SparkleIcon,
} from '../components/icons/Icons';

const asArray = (data) => (Array.isArray(data) ? data : data?.results || data?.entries || []);

const formatWhen = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

// HH:MM:SS ko'rinishidagi countdown (soatlik qism 0 bo'lsa MM:SS).
const fmtCountdown = (secs) => {
  const s = Math.max(0, Math.floor(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(r)}` : `${pad(m)}:${pad(r)}`;
};

const nextMidnightTs = () => {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d.getTime();
};

export default function StudentHomeScreen({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  // Bir soniyalik "soat" — barcha countdown'larni bitta interval boshqaradi.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const { data, loading, refreshing, error, reload, refresh } = useFetch(async () => {
    const [stats, streak, olympiads, dailyGoal, notifs] = await Promise.all([
      studentApi.myStats().then((r) => r.data).catch(() => null),
      studentApi.myStreak().then((r) => r.data).catch(() => null),
      studentApi.olympiads().then((r) => r.data).catch(() => null),
      studentApi.dailyGoal().then((r) => r.data).catch(() => null),
      notificationsApi.list().then((r) => r.data).catch(() => null),
    ]);
    // Barcha asosiy manbalar null bo'lsa (tarmoq/server nosozligi) — xatolik
    // ekranini ko'rsatamiz (item 16).
    if (stats === null && streak === null && olympiads === null && dailyGoal === null) {
      throw new Error('home_load_failed');
    }
    const notifList = Array.isArray(notifs) ? notifs : notifs?.results || [];
    return {
      stats,
      streak,
      olympiads: asArray(olympiads),
      dailyGoal,
      unread: notifList.filter((n) => !n.is_read).length,
    };
  }, []);

  if (loading) return <LoadingState message="Ma'lumotlar yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  const stats = data?.stats || {};
  const streak = data?.streak || {};
  const olympiads = data?.olympiads || [];
  const goal = data?.dailyGoal || {};
  const unread = data?.unread || 0;

  const activeEvent = olympiads.find((o) => o.status === 'active') || null;
  const upcomingEvent =
    olympiads.find((o) => o.status === 'draft' || o.status === 'scheduled') ||
    olympiads.find((o) => o !== activeEvent) ||
    null;

  const goalDone = goal.completed ?? goal.done ?? 0;
  const goalTotal = goal.target ?? goal.total ?? 5;
  const goalPct = goalTotal ? Math.round((goalDone / goalTotal) * 100) : 0;

  const initial = (user?.full_name || 'O')[0].toUpperCase();

  // Kunlik mashq yangilanishigacha countdown: backend reset/expire vaqti bo'lsa
  // shundan, bo'lmasa kun oxiri (24:00) gacha hisoblaymiz.
  const goalResetIso = goal.reset_at || goal.resets_at || goal.expires_at || goal.next_reset_at;
  const goalResetTs = goalResetIso ? new Date(goalResetIso).getTime() : nextMidnightTs();
  const goalRemainSec = Number.isNaN(goalResetTs) ? 0 : Math.max(0, Math.floor((goalResetTs - now) / 1000));

  // Faol tadbir tugashigacha countdown: expires_at / end_datetime, aks holda
  // boshlanish + davomiylik (daqiqa) dan.
  const eventEndTs = (() => {
    if (!activeEvent) return null;
    const iso = activeEvent.expires_at || activeEvent.end_datetime || activeEvent.ends_at;
    if (iso) {
      const t = new Date(iso).getTime();
      return Number.isNaN(t) ? null : t;
    }
    if (activeEvent.start_datetime && activeEvent.duration_minutes) {
      const t = new Date(activeEvent.start_datetime).getTime();
      return Number.isNaN(t) ? null : t + activeEvent.duration_minutes * 60000;
    }
    return null;
  })();
  const eventRemainSec = eventEndTs != null ? Math.max(0, Math.floor((eventEndTs - now) / 1000)) : null;

  const confirmLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Splash' }] });
  };

  const menuItems = [
    { label: 'AI Tahlil', icon: <SparkleIcon size={18} color={colors.purple} />, onPress: () => navigation.navigate('Analytics') },
    { label: "Do'kon", icon: <CoinIcon size={18} />, onPress: () => navigation.navigate('Shop') },
    { label: 'Reyting', icon: <TrophyIcon size={17} color={colors.gold} strokeWidth={2} full={false} />, onPress: () => navigation.navigate('Leaderboard') },
    { label: '1v1 Duel', icon: <LightningIcon size={18} />, onPress: () => navigation.navigate('DuelList') },
    { label: 'Premiumga o\'tish', icon: <CrownIcon size={18} />, onPress: () => navigation.navigate('Premium') },
    { label: 'Parolni o\'zgartirish', icon: <SettingsIcon size={18} color={colors.textSecondary} />, onPress: () => navigation.navigate('ChangePassword') },
    { label: 'Hisobdan chiqish', icon: <ProfileBadgeIcon size={18} color={colors.red} />, danger: true, onPress: confirmLogout },
  ];

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
            <Text style={styles.greeting}>Salom, {(user?.full_name || 'Foydalanuvchi').split(' ')[0]}!</Text>
            <Text style={styles.center}>{user?.center_name || 'Olympy platformasi'}</Text>
          </View>
          <View style={styles.streakPill}>
            <FlameIcon size={14} />
            <Text style={styles.streakText}>{streak.streak_count ?? 0} kun</Text>
          </View>
          <TouchableOpacity activeOpacity={0.8} style={styles.bellBox} onPress={() => navigation.navigate('Notifications')}>
            <BellIcon size={18} />
            {unread > 0 ? <View style={styles.bellDot} /> : null}
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Profil')}>
            <Avatar letter={initial} size={38} fontSize={15} />
          </TouchableOpacity>
        </View>

        <View style={styles.kpiGrid}>
          <Card radius={18} style={styles.kpiCard}>
            <IconBox size={32} radius={10} background={tints.blue14}>
              <StarIcon size={16} color={colors.blue} />
            </IconBox>
            <Text style={styles.kpiValue}>{stats.average_score ?? 0}</Text>
            <Text style={styles.kpiLabel}>O'rtacha ball</Text>
          </Card>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.kpiTouch}
            onPress={() => navigation.navigate('Leaderboard')}
          >
            <Card radius={18} style={styles.kpiCard}>
              <IconBox size={32} radius={10} background={tints.gold14}>
                <TrophyIcon size={16} color={colors.gold} strokeWidth={1.8} full />
              </IconBox>
              <Text style={styles.kpiValue}>{stats.best_rank ? `#${stats.best_rank}` : '—'}</Text>
              <Text style={styles.kpiLabel}>Reyting o'rni</Text>
            </Card>
          </TouchableOpacity>
          <Card radius={18} style={styles.kpiCard}>
            <IconBox size={32} radius={10} background={tints.green14}>
              <CalendarIcon size={16} color={colors.green} strokeWidth={1.8} />
            </IconBox>
            <Text style={styles.kpiValue}>{stats.total_attempts ?? 0}</Text>
            <Text style={styles.kpiLabel}>Tadbirlar</Text>
          </Card>
          <Card radius={18} style={styles.kpiCard}>
            <IconBox size={32} radius={10} background={tints.purple16}>
              <MedalIcon size={16} color={colors.purple} />
            </IconBox>
            <Text style={styles.kpiValue}>{stats.certificates_count ?? stats.total_attempts ?? 0}</Text>
            <Text style={styles.kpiLabel}>Sertifikatlar</Text>
          </Card>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.cardsScroll}
          contentContainerStyle={styles.cardsRow}
        >
          <Card radius={18} style={[styles.miniCard, styles.goalCard]}>
            <DonutProgress size={62} strokeWidth={7} progress={goalPct} color={colors.green} radius={26}>
              <Text style={styles.goalPercent}>{goalPct}%</Text>
            </DonutProgress>
            <Text style={styles.miniTitle}>Kunlik maqsad</Text>
            <Text style={styles.miniSub}>{goalDone}/{goalTotal} mashq</Text>
          </Card>
          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('Analytics')}>
            <Card radius={18} style={styles.miniCard}>
              <IconBox size={30} radius={9} background={tints.purple16}>
                <SparkleIcon size={15} color={colors.purple} />
              </IconBox>
              <Text style={styles.miniTitle}>AI Tahlil</Text>
              <Text style={styles.miniSub}>Shaxsiy tahlil va tavsiyalar</Text>
              <Text style={styles.miniLink}>Ko'rish →</Text>
            </Card>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('Mashq')}>
            <Card radius={18} style={styles.miniCard}>
              <IconBox size={30} radius={9} background={tints.blue14}>
                <LightningIcon size={15} />
              </IconBox>
              <Text style={styles.miniTitle}>Kunlik 3 savol</Text>
              <View style={styles.countdownRow}>
                <CalendarIcon size={11} color={colors.orange} strokeWidth={2} />
                <Text style={styles.countdownText}>{fmtCountdown(goalRemainSec)}</Text>
              </View>
              <Text style={styles.miniLink}>Boshlash →</Text>
            </Card>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('Leaderboard')}>
            <Card radius={18} style={styles.miniCard}>
              <IconBox size={30} radius={9} background={tints.gold14}>
                <TrophyIcon size={15} color={colors.gold} strokeWidth={2} full={false} />
              </IconBox>
              <Text style={styles.miniTitle}>Haftalik konkurs</Text>
              <Text style={styles.miniSub}>Reytingda ishtirok eting</Text>
              <Text style={styles.miniLink}>Qatnashish →</Text>
            </Card>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('DuelList')}>
            <Card radius={18} style={styles.miniCard}>
              <IconBox size={30} radius={9} background={tints.blue14}>
                <LightningIcon size={15} />
              </IconBox>
              <Text style={styles.miniTitle}>1v1 Duel</Text>
              <Text style={styles.miniSub}>Do'st bilan bellashing</Text>
              <Text style={styles.miniLink}>Boshlash →</Text>
            </Card>
          </TouchableOpacity>
          <Card radius={18} style={styles.miniCard}>
            <View style={styles.rivalRow}>
              <FlameIcon size={16} />
              <Text style={styles.miniTitle}>Eng uzun streak</Text>
            </View>
            <Text style={styles.rivalText}>Sizning rekordingiz: {streak.longest_streak ?? 0} kun ketma-ket</Text>
          </Card>
        </ScrollView>

        <SectionHeader title="Bugungi tadbirlar" action="Barchasi" onAction={() => navigation.navigate('Tadbirlar')} />
        {activeEvent ? (
          <Card radius={18} style={styles.eventCard}>
            <View style={styles.badgeRow}>
              <Badge label={activeEvent.subject || 'Tadbir'} color={colors.blueLight} background={tints.blue14} size={11} />
              <Badge label="Faol" color={colors.greenLight} background={tints.green14} size={11} />
            </View>
            <Text style={styles.eventTitle}>{activeEvent.title}</Text>
            <View style={styles.eventMeta}>
              <Text style={styles.metaText}>{activeEvent.duration_minutes || 0} daqiqa</Text>
              <Text style={styles.metaText}>·</Text>
              <Text style={styles.metaText}>{activeEvent.participants || 0} ishtirokchi</Text>
            </View>
            {eventRemainSec != null && eventRemainSec > 0 ? (
              <View style={styles.eventTimer}>
                <FlameIcon size={12} color={colors.red} />
                <Text style={styles.eventTimerText}>{fmtCountdown(eventRemainSec)} qoldi</Text>
              </View>
            ) : null}
            <Button
              title="Kirish"
              height={46}
              radius={12}
              fontSize={14.5}
              style={styles.eventBtn}
              onPress={() =>
                navigation.navigate('Exam', {
                  olympiadId: activeEvent.id,
                  title: activeEvent.title,
                  durationMinutes: activeEvent.duration_minutes,
                })
              }
            />
          </Card>
        ) : (
          <Card radius={18} style={styles.emptyCard}>
            <Text style={styles.emptyText}>Hozircha faol tadbir yo'q</Text>
          </Card>
        )}

        {upcomingEvent ? (
          <>
            <SectionHeader title="Yaqinda boshlanadi" />
            <Card style={styles.upcomingCard}>
              <IconBox size={38} radius={12} background={tints.purple16}>
                <PhysicsIcon size={18} />
              </IconBox>
              <View style={styles.upcomingText}>
                <Text style={styles.upcomingTitle}>{upcomingEvent.title}</Text>
                <Text style={styles.upcomingSub}>
                  {formatWhen(upcomingEvent.start_datetime)} · {upcomingEvent.duration_minutes || 0} daqiqa
                </Text>
              </View>
              <Badge label="Kutilmoqda" color={colors.orange} background={tints.orange14} size={11} />
            </Card>
          </>
        ) : null}
      </ScrollView>
      <Fab onPress={() => navigation.navigate('AiChat')} />
      <QuickMenu visible={menuOpen} onClose={() => setMenuOpen(false)} title="TEZ MENYU" items={menuItems} />
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
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: tints.orange14,
    borderWidth: 1,
    borderColor: tints.orangeBorder30,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  streakText: {
    fontSize: 13,
    fontFamily: FONTS.extrabold,
    color: colors.orange,
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
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  kpiTouch: {
    flexBasis: '47%',
    flexGrow: 1,
  },
  kpiCard: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: 14,
  },
  kpiValue: {
    fontSize: 22,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    marginTop: 8,
  },
  kpiLabel: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
  },
  cardsScroll: {
    marginTop: 14,
  },
  cardsRow: {
    gap: 10,
    paddingBottom: 4,
  },
  miniCard: {
    width: 150,
    padding: 14,
    gap: 6,
  },
  goalCard: {
    alignItems: 'center',
    gap: 8,
  },
  goalPercent: {
    fontSize: 13,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  miniTitle: {
    fontSize: 11.5,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    lineHeight: 14.95,
  },
  miniSub: {
    fontSize: 10.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
  },
  miniLink: {
    fontSize: 11,
    fontFamily: FONTS.extrabold,
    color: colors.blue,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  countdownText: {
    fontSize: 11,
    fontFamily: FONTS.extrabold,
    color: colors.orange,
    fontVariant: ['tabular-nums'],
  },
  eventTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: tints.red10,
    borderWidth: 1,
    borderColor: tints.redBorder35,
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  eventTimerText: {
    fontSize: 12,
    fontFamily: FONTS.extrabold,
    color: colors.red,
    fontVariant: ['tabular-nums'],
  },
  rivalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rivalText: {
    fontSize: 10.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    lineHeight: 14.7,
  },
  eventCard: {
    padding: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    marginTop: 10,
  },
  eventMeta: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 8,
  },
  metaText: {
    fontSize: 12,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
  },
  eventBtn: {
    marginTop: 14,
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
  upcomingCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  upcomingText: {
    flex: 1,
  },
  upcomingTitle: {
    fontSize: 14,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  upcomingSub: {
    fontSize: 11.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
