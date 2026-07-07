import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useFetch from '../services/useFetch';
import { teacherApi } from '../services/api';
import { BackIcon, PlusIcon, ChevronRightIcon, CalendarIcon } from '../components/icons/Icons';

const asArray = (data) => (Array.isArray(data) ? data : data?.results || []);
const makeSTATUS = (colors, tints) => ({
  active: { label: 'Faol', color: colors.greenLight, bg: tints.green14 },
  finished: { label: 'Tugagan', color: colors.slate, bg: tints.slate14 },
  draft: { label: 'Qoralama', color: colors.orange, bg: tints.orange14 },
  inactive: { label: 'Nofaol', color: colors.textMuted, bg: tints.slate14 },
});

export default function TeacherOlympiadsScreen({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const STATUS = makeSTATUS(colors, tints);
  const { data, loading, refreshing, error, reload, refresh } = useFetch(
    () => teacherApi.myOlympiads().then((r) => asArray(r.data)),
    []
  );

  const [selected, setSelected] = useState(null);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  // Tadbir yaratib qaytilganda ro'yxat yangilansin.
  useEffect(() => navigation.addListener('focus', reload), [navigation, reload]);

  const olympiads = data || [];

  const openDetail = async (o) => {
    setSelected(o);
    setStats(null);
    setStatsLoading(true);
    try {
      const { data: s } = await teacherApi.olympiadStats(o.id);
      setStats(s);
    } catch (e) {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  };

  const closeDetail = () => {
    setSelected(null);
    setStats(null);
  };

  const publish = async () => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      await teacherApi.publishOlympiad(selected.id);
      Alert.alert('Nashr qilindi', `"${selected.title}" endi faol.`);
      closeDetail();
      reload();
    } catch (e) {
      const err = e?.response?.data;
      const msg = err?.errors ? `${err.detail}: ${err.errors.join(', ')}` : err?.detail;
      Alert.alert('Nashr qilinmadi', msg || "Tadbirni nashr qilib bo'lmadi.");
    } finally {
      setBusy(false);
    }
  };

  const finish = () => {
    if (!selected) return;
    Alert.alert('Yakunlash', `"${selected.title}" tadbirini yakunlaysizmi? Bundan keyin o'quvchilar kira olmaydi.`, [
      { text: 'Bekor', style: 'cancel' },
      {
        text: 'Yakunlash',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await teacherApi.finishOlympiad(selected.id);
            closeDetail();
            reload();
          } catch (e) {
            Alert.alert('Xatolik', e?.response?.data?.detail || "Yakunlab bo'lmadi.");
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  if (loading && !data) return <LoadingState message="Tadbirlar yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  const st = selected ? STATUS[selected.status] || STATUS.draft : null;
  const canPublish = selected && (selected.status === 'draft' || selected.status === 'inactive');
  const canFinish = selected && selected.status === 'active';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()} style={styles.backBtn}>
          <BackIcon size={16} />
        </TouchableOpacity>
        <Text style={styles.title}>Tadbirlar</Text>
        <TouchableOpacity activeOpacity={0.8} style={styles.addBtn} onPress={() => navigation.navigate('CreateOlympiad')}>
          <PlusIcon size={15} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.blue} />}
      >
        {olympiads.length === 0 ? (
          <EmptyState
            icon={<CalendarIcon size={24} color={colors.blueLight} />}
            title="Tadbir yo'q"
            message="Hali tadbir yaratmagansiz. Yuqoridagi + tugma orqali yangi tadbir yarating."
            actionLabel="Tadbir yaratish"
            onAction={() => navigation.navigate('CreateOlympiad')}
          />
        ) : (
          <View style={styles.list}>
            {olympiads.map((o) => {
              const s = STATUS[o.status] || STATUS.draft;
              return (
                <TouchableOpacity key={o.id} activeOpacity={0.85} onPress={() => openDetail(o)}>
                  <Card style={styles.card}>
                    <View style={styles.cardBody}>
                      <View style={styles.badgeRow}>
                        <Badge label={o.subject || 'Fan'} color={colors.blueLight} background={tints.blue14} size={10.5} style={styles.badgeSm} />
                        <Badge label={s.label} color={s.color} background={s.bg} size={10.5} style={styles.badgeSm} />
                      </View>
                      <Text style={styles.cardTitle} numberOfLines={1}>{o.title}</Text>
                      <Text style={styles.cardSub}>
                        {o.duration_minutes || 0} daqiqa · {o.participants || 0} ishtirokchi
                      </Text>
                    </View>
                    <ChevronRightIcon size={14} />
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={closeDetail}>
        <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={closeDetail} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          {selected ? (
            <>
              <View style={styles.sheetBadges}>
                <Badge label={selected.subject || 'Fan'} color={colors.blueLight} background={tints.blue14} size={11} />
                {st ? <Badge label={st.label} color={st.color} background={st.bg} size={11} /> : null}
              </View>
              <Text style={styles.sheetTitle}>{selected.title}</Text>

              {statsLoading ? (
                <ActivityIndicator color={colors.blue} style={{ marginVertical: 24 }} />
              ) : stats ? (
                <View style={styles.statsGrid}>
                  <View style={styles.statCell}>
                    <Text style={styles.statValue}>{stats.participants ?? 0}</Text>
                    <Text style={styles.statLabel}>Ishtirokchi</Text>
                  </View>
                  <View style={styles.statCell}>
                    <Text style={styles.statValue}>{stats.average_score ?? 0}</Text>
                    <Text style={styles.statLabel}>O'rtacha ball</Text>
                  </View>
                  <View style={styles.statCell}>
                    <Text style={styles.statValue}>{stats.max_score ?? 0}</Text>
                    <Text style={styles.statLabel}>Eng yuqori</Text>
                  </View>
                  <View style={styles.statCell}>
                    <Text style={styles.statValue}>{stats.full_complete_percent ?? 0}%</Text>
                    <Text style={styles.statLabel}>To'liq yechgan</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.noStats}>Statistika hozircha mavjud emas</Text>
              )}

              {canPublish ? (
                <Button
                  title={busy ? 'Nashr qilinmoqda…' : 'Nashr qilish'}
                  variant="success"
                  height={50}
                  radius={13}
                  fontSize={15}
                  style={styles.actionBtn}
                  disabled={busy}
                  onPress={publish}
                />
              ) : null}
              {canFinish ? (
                <Button
                  title="Tadbirni yakunlash"
                  variant="danger"
                  height={50}
                  radius={13}
                  fontSize={15}
                  style={styles.actionBtn}
                  disabled={busy}
                  onPress={finish}
                />
              ) : null}
              <TouchableOpacity activeOpacity={0.7} onPress={closeDetail}>
                <Text style={styles.closeText}>Yopish</Text>
              </TouchableOpacity>
            </>
          ) : null}
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
  addBtn: {
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
    alignItems: 'center',
    gap: 12,
  },
  cardBody: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeSm: {
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 7,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    marginTop: 7,
  },
  cardSub: {
    fontSize: 11,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 2,
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
    paddingBottom: 36,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderDashed,
    alignSelf: 'center',
  },
  sheetBadges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    marginTop: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  statCell: {
    flexBasis: '47%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surfaceDeep,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  statLabel: {
    fontSize: 10.5,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
    marginTop: 2,
  },
  noStats: {
    fontSize: 13,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
    textAlign: 'center',
    marginVertical: 22,
  },
  actionBtn: {
    marginTop: 16,
  },
  closeText: {
    textAlign: 'center',
    marginTop: 14,
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: colors.textMuted,
  },
});
