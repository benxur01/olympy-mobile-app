import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { DARK_COLORS } from '../constants/colors';
import { FONTS } from '../constants/typography';
import Card from '../components/Card';
import Badge from '../components/Badge';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useFetch from '../services/useFetch';
import { teacherApi, managerApi } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { BookIcon, ChevronDownIcon, ChevronRightIcon } from '../components/icons/Icons';
import CodeHighlight from '../components/CodeHighlight';

// Monospace: iOS'da Menlo, Android/Web'da umumiy 'monospace' oilasi (CodeQuestion
// bilan bir xil — kod bloklarining odatiy ko'rinishi uchun).
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });
const asResults = (data) => (Array.isArray(data) ? data : data?.results || []);

// Judge0 til kalitlarini CodeHighlight'ning tanigan tillariga moslashtirish.
const HL_LANGS = {
  python: 'python',
  javascript: 'javascript',
  js: 'javascript',
  java: 'java',
  cpp: 'cpp',
  'c++': 'cpp',
  c: 'c',
};
const toHlLang = (lang) => HL_LANGS[String(lang || '').toLowerCase()] || null;

export default function CodeReviewScreen({ route }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const { user } = useAuth();
  const params = route?.params || {};
  const singleOlympiadId = params.olympiadId;

  // Sof menejerda teacher olimpiadalari bo'sh — bunday holda markaz
  // statistikasidagi natijasi bor tadbirlarni ishlatamiz (EssayGradingScreen
  // naqshi). Teacher oqimiga ta'sir qilmaydi.
  const isManager = Array.isArray(user?.roles) && user.roles.includes('manager');
  const { data, loading, refreshing, error, reload, refresh } = useFetch(async () => {
    // Ma'lum bir olimpiada berilgan bo'lsa (o'qituvchi tadbir detalidan) —
    // faqat o'shaning kod javoblarini olamiz, boshqalarini yig'maymiz.
    if (singleOlympiadId) {
      const list = await teacherApi
        .codeSubmissions(singleOlympiadId)
        .then((r) => (Array.isArray(r.data) ? r.data : []))
        .catch(() => []);
      return list;
    }
    const olyData = await teacherApi.myOlympiads().then((r) => r.data).catch(() => null);
    let olympiads = asResults(olyData);
    if (!olympiads.length && isManager) {
      const events = await managerApi
        .stats(undefined, { page_size: 200 })
        .then((r) => (Array.isArray(r.data?.events) ? r.data.events : []))
        .catch(() => []);
      olympiads = events
        .filter((e) => (e.participants || 0) > 0)
        .slice(0, 20)
        .map((e) => ({ id: e.olympiad_id, title: e.title }));
    }
    if (!olympiads.length) return [];
    const lists = await Promise.all(
      olympiads.map((o) =>
        teacherApi
          .codeSubmissions(o.id)
          .then((r) => (Array.isArray(r.data) ? r.data.map((s) => ({ ...s, olympiad_title: o.title })) : []))
          .catch(() => [])
      )
    );
    return lists.flat();
  }, [isManager, singleOlympiadId]);

  const [expanded, setExpanded] = useState({});
  const toggle = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  if (loading) return <LoadingState message="Kod javoblari yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  const items = data || [];

  if (!items.length) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <EmptyState
          icon={<BookIcon size={22} color={colors.blueLight} />}
          title="Kod javoblari yo'q"
          message="Bu tadbirlarda hali IT (kod) savollariga javoblar yo'q. O'quvchilar yechgach shu yerda ko'rinadi."
          actionLabel="Yangilash"
          onAction={reload}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.blue} />}
      >
        <Text style={styles.title}>Kod javoblari</Text>
        <Text style={styles.subtitle}>{items.length} ta topshiriq</Text>

        <View style={styles.list}>
          {items.map((sub) => {
            const isOpen = !!expanded[sub.id];
            const hasScore = typeof sub.ai_code_score === 'number';
            return (
              <Card key={sub.id} style={styles.card}>
                <TouchableOpacity activeOpacity={0.85} onPress={() => toggle(sub.id)}>
                  <View style={styles.rowTop}>
                    <View style={styles.rowInfo}>
                      <Text style={styles.studentName} numberOfLines={1}>
                        {sub.student_name || '—'}
                      </Text>
                      <Text style={styles.questionText} numberOfLines={2}>
                        {sub.question_text || '—'}
                      </Text>
                      {sub.olympiad_title ? (
                        <Text style={styles.olympiadTitle} numberOfLines={1}>{sub.olympiad_title}</Text>
                      ) : null}
                    </View>
                    {hasScore ? (
                      <Badge
                        label={`AI ${sub.ai_code_score}`}
                        color={colors.purpleLight}
                        background={tints.purple16}
                        size={11}
                      />
                    ) : (
                      <Badge label="Ball yo'q" color={colors.textMuted} background={tints.slate14} size={11} />
                    )}
                  </View>
                  <View style={styles.rowBottom}>
                    <Badge
                      label={sub.code_language || '—'}
                      color={colors.textSecondary}
                      background={colors.surfaceDeep}
                      size={11}
                    />
                    <View style={styles.expandBtn}>
                      {isOpen ? (
                        <ChevronDownIcon size={11} color={colors.blue} />
                      ) : (
                        <ChevronRightIcon size={13} color={colors.blue} />
                      )}
                      <Text style={styles.expandText}>{isOpen ? 'Yopish' : "Ko'rish"}</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {isOpen ? (
                  <View style={styles.details}>
                    <Text style={styles.sectionLabel}>KOD</Text>
                    <ScrollView
                      style={styles.codeBox}
                      contentContainerStyle={styles.codeContent}
                      nestedScrollEnabled
                      showsVerticalScrollIndicator
                    >
                      {sub.submitted_code ? (
                        <CodeHighlight
                          code={String(sub.submitted_code)}
                          language={toHlLang(sub.code_language)}
                          colors={colors}
                          fontFamily={MONO}
                          fontSize={12.5}
                        />
                      ) : (
                        <Text style={styles.codeText}>{"(bo'sh)"}</Text>
                      )}
                    </ScrollView>

                    {sub.ai_code_review ? (
                      <>
                        <Text style={styles.sectionLabel}>AI TAVSIYASI</Text>
                        <View style={styles.reviewBox}>
                          <Text style={styles.reviewText}>{sub.ai_code_review}</Text>
                        </View>
                      </>
                    ) : null}
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>

        <Text style={styles.footnote}>
          AI tavsiyasi va ball test yakunlangach bir necha soniyada hisoblanadi.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors, tints) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 40 },
  title: { fontSize: 19, fontFamily: FONTS.extrabold, color: colors.text },
  subtitle: { fontSize: 12, fontFamily: FONTS.semibold, color: colors.textSecondary, marginTop: 2 },
  list: { gap: 10, marginTop: 16 },
  card: { padding: 14 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowInfo: { flex: 1 },
  studentName: { fontSize: 14, fontFamily: FONTS.extrabold, color: colors.text },
  questionText: { fontSize: 12, fontFamily: FONTS.semibold, color: colors.textSecondary, marginTop: 4, lineHeight: 17 },
  olympiadTitle: { fontSize: 11, fontFamily: FONTS.bold, color: colors.textMuted, marginTop: 4 },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  expandBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  expandText: { fontSize: 12, fontFamily: FONTS.extrabold, color: colors.blue },
  details: { marginTop: 14, gap: 7 },
  sectionLabel: {
    fontSize: 10.5,
    fontFamily: FONTS.extrabold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  codeBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: DARK_COLORS.bg,
    maxHeight: 260,
  },
  codeContent: { padding: 13 },
  codeText: {
    fontFamily: MONO,
    fontSize: 12.5,
    color: DARK_COLORS.text,
    lineHeight: 19,
  },
  reviewBox: {
    borderWidth: 1,
    borderColor: tints.purpleBorder35,
    borderRadius: 12,
    backgroundColor: tints.purple16,
    padding: 12,
  },
  reviewText: { fontSize: 13, fontFamily: FONTS.semibold, color: colors.textBody, lineHeight: 19 },
  footnote: {
    fontSize: 10.5,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
    marginTop: 16,
    lineHeight: 15,
  },
});
