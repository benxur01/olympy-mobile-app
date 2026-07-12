import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import SearchBar from '../components/SearchBar';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useFetch from '../services/useFetch';
import { managerApi } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { centerIdForUser } from '../services/roles';
import { CheckIcon, CloseIcon, InboxIcon } from '../components/icons/Icons';

const makeAVATAR_COLORS = (colors, tints) => ([colors.blue, colors.purple, colors.green, colors.orange, colors.blueDeep]);

const nameOf = (u) => u?.full_name || u?.username || u?.phone || "O'quvchi";
const firstLetter = (u) => (nameOf(u)[0] || '?').toUpperCase();

const formatWhen = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export default function ApplicationsScreen() {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const AVATAR_COLORS = makeAVATAR_COLORS(colors, tints);
  const { user } = useAuth();
  const centerId = centerIdForUser(user);
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState(null);

  const { data, loading, refreshing, error, reload, refresh } = useFetch(async () => {
    if (!centerId) return { pending: [], approved: [] };
    const [pending, approved] = await Promise.all([
      managerApi.pendingMemberships(centerId).then((r) => r.data).catch(() => null),
      managerApi.studentsMemberships(centerId).then((r) => r.data).catch(() => null),
    ]);
    if (pending === null && approved === null) {
      throw new Error('applications_load_failed');
    }
    return {
      pending: Array.isArray(pending) ? pending : [],
      approved: Array.isArray(approved) ? approved : [],
    };
  }, [centerId]);

  const pending = data?.pending || [];
  const approved = data?.approved || [];

  const filteredPending = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pending;
    return pending.filter(
      (m) => nameOf(m.user).toLowerCase().includes(q) || (m.user?.phone || '').includes(q)
    );
  }, [pending, query]);

  const decide = (membership, decision) => {
    if (!centerId || busyId) return;
    setBusyId(membership.membership_id);
    const approve =
      membership.role === 'teacher' ? managerApi.approveTeacher
      : membership.role === 'manager' ? managerApi.approveManager
      : managerApi.approveStudent;
    approve(centerId, { membership_id: membership.membership_id, decision })
      .then(() => reload())
      .catch((e) => {
        const detail = e?.response?.data?.detail;
        Alert.alert('Xatolik', detail || "Amalni bajarib bo'lmadi. Qayta urinib ko'ring.");
      })
      .finally(() => setBusyId(null));
  };

  if (loading) return <LoadingState message="Arizalar yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  if (!centerId) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <EmptyState
          icon={<InboxIcon size={24} color={colors.blueLight} />}
          title="Markaz topilmadi"
          message="Sizga biriktirilgan o'quv markazi yo'q. Arizalarni ko'rish uchun markaz kerak."
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
        <View style={styles.header}>
          <Text style={styles.title}>Arizalar</Text>
          {pending.length > 0 ? (
            <Badge
              label={`${pending.length} ta yangi`}
              color={colors.orange}
              background={tints.orange14}
              borderColor={tints.orangeBorder30}
              size={12}
              style={styles.newBadge}
            />
          ) : null}
        </View>
        <SearchBar
          placeholder="Ism yoki telefon bo'yicha qidirish"
          value={query}
          onChangeText={setQuery}
          style={styles.search}
        />

        {pending.length === 0 && approved.length === 0 ? (
          <EmptyState
            compact
            icon={<InboxIcon size={24} color={colors.blueLight} />}
            title="Arizalar yo'q"
            message="Hozircha yangi arizalar yoki tasdiqlangan o'quvchilar yo'q."
          />
        ) : (
          <View style={styles.list}>
            {filteredPending.map((m, i) => (
              <Card key={m.membership_id} style={styles.pendingCard}>
                <View style={styles.row}>
                  <Avatar
                    letter={firstLetter(m.user)}
                    size={42}
                    fontSize={16}
                    background={AVATAR_COLORS[i % AVATAR_COLORS.length]}
                  />
                  <View style={styles.rowText}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">{nameOf(m.user)}</Text>
                      {m.role === 'teacher' ? (
                        <Badge label="O'qituvchi" color={colors.purple} background={tints.purple16} style={styles.roleBadge} />
                      ) : m.role === 'manager' ? (
                        <Badge label="Menejer" color={colors.blue} background={tints.blue14} style={styles.roleBadge} />
                      ) : null}
                    </View>
                    <Text style={styles.sub}>
                      {(m.user?.phone || '') + (m.subject ? ` · ${m.subject}` : '') + (m.created_at ? ` · ${formatWhen(m.created_at)}` : '')}
                    </Text>
                  </View>
                  <Badge label="Kutilmoqda" color={colors.orange} background={tints.orange14} />
                </View>
                <View style={styles.actions}>
                  <Button
                    title="Tasdiqlash"
                    variant="success"
                    height={40}
                    radius={11}
                    fontSize={12.5}
                    icon={<CheckIcon size={13} color={colors.white} />}
                    style={styles.actionBtn}
                    disabled={busyId === m.membership_id}
                    onPress={() => decide(m, 'approve')}
                  />
                  <Button
                    title="Rad etish"
                    variant="danger"
                    height={40}
                    radius={11}
                    fontSize={12.5}
                    icon={<CloseIcon size={11} />}
                    style={styles.actionBtn}
                    disabled={busyId === m.membership_id}
                    onPress={() => decide(m, 'reject')}
                  />
                </View>
              </Card>
            ))}

            {approved.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>Tasdiqlangan o'quvchilar</Text>
                {approved.map((m, i) => {
                  const u = m.user_detail || m.user || {};
                  return (
                    <Card key={m.id || m.membership_id || i} style={styles.resolvedCard}>
                      <Avatar
                        letter={firstLetter(u)}
                        size={42}
                        fontSize={16}
                        background={AVATAR_COLORS[i % AVATAR_COLORS.length]}
                      />
                      <View style={styles.rowText}>
                        <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">{nameOf(u)}</Text>
                        <Text style={styles.sub}>{u.phone || m.subject || "O'quvchi"}</Text>
                      </View>
                      <Badge label="Tasdiqlangan" color={colors.greenLight} background={tints.green14} />
                    </Card>
                  );
                })}
              </>
            ) : null}
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
    paddingBottom: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 19,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  newBadge: {
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 10,
  },
  search: {
    marginTop: 14,
  },
  list: {
    gap: 9,
    marginTop: 14,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: FONTS.extrabold,
    color: colors.textSecondary,
    marginTop: 12,
    marginBottom: 2,
  },
  pendingCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  resolvedCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  roleBadge: {
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 7,
  },
  name: {
    fontSize: 14,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    flexShrink: 1,
  },
  sub: {
    fontSize: 11.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
  },
});
