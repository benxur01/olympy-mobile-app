import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Linking, AppState, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Card from '../components/Card';
import Button from '../components/Button';
import SegmentedControl from '../components/SegmentedControl';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import useFetch from '../services/useFetch';
import { billingApi } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { CrownIcon, CheckIcon, FileIcon } from '../components/icons/Icons';

const formatPrice = (value) => Math.round(value || 0).toLocaleString('uz-UZ');
const formatAmount = (amount) => `${(Number(amount) || 0).toLocaleString('ru-RU').replace(/ /g, ' ')} UZS`;
const fmtReceiptDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
// Backend status kodlari: pending/success/failed/cancelled.
const RECEIPT_STATUS = {
  success: { label: "To'langan", icon: '✅' },
  pending: { label: 'Kutilmoqda', icon: '⏳' },
  failed: { label: 'Xato', icon: '❌' },
  cancelled: { label: 'Bekor qilingan', icon: '↩️' },
};
const receiptStatus = (status) => RECEIPT_STATUS[status] || { label: status || '—', icon: 'ℹ️' };
const PROVIDER_LABEL = { click: 'Click', payme: 'Payme' };
const providerLabel = (p) => PROVIDER_LABEL[p] || (p ? p[0].toUpperCase() + p.slice(1) : '—');

