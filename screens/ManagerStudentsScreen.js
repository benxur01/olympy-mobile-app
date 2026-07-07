import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
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
import { UsersIcon, StarIcon, ChevronRightIcon } from '../components/icons/Icons';

const makeAVATAR_COLORS = (colors) => ([colors.blue, colors.purple, colors.green, colors.orange, colors.blueDeep]);
const asArray = (data) => (Array.isArray(data) ? data : data?.results || data?.members || []);
const nameOf = (u) => u?.full_name || u?.username || u?.phone || "O'quvchi";
const initialOf = (name) => (name || '?').trim()[0]?.toUpperCase() || '?';

const scoreColor = (colors, v) =>
  v >= 90 ? colors.greenLight : v >= 70 ? colors.blueLight : colors.orange;

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function ManagerStudentsScreen() {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const AVATAR_COLORS = makeAVATAR_COLORS(colors);
  const { user } = useAuth();
  const centerId = centerIdForUser(user);
  const [query, setQuery] = useState('');

  // O'quvchi tafsiloti modali.
  const [detailFor, setDetailFor] = useState(null); // membership row
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  // Guruh tegi tahrirlash modali.
  const [tagFor, setTagFor] = useState(null); // membership row
  const [tagValue, setTagValue] = useState('');
  const [tagSaving, setTagSaving] = useState(false);

  const { data, loading, refreshing, error, reload, refresh } = useFetch(async () => {
    if (!centerId) return { students: [] };
    const rows = await managerApi.studentsMemberships(centerId).then((r) => r.data);
    return { students: asArray(rows) };
  }, [centerId]);

  const students = data?.students || [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const u = s.user || {};
      const name = nameOf(u).toLowerCase();
      const phone = String(u.normalized_phone || u.phone || '').toLowerCase();
      const tag = String(s.group_tag || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || tag.includes(q);
    });
  }, [students, query]);

  const openDetail = (row) => {
    if (!row?.membership_id) return;
    setDetailFor(row);
    setDetail(null);
    setDetailError('');
    setDetailLoading(true);
    managerApi
      .studentDetail(row.membership_id)
      .then((r) => setDetail(r.data))
      .catch((e) => setDetailError(e?.response?.data?.detail || "Ma'lumot yuklanmadi"))
      .finally(() => setDetailLoading(false));
  };

  const openTag = (row) => {
    setTagFor(row);
    setTagValue(row.group_tag || '');
  };

  const saveTag = () => {
    if (!tagFor || !centerId) return;
    const trimmed = (tagValue || '').trim();
    if (trimmed === (tagFor.group_tag || '')) { setTagFor(null); return; }
    setTagSaving(true);
    managerApi
      .setGroupTag(centerId, tagFor.membership_id, trimmed)
      .then(() => { setTagFor(null); reload(); })
      .catch((e) => setDetailError(e?.response?.data?.detail || "Guruhni saqlab bo'lmadi"))
      .finally(() => setTagSaving(false));
  };

  if (loading) return <LoadingState message="O'quvchilar yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  if (!centerId) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <EmptyState
          icon={<UsersIcon size={24} color={colors.blueLight} />}
          title="Markaz topilmadi"
          message="Sizga biriktirilgan o'quv markazi yo'q."
        />
      </SafeAreaView>
    );
  }

  const dStats = detail?.stats || {};
  const dUser = detail?.user || detailFor?.user || {};
  const dAttempts = Array.isArray(detail?.attempts) ? detail.attempts : [];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.blue} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>O'quvchilar</Text>
          <Badge
            label={`${filtered.length}${query && filtered.length !== students.length ? `/${students.length}` : ''} ta`}
            color={colors.blueLight}
            background={tints.blue14}
            size={12}
            style={styles.countBadge}
          />
        </View>
        <SearchBar
          placeholder="Ism, telefon yoki guruh bo'yicha qidirish"
          value={query}
          onChangeText={setQuery}
          style={styles.search}
        />

        {filtered.length === 0 ? (
          <EmptyState
            compact
            icon={<UsersIcon size={24} color={colors.blueLight} />}
            title={query ? 'Topilmadi' : "O'quvchilar yo'q"}
            message={query ? "Qidiruv bo'yicha o'quvchi topilmadi." : 'Hozircha tasdiqlangan o\'quvchilar yo\'q.'}
          />
        ) : (
          <View style={styles.list}>
            {filtered.map((s, i) => {
              const u = s.user || {};
              const name = nameOf(u);
              const score = Math.round(s.avg_score || 0);
              return (
                <Card key={s.membership_id || i} style={styles.card}>
                  <TouchableOpacity activeOpacity={0.85} style={styles.cardMain} onPress={() => openDetail(s)}>
                    <Avatar
                      letter={initialOf(name)}
                      uri={u.avatar_url || undefined}
                      size={42}
                      fontSize={16}
                      background={AVATAR_COLORS[i % AVATAR_COLORS.length]}
                    />
                    <View style={styles.cardText}>
                      <View style={styles.nameRow}>
                        {u.is_premium ? <StarIcon size={12} color={colors.gold} /> : null}
                        <Text style={styles.name} numberOfLines={1}>{name}</Text>
                      </View>
                      <Text style={styles.sub} numberOfLines={1}>
                        {[u.normalized_phone || u.phone, s.olympiads_count ? `${s.olympiads_count} tadbir` : null]
                          .filter(Boolean).join(' · ') || 'Ma\'lumot yo\'q'}
                      </Text>
                    </View>
                    <View style={styles.scoreBox}>
                      <Text style={[styles.score, { color: scoreColor(colors, score) }]}>{score}%</Text>
                      <ChevronRightIcon size={13} />
                    </View>
                  </TouchableOpacity>
                  <View style={styles.cardFooter}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => openTag(s)}
                      style={[styles.tagBtn, s.group_tag ? styles.tagBtnOn : styles.tagBtnOff]}
                    >
                      <Text style={[styles.tagText, s.group_tag ? styles.tagTextOn : styles.tagTextOff]}>
                        {s.group_tag ? s.group_tag : '+ guruh'}
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.joined}>{formatDate(s.created_at)}</Text>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* O'quvchi tafsiloti modal */}
      <Modal visible={!!detailFor} transparent animationType="slide" onRequestClose={() => setDetailFor(null)}>
        <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={() => setDetailFor(null)} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          {detailLoading ? (
            <ActivityIndicator color={colors.blue} style={{ marginVertical: 40 }} />
          ) : detailError ? (
            <Text style={styles.errorText}>{detailError}</Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.sheetScroll}>
              <View style={styles.detailHead}>
                <Avatar letter={initialOf(nameOf(dUser))} uri={dUser.avatar_url || undefined} size={54} fontSize={20} background={colors.purple} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailName}>{nameOf(dUser)}</Text>
                  <Text style={styles.detailSub}>
                    {[dUser.normalized_phone || dUser.phone, detail?.subject].filter(Boolean).join(' · ') || "O'quvchi"}
                  </Text>
                </View>
                {dUser.is_premium ? <Badge label="Premium" color={colors.gold} background={tints.gold14} /> : null}
              </View>

              <View style={styles.detailStats}>
                <View style={styles.detailStat}>
                  <Text style={styles.detailStatValue}>{dStats.total_attempts || 0}</Text>
                  <Text style={styles.detailStatLabel}>Urinish</Text>
                </View>
                <View style={styles.detailStat}>
                  <Text style={[styles.detailStatValue, { color: colors.gold }]}>{Math.round(dStats.average_score || 0)}%</Text>
                  <Text style={styles.detailStatLabel}>O'rtacha</Text>
                </View>
                <View style={styles.detailStat}>
                  <Text style={[styles.detailStatValue, { color: colors.greenLight }]}>{dStats.best_score || 0}%</Text>
                  <Text style={styles.detailStatLabel}>Eng yuqori</Text>
                </View>
                <View style={styles.detailStat}>
                  <Text style={styles.detailStatValue}>{dStats.first_place_count || 0}</Text>
                  <Text style={styles.detailStatLabel}>1-o'rin</Text>
                </View>
              </View>

              <Text style={styles.detailSectionLabel}>So'nggi natijalar</Text>
              {dAttempts.length === 0 ? (
                <Text style={styles.emptyInline}>Hali natijalar yo'q</Text>
              ) : (
                dAttempts.slice(0, 10).map((a, idx) => (
                  <View key={a.attempt_id || idx} style={styles.attemptRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.attemptTitle} numberOfLines={1}>{a.olympiad_title || 'Tadbir'}</Text>
                      <Text style={styles.attemptSub} numberOfLines={1}>
                        {[a.subject, a.rank ? `${a.rank}-o'rin` : null, `${a.correct_count || 0}/${a.total_questions || 0} to'g'ri`]
                          .filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                    <Text style={[styles.attemptScore, { color: scoreColor(colors, Math.round(a.score || 0)) }]}>
                      {Math.round(a.score || 0)}%
                    </Text>
                  </View>
                ))
              )}
              <View style={{ height: 8 }} />
            </ScrollView>
          )}
          <TouchableOpacity activeOpacity={0.7} onPress={() => setDetailFor(null)}>
            <Text style={styles.cancel}>Yopish</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Guruh tegi modal */}
      <Modal visible={!!tagFor} transparent animationType="fade" onRequestClose={() => setTagFor(null)}>
        <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={() => setTagFor(null)} />
        <View style={styles.tagSheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Guruh / sinf tegi</Text>
          <Text style={styles.tagHint}>Masalan: 9-A, Kuchli guruh, Ertalabki smena</Text>
          <TextInput
            autoFocus
            style={styles.tagInput}
            placeholder="Guruh nomi"
            placeholderTextColor={colors.textMuted}
            value={tagValue}
            maxLength={50}
            onChangeText={setTagValue}
          />
          <Button
            title={tagSaving ? 'Saqlanmoqda…' : 'Saqlash'}
            height={48}
            radius={12}
            fontSize={14}
            style={{ marginTop: 12 }}
            disabled={tagSaving}
            onPress={saveTag}
          />
          <TouchableOpacity activeOpacity={0.7} onPress={() => setTagFor(null)}>
            <Text style={styles.cancel}>Bekor qilish</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors, tints) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 100 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 19, fontFamily: FONTS.extrabold, color: colors.text },
  countBadge: { paddingVertical: 5, paddingHorizontal: 11, borderRadius: 10 },
  search: { marginTop: 14 },
  list: { gap: 9, marginTop: 14 },
  card: { paddingVertical: 12, paddingHorizontal: 14 },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardText: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { fontSize: 14, fontFamily: FONTS.extrabold, color: colors.text, flexShrink: 1 },
  sub: { fontSize: 11.5, fontFamily: FONTS.semibold, color: colors.textSecondary, marginTop: 2 },
  scoreBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  score: { fontSize: 15, fontFamily: FONTS.extrabold },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 11, paddingTop: 11, borderTopWidth: 1, borderTopColor: colors.divider,
  },
  tagBtn: { paddingVertical: 5, paddingHorizontal: 11, borderRadius: 9 },
  tagBtnOn: { backgroundColor: tints.blue14 },
  tagBtnOff: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderDashed },
  tagText: { fontSize: 11.5, fontFamily: FONTS.extrabold },
  tagTextOn: { color: colors.blueLight },
  tagTextOff: { color: colors.textMuted },
  joined: { fontSize: 11, fontFamily: FONTS.semibold, color: colors.textMuted },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '82%',
    backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 14, paddingHorizontal: 22, paddingBottom: 30,
  },
  sheetScroll: { marginTop: 4 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderDashed, alignSelf: 'center' },
  errorText: { fontSize: 13, fontFamily: FONTS.semibold, color: colors.red, textAlign: 'center', marginVertical: 30 },
  detailHead: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 16 },
  detailName: { fontSize: 17, fontFamily: FONTS.extrabold, color: colors.text },
  detailSub: { fontSize: 12.5, fontFamily: FONTS.semibold, color: colors.textSecondary, marginTop: 2 },
  detailStats: {
    flexDirection: 'row', gap: 8, marginTop: 18,
  },
  detailStat: {
    flex: 1, backgroundColor: colors.surfaceDeep, borderRadius: 13, paddingVertical: 12, alignItems: 'center',
  },
  detailStatValue: { fontSize: 17, fontFamily: FONTS.extrabold, color: colors.text },
  detailStatLabel: { fontSize: 10, fontFamily: FONTS.bold, color: colors.textSecondary, marginTop: 3 },
  detailSectionLabel: { fontSize: 13, fontFamily: FONTS.extrabold, color: colors.text, marginTop: 20, marginBottom: 8 },
  emptyInline: { fontSize: 12.5, fontFamily: FONTS.semibold, color: colors.textMuted, paddingVertical: 12 },
  attemptRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11,
    borderTopWidth: 1, borderTopColor: colors.divider,
  },
  attemptTitle: { fontSize: 13, fontFamily: FONTS.bold, color: colors.text },
  attemptSub: { fontSize: 11, fontFamily: FONTS.semibold, color: colors.textSecondary, marginTop: 2 },
  attemptScore: { fontSize: 15, fontFamily: FONTS.extrabold },
  cancel: { textAlign: 'center', marginTop: 14, fontSize: 13, fontFamily: FONTS.bold, color: colors.textMuted },
  tagSheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 14, paddingHorizontal: 22, paddingBottom: 34,
  },
  sheetTitle: { fontSize: 17, fontFamily: FONTS.extrabold, color: colors.text, marginTop: 16 },
  tagHint: { fontSize: 12, fontFamily: FONTS.semibold, color: colors.textSecondary, marginTop: 6, marginBottom: 12 },
  tagInput: {
    height: 48, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12,
    backgroundColor: colors.surface, paddingHorizontal: 14, fontSize: 14, fontFamily: FONTS.bold, color: colors.text,
  },
});
