import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import { useTabBarSpacing } from '../components/TabBar';
import Card from '../components/Card';
import Badge from '../components/Badge';
import IconBox from '../components/IconBox';
import Fab from '../components/Fab';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import useFetch from '../services/useFetch';
import { studentApi } from '../services/api';
import { useAuth } from '../services/AuthContext';
import {
  TrophyIcon,
  ChevronRightIcon,
  LockIcon,
  SparkleIcon,
  BookIcon,
  CalendarIcon,
} from '../components/icons/Icons';

const makeSUBJECT_COLORS = (colors, tints) => ([
  { color: colors.blueLight, bg: tints.blue14 },
  { color: colors.purpleLight, bg: tints.purple16 },
  { color: colors.greenLight, bg: tints.green14 },
  { color: colors.orange, bg: tints.orange14 },
]);

const asArray = (data) => (Array.isArray(data) ? data : data?.results || []);

const normalizeTopicSubjects = (raw) => {
  const arr = Array.isArray(raw) ? raw : raw?.subjects || raw?.results || [];
  return arr
    .map((s) =>
      typeof s === 'string'
        ? { subject: s }
        : { subject: s.subject || s.name || s.title, topic: s.topic, count: s.question_count ?? s.count }
    )
    .filter((s) => s.subject);
};

