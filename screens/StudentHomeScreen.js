import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import { useTabBarSpacing } from '../components/TabBar';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Avatar from '../components/Avatar';
import IconBox from '../components/IconBox';
import Fab from '../components/Fab';
import QuickMenu from '../components/QuickMenu';
import SectionHeader from '../components/SectionHeader';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import StreakWarningBanner from '../components/StreakWarningBanner';
import SuggestedOlympiadCard from '../components/SuggestedOlympiadCard';
import PeerComparisonCard from '../components/PeerComparisonCard';
import RivalActivityCard from '../components/RivalActivityCard';
import WeeklyContestCard from '../components/WeeklyContestCard';
import useFetch from '../services/useFetch';
import { studentApi, notificationsApi, parentApi, extractLeaderboardEntries } from '../services/api';
import ParentRequestsSection from '../components/ParentRequestsSection';
import { useAuth } from '../services/AuthContext';
import {
  BellIcon,
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
  BarsIcon,
  ChevronRightIcon,
} from '../components/icons/Icons';

const asArray = (data) => (Array.isArray(data) ? data : data?.results || data?.entries || []);

// Tab navigator ichidan root stack ekraniga o'tish (Premium kabi package).
// Ba'zi holatlarda to'g'ridan-to'g'ri navigate ishlamaydi — parent orqali urinamiz.
const openStackScreen = (navigation, name, params) => {
  if (!navigation?.navigate) return;
  // Avval eng yuqori parent stack (RootNavigator) ni topamiz —
  // MyCompetitions / MyCertificates / Premium shu yerda ro'yxatdan o'tgan.
  let nav = navigation;
  let root = navigation;
  while (nav?.getParent?.()) {
    nav = nav.getParent();
    if (nav) root = nav;
  }
  if (root?.navigate) {
    root.navigate(name, params);
    return;
  }
  navigation.navigate(name, params);
};

const formatWhen = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

// Ball qiymatini xavfsiz son qilish (null/undefined/"" → null).
const toScore = (v) => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// Eng yuqori / so'nggi ball: avval stats, bo'sh yoki 0 bo'lib attempts
// bo'lsa — natijalar ro'yxatidan hisoblaymiz (production ba'zan
// best_score/latest_score ni 0 yoki yo'q qaytaradi).
const resolveBestAndLatest = (stats, results) => {
  const attempts = Number(stats?.total_attempts) || (results?.length ?? 0);
  const scores = (results || [])
    .map((r) => toScore(r?.score ?? r?.percentage ?? r?.percent))
    .filter((n) => n != null);
  const fromResultsBest = scores.length ? Math.max(...scores) : null;
  // So'nggi: ro'yxat odatda yangidan eskilikka tartiblangan.
  const fromResultsLatest = scores.length ? scores[0] : null;

  let best = toScore(stats?.best_score ?? stats?.bestScore);
  let latest = toScore(stats?.latest_score ?? stats?.latestScore);
  const avg = toScore(stats?.average_score ?? stats?.avg_score);

  // Stats 0 qaytarsa-yu, haqiqiy natijalar bo'lsa — natijalarga ishonamiz.
  if ((best == null || (best === 0 && attempts > 0 && fromResultsBest > 0)) && fromResultsBest != null) {
    best = fromResultsBest;
  }
  if ((latest == null || (latest === 0 && attempts > 0 && fromResultsLatest > 0)) && fromResultsLatest != null) {
    latest = fromResultsLatest;
  }
  if (best == null && avg != null) best = Math.round(avg);
  if (latest == null && avg != null) latest = Math.round(avg);

  return {
    bestScore: best != null ? Math.round(best) : 0,
    latestScore: latest != null ? Math.round(latest) : 0,
  };
};

