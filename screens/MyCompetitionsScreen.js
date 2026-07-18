import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Card from '../components/Card';
import Badge from '../components/Badge';
import IconBox from '../components/IconBox';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useFetch from '../services/useFetch';
import { studentApi } from '../services/api';
import { BackIcon, CalendarIcon } from '../components/icons/Icons';

const asArray = (data) => (Array.isArray(data) ? data : data?.results || data?.entries || []);

const STATUS_META = (colors, tints) => ({
  active: { label: 'Faol', color: colors.greenLight, bg: tints.green14 },
  finished: { label: 'Yakunlandi', color: colors.slate, bg: tints.slate14 },
  draft: { label: 'Kutilmoqda', color: colors.orange, bg: tints.orange14 },
  scheduled: { label: 'Kutilmoqda', color: colors.orange, bg: tints.orange14 },
});

const formatWhen = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('uz-UZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

// Premium kabi alohida stack package: foydalanuvchi qatnashgan musobaqalar.
export default function MyCompetitionsScreen({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const statusMeta = STATUS_META(colors, tints);

  const { data, loading, refreshing, error, reload, refresh } = useFetch(async () => {
    const [resultsRes, olympiadsRes] = await Promise.all([
      studentApi.myResults({ page_size: 50 }).then((r) => r.data).catch(() => null),
      studentApi.olympiads().then((r) => r.data).catch(() => null),
    ]);
    if (resultsRes === null && olympiadsRes === null) {
      throw new Error('competitions_load_failed');
    }
    const results = asArray(resultsRes);
    const olympiads = asArray(olympiadsRes);
    const olyById = {};
    olympiads.forEach((o) => {
      if (o?.id != null) olyById[o.id] = o;
    });

    // Nom yo'q bo'lsa detail so'rov (production API ba'zan faqat id qaytaradi).
    const missingIds = [
      ...new Set(
        results
          .map((r) => {
            if (r.olympiad_title || r.olympiad?.title) return null;
            const o = r.olympiad;
            const id = o && typeof o === 'object' ? o.id : o;
            if (id == null || olyById[id]) return null;
            return id;
          })
          .filter((id) => id != null)
      ),
    ];
    if (missingIds.length) {
      const details = await Promise.all(
        missingIds.slice(0, 20).map((id) =>
          studentApi.olympiadDetail(id).then((r) => r.data).catch(() => null)
        )
      );
      details.forEach((o) => {
        if (o?.id != null) olyById[o.id] = o;
      });
    }

    const items = results.map((r) => {
      const olympiadId =
        r.olympiad && typeof r.olympiad === 'object' ? r.olympiad.id : r.olympiad;
      const oly =
        (olympiadId != null ? olyById[olympiadId] : null) ||
        (r.olympiad && typeof r.olympiad === 'object' ? r.olympiad : null);
      const title =
        r.olympiad_title ||
        oly?.title ||
        r.olympiad?.title ||
        (olympiadId != null ? `Olimpiada #${olympiadId}` : 'Tadbir');
      return {
        id: r.id ?? `${olympiadId}-${r.score}`,
        olympiadId,
        title,
        subject: r.subject || oly?.subject || '',
        score: r.score,
        rank: r.rank,
        status: oly?.status || 'finished',
        when: formatWhen(r.submitted_at),
        correct: r.correct_count,
        total: r.total_questions,
      };
    });

    return { items, total: items.length };
  }, []);

  if (loading && !data) return <LoadingState message="Musobaqalar yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  const items = data?.items || [];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Orqaga"
        >
          <BackIcon size={16} />
        </TouchableOpacity>
        <Text style={styles.title}>Mening musobaqalarim</Text>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{items.length}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.blue} />
        }
      >
        <Text style={styles.subtitle}>
          Siz qatnashgan olimpiada va musobaqalar ro'yxati
        </Text>

        {items.length === 0 ? (
          <EmptyState
            title="Hali musobaqa yo'q"
            message="Olimpiadada qatnashgach, natijalaringiz shu yerda ko'rinadi."
          />
        ) : (
          <View style={styles.list}>
            {items.map((o, i) => {
              const st = statusMeta[o.status] || statusMeta.finished;
              return (
                <Card key={o.id || i} style={styles.row}>
                  <IconBox size={42} radius={12} background={tints.green14}>
                    <CalendarIcon size={19} color={colors.green} strokeWidth={2} />
                  </IconBox>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle} numberOfLines={2}>
                      {o.title}
                    </Text>
                    <View style={styles.meta}>
                      {o.subject ? <Text style={styles.metaText}>{o.subject}</Text> : null}
                      {o.when ? <Text style={styles.metaText}>{o.when}</Text> : null}
                      <Badge
                        label={st.label}
                        color={st.color}
                        background={st.bg}
                        size={9.5}
                        style={styles.badge}
                      />
                    </View>
                    {o.correct != null && o.total != null ? (
                      <Text style={styles.metaText}>
                        {o.correct}/{o.total} to'g'ri
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.scoreBox}>
                    <Text style={styles.score}>{o.score ?? '—'}</Text>
                    <Text style={styles.scoreLabel}>{o.rank ? `#${o.rank}` : 'ball'}</Text>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors, tints) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 10,
      gap: 10,
    },
    backBtn: {
      width: 38,
      height: 38,
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
    countPill: {
      minWidth: 32,
      height: 28,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: tints.green14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    countText: {
      fontSize: 13,
      fontFamily: FONTS.extrabold,
      color: colors.green,
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    subtitle: {
      fontSize: 12.5,
      fontFamily: FONTS.semibold,
      color: colors.textSecondary,
      marginBottom: 14,
      lineHeight: 18,
    },
    list: {
      gap: 10,
    },
    row: {
      paddingVertical: 14,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    rowText: {
      flex: 1,
      minWidth: 0,
      gap: 3,
    },
    rowTitle: {
      fontSize: 14,
      fontFamily: FONTS.extrabold,
      color: colors.text,
    },
    meta: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
    },
    metaText: {
      fontSize: 11,
      fontFamily: FONTS.semibold,
      color: colors.textSecondary,
    },
    badge: {
      paddingVertical: 2,
      paddingHorizontal: 7,
      borderRadius: 6,
    },
    scoreBox: {
      alignItems: 'center',
      minWidth: 44,
    },
    score: {
      fontSize: 18,
      fontFamily: FONTS.extrabold,
      color: colors.text,
    },
    scoreLabel: {
      fontSize: 10,
      fontFamily: FONTS.bold,
      color: colors.textSecondary,
      marginTop: 1,
    },
  });
