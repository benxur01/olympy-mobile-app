import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import { useTabBarSpacing } from '../components/TabBar';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import SearchBar from '../components/SearchBar';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useFetch from '../services/useFetch';
import { studentApi } from '../services/api';
import { CalendarIcon, ClockIcon, UsersIcon } from '../components/icons/Icons';

const asArray = (data) => (Array.isArray(data) ? data : data?.results || data?.entries || []);

const formatWhen = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('uz-UZ', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const makeSTATUS = (colors, tints) => ({
  active: { label: 'Faol', color: colors.greenLight, bg: tints.green14, border: tints.greenBorder30 },
  finished: { label: 'Yakunlandi', color: colors.slate, bg: tints.slate14 },
  draft: { label: 'Kutilmoqda', color: colors.orange, bg: tints.orange14 },
  scheduled: { label: 'Kutilmoqda', color: colors.orange, bg: tints.orange14 },
});

function EventCard({ event, onEnter }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const STATUS = makeSTATUS(colors, tints);
  const st = STATUS[event.status] || STATUS.scheduled;
  const isActive = event.status === 'active';
  const isFinished = event.status === 'finished';
  return (
    <Card radius={18} style={styles.eventCard}>
      <View style={styles.badgeRow}>
        {event.subject ? (
          <Badge label={event.subject} color={colors.blueLight} background={tints.blue14} size={11} />
        ) : null}
        <Badge label={st.label} color={st.color} background={st.bg} borderColor={st.border} size={11} />
      </View>
      <Text style={styles.eventTitle}>{event.title || 'Nomsiz tadbir'}</Text>
      <View style={styles.eventMeta}>
        <View style={styles.metaItem}>
          <ClockIcon size={12} color={colors.textMuted} />
          <Text style={styles.metaText}>{event.duration_minutes || 0} daqiqa</Text>
        </View>
        <View style={styles.metaItem}>
          <UsersIcon size={12} color={colors.textMuted} />
          <Text style={styles.metaText}>{event.participants || 0} ishtirokchi</Text>
        </View>
        {event.max_score ? (
          <Text style={styles.metaText}>· {event.max_score} ball</Text>
        ) : null}
      </View>
      {event.start_datetime ? (
        <Text style={styles.startText}>Boshlanish: {formatWhen(event.start_datetime)}</Text>
      ) : null}
      {isActive ? (
        <Button
          title="Kirish"
          height={46}
          radius={12}
          fontSize={14.5}
          style={styles.enterBtn}
          onPress={() => onEnter(event)}
        />
      ) : (
        <Button
          title={isFinished ? 'Yakunlangan' : 'Hali boshlanmagan'}
          variant="muted"
          height={46}
          radius={12}
          fontSize={14}
          style={styles.enterBtn}
          disabled
        />
      )}
    </Card>
  );
}

export default function EventsScreen({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const tabBarSpacing = useTabBarSpacing();
  const [query, setQuery] = useState('');
  const { data, loading, refreshing, error, reload, refresh } = useFetch(
    () => studentApi.olympiads().then((r) => asArray(r.data)),
    []
  );

  const events = useMemo(() => {
    const list = data || [];
    const q = query.trim().toLowerCase();
    const filtered = q
      ? list.filter(
          (e) =>
            (e.title || '').toLowerCase().includes(q) ||
            (e.subject || '').toLowerCase().includes(q)
        )
      : list;
    const rank = (e) => (e.status === 'active' ? 0 : e.status === 'finished' ? 2 : 1);
    return [...filtered].sort((a, b) => rank(a) - rank(b));
  }, [data, query]);

  if (loading) return <LoadingState message="Tadbirlar yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  const enter = (event) =>
    navigation.navigate('Exam', {
      olympiadId: event.id,
      title: event.title,
      durationMinutes: event.duration_minutes,
    });

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarSpacing }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.blue} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Tadbirlar</Text>
          <Text style={styles.subtitle}>Olimpiada va musobaqalar</Text>
        </View>
        <SearchBar
          placeholder="Tadbir yoki fan bo'yicha qidirish"
          value={query}
          onChangeText={setQuery}
          style={styles.search}
        />

        {events.length === 0 ? (
          <EmptyState
            compact
            icon={<CalendarIcon size={24} color={colors.blueLight} />}
            title="Tadbirlar yo'q"
            message={
              query
                ? "Qidiruv bo'yicha tadbir topilmadi."
                : "Hozircha faol yoki rejalashtirilgan tadbir yo'q. Keyinroq qayta tekshiring."
            }
          />
        ) : (
          <View style={styles.list}>
            {events.map((event) => (
              <EventCard key={event.id} event={event} onEnter={enter} />
            ))}
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
    paddingBottom: 110,
  },
  header: {
    marginBottom: 4,
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
  search: {
    marginTop: 14,
    marginBottom: 4,
  },
  list: {
    gap: 11,
    marginTop: 12,
  },
  eventCard: {
    padding: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  eventTitle: {
    fontSize: 16,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    marginTop: 10,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
  },
  startText: {
    fontSize: 11.5,
    fontFamily: FONTS.bold,
    color: colors.textMuted,
    marginTop: 8,
  },
  enterBtn: {
    marginTop: 14,
  },
});