export default function StudentHomeScreen({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const tabBarSpacing = useTabBarSpacing();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const { data, loading, refreshing, error, reload, refresh } = useFetch(async () => {
    const [stats, olympiads, notifs, results, leaderboard] = await Promise.all([
      studentApi.myStats().then((r) => r.data).catch(() => null),
      studentApi.olympiads().then((r) => r.data).catch(() => null),
      notificationsApi.list().then((r) => r.data).catch(() => null),
      // Eng yuqori / so'nggi ball zaxirasi — stats 0 qaytarsa natijalardan olinadi.
      studentApi.myResults({ page_size: 20 }).then((r) => r.data).catch(() => null),
      // Global reyting o'rni — stats.best_rank bitta olimpiadadagi eng yaxshi
      // o'rin (eskilik/noto'g'ri bo'lishi mumkin); leaderboard jonli tartib.
      studentApi.leaderboard({ page_size: 100 }).then((r) => r.data).catch(() => null),
    ]);
    // Barcha asosiy manbalar null bo'lsa (tarmoq/server nosozligi) — xatolik
    // ekranini ko'rsatamiz (item 16).
    if (stats === null && olympiads === null) {
      throw new Error('home_load_failed');
    }
    const notifList = Array.isArray(notifs) ? notifs : notifs?.results || [];
    const resultsArr = asArray(results);
    const lbEntries = extractLeaderboardEntries(leaderboard);
    return {
      stats,
      results: resultsArr,
      lbEntries,
      olympiads: asArray(olympiads),
      unread: notifList.filter((n) => !n.is_read).length,
    };
  }, []);

  // Meni "farzand" sifatida kuzatmoqchi bo'lgan ota-onalarning so'rovlari —
  // asosiy ekranni bloklamasligi uchun alohida yuklanadi. Avval xato bilan
  // ParentScreen.js'da edi (ota-onalar uchun), aslida bu STUDENT funksiyasi.
  const requestsFetch = useFetch(
    () => parentApi.parentRequests().then((r) => asArray(r.data)),
    []
  );
  const [respondingId, setRespondingId] = useState(null);
  const parentRequests = requestsFetch.data || [];

  const respondParentRequest = async (linkId, accept) => {
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

  // Hooks Rules: early return'dan OLDIN barcha hook'lar chaqirilishi kerak.
  const stats = data?.stats || {};
  const myResults = data?.results || [];
  const lbEntries = data?.lbEntries || [];
  const olympiads = data?.olympiads || [];
  const unread = data?.unread || 0;
  const { bestScore, latestScore } = resolveBestAndLatest(stats, myResults);

  // Global reyting: leaderboard ichidagi o'rin (Natijalar bilan bir xil).
  // stats.best_rank — bitta tadbirdagi eng yaxshi joy (masalan #2), global emas.
  const myLbEntry =
    user?.id != null
      ? lbEntries.find((e) => e?.user_id != null && Number(e.user_id) === Number(user.id))
      : null;
  const attemptsCount = Number(stats.total_attempts) || myResults.length || 0;
  let globalRankLabel = '—';
  if (myLbEntry?.rank != null) {
    globalRankLabel = `#${myLbEntry.rank}`;
  } else if (attemptsCount > 0 && lbEntries.length > 0) {
    // Top-N dan tashqarida
    globalRankLabel = `${lbEntries.length}+`;
  }
  // Sertifikat faqat 1-o'rin — KPI da total_attempts o'rniga shu son.
  const certificatesCount =
    stats.certificates_count != null
      ? Number(stats.certificates_count)
      : myResults.filter((r) => Number(r.rank) === 1).length;

  const activeEvent = olympiads.find((o) => o.status === 'active') || null;
  const upcomingEvent =
    olympiads.find((o) => o.status === 'draft' || o.status === 'scheduled') ||
    olympiads.find((o) => o !== activeEvent) ||
    null;

  const initial = (user?.full_name || 'O')[0].toUpperCase();
  const isPremium = user?.is_premium || user?.is_premium_active;

  if (loading) return <LoadingState message="Ma'lumotlar yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  const confirmLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Splash' }] });
  };

  const menuItems = [
    { label: 'AI Tahlil', icon: <SparkleIcon size={18} color={colors.purple} />, onPress: () => navigation.navigate('Analytics') },
    { label: "O'sishim", icon: <BarsIcon size={18} color={colors.blue} />, onPress: () => navigation.navigate('Progress') },
    { label: "Do'kon", icon: <CoinIcon size={18} />, onPress: () => navigation.navigate('Shop') },
    { label: 'Reyting', icon: <TrophyIcon size={17} color={colors.gold} strokeWidth={2} full={false} />, onPress: () => navigation.navigate('Natijalar') },
    { label: 'Markazlar reytingi', icon: <TrophyIcon size={17} color={colors.gold} strokeWidth={2} full />, onPress: () => navigation.navigate('CenterRanking') },
    { label: '1v1 Duel', icon: <LightningIcon size={18} />, onPress: () => navigation.navigate('DuelList') },
    { label: 'Premiumga o\'tish', icon: <CrownIcon size={18} />, onPress: () => navigation.navigate('Premium') },
    { label: 'Parolni o\'zgartirish', icon: <SettingsIcon size={18} color={colors.textSecondary} />, onPress: () => navigation.navigate('ChangePassword') },
    { label: 'Hisobdan chiqish', icon: <ProfileBadgeIcon size={18} color={colors.red} />, danger: true, onPress: confirmLogout },
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarSpacing }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.blue} />}
      >
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.8} style={styles.menuBox} onPress={() => setMenuOpen(true)}>
            <MenuIcon size={22} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.greeting} numberOfLines={1}>Salom, {(user?.full_name || 'Foydalanuvchi').split(' ')[0]}!</Text>
            <Text style={styles.center} numberOfLines={1}>{user?.center_name || 'Olympy platformasi'}</Text>
          </View>
          <TouchableOpacity activeOpacity={0.8} style={styles.bellBox} onPress={() => navigation.navigate('Notifications')}>
            <BellIcon size={18} />
            {unread > 0 ? <View style={styles.bellDot} /> : null}
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Profil')}>
            <Avatar letter={initial} size={38} fontSize={15} />
          </TouchableOpacity>
        </View>

        {!isPremium ? (
          <TouchableOpacity activeOpacity={0.85} style={styles.premiumBanner} onPress={() => navigation.navigate('Premium')}>
            <CrownIcon size={15} color={colors.gold} />
            <Text style={styles.premiumBannerText}>Premiumga o'ting — narxlarni ko'ring</Text>
            <ChevronRightIcon size={13} color={colors.gold} />
          </TouchableOpacity>
        ) : null}

        <View style={styles.kpiGrid}>
          <Card radius={18} style={styles.kpiCard}>
            <IconBox size={32} radius={10} background={tints.blue14}>
              <StarIcon size={16} color={colors.blue} />
            </IconBox>
            <View style={styles.kpiDualBlock}>
              <Text style={styles.kpiDualScores} numberOfLines={1}>
                <Text style={styles.kpiDualValue}>{bestScore}</Text>
                <Text style={styles.kpiDualSlash}>/</Text>
                <Text style={styles.kpiDualValue}>{latestScore}</Text>
              </Text>
              <Text style={styles.kpiDualCaption} numberOfLines={1}>
                Eng yuqori / So'nggi
              </Text>
            </View>
          </Card>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.kpiTouch}
            onPress={() => navigation.navigate('Natijalar')}
          >
            <Card radius={18} style={styles.kpiCard}>
              <IconBox size={32} radius={10} background={tints.gold14}>
                <TrophyIcon size={16} color={colors.gold} strokeWidth={1.8} full />
              </IconBox>
              <Text style={styles.kpiValue}>{globalRankLabel}</Text>
              <Text style={styles.kpiLabel}>Reyting o'rni</Text>
            </Card>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.kpiTouch}
            onPress={() => openStackScreen(navigation, 'MyCompetitions')}
          >
            <Card radius={18} style={styles.kpiCard}>
              <IconBox size={32} radius={10} background={tints.green14}>
                <CalendarIcon size={16} color={colors.green} strokeWidth={1.8} />
              </IconBox>
              <Text style={styles.kpiValue}>{stats.total_attempts ?? 0}</Text>
              <Text style={styles.kpiLabel}>Musobaqalar</Text>
            </Card>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.kpiTouch}
            onPress={() => openStackScreen(navigation, 'MyCertificates')}
          >
            <Card radius={18} style={styles.kpiCard}>
              <IconBox size={32} radius={10} background={tints.purple16}>
                <MedalIcon size={16} color={colors.purple} />
              </IconBox>
              <Text style={styles.kpiValue}>{certificatesCount}</Text>
              <Text style={styles.kpiLabel}>Sertifikatlar</Text>
            </Card>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.miniCardTouch}
          onPress={() => navigation.navigate('Analytics')}
        >
          <Card radius={18} style={styles.miniCard}>
            <IconBox size={30} radius={9} background={tints.purple16}>
              <SparkleIcon size={15} color={colors.purple} />
            </IconBox>
            <View style={styles.miniTitleRow}>
              <Text style={styles.miniTitle}>AI Tahlil</Text>
              <Text style={styles.miniArrow}>→</Text>
            </View>
            <Text style={styles.miniSub}>Shaxsiy tahlil va tavsiyalar</Text>
          </Card>
        </TouchableOpacity>

        {parentRequests.length > 0 ? (
          <ParentRequestsSection
            requests={parentRequests}
            respondingId={respondingId}
            onRespond={respondParentRequest}
          />
        ) : null}

        {/* Retention widget'lari — har biri o'z ma'lumotini mustaqil yuklaydi va
            ko'rsatadigan narsa bo'lmasa jim (null) qoladi. */}
        <View style={styles.retentionSection}>
          <StreakWarningBanner navigation={navigation} />
          <SuggestedOlympiadCard navigation={navigation} />
          <PeerComparisonCard />
          <RivalActivityCard />
          <WeeklyContestCard />
        </View>

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
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    backgroundColor: tints.gold10,
    borderWidth: 1,
    borderColor: tints.goldBorder35,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  premiumBannerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONTS.extrabold,
    color: colors.gold,
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
  kpiDualBlock: {
    marginTop: 8,
    width: '100%',
    gap: 2,
  },
  // Bitta qator: 56/56 — orasida bo'sh joy yo'q, yaqin yoziladi.
  kpiDualScores: {
    fontSize: 20,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    letterSpacing: 0,
  },
  kpiDualSlash: {
    fontSize: 20,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  kpiDualValue: {
    fontSize: 20,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  kpiDualCaption: {
    fontSize: 9.5,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
  },
  retentionSection: {
    marginTop: 14,
    gap: 12,
  },
  // AI Tahlil — ota konteynerga to'liq sig'adi (o'ngda bo'sh joy qolmasin).
  miniCardTouch: {
    width: '100%',
    flex: 1,
    marginTop: 14,
  },
  miniCard: {
    width: '100%',
    flex: 1,
    padding: 14,
    gap: 6,
  },
  miniTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  miniTitle: {
    fontSize: 11.5,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    lineHeight: 14.95,
  },
  miniArrow: {
    fontSize: 13,
    fontFamily: FONTS.extrabold,
    color: colors.blue,
  },
  miniSub: {
    fontSize: 10.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
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
