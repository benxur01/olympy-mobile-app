import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import Badge from '../components/Badge';
import SearchBar from '../components/SearchBar';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import useFetch from '../services/useFetch';
import { studentApi } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { BackIcon, ChevronRightIcon } from '../components/icons/Icons';

const asArray = (data) => (Array.isArray(data) ? data : data?.results || []);
const initialOf = (name) => (name || '?').trim()[0]?.toUpperCase() || '?';
const locationOf = (c) => [c.region, c.district || c.city].filter(Boolean).join(', ');

export default function JoinCenterScreen({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const { user, reloadMe } = useAuth();
  const [query, setQuery] = useState('');
  const [joiningId, setJoiningId] = useState(null);

  const { data, loading, refreshing, error, reload, refresh } = useFetch(
    () => studentApi.centersList().then((r) => asArray(r.data)),
    []
  );

  const centers = useMemo(() => {
    const rows = (data || []).filter((c) => !c.status || c.status === 'approved' || c.status === 'active');
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (c) =>
        String(c.name || '').toLowerCase().includes(q) ||
        String(c.organization_type || '').toLowerCase().includes(q) ||
        locationOf(c).toLowerCase().includes(q)
    );
  }, [data, query]);

  const doJoin = async (center) => {
    if (joiningId) return;
    setJoiningId(center.id);
    try {
      await studentApi.joinCenter(center.id, { subject: '' });
      try { await reloadMe(); } catch (e) {}
      Alert.alert(
        'Ariza yuborildi',
        `"${center.name}" markaziga qo'shilish arizangiz yuborildi. Markaz tasdiqlagach faollashadi.`
      );
    } catch (e) {
      const detail = e?.response?.data?.detail || '';
      if (e?.response?.status === 400 && /allaqachon/i.test(detail)) {
        Alert.alert('Markaz', 'Siz bu markazga allaqachon a\'zosiz yoki arizangiz kutilmoqda.');
      } else {
        Alert.alert('Xatolik', detail || "Ariza yuborib bo'lmadi. Qayta urinib ko'ring.");
      }
    } finally {
      setJoiningId(null);
    }
  };

  const confirmJoin = (center) => {
    Alert.alert(
      'Markazga qo\'shilish',
      `"${center.name}" markaziga qo'shilish uchun ariza yuborilsinmi?`,
      [
        { text: 'Bekor qilish', style: 'cancel' },
        { text: 'Yuborish', onPress: () => doJoin(center) },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()} style={styles.backBtn}>
          <BackIcon size={16} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Boshqa markazga qo'shilish</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            Markaz tanlab, qo'shilish uchun ariza yuboring
          </Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <SearchBar
          placeholder="Nomi, turi yoki viloyat…"
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {loading && !data ? (
        <LoadingState message="Markazlar yuklanmoqda…" />
      ) : error && !data ? (
        <ErrorState onRetry={reload} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.blue} />}
        >
          {centers.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                {query.trim() ? 'Qidiruvga mos markaz topilmadi' : "Markazlar ro'yxati bo'sh"}
              </Text>
            </Card>
          ) : (
            <View style={styles.list}>
              {centers.map((c, i) => {
                const mine = user?.center_name && c.name === user.center_name;
                return (
                  <TouchableOpacity
                    key={c.id ?? i}
                    activeOpacity={0.85}
                    disabled={mine || joiningId != null}
                    onPress={() => confirmJoin(c)}
                  >
                    <Card style={styles.rowCard}>
                      <Avatar letter={initialOf(c.name)} size={40} fontSize={16} background={colors.blue} />
                      <View style={styles.rowText}>
                        <Text style={styles.rowName} numberOfLines={1}>{c.name}</Text>
                        <Text style={styles.rowSub} numberOfLines={1}>
                          {[c.organization_type || "O'quv markaz", locationOf(c)].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                      {mine ? (
                        <Badge label="Sizniki" color={colors.greenLight} background={tints.green14} size={10.5} />
                      ) : joiningId === c.id ? (
                        <Text style={styles.joining}>Yuborilmoqda…</Text>
                      ) : (
                        <ChevronRightIcon size={15} />
                      )}
                    </Card>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors, tints) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingTop: 6,
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: { flex: 1 },
    title: { fontSize: 18, fontFamily: FONTS.extrabold, color: colors.text },
    subtitle: { fontSize: 11.5, fontFamily: FONTS.semibold, color: colors.textSecondary, marginTop: 1 },
    searchWrap: { paddingHorizontal: 20, paddingBottom: 6 },
    content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
    list: { gap: 8 },
    rowCard: { paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
    rowText: { flex: 1 },
    rowName: { fontSize: 13.5, fontFamily: FONTS.extrabold, color: colors.text },
    rowSub: { fontSize: 11, fontFamily: FONTS.semibold, color: colors.textSecondary, marginTop: 2 },
    joining: { fontSize: 11.5, fontFamily: FONTS.bold, color: colors.textMuted },
    emptyCard: { padding: 20, alignItems: 'center' },
    emptyText: { fontSize: 12.5, fontFamily: FONTS.semibold, color: colors.textMuted, textAlign: 'center' },
  });