export default function PracticeScreen({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const SUBJECT_COLORS = makeSUBJECT_COLORS(colors, tints);
  const tabBarSpacing = useTabBarSpacing();
  const { user } = useAuth();
  const [explaining, setExplaining] = useState(false);
  const [picker, setPicker] = useState(null); // null | 'topic' | 'past'
  const { data, loading, refreshing, error, reload, refresh } = useFetch(async () => {
    // Xato-javob fanlari — asosiy manba (uning xatoligi ErrorState ko'rsatadi).
    const wrong = await studentApi.wrongAnswerSubjects().then((r) => asArray(r.data));
    const [topicSubjects, olympiads] = await Promise.all([
      studentApi.practiceSubjects().then((r) => r.data).catch(() => null),
      studentApi.olympiads().then((r) => asArray(r.data)).catch(() => []),
    ]);
    return { wrong, topicSubjects, olympiads };
  }, []);

  if (loading) return <LoadingState message="Yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  const subjects = data?.wrong || [];
  const totalWrong = subjects.reduce((sum, s) => sum + (s.question_count || 0), 0);
  const hasWrong = totalWrong > 0;
  const isPremium = user?.is_premium || user?.is_premium_active;

  const topicSubjects = normalizeTopicSubjects(data?.topicSubjects);
  const finishedOlympiads = (data?.olympiads || []).filter((o) => o.status === 'finished');

  const startRepeat = (subject) => {
    if (!subject) return;
    navigation.navigate('PracticeRunner', { subject });
  };

  const startTopic = (item) => {
    setPicker(null);
    navigation.navigate('PracticeRunner', {
      mode: 'topic',
      subject: item.subject,
      ...(item.topic ? { topic: item.topic } : {}),
      sessionTitle: `${item.subject} · mashq`,
    });
  };

  const startPast = (o) => {
    setPicker(null);
    navigation.navigate('PracticeRunner', {
      mode: 'topic',
      subject: o.subject,
      sessionTitle: `${o.title || o.subject} · sinov`,
    });
  };

  const explainAll = async () => {
    if (!isPremium) {
      navigation.navigate('Premium');
      return;
    }
    if (explaining) return;
    setExplaining(true);
    try {
      await studentApi.explainAllMistakes();
      Alert.alert(
        'Tayyor',
        "Barcha xatolaringiz AI tomonidan tahlil qilindi. Izohlarni xatolar bo'limida ko'rishingiz mumkin.",
        [
          { text: 'Ko\'rish', onPress: () => navigation.navigate('Mistakes') },
          { text: 'Yaxshi', style: 'cancel' },
        ]
      );
    } catch (e) {
      const detail = e?.response?.data?.detail;
      Alert.alert('Xatolik', detail || "Hozircha bajarib bo'lmadi. Keyinroq urinib ko'ring.");
    } finally {
      setExplaining(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarSpacing }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.blue} />}
      >
        <Text style={styles.title}>Mashq qilish</Text>
        <Text style={styles.subtitle}>Bilimingizni mustahkamlang</Text>

        <View style={styles.modes}>
          <TouchableOpacity activeOpacity={0.85} onPress={() => setPicker('topic')}>
            <Card radius={18} style={styles.modeCard}>
              <IconBox size={46} radius={14} background={tints.blue14}>
                <BookIcon size={22} color={colors.blue} />
              </IconBox>
              <View style={styles.modeText}>
                <Text style={styles.modeTitle}>Mavzu bo'yicha mashq</Text>
                <Text style={styles.modeSub}>Fan tanlab yangi savollar ishlash</Text>
              </View>
              <ChevronRightIcon size={15} />
            </Card>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.85} onPress={() => setPicker('past')}>
            <Card radius={18} style={styles.modeCard}>
              <IconBox size={46} radius={14} background={tints.purple16}>
                <CalendarIcon size={22} color={colors.purple} strokeWidth={1.9} />
              </IconBox>
              <View style={styles.modeText}>
                <Text style={styles.modeTitle}>O'tgan olimpiadani sinash</Text>
                <Text style={styles.modeSub}>Tugagan tadbir mavzusida mashq</Text>
              </View>
              <ChevronRightIcon size={15} />
            </Card>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('Musobaqalar')}>
            <Card radius={18} style={styles.modeCard}>
              <IconBox size={46} radius={14} background={tints.gold13}>
                <TrophyIcon size={22} color={colors.gold} strokeWidth={1.9} full={false} />
              </IconBox>
              <View style={styles.modeText}>
                <Text style={styles.modeTitle}>Musobaqalarda qatnashish</Text>
                <Text style={styles.modeSub}>Faol olimpiadalarni ko'rish</Text>
              </View>
              <ChevronRightIcon size={15} />
            </Card>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Xatolar sandig'i</Text>
        <Card radius={18} style={styles.mistakesCard}>
          {hasWrong ? (
            <>
              <View style={styles.badgeRow}>
                {subjects.map((s, i) => {
                  const c = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
                  return (
                    <TouchableOpacity
                      key={s.subject}
                      activeOpacity={0.8}
                      onPress={() => startRepeat(s.subject)}
                    >
                      <Badge
                        label={`${s.subject} · ${s.question_count}`}
                        color={c.color}
                        background={c.bg}
                        size={11}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.aiButton}
                onPress={explainAll}
                disabled={explaining}
              >
                {isPremium ? (
                  <SparkleIcon size={14} color={colors.gold} />
                ) : (
                  <LockIcon size={14} />
                )}
                <Text style={styles.aiButtonText}>
                  {explaining ? 'Tahlil qilinmoqda…' : 'AI bilan barchasini tushuntirish'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.viewMistakesBtn}
                onPress={() => navigation.navigate('Mistakes')}
              >
                <Text style={styles.viewMistakesText}>Barcha xatolarni ko'rish →</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.emptyMistakes}>
              <Text style={styles.emptyTitle}>Xatolar yo'q</Text>
              <Text style={styles.emptyText}>
                Ajoyib! Hali noto'g'ri javob bermagansiz. Musobaqalarda qatnashishda davom eting.
              </Text>
            </View>
          )}
        </Card>
      </ScrollView>
      <Fab onPress={() => navigation.navigate('AiChat')} />

      <Modal visible={!!picker} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
        <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={() => setPicker(null)} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>
            {picker === 'past' ? 'Tugagan olimpiadani tanlang' : 'Fan tanlang'}
          </Text>
          <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
            {picker === 'topic' ? (
              topicSubjects.length ? (
                topicSubjects.map((s, i) => (
                  <TouchableOpacity
                    key={`${s.subject}-${i}`}
                    activeOpacity={0.8}
                    style={styles.pickerRow}
                    onPress={() => startTopic(s)}
                  >
                    <BookIcon size={18} color={colors.blue} />
                    <Text style={styles.pickerLabel} numberOfLines={1}>{s.subject}</Text>
                    {s.count ? <Text style={styles.pickerCount}>{s.count} savol</Text> : null}
                    <ChevronRightIcon size={14} />
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.pickerEmpty}>Hozircha mashq uchun fanlar mavjud emas.</Text>
              )
            ) : finishedOlympiads.length ? (
              finishedOlympiads.map((o) => (
                <TouchableOpacity
                  key={o.id}
                  activeOpacity={0.8}
                  style={styles.pickerRow}
                  onPress={() => startPast(o)}
                >
                  <CalendarIcon size={18} color={colors.purple} strokeWidth={1.9} />
                  <View style={styles.pickerText}>
                    <Text style={styles.pickerLabel} numberOfLines={1}>{o.title || 'Tadbir'}</Text>
                    {o.subject ? <Text style={styles.pickerSub}>{o.subject}</Text> : null}
                  </View>
                  <ChevronRightIcon size={14} />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.pickerEmpty}>Hozircha tugagan olimpiada yo'q.</Text>
            )}
          </ScrollView>
          <TouchableOpacity activeOpacity={0.7} onPress={() => setPicker(null)}>
            <Text style={styles.pickerCancel}>Bekor qilish</Text>
          </TouchableOpacity>
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
    paddingBottom: 110,
  },
  title: {
    fontSize: 19,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  subtitle: {
    fontSize: 12.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 3,
  },
  modes: {
    gap: 11,
    marginTop: 18,
  },
  modeCard: {
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  modeText: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 15.5,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  modeSub: {
    fontSize: 12,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    marginTop: 24,
    marginBottom: 10,
  },
  mistakesCard: {
    padding: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  aiButton: {
    marginTop: 14,
    height: 44,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: tints.goldBorder45,
    borderRadius: 12,
    backgroundColor: tints.gold07,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  aiButtonText: {
    fontSize: 13,
    fontFamily: FONTS.extrabold,
    color: colors.gold,
  },
  viewMistakesBtn: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 4,
  },
  viewMistakesText: {
    fontSize: 12.5,
    fontFamily: FONTS.extrabold,
    color: colors.blue,
  },
  emptyMistakes: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  emptyText: {
    fontSize: 12.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
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
    paddingBottom: 34,
    maxHeight: '70%',
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
    marginBottom: 8,
  },
  pickerScroll: {
    flexGrow: 0,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  pickerText: {
    flex: 1,
  },
  pickerLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  pickerSub: {
    fontSize: 11.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pickerCount: {
    fontSize: 11.5,
    fontFamily: FONTS.bold,
    color: colors.textMuted,
  },
  pickerEmpty: {
    fontSize: 12.5,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 26,
  },
  pickerCancel: {
    textAlign: 'center',
    marginTop: 14,
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: colors.textMuted,
  },
});
