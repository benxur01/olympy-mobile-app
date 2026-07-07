import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Avatar from '../components/Avatar';
import IconBox from '../components/IconBox';
import SegmentedControl from '../components/SegmentedControl';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useFetch from '../services/useFetch';
import { duelApi } from '../services/api';
import {
  BackIcon,
  LightningIcon,
  TrophyIcon,
  ChevronRightIcon,
  PlusIcon,
} from '../components/icons/Icons';

const asArray = (data) => (Array.isArray(data) ? data : data?.results || []);
const initialOf = (name) => (name || '?').trim()[0]?.toUpperCase() || '?';

const dateOf = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export default function DuelListScreen({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const [tab, setTab] = useState(0); // 0 = Faol, 1 = Tugagan

  const { data, loading, refreshing, error, reload, refresh } = useFetch(
    () => duelApi.myDuels().then((r) => asArray(r.data)),
    []
  );

  // Ekranga qaytilganda (duel o'ynab bo'lgach) ro'yxatni yangilaymiz.
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => reload());
    return unsub;
  }, [navigation, reload]);

  // G'olib/mag'lub/durang badge'i (tugagan duellar uchun).
  const outcomeBadge = (outcome) => {
    if (outcome === 'win') {
      return <Badge label="Yutdingiz" color={colors.greenLight} background={tints.green14} size={11} />;
    }
    if (outcome === 'loss') {
      return <Badge label="Yutqazdingiz" color={colors.redSoftText} background={tints.red12} size={11} />;
    }
    if (outcome === 'draw') {
      return <Badge label="Durang" color={colors.goldSoftText} background={tints.gold14} size={11} />;
    }
    return <Badge label="Davom etmoqda" color={colors.orangeSoftText} background={tints.orange14} size={11} />;
  };

  const list = data || [];
  const active = list.filter((d) => d.status !== 'completed');
  const finished = list.filter((d) => d.status === 'completed');
  const shown = tab === 0 ? active : finished;

  const openDuel = (d) => {
    if (d.status === 'completed') {
      navigation.navigate('DuelResult', { duelId: d.id });
    } else {
      navigation.navigate('DuelPlay', { duelId: d.id });
    }
  };

  if (loading && !data) return <LoadingState message="Duellar yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()} style={styles.backBtn}>
          <BackIcon size={16} />
        </TouchableOpacity>
        <Text style={styles.title}>Duellar</Text>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate('DuelInvite')}
          style={styles.newBtn}
        >
          <PlusIcon size={16} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.blue} />}
      >
        <Card radius={18} style={styles.hero}>
          <IconBox size={42} radius={13} background={tints.blue14}>
            <LightningIcon size={20} />
          </IconBox>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>1v1 Duel</Text>
            <Text style={styles.heroSub}>Do'stingizni 10 ta savolda musobaqaga chorlang</Text>
          </View>
        </Card>

        <Button
          title="Yangi duel boshlash"
          height={50}
          radius={13}
          fontSize={15}
          icon={<LightningIcon size={17} color={colors.white} />}
          style={styles.startBtn}
          onPress={() => navigation.navigate('DuelInvite')}
        />

        <SegmentedControl
          segments={[`Faol${active.length ? ` (${active.length})` : ''}`, 'Tugagan']}
          activeIndex={tab}
          onChange={setTab}
          style={styles.segment}
        />

        {shown.length === 0 ? (
          <EmptyState
            compact
            icon={<LightningIcon size={22} color={colors.blueLight} />}
            title={tab === 0 ? 'Faol duel yo\'q' : 'Tugagan duel yo\'q'}
            message={
              tab === 0
                ? 'Yangi duel boshlab, do\'stingiz bilan bellashing.'
                : 'Yakunlangan duellaringiz shu yerda ko\'rinadi.'
            }
          />
        ) : (
          <View style={styles.list}>
            {shown.map((d) => (
              <TouchableOpacity key={d.id} activeOpacity={0.85} onPress={() => openDuel(d)}>
                <Card style={styles.row}>
                  <Avatar letter={initialOf(d.opponent_name)} size={42} fontSize={16} background={colors.blueDeep} />
                  <View style={styles.rowText}>
                    <Text style={styles.rowName} numberOfLines={1}>{d.opponent_name || '—'}</Text>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {[d.subject || 'Aralash', dateOf(d.completed_at || d.created_at)].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <View style={styles.rowRight}>
                    {outcomeBadge(d.outcome)}
                    <ChevronRightIcon size={16} color={colors.textMuted} />
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {tab === 1 && finished.length > 0 ? (
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <TrophyIcon size={16} color={colors.gold} strokeWidth={2} full />
              <Text style={styles.statValue}>{finished.filter((d) => d.outcome === 'win').length}</Text>
              <Text style={styles.statLabel}>G'alaba</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.textSecondary }]}>
                {finished.filter((d) => d.outcome === 'draw').length}
              </Text>
              <Text style={styles.statLabel}>Durang</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.red }]}>
                {finished.filter((d) => d.outcome === 'loss').length}
              </Text>
              <Text style={styles.statLabel}>Mag'lubiyat</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
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
  newBtn: {
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
    paddingBottom: 40,
    flexGrow: 1,
  },
  hero: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  heroText: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 16,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  heroSub: {
    fontSize: 12,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 16.5,
  },
  startBtn: {
    marginTop: 12,
  },
  segment: {
    marginTop: 18,
  },
  list: {
    gap: 8,
    marginTop: 14,
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: {
    flex: 1,
  },
  rowName: {
    fontSize: 14,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  rowSub: {
    fontSize: 11.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 18,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    marginTop: 2,
  },
  statLabel: {
    fontSize: 10.5,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
  },
});
