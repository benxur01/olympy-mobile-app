import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import { useAuth } from '../services/AuthContext';
import { routeForUser } from '../services/roles';
import { ClockIcon, CloseIcon, RepeatIcon, LogoutIcon } from '../components/icons/Icons';

// Markazga a'zolik arizasi bergan, lekin hali tasdiqlanmagan (yoki rad etilgan)
// foydalanuvchi uchun bloklovchi ekran. `roles_detail` — backend qaytaradigan
// rol bo'yicha ariza holati (approved-only `roles` massividan alohida) —
// `centerIdForUser` bilan bir xil kirish naqshi orqali o'qiladi.
const ROLE_LABELS = {
  student: "O'quvchi",
  teacher: "O'qituvchi",
  manager: 'Menejer',
  owner: 'Egasi',
  director: 'Direktor',
  parent: 'Ota-ona',
};

const roleLabel = (key) => ROLE_LABELS[key] || key;

export default function PendingAccessScreen({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const { user, reloadMe, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { pending, rejected } = useMemo(() => {
    const rd = user?.roles_detail || {};
    const pendingList = [];
    const rejectedList = [];
    for (const [role, data] of Object.entries(rd)) {
      if (!data) continue;
      const entry = { role, centerName: data.centerName, subject: data.subject };
      if (data.status === 'pending') pendingList.push(entry);
      else if (data.status === 'rejected') rejectedList.push(entry);
    }
    return { pending: pendingList, rejected: rejectedList };
  }, [user]);

  const hasAny = pending.length > 0 || rejected.length > 0;

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const me = await reloadMe();
      // Tasdiqlangan bo'lsa — tegishli panelga o'tamiz; aks holda shu ekranda
      // qolamiz (foydalanuvchi qayta-qayta "Yangilash" bosa oladi).
      const next = routeForUser(me);
      if (next !== 'PendingAccess') {
        navigation.reset({ index: 0, routes: [{ name: next }] });
      }
    } catch (e) {
      Alert.alert('Xatolik', "Holatni yangilab bo'lmadi. Internet aloqasini tekshiring.");
    } finally {
      setRefreshing(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert('Chiqish', 'Hisobdan chiqmoqchimisiz?', [
      { text: 'Bekor qilish', style: 'cancel' },
      {
        text: 'Chiqish',
        style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.reset({ index: 0, routes: [{ name: 'Splash' }] });
        },
      },
    ]);
  };

  const firstName = (user?.full_name || user?.username || '').split(' ')[0];

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {hasAny ? (
          <Card style={styles.card}>
            <View style={styles.iconWrap}>
              <ClockIcon size={28} color={colors.orange} />
            </View>
            <Text style={styles.title}>Arizangiz ko'rib chiqilmoqda</Text>
            <Text style={styles.subtitle}>
              {firstName ? `Salom, ${firstName}! ` : ''}Hisobingiz yaratildi.
              Ariza tasdiqlangach, tegishli panel avtomatik ochiladi. Tasdiqlash
              odatda bir necha daqiqadan bir kungacha vaqt oladi.
            </Text>

            {pending.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Kutilayotgan arizalar</Text>
                {pending.map((e, i) => (
                  <View key={`p-${e.role}-${i}`} style={styles.pendingRow}>
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle}>{roleLabel(e.role)}</Text>
                      <Text style={styles.rowSub} numberOfLines={1}>
                        {e.centerName || 'Markaz'}{e.subject ? ` · ${e.subject}` : ''}
                      </Text>
                    </View>
                    <Badge label="Kutilmoqda" color={colors.orange} background={tints.orange14} borderColor={tints.orangeBorder30} />
                  </View>
                ))}
              </View>
            ) : null}

            {rejected.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Rad etilgan arizalar</Text>
                {rejected.map((e, i) => (
                  <View key={`r-${e.role}-${i}`} style={styles.rejectedRow}>
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle}>{roleLabel(e.role)}</Text>
                      <Text style={styles.rowSub} numberOfLines={1}>
                        {e.centerName || 'Markaz'}{e.subject ? ` · ${e.subject}` : ''}
                      </Text>
                    </View>
                    <Badge label="Rad etildi" color={colors.red} background={tints.red12} borderColor={tints.redBorder40} />
                  </View>
                ))}
              </View>
            ) : null}
          </Card>
        ) : (
          <Card style={styles.card}>
            <View style={styles.iconWrap}>
              <ClockIcon size={28} color={colors.orange} />
            </View>
            <Text style={styles.title}>Hisobingiz hali faollashtirilmagan</Text>
            <Text style={styles.subtitle}>
              Hisobingiz hali faollashtirilmagan. Qo'llab-quvvatlash xizmati bilan
              bog'laning.
            </Text>
          </Card>
        )}

        <View style={styles.actions}>
          <Button
            title="Yangilash"
            variant="primary"
            height={48}
            radius={13}
            fontSize={14}
            icon={<RepeatIcon size={16} color={colors.white} />}
            disabled={refreshing}
            onPress={refresh}
          />
          <Button
            title="Chiqish"
            variant="danger"
            height={48}
            radius={13}
            fontSize={14}
            icon={<LogoutIcon size={16} color={colors.red} />}
            onPress={confirmLogout}
          />
        </View>
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
    content: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: 20,
      paddingVertical: 32,
      gap: 16,
    },
    card: {
      paddingVertical: 26,
      paddingHorizontal: 22,
      alignItems: 'center',
    },
    iconWrap: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: tints.orange14,
      borderWidth: 1,
      borderColor: tints.orangeBorder30,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    title: {
      fontSize: 19,
      fontFamily: FONTS.extrabold,
      color: colors.text,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 13,
      fontFamily: FONTS.semibold,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginTop: 8,
    },
    section: {
      alignSelf: 'stretch',
      marginTop: 20,
      gap: 8,
    },
    sectionLabel: {
      fontSize: 11.5,
      fontFamily: FONTS.extrabold,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    pendingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: tints.orange10,
      borderWidth: 1,
      borderColor: tints.orangeBorder30,
    },
    rejectedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: tints.red10,
      borderWidth: 1,
      borderColor: tints.redBorder40,
    },
    rowText: {
      flex: 1,
    },
    rowTitle: {
      fontSize: 14,
      fontFamily: FONTS.extrabold,
      color: colors.text,
    },
    rowSub: {
      fontSize: 11.5,
      fontFamily: FONTS.semibold,
      color: colors.textSecondary,
      marginTop: 2,
    },
    actions: {
      gap: 10,
    },
  });
