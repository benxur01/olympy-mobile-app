import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Card from '../components/Card';
import Badge from '../components/Badge';
import SegmentedControl from '../components/SegmentedControl';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import useFetch from '../services/useFetch';
import { studentApi } from '../services/api';
import { CoinIcon, FileIcon, ClockIcon } from '../components/icons/Icons';

const asArray = (data) => (Array.isArray(data) ? data : data?.results || data?.redemptions || []);

// Harid tarixidagi holat belgisi.
const makeREDEEM_STATUS = (colors, tints) => ({
  pending: { label: 'Kutilmoqda', color: colors.orange, bg: tints.orange14 },
  approved: { label: 'Berildi', color: colors.greenLight, bg: tints.green14 },
  fulfilled: { label: 'Berildi', color: colors.greenLight, bg: tints.green14 },
  completed: { label: 'Berildi', color: colors.greenLight, bg: tints.green14 },
  rejected: { label: 'Rad etildi', color: colors.red, bg: tints.red12 },
  cancelled: { label: 'Bekor qilindi', color: colors.gray, bg: tints.slate14 },
});

const redeemDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export default function ShopScreen() {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const REDEEM_STATUS = makeREDEEM_STATUS(colors, tints);
  const [tab, setTab] = useState(0);
  const { data, loading, error, reload } = useFetch(async () => {
    const [shop, redemptions] = await Promise.all([
      studentApi.shopProducts().then((r) => r.data),
      studentApi.myRedemptions().then((r) => r.data).catch(() => null),
    ]);
    return { shop, redemptions };
  }, []);

  if (loading) return <LoadingState message="Do'kon yuklanmoqda…" />;
  if (error) return <ErrorState onRetry={reload} />;

  const coins = data?.shop?.coins ?? 0;
  const products = data?.shop?.products || [];
  const redemptions = asArray(data?.redemptions);

  const purchase = async (product) => {
    if (coins < (product.coin_cost || 0)) {
      Alert.alert('Coin yetarli emas', 'Bu mahsulotni olish uchun coininigiz yetarli emas.');
      return;
    }
    try {
      await studentApi.redeemReward({ product_id: product.id });
      Alert.alert('Muvaffaqiyatli', `"${product.title}" uchun so'rov yuborildi.`);
      reload();
    } catch (e) {
      Alert.alert('Xatolik', e.response?.data?.detail || "So'rovni yuborib bo'lmadi.");
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Do'kon</Text>
        <View style={styles.balanceCard}>
          <View style={styles.coinWrap}>
            <CoinIcon size={24} />
          </View>
          <View style={styles.balanceText}>
            <Text style={styles.balanceValue}>{coins.toLocaleString('uz-UZ')}</Text>
            <Text style={styles.balanceLabel}>Coin balansingiz</Text>
          </View>
          <Text style={styles.howTo}>Qanday yig'iladi?</Text>
        </View>
        <SegmentedControl
          segments={['Mahsulotlar', 'Tarix']}
          activeIndex={tab}
          onChange={setTab}
          style={styles.segments}
        />
        {tab === 1 ? (
          redemptions.length === 0 ? (
            <Card radius={18} style={styles.emptyCard}>
              <Text style={styles.emptyText}>Hali harid tarixi yo'q</Text>
            </Card>
          ) : (
            <View style={styles.history}>
              {redemptions.map((r, i) => {
                const st = REDEEM_STATUS[r.status] || REDEEM_STATUS.pending;
                const title = r.product_title || r.product?.title || r.title || 'Mahsulot';
                const cost = r.coin_cost ?? r.cost ?? r.product?.coin_cost;
                return (
                  <Card key={r.id || i} style={styles.historyCard}>
                    <View style={styles.historyIcon}>
                      <FileIcon size={20} color={colors.textMuted} />
                    </View>
                    <View style={styles.historyText}>
                      <Text style={styles.historyName} numberOfLines={1}>{title}</Text>
                      <View style={styles.historyMeta}>
                        <ClockIcon size={11} color={colors.textMuted} />
                        <Text style={styles.historyDate}>{redeemDate(r.created_at || r.date)}</Text>
                        {cost != null ? <Text style={styles.historyCost}>· {cost} coin</Text> : null}
                      </View>
                    </View>
                    <Badge label={st.label} color={st.color} background={st.bg} size={10} style={styles.historyBadge} />
                  </Card>
                );
              })}
            </View>
          )
        ) : products.length === 0 ? (
          <Card radius={18} style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {data?.shop?.center_name
                ? 'Markazingizda hozircha mahsulot yo\'q'
                : "Do'kon uchun markazga a'zo bo'lishingiz kerak"}
            </Text>
          </Card>
        ) : (
          <View style={styles.grid}>
            {products.map((p) => {
              const soldOut = (p.stock ?? 0) <= 0;
              return (
                <Card key={p.id} radius={18} style={[styles.product, soldOut ? { opacity: 0.55 } : null]}>
                  <View style={styles.productImage}>
                    <FileIcon size={34} />
                  </View>
                  <View style={styles.productBody}>
                    <Text style={styles.productName} numberOfLines={1}>{p.title}</Text>
                    <Text style={[styles.productStock, soldOut ? { color: colors.red } : null]}>
                      {soldOut ? 'Tugagan' : `${p.stock} ta qoldi`}
                    </Text>
                    <View style={styles.productFooter}>
                      <Text style={styles.productPrice}>{p.coin_cost}</Text>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        disabled={soldOut}
                        onPress={() => purchase(p)}
                        style={[styles.buyBtn, soldOut ? styles.buyBtnDisabled : null]}
                      >
                        <Text style={[styles.buyBtnText, soldOut ? { color: colors.textMuted } : null]}>
                          Olish
                        </Text>
                      </TouchableOpacity>
                    </View>
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

const makeStyles = (colors, tints) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 19,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  balanceCard: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: tints.goldBorder30,
    borderRadius: 18,
    backgroundColor: tints.gold08,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  coinWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: tints.gold18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceText: {
    flex: 1,
  },
  balanceValue: {
    fontSize: 24,
    fontFamily: FONTS.extrabold,
    color: colors.gold,
  },
  balanceLabel: {
    fontSize: 11.5,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
  },
  howTo: {
    fontSize: 11.5,
    fontFamily: FONTS.extrabold,
    color: colors.textSecondary,
  },
  segments: {
    marginTop: 14,
  },
  emptyCard: {
    marginTop: 14,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
    textAlign: 'center',
  },
  history: {
    gap: 8,
    marginTop: 14,
  },
  historyCard: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyText: {
    flex: 1,
  },
  historyName: {
    fontSize: 13.5,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  historyDate: {
    fontSize: 11,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
  },
  historyCost: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: colors.gold,
  },
  historyBadge: {
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 7,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  product: {
    flexBasis: '47%',
    flexGrow: 1,
    overflow: 'hidden',
  },
  productImage: {
    height: 96,
    backgroundColor: colors.surfaceDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productBody: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  productName: {
    fontSize: 13.5,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  productStock: {
    fontSize: 10.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 2,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  productPrice: {
    fontSize: 14,
    fontFamily: FONTS.extrabold,
    color: colors.gold,
  },
  buyBtn: {
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  buyBtnDisabled: {
    backgroundColor: colors.surfaceDeep,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  buyBtnText: {
    fontSize: 11,
    fontFamily: FONTS.extrabold,
    color: colors.white,
  },
});
