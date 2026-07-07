import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Card from '../components/Card';
import Button from '../components/Button';
import Avatar from '../components/Avatar';
import ProgressBar from '../components/ProgressBar';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import useFetch from '../services/useFetch';
import { duelApi } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { BackIcon, TrophyIcon, CloseIcon, LightningIcon } from '../components/icons/Icons';

const initialOf = (name) => (name || '?').trim()[0]?.toUpperCase() || '?';

export default function DuelResultScreen({ route, navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const { user } = useAuth();
  const duelId = route?.params?.duelId;

  const { data, loading, error, reload, refresh, refreshing } = useFetch(
    () => duelApi.result(duelId).then((r) => r.data),
    [duelId]
  );

  if (loading && !data) return <LoadingState message="Natija yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  const result = data || {};
  const meIsChallenger = result.challenger?.user_id === user?.id;
  const meSide = (meIsChallenger ? result.challenger : result.opponent) || {};
  const oppSide = (meIsChallenger ? result.opponent : result.challenger) || {};
  const total = result.total_questions || 0;
  const outcome = result.my_outcome || 'pending';
  const completed = result.status === 'completed';

  const meta = {
    win: { title: 'G\'alaba!', sub: 'Bu duelda siz g\'olib bo\'ldingiz', accent: colors.gold, bg: tints.gold14, border: tints.goldBorder35 },
    loss: { title: 'Mag\'lubiyat', sub: 'Bu safar omad kulib boqmadi', accent: colors.red, bg: tints.red12, border: tints.redBorder35 },
    draw: { title: 'Durang', sub: 'Ikkalangiz ham teng ball to\'pladingiz', accent: colors.gold, bg: tints.gold10, border: tints.goldBorder30 },
    pending: { title: 'Duel davom etmoqda', sub: 'Raqib hali barcha savollarga javob bermagan', accent: colors.blue, bg: tints.blue10, border: tints.blueBorder30 },
  }[outcome] || { title: 'Natija', sub: '', accent: colors.blue, bg: tints.blue10, border: tints.blueBorder30 };

  const HeroIcon = outcome === 'loss' ? CloseIcon : outcome === 'pending' ? LightningIcon : TrophyIcon;

  const meCorrect = meSide.correct || 0;
  const oppCorrect = oppSide.correct || 0;
  const mePct = total ? (meCorrect / total) * 100 : 0;
  const oppPct = total ? (oppCorrect / total) * 100 : 0;
  const meWon = completed && outcome === 'win';
  const oppWon = completed && outcome === 'loss';

  const goList = () => {
    // Natijadan ro'yxatga: DuelList stack'da orqada bo'lsa unga qaytamiz,
    // bo'lmasa (deep-link) yangi ochamiz.
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.replace('DuelList');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <TouchableOpacity activeOpacity={0.7} onPress={goList} style={styles.backBtn}>
          <BackIcon size={16} />
        </TouchableOpacity>
        <Text style={styles.title}>Duel natijasi</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: meta.bg, borderColor: meta.border }]}>
          <View style={[styles.heroBadge, { backgroundColor: meta.accent }]}>
            <HeroIcon size={30} color={outcome === 'draw' || outcome === 'win' ? colors.goldText : colors.white} strokeWidth={2} full />
          </View>
          <Text style={styles.heroTitle}>{meta.title}</Text>
          <Text style={styles.heroSub}>{meta.sub}</Text>
          {result.subject ? <Text style={styles.heroSubject}>{result.subject}</Text> : null}
        </View>

        <View style={styles.vsRow}>
          <View style={[styles.playerCol, meWon ? styles.playerWon : null]}>
            <Avatar letter={initialOf(meSide.full_name || user?.full_name)} size={54} fontSize={20} background={colors.blueDeep} borderColor={meWon ? colors.gold : undefined} borderWidth={2.5} />
            <Text style={styles.playerName} numberOfLines={1}>Siz</Text>
            <Text style={[styles.playerScore, meWon ? { color: colors.gold } : null]}>{meCorrect}</Text>
            <Text style={styles.playerOf}>/ {total}</Text>
          </View>

          <View style={styles.vsMid}>
            <Text style={styles.vsText}>VS</Text>
          </View>

          <View style={[styles.playerCol, oppWon ? styles.playerWon : null]}>
            <Avatar letter={initialOf(oppSide.full_name)} size={54} fontSize={20} background={colors.purple} borderColor={oppWon ? colors.gold : undefined} borderWidth={2.5} />
            <Text style={styles.playerName} numberOfLines={1}>{(oppSide.full_name || 'Raqib').split(' ')[0]}</Text>
            <Text style={[styles.playerScore, oppWon ? { color: colors.gold } : null]}>{oppCorrect}</Text>
            <Text style={styles.playerOf}>/ {total}</Text>
          </View>
        </View>

        <Card radius={16} style={styles.barsCard}>
          <View style={styles.barBlock}>
            <View style={styles.barLabelRow}>
              <Text style={styles.barName}>Siz</Text>
              <Text style={styles.barVal}>{meCorrect}/{total} to'g'ri</Text>
            </View>
            <ProgressBar progress={mePct} height={8} color={colors.blue} />
          </View>
          <View style={styles.barBlock}>
            <View style={styles.barLabelRow}>
              <Text style={styles.barName} numberOfLines={1}>{oppSide.full_name || 'Raqib'}</Text>
              <Text style={styles.barVal}>{oppCorrect}/{total} to'g'ri</Text>
            </View>
            <ProgressBar progress={oppPct} height={8} color={colors.purple} />
          </View>
        </Card>

        {!completed ? (
          <Button title="Yangilash" variant="dark" height={48} radius={12} fontSize={14.5} style={styles.refreshBtn} disabled={refreshing} onPress={refresh} />
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Yana duel" variant="dark" height={50} radius={13} fontSize={14.5} style={styles.footerBtn} onPress={() => navigation.replace('DuelInvite')} />
        <Button title="Duellar ro'yxati" height={50} radius={13} fontSize={14.5} style={styles.footerBtn} onPress={goList} />
      </View>
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
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 26,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  heroBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  heroSub: {
    fontSize: 13,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  heroSubject: {
    fontSize: 11.5,
    fontFamily: FONTS.extrabold,
    color: colors.textMuted,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  vsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
  },
  playerCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  playerWon: {
    borderColor: tints.goldBorder35,
    backgroundColor: tints.gold08,
  },
  playerName: {
    fontSize: 12.5,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    marginTop: 6,
  },
  playerScore: {
    fontSize: 30,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    marginTop: 4,
  },
  playerOf: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
    marginTop: -4,
  },
  vsMid: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    fontSize: 15,
    fontFamily: FONTS.extrabold,
    color: colors.textMuted,
  },
  barsCard: {
    marginTop: 16,
    padding: 16,
    gap: 14,
  },
  barBlock: {
    gap: 7,
  },
  barLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  barName: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  barVal: {
    fontSize: 11.5,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
  },
  refreshBtn: {
    marginTop: 16,
    alignSelf: 'stretch',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  footerBtn: {
    flex: 1,
  },
});
