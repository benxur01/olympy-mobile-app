import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import SearchBar from '../components/SearchBar';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useFetch from '../services/useFetch';
import { ownerApi } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { centerIdForUser } from '../services/roles';
import { BackIcon, PlusIcon, EditIcon, CoinIcon, ShirtIcon } from '../components/icons/Icons';

const asArray = (data) => (Array.isArray(data) ? data : data?.results || []);
const emptyForm = { title: '', coin_cost: '', stock: '', description: '', icon: '🎁', is_active: true };

export default function OwnerShopScreen({ navigation, route }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const { user } = useAuth();
  const centerId = route?.params?.centerId ?? centerIdForUser(user);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | product
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data, loading, refreshing, error, reload, refresh } = useFetch(async () => {
    if (!centerId) return [];
    const res = await ownerApi.centerShopProducts(centerId).then((r) => r.data);
    return asArray(res);
  }, [centerId]);

  const products = data || [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => (p.title || '').toLowerCase().includes(q));
  }, [products, query]);

  const setField = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const openNew = () => {
    setForm(emptyForm);
    setEditing('new');
  };

  const openEdit = (p) => {
    setForm({
      title: p.title || '',
      coin_cost: p.coin_cost != null ? String(p.coin_cost) : '',
      stock: p.stock != null ? String(p.stock) : '',
      description: p.description || '',
      icon: p.icon || '🎁',
      is_active: p.is_active !== false,
    });
    setEditing(p);
  };

  const closeModal = () => {
    if (saving) return;
    setEditing(null);
    setForm(emptyForm);
  };

  const submit = async () => {
    if (saving || !centerId) return;
    const title = form.title.trim();
    const coinCost = parseInt(form.coin_cost, 10);
    if (!title) {
      Alert.alert('Maydonlar', 'Mahsulot nomini kiriting.');
      return;
    }
    if (!Number.isFinite(coinCost) || coinCost < 0) {
      Alert.alert('Maydonlar', "Tanga narxini to'g'ri kiriting.");
      return;
    }
    const stock = parseInt(form.stock, 10);
    const body = {
      title,
      description: form.description.trim(),
      coin_cost: coinCost,
      icon: form.icon || '🎁',
      stock: Number.isFinite(stock) ? stock : 0,
      is_active: !!form.is_active,
    };
    setSaving(true);
    try {
      const isEdit = editing && editing !== 'new';
      if (isEdit) {
        await ownerApi.updateCenterShopProduct(centerId, editing.id, body);
      } else {
        await ownerApi.createCenterShopProduct(centerId, body);
      }
      setEditing(null);
      setForm(emptyForm);
      Alert.alert('Saqlandi', isEdit ? 'Mahsulot yangilandi.' : "Mahsulot qo'shildi.");
      reload();
    } catch (e) {
      Alert.alert('Xatolik', e?.response?.data?.detail || "Mahsulotni saqlab bo'lmadi.");
    } finally {
      setSaving(false);
    }
  };

  const remove = (p) => {
    Alert.alert("Mahsulotni o'chirish", `${p.title} do'kondan o'chirilsinmi?`, [
      { text: 'Bekor', style: 'cancel' },
      {
        text: "O'chirish",
        style: 'destructive',
        onPress: async () => {
          try {
            await ownerApi.deleteCenterShopProduct(centerId, p.id);
            reload();
          } catch (e) {
            Alert.alert('Xatolik', e?.response?.data?.detail || "O'chirib bo'lmadi.");
          }
        },
      },
    ]);
  };

  if (loading) return <LoadingState message="Do'kon yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()} style={styles.backBtn}>
          <BackIcon size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Do'kon boshqaruvi</Text>
        <TouchableOpacity activeOpacity={0.85} onPress={openNew} style={styles.addIconBtn}>
          <PlusIcon size={16} color={colors.white} strokeWidth={2.6} />
        </TouchableOpacity>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.blue} />}
      >
        <SearchBar
          placeholder="Mahsulot nomi bo'yicha qidirish"
          value={query}
          onChangeText={setQuery}
          style={styles.search}
        />
        {products.length === 0 ? (
          <EmptyState
            compact
            icon={<ShirtIcon size={24} color={colors.blueLight} />}
            title="Mahsulotlar yo'q"
            message="Markaz do'koniga birinchi mahsulotni qo'shing."
          />
        ) : (
          <View style={styles.list}>
            {filtered.map((p) => (
              <Card key={p.id} style={styles.productCard}>
                <View style={styles.productIcon}>
                  <Text style={styles.productEmoji}>{p.icon || '🎁'}</Text>
                </View>
                <View style={styles.productText}>
                  <View style={styles.productNameRow}>
                    <Text style={styles.productName} numberOfLines={1}>{p.title}</Text>
                    {p.is_active === false ? (
                      <Badge label="Nofaol" color={colors.textMuted} background={tints.slate14} style={styles.stateBadge} />
                    ) : null}
                  </View>
                  <View style={styles.productMeta}>
                    <CoinIcon size={13} color={colors.gold} />
                    <Text style={styles.productPrice}>{p.coin_cost}</Text>
                    <Text style={styles.productStock}>· {p.stock ?? 0} dona</Text>
                  </View>
                </View>
                <TouchableOpacity activeOpacity={0.7} onPress={() => openEdit(p)} style={styles.rowAction}>
                  <EditIcon size={16} color={colors.blueLight} />
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.7} onPress={() => remove(p)} style={styles.rowAction}>
                  <Text style={styles.deleteX}>✕</Text>
                </TouchableOpacity>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={closeModal}>
        <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={closeModal} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>
            {editing && editing !== 'new' ? 'Mahsulotni tahrirlash' : "Mahsulot qo'shish"}
          </Text>
          <TextInput style={styles.input} placeholder="Mahsulot nomi" placeholderTextColor={colors.textMuted} value={form.title} onChangeText={(v) => setField('title', v)} />
          <View style={styles.twoCol}>
            <TextInput style={[styles.input, styles.colInput]} placeholder="Narx (tanga)" placeholderTextColor={colors.textMuted} keyboardType="number-pad" value={form.coin_cost} onChangeText={(v) => setField('coin_cost', v)} />
            <TextInput style={[styles.input, styles.colInput]} placeholder="Zaxira (dona)" placeholderTextColor={colors.textMuted} keyboardType="number-pad" value={form.stock} onChangeText={(v) => setField('stock', v)} />
          </View>
          <TextInput style={[styles.input, styles.textArea]} placeholder="Tavsif (ixtiyoriy)" placeholderTextColor={colors.textMuted} multiline value={form.description} onChangeText={(v) => setField('description', v)} />
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.toggleRow}
            onPress={() => setField('is_active', !form.is_active)}
          >
            <Text style={styles.toggleLabel}>Do'konda faol</Text>
            <View style={[styles.switch, form.is_active ? styles.switchOn : null]}>
              <View style={[styles.knob, form.is_active ? styles.knobOn : null]} />
            </View>
          </TouchableOpacity>
          <Button
            title={saving ? 'Saqlanmoqda…' : 'Saqlash'}
            variant="success"
            height={50}
            radius={13}
            fontSize={15}
            style={{ marginTop: 14 }}
            disabled={saving}
            onPress={submit}
          />
          <TouchableOpacity activeOpacity={0.7} onPress={closeModal}>
            <Text style={styles.cancel}>Bekor qilish</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors, tints) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, fontSize: 18, fontFamily: FONTS.extrabold, color: colors.text },
  addIconBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  search: { marginBottom: 14 },
  list: { gap: 9 },
  productCard: { paddingVertical: 13, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  productIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.surfaceDeep, alignItems: 'center', justifyContent: 'center' },
  productEmoji: { fontSize: 20 },
  productText: { flex: 1 },
  productNameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  productName: { flex: 1, fontSize: 14, fontFamily: FONTS.extrabold, color: colors.text },
  stateBadge: { paddingVertical: 2, paddingHorizontal: 7, borderRadius: 7 },
  productMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  productPrice: { fontSize: 12.5, fontFamily: FONTS.extrabold, color: colors.gold },
  productStock: { fontSize: 11.5, fontFamily: FONTS.semibold, color: colors.textSecondary },
  rowAction: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  deleteX: { fontSize: 16, fontFamily: FONTS.bold, color: colors.red },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
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
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderDashed, alignSelf: 'center' },
  sheetTitle: { fontSize: 17, fontFamily: FONTS.extrabold, color: colors.text, marginTop: 16, marginBottom: 12 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: colors.text,
    marginBottom: 9,
  },
  twoCol: { flexDirection: 'row', gap: 9 },
  colInput: { flex: 1 },
  textArea: { minHeight: 84, paddingTop: 12, textAlignVertical: 'top' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  toggleLabel: { fontSize: 14, fontFamily: FONTS.bold, color: colors.text },
  switch: { width: 46, height: 27, borderRadius: 14, backgroundColor: colors.surfaceDeep, borderWidth: 1, borderColor: colors.borderStrong, padding: 2, justifyContent: 'center' },
  switchOn: { backgroundColor: tints.green14, borderColor: colors.green },
  knob: { width: 21, height: 21, borderRadius: 11, backgroundColor: colors.textMuted },
  knobOn: { backgroundColor: colors.green, alignSelf: 'flex-end' },
  cancel: { textAlign: 'center', marginTop: 14, fontSize: 13, fontFamily: FONTS.bold, color: colors.textMuted },
});
