import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Card from '../components/Card';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useFetch from '../services/useFetch';
import { notificationsApi } from '../services/api';
import { BackIcon, BellIcon } from '../components/icons/Icons';

const asArray = (data) => (Array.isArray(data) ? data : data?.results || []);

const timeOf = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString('uz-UZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const makeDOT_BY_TYPE = (colors, tints) => (type = '') => {
  const t = String(type).toLowerCase();
  if (t.includes('cheat') || t.includes('disq') || t.includes('warning')) return colors.red;
  if (t.includes('published') || t.includes('olympiad') || t.includes('reminder')) return colors.blue;
  if (t.includes('reward') || t.includes('streak') || t.includes('badge')) return colors.gold;
  return colors.green;
};

export default function NotificationsScreen({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const DOT_BY_TYPE = makeDOT_BY_TYPE(colors, tints);
  const { data, loading, refreshing, error, reload, refresh } = useFetch(
    () => notificationsApi.list().then((r) => asArray(r.data)),
    []
  );
  const [items, setItems] = useState(null);
  const [marking, setMarking] = useState(false);

  // Ro'yxatni lokal state'da ushlaymiz — o'qilgan deb belgilaganda darhol
  // yangilanadi (optimistik).
  const list = items ?? data ?? [];
  const unread = list.filter((n) => !n.is_read).length;

  if (loading && !data) return <LoadingState message="Bildirishnomalar yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  const markOne = async (n) => {
    if (n.is_read) return;
    setItems((prev) => (prev ?? data ?? []).map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    try {
      await notificationsApi.markRead(n.id);
    } catch (e) {}
  };

  const markAll = async () => {
    if (marking || unread === 0) return;
    setMarking(true);
    setItems((prev) => (prev ?? data ?? []).map((x) => ({ ...x, is_read: true })));
    try {
      await notificationsApi.markAllRead();
    } catch (e) {}
    setMarking(false);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()} style={styles.backBtn}>
          <BackIcon size={16} />
        </TouchableOpacity>
        <Text style={styles.title}>Bildirishnomalar</Text>
        {unread > 0 ? (
          <TouchableOpacity activeOpacity={0.7} onPress={markAll}>
            <Text style={styles.markAll}>Barchasi o'qildi</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.markAllPlaceholder} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setItems(null);
              refresh();
            }}
            tintColor={colors.blue}
          />
        }
      >
        {list.length === 0 ? (
          <EmptyState
            icon={<BellIcon size={24} color={colors.blueLight} />}
            title="Bildirishnoma yo'q"
            message="Yangi tadbirlar, natijalar va eslatmalar shu yerda ko'rinadi."
          />
        ) : (
          <View style={styles.list}>
            {list.map((n) => (
              <TouchableOpacity key={n.id} activeOpacity={0.85} onPress={() => markOne(n)}>
                <Card style={[styles.card, n.is_read ? null : styles.cardUnread]}>
                  <View style={[styles.dot, { backgroundColor: DOT_BY_TYPE(n.type) }]} />
                  <View style={styles.textWrap}>
                    <Text style={styles.notifTitle} numberOfLines={2}>
                      {n.title || 'Bildirishnoma'}
                    </Text>
                    {n.message ? (
                      <Text style={styles.message} numberOfLines={3}>
                        {n.message}
                      </Text>
                    ) : null}
                    <Text style={styles.time}>{timeOf(n.created_at)}</Text>
                  </View>
                </Card>
              </TouchableOpacity>
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
  markAll: {
    fontSize: 12,
    fontFamily: FONTS.extrabold,
    color: colors.blue,
  },
  markAllPlaceholder: {
    width: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 30,
    flexGrow: 1,
  },
  list: {
    gap: 8,
  },
  card: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 11,
  },
  cardUnread: {
    borderColor: tints.blueBorder30,
    backgroundColor: tints.blue06,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  textWrap: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 13.5,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  message: {
    fontSize: 12,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 17,
  },
  time: {
    fontSize: 10.5,
    fontFamily: FONTS.bold,
    color: colors.textMuted,
    marginTop: 6,
  },
});