export default function PremiumScreen() {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const { reloadMe } = useAuth();
  const { data, loading, error, reload } = useFetch(
    () => billingApi.plans().then((r) => r.data),
    []
  );
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [durIdx, setDurIdx] = useState(0);
  const checkoutStartedRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);

  // Billing tarixi + chek — "Tarix" tugmasi.
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [billingHistory, setBillingHistory] = useState([]);
  const [receipt, setReceipt] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  const openBillingHistory = async () => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const { data: res } = await billingApi.history();
      setBillingHistory(Array.isArray(res) ? res : []);
    } catch (e) {
      setBillingHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openReceipt = async (txId) => {
    setReceiptLoading(true);
    try {
      const { data: res } = await billingApi.receipt(txId);
      setReceipt(res || null);
    } catch (e) {
      // jim — tugma qayta bosilsa qayta urinadi
    } finally {
      setReceiptLoading(false);
    }
  };

  // To'lov brauzeridan qaytganda (ilova qayta faollashganda) obuna holatini
  // yangilaymiz — deep-link (scheme "olympy") return oqimi (item 20).
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (next) => {
      const cameToForeground = /inactive|background/.test(appStateRef.current) && next === 'active';
      appStateRef.current = next;
      if (cameToForeground && checkoutStartedRef.current) {
        checkoutStartedRef.current = false;
        try {
          await billingApi.subscriptionStatus().catch(() => null);
          const me = await reloadMe();
          if (me?.is_premium || me?.is_premium_active) {
            Alert.alert('Premium faollashtirildi', 'Obunangiz muvaffaqiyatli faollashtirildi!');
          }
        } catch (e) {}
      }
    });
    return () => sub.remove();
  }, [reloadMe]);

  if (loading) return <LoadingState message="Tariflar yuklanmoqda…" />;
  if (error) return <ErrorState onRetry={reload} />;

  const plans = Array.isArray(data) ? data : data?.results || data?.plans || [];

  // Rejalarni muddat (duration_days) bo'yicha guruhlaymiz. Chegirma foizini
  // backend bermasa, eng qisqa muddatning kunlik narxiga nisbatan hisoblaymiz.
  const durations = [...new Set(plans.map((p) => p.duration_days).filter(Boolean))].sort((a, b) => a - b);
  const perDayFor = (d) => {
    const ps = plans.filter((p) => p.duration_days === d && p.price);
    if (!ps.length) return null;
    return Math.min(...ps.map((p) => p.price / d));
  };
  const basePerDay = durations.length ? perDayFor(durations[0]) : null;
  const segments = durations.map((d) => {
    const months = Math.max(1, Math.round(d / 30));
    const pd = perDayFor(d);
    const disc = basePerDay && pd ? Math.round((1 - pd / basePerDay) * 100) : 0;
    return disc > 0 ? `${months} oy -${disc}%` : `${months} oy`;
  });
  const grouped = durations.length > 1;
  const activeDur = durations[durIdx] ?? durations[0];
  const visiblePlans = grouped ? plans.filter((p) => p.duration_days === activeDur) : plans;

  const checkout = async (provider) => {
    if (!selectedPlan) return;
    setProcessing(true);
    try {
      const { data: res } = await billingApi.checkout({ plan_id: selectedPlan.id, provider });
      const payUrl = res?.payment_url || res?.checkout_url || res?.url;
      if (payUrl) {
        checkoutStartedRef.current = true;
        Linking.openURL(payUrl);
      } else {
        Alert.alert('To\'lov', 'To\'lov so\'rovi yaratildi.');
      }
      setSelectedPlan(null);
    } catch (e) {
      Alert.alert('Xatolik', e.response?.data?.detail || "To'lovni boshlab bo'lmadi.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <CrownIcon size={20} />
          <Text style={styles.title}>Premium</Text>
          <TouchableOpacity activeOpacity={0.8} style={styles.historyBtn} onPress={openBillingHistory}>
            <FileIcon size={14} color={colors.textSecondary} />
            <Text style={styles.historyBtnText}>Tarix</Text>
          </TouchableOpacity>
        </View>

        {plans.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>Hozircha tariflar mavjud emas</Text>
          </View>
        ) : (
          <>
            {grouped ? (
              <SegmentedControl
                segments={segments}
                activeIndex={durIdx}
                onChange={setDurIdx}
                fontSize={11.5}
                style={styles.durControl}
              />
            ) : null}
          <View style={styles.plans}>
            {visiblePlans.map((plan) => {
              const popular = plan.is_popular;
              const features = Array.isArray(plan.features) ? plan.features : [];
              return (
                <View key={plan.id} style={popular ? styles.proPlan : styles.plan}>
                  {popular ? (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularText}>MASHHUR</Text>
                    </View>
                  ) : null}
                  <Text style={[styles.planName, popular ? { color: colors.gold } : null]}>{plan.name}</Text>
                  <Text style={styles.planPrice}>
                    {formatPrice(plan.price)} <Text style={styles.planUnit}>so'm{plan.duration_days ? `/${plan.duration_days} kun` : ''}</Text>
                  </Text>
                  {features.length ? (
                    <View style={styles.features}>
                      {features.map((f, i) => (
                        <View key={i} style={styles.feature}>
                          <CheckIcon size={12} />
                          <Text style={[styles.featureText, popular ? { color: colors.textBody } : null]}>{f}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  {plan.description ? <Text style={styles.planDesc}>{plan.description}</Text> : null}
                  <Button
                    title="Tanlash"
                    variant={popular ? 'gold' : 'dark'}
                    height={46}
                    radius={12}
                    fontSize={14}
                    style={styles.chooseBtn}
                    onPress={() => setSelectedPlan(plan)}
                  />
                </View>
              );
            })}
          </View>
          </>
        )}
      </ScrollView>

      {selectedPlan ? (
        <>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.overlay}
            onPress={() => setSelectedPlan(null)}
          />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>To'lov usulini tanlang</Text>
            <Text style={styles.sheetSub}>
              {selectedPlan.name} · <Text style={styles.sheetPrice}>{formatPrice(selectedPlan.price)} so'm</Text>
            </Text>
            <Button
              title="Payme orqali to'lash"
              variant="payme"
              height={52}
              radius={14}
              style={styles.payBtn}
              disabled={processing}
              onPress={() => checkout('payme')}
            />
            <Button
              title="Click orqali to'lash"
              variant="click"
              height={52}
              radius={14}
              style={styles.clickBtn}
              disabled={processing}
              onPress={() => checkout('click')}
            />
            <TouchableOpacity activeOpacity={0.7} onPress={() => setSelectedPlan(null)}>
              <Text style={styles.cancel}>Bekor qilish</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : null}

      {/* Billing tarixi modali — so'nggi to'lov tranzaksiyalari. */}
      <Modal visible={historyOpen} transparent animationType="slide" onRequestClose={() => setHistoryOpen(false)}>
        <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={() => setHistoryOpen(false)} />
        <View style={styles.historySheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Billing tarixi</Text>
          {historyLoading ? (
            <ActivityIndicator color={colors.blue} style={styles.historyLoading} />
          ) : billingHistory.length === 0 ? (
            <Text style={styles.historyEmpty}>Hozircha to'lovlar yo'q.</Text>
          ) : (
            <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
              {billingHistory.map((tx) => {
                const st = receiptStatus(tx.status);
                return (
                  <View key={tx.id} style={styles.historyRow}>
                    <View style={styles.historyRowText}>
                      <Text style={styles.historyPlan} numberOfLines={1}>{tx.plan_name}</Text>
                      <Text style={styles.historyMeta}>{formatAmount(tx.amount)} · {st.icon} {st.label}</Text>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.receiptBtn}
                      disabled={receiptLoading}
                      onPress={() => openReceipt(tx.id)}
                    >
                      <Text style={styles.receiptBtnText}>Chek</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Chek modali — bitta tranzaksiya tafsiloti. */}
      <Modal visible={!!receipt || receiptLoading} transparent animationType="fade" onRequestClose={() => setReceipt(null)}>
        <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={() => setReceipt(null)} />
        <View style={styles.receiptSheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>To'lov cheki</Text>
          {receiptLoading && !receipt ? (
            <ActivityIndicator color={colors.blue} style={styles.historyLoading} />
          ) : receipt ? (
            <View style={styles.receiptBody}>
              {receipt.user_name ? (
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Ism</Text>
                  <Text style={styles.receiptValue}>{receipt.user_name}</Text>
                </View>
              ) : null}
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Sana</Text>
                <Text style={styles.receiptValue}>{fmtReceiptDate(receipt.created_at)}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Tarif</Text>
                <Text style={styles.receiptValue}>{receipt.plan_name}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Summa</Text>
                <Text style={[styles.receiptValue, styles.receiptAmount]}>{formatAmount(receipt.amount)}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Usul</Text>
                <Text style={styles.receiptValue}>{providerLabel(receipt.provider)}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>ID</Text>
                <Text style={styles.receiptValueMono}>#TX-{receipt.id}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Holat</Text>
                <Text style={styles.receiptValue}>{receiptStatus(receipt.status).icon} {receiptStatus(receipt.status).label}</Text>
              </View>
            </View>
          ) : null}
          <TouchableOpacity activeOpacity={0.7} onPress={() => setReceipt(null)}>
            <Text style={styles.cancel}>Yopish</Text>
          </TouchableOpacity>
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
  content: {
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 19,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    flex: 1,
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  historyBtnText: {
    fontSize: 11.5,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
  },
  emptyWrap: {
    marginTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
  },
  durControl: {
    marginTop: 16,
  },
  plans: {
    gap: 11,
    marginTop: 14,
  },
  plan: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
    padding: 18,
  },
  planName: {
    fontSize: 15,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  planPrice: {
    fontSize: 21,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    marginTop: 4,
  },
  planUnit: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
  },
  planDesc: {
    fontSize: 12,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 10,
    lineHeight: 18,
  },
  features: {
    gap: 6,
    marginTop: 12,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 12.5,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
  },
  proPlan: {
    borderWidth: 1.5,
    borderColor: colors.gold,
    borderRadius: 18,
    backgroundColor: tints.gold07,
    padding: 18,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  popularBadge: {
    position: 'absolute',
    top: -11,
    right: 16,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.gold,
  },
  popularText: {
    fontSize: 10.5,
    fontFamily: FONTS.extrabold,
    color: colors.goldText,
  },
  chooseBtn: {
    marginTop: 14,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    zIndex: 8,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.borderStrong,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 14,
    paddingHorizontal: 22,
    paddingBottom: 40,
    zIndex: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderDashed,
    alignSelf: 'center',
  },
  sheetTitle: {
    fontSize: 16,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    marginTop: 16,
  },
  sheetSub: {
    fontSize: 12.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 4,
  },
  sheetPrice: {
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  payBtn: {
    marginTop: 16,
  },
  clickBtn: {
    marginTop: 9,
  },
  cancel: {
    textAlign: 'center',
    marginTop: 14,
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: colors.textMuted,
  },
  historySheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '75%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.borderStrong,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 14,
    paddingHorizontal: 22,
    paddingBottom: 30,
    zIndex: 9,
  },
  receiptSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.borderStrong,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 14,
    paddingHorizontal: 22,
    paddingBottom: 40,
    zIndex: 9,
  },
  historyLoading: {
    marginTop: 30,
    marginBottom: 20,
  },
  historyEmpty: {
    textAlign: 'center',
    marginTop: 30,
    marginBottom: 20,
    fontSize: 12.5,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
  },
  historyList: {
    marginTop: 14,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surfaceDeep,
    padding: 13,
    marginBottom: 9,
  },
  historyRowText: {
    flex: 1,
  },
  historyPlan: {
    fontSize: 13.5,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  historyMeta: {
    fontSize: 11,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 3,
  },
  receiptBtn: {
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  receiptBtnText: {
    fontSize: 11.5,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
  },
  receiptBody: {
    marginTop: 16,
    gap: 11,
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  receiptLabel: {
    fontSize: 12,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
  },
  receiptValue: {
    fontSize: 12.5,
    fontFamily: FONTS.bold,
    color: colors.text,
    flexShrink: 1,
    textAlign: 'right',
  },
  receiptAmount: {
    color: colors.blueLight,
    fontFamily: FONTS.extrabold,
  },
  receiptValueMono: {
    fontSize: 12,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
  },
});
