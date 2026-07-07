import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Modal, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Avatar from '../components/Avatar';
import IconBox from '../components/IconBox';
import SearchBar from '../components/SearchBar';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import useFetch from '../services/useFetch';
import { adminApi } from '../services/api';
import {
  BuildingIcon,
  DotsIcon,
  BarsIcon,
  SparkleIcon,
  ChevronRightIcon,
  CrownIcon,
  UsersIcon,
  LockIcon,
  CheckIcon,
  LogoutIcon,
} from '../components/icons/Icons';
import { useAuth } from '../services/AuthContext';

const roleLabels = (roles = []) =>
  roles
    .map((r) =>
      ({ platform_admin: 'Admin', owner: 'Direktor', manager: 'Menejer', teacher: "O'qituvchi", parent: 'Ota-ona', student: "O'quvchi" }[r] || r)
    )
    .join(', ');

// Foydalanuvchi boshqaruv modali uchun rol variantlari (website Admin panel
// bilan bir xil). `admin` alohida — User.roles ga emas, is_platform_admin
// flag'iga yoziladi (backend set-roles buni shunday qabul qiladi).
const ROLE_KEYS = [
  { value: 'student', label: "O'quvchi" },
  { value: 'teacher', label: "O'qituvchi" },
  { value: 'manager', label: 'Menejer' },
  { value: 'owner', label: 'Direktor' },
  { value: 'admin', label: 'Platform Admin' },
];

// Premium muddatlari (backend toggle-premium: kun soni; 0 = umrbod, -1 = bekor).
const DURATION_OPTIONS = [
  { value: 30, label: '1 oy' },
  { value: 90, label: '3 oy' },
  { value: 180, label: '6 oy' },
  { value: 365, label: '1 yil' },
  { value: 0, label: 'Umrbod' },
  { value: -1, label: 'Bekor qilish' },
];

const PLAN_NAMES = ['Standart', 'Plus', 'Pro'];

const asArray = (data) => (Array.isArray(data) ? data : data?.results || []);
const makeDOT_BY_ACTION = (colors, tints) => (action = '') => {
  const a = action.toLowerCase();
  if (a.includes('tasdiq') || a.includes('approve')) return colors.greenLight;
  if (a.includes('blok') || a.includes('rad') || a.includes('reject') || a.includes('delete')) return colors.red;
  return colors.orange;
};
const timeOf = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('uz-UZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export default function AdminScreen({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const DOT_BY_ACTION = makeDOT_BY_ACTION(colors, tints);
  const { logout } = useAuth();
  const { data, loading, error, reload } = useFetch(async () => {
    const [allCenters, pending, audit, users] = await Promise.all([
      adminApi.centers().then((r) => r.data).catch(() => null),
      adminApi.centers({ status: 'pending' }).then((r) => r.data).catch(() => null),
      adminApi.auditLog().then((r) => r.data).catch(() => null),
      adminApi.users({ page_size: 20 }).then((r) => r.data).catch(() => null),
    ]);
    if (allCenters === null && pending === null && audit === null && users === null) {
      throw new Error('admin_load_failed');
    }
    return {
      allCenters: asArray(allCenters),
      pending: asArray(pending),
      audit: asArray(audit),
      users: asArray(users),
      // Jami foydalanuvchilar soni — DRF pagination meta (count).
      usersCount: users?.count ?? (Array.isArray(users) ? users.length : asArray(users).length),
    };
  }, []);

  const [userQuery, setUserQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [detailCenter, setDetailCenter] = useState(null);

  // Foydalanuvchi boshqaruv modali. manageMode: 'menu' | 'premium' | 'roles'.
  const [manageUser, setManageUser] = useState(null);
  const [manageMode, setManageMode] = useState('menu');
  const [roleSel, setRoleSel] = useState([]);
  const [premDuration, setPremDuration] = useState(30);
  const [premPlanType, setPremPlanType] = useState('student');
  const [premPlanName, setPremPlanName] = useState('Pro');
  const [busy, setBusy] = useState(false);

  const openManage = (u) => {
    setManageMode('menu');
    const rk = Array.isArray(u.roles) ? [...u.roles] : [];
    if (u.is_platform_admin && !rk.includes('admin')) rk.push('admin');
    setRoleSel(rk.filter((r) => ROLE_KEYS.some((k) => k.value === r)));
    setPremDuration(u.is_premium ? -1 : 30);
    setPremPlanType('student');
    setPremPlanName('Pro');
    setManageUser(u);
  };

  const toggleRole = (value) =>
    setRoleSel((prev) => (prev.includes(value) ? prev.filter((r) => r !== value) : [...prev, value]));

  const runManage = async (fn, successMsg) => {
    try {
      setBusy(true);
      await fn();
      setManageUser(null);
      Alert.alert('Bajarildi', successMsg);
      reload();
    } catch (e) {
      Alert.alert('Xatolik', e.response?.data?.detail || "Amalni bajarib bo'lmadi.");
    } finally {
      setBusy(false);
    }
  };

  const doSetActive = (u, isActive) =>
    runManage(() => adminApi.setUserActive(u.id, isActive), isActive ? 'Blok ochildi' : 'Foydalanuvchi bloklandi');

  const doSavePremium = () => {
    const payload =
      premDuration === -1
        ? { duration: -1 }
        : { duration: premDuration, plan_type: premPlanType, ...(premDuration > 0 ? { plan_name: premPlanName } : {}) };
    return runManage(
      () => adminApi.toggleUserPremium(manageUser.id, payload),
      premDuration === -1 ? 'Premium bekor qilindi' : 'Premium berildi',
    );
  };

  const doSaveRoles = () => {
    const isPlatformAdmin = roleSel.includes('admin');
    const roles = roleSel.filter((r) => r !== 'admin');
    return runManage(() => adminApi.setUserRoles(manageUser.id, { roles, isPlatformAdmin }), 'Rollar yangilandi');
  };

  // Foydalanuvchi qidiruvi — 400ms debounce bilan backend `?search=` orqali.
  useEffect(() => {
    const q = userQuery.trim();
    const t = setTimeout(() => {
      if (!q) {
        setSearchedUsers(null);
        return;
      }
      setUsersLoading(true);
      adminApi
        .users({ search: q, page_size: 20 })
        .then((r) => setSearchedUsers(asArray(r.data)))
        .catch(() => setSearchedUsers([]))
        .finally(() => setUsersLoading(false));
    }, 400);
    return () => clearTimeout(t);
  }, [userQuery]);

  if (loading) return <LoadingState message="Admin panel yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  const allCenters = data?.allCenters || [];
  const pending = data?.pending || [];
  const audit = data?.audit || [];
  const baseUsers = data?.users || [];
  const usersCount = data?.usersCount ?? 0;
  const usersList = searchedUsers ?? baseUsers;

  const act = async (center, action) => {
    try {
      if (action === 'approve') await adminApi.approveCenter(center.id);
      else await adminApi.rejectCenter(center.id);
      Alert.alert('Bajarildi', `"${center.name}" ${action === 'approve' ? 'tasdiqlandi' : 'rad etildi'}.`);
      reload();
    } catch (e) {
      Alert.alert('Xatolik', e.response?.data?.detail || 'Amalni bajarib bo\'lmadi.');
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

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Platforma</Text>
            <Text style={styles.subtitle}>Admin panel · barcha markazlar</Text>
          </View>
          <Badge
            label="ADMIN"
            color={colors.purpleLight}
            background={tints.purple16}
            borderColor={tints.purpleBorder35}
            size={11.5}
            style={styles.adminBadge}
          />
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.logoutBtn}
            onPress={confirmLogout}
            accessibilityRole="button"
            accessibilityLabel="Hisobdan chiqish"
          >
            <LogoutIcon size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{allCenters.length}</Text>
            <Text style={styles.statLabel}>Markazlar</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{usersCount}</Text>
            <Text style={styles.statLabel}>Foydalanuvchilar</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.orange }]}>{pending.length}</Text>
            <Text style={styles.statLabel}>Kutilmoqda</Text>
          </Card>
        </View>

        <View style={styles.navRow}>
          <TouchableOpacity
            style={styles.navCardTouch}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('AdminAnalytics')}
          >
            <Card style={styles.navCard}>
              <IconBox size={40} radius={12} background={tints.blue14}>
                <BarsIcon size={19} color={colors.blue} />
              </IconBox>
              <Text style={styles.navTitle}>Analitika</Text>
              <Text style={styles.navSub}>Grafik va statistika</Text>
            </Card>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navCardTouch}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('AdminSupport')}
          >
            <Card style={styles.navCard}>
              <IconBox size={40} radius={12} background={tints.purple16}>
                <SparkleIcon size={19} color={colors.purple} />
              </IconBox>
              <Text style={styles.navTitle}>Support chatlar</Text>
              <Text style={styles.navSub}>AI yozishmalar · javob</Text>
            </Card>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Yangi markaz arizalari</Text>
        {pending.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Kutilayotgan ariza yo'q</Text>
          </Card>
        ) : (
          pending.map((c) => (
            <Card key={c.id} style={styles.requestCard}>
              <View style={styles.requestRow}>
                <IconBox size={42} radius={12} background={tints.blue14}>
                  <BuildingIcon size={19} />
                </IconBox>
                <View style={styles.requestText}>
                  <Text style={styles.requestName} numberOfLines={1}>{c.name}</Text>
                  <Text style={styles.requestSub} numberOfLines={1}>
                    {[c.region, c.owner_full_name && `direktor: ${c.owner_full_name}`].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <TouchableOpacity activeOpacity={0.7} style={styles.moreBtn} onPress={() => setDetailCenter(c)}>
                  <DotsIcon size={18} />
                </TouchableOpacity>
              </View>
              <View style={styles.actions}>
                <Button title="Tasdiqlash" variant="success" height={40} radius={11} fontSize={12.5} style={styles.actionBtn} onPress={() => act(c, 'approve')} />
                <Button title="Rad etish" variant="danger" height={40} radius={11} fontSize={12.5} style={styles.actionBtn} onPress={() => act(c, 'reject')} />
              </View>
            </Card>
          ))
        )}

        <Text style={styles.sectionTitle}>Foydalanuvchilar</Text>
        <SearchBar
          placeholder="Ism yoki telefon bo'yicha qidirish"
          value={userQuery}
          onChangeText={setUserQuery}
          style={styles.userSearch}
        />
        {usersLoading ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Qidirilmoqda…</Text>
          </Card>
        ) : usersList.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>{userQuery ? 'Foydalanuvchi topilmadi' : "Foydalanuvchilar yo'q"}</Text>
          </Card>
        ) : (
          <View style={styles.userList}>
            {usersList.map((u) => (
              <TouchableOpacity key={u.id} activeOpacity={0.85} onPress={() => openManage(u)}>
                <Card style={styles.userCard}>
                  <Avatar
                    letter={(u.full_name || '?').trim()[0]?.toUpperCase() || '?'}
                    size={38}
                    fontSize={14}
                  />
                  <View style={styles.userText}>
                    <Text style={styles.userName} numberOfLines={1}>{u.full_name || 'Foydalanuvchi'}</Text>
                    <Text style={styles.userSub} numberOfLines={1}>
                      {[u.phone, roleLabels(u.roles)].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  {u.is_active === false ? (
                    <Badge label="Bloklangan" color={colors.red} background={tints.red12} size={10} />
                  ) : u.is_premium ? (
                    <Badge label="Premium" color={colors.gold} background={tints.gold14} size={10} />
                  ) : null}
                  <ChevronRightIcon size={16} color={colors.textMuted} />
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Audit log</Text>
        {audit.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Log yozuvlari yo'q</Text>
          </Card>
        ) : (
          <Card style={styles.auditCard}>
            {audit.slice(0, 12).map((entry, i) => (
              <View
                key={i}
                style={[styles.auditRow, i < Math.min(audit.length, 12) - 1 ? styles.auditDivider : null]}
              >
                <View style={[styles.auditDot, { backgroundColor: DOT_BY_ACTION(entry.action) }]} />
                <View style={styles.auditText}>
                  <Text style={styles.auditTitle}>{entry.action || entry.message}</Text>
                  <Text style={styles.auditMeta}>{[entry.actor, timeOf(entry.created_at)].filter(Boolean).join(' · ')}</Text>
                </View>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>

      <Modal visible={!!detailCenter} transparent animationType="fade" onRequestClose={() => setDetailCenter(null)}>
        <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={() => setDetailCenter(null)} />
        <View style={styles.detailSheet}>
          <View style={styles.handle} />
          {detailCenter ? (
            <>
              <View style={styles.detailHead}>
                <IconBox size={46} radius={13} background={tints.blue14}>
                  <BuildingIcon size={20} />
                </IconBox>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailName} numberOfLines={2}>{detailCenter.name}</Text>
                  <Text style={styles.detailStatus}>
                    {detailCenter.status === 'pending' ? 'Kutilmoqda' : detailCenter.status || ''}
                  </Text>
                </View>
              </View>
              {[
                ['Hudud', detailCenter.region],
                ['Direktor', detailCenter.owner_full_name || detailCenter.owner?.full_name],
                ['Telefon', detailCenter.owner_phone || detailCenter.phone || detailCenter.owner?.phone],
                ['Yaratilgan', timeOf(detailCenter.created_at)],
                ['ID', detailCenter.id != null ? `#${detailCenter.id}` : null],
              ]
                .filter(([, v]) => v)
                .map(([label, value]) => (
                  <View key={label} style={styles.detailField}>
                    <Text style={styles.detailLabel}>{label}</Text>
                    <Text style={styles.detailValue}>{String(value)}</Text>
                  </View>
                ))}
              <View style={styles.detailActions}>
                <Button
                  title="Tasdiqlash"
                  variant="success"
                  height={44}
                  radius={12}
                  fontSize={13.5}
                  style={styles.actionBtn}
                  onPress={() => {
                    const c = detailCenter;
                    setDetailCenter(null);
                    act(c, 'approve');
                  }}
                />
                <Button
                  title="Rad etish"
                  variant="danger"
                  height={44}
                  radius={12}
                  fontSize={13.5}
                  style={styles.actionBtn}
                  onPress={() => {
                    const c = detailCenter;
                    setDetailCenter(null);
                    act(c, 'reject');
                  }}
                />
              </View>
              <TouchableOpacity activeOpacity={0.7} onPress={() => setDetailCenter(null)}>
                <Text style={styles.detailCancel}>Yopish</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </Modal>

      <Modal visible={!!manageUser} transparent animationType="fade" onRequestClose={() => setManageUser(null)}>
        <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={() => (busy ? null : setManageUser(null))} />
        <View style={styles.detailSheet}>
          <View style={styles.handle} />
          {manageUser ? (
            <>
              <View style={styles.manageHead}>
                <Avatar
                  letter={(manageUser.full_name || '?').trim()[0]?.toUpperCase() || '?'}
                  size={44}
                  fontSize={16}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailName} numberOfLines={1}>{manageUser.full_name || 'Foydalanuvchi'}</Text>
                  <Text style={styles.manageSub} numberOfLines={1}>
                    {[manageUser.phone, roleLabels(manageUser.roles)].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              </View>

              {manageMode === 'menu' ? (
                <View style={styles.manageMenu}>
                  <TouchableOpacity style={styles.manageRow} activeOpacity={0.8} onPress={() => setManageMode('premium')}>
                    <IconBox size={36} radius={10} background={tints.gold14}>
                      <CrownIcon size={17} color={colors.gold} />
                    </IconBox>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.manageRowTitle}>Premium boshqarish</Text>
                      <Text style={styles.manageRowSub}>{manageUser.is_premium ? 'Hozir: Premium' : 'Hozir: oddiy hisob'}</Text>
                    </View>
                    <ChevronRightIcon size={16} color={colors.textMuted} />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.manageRow} activeOpacity={0.8} onPress={() => setManageMode('roles')}>
                    <IconBox size={36} radius={10} background={tints.blue14}>
                      <UsersIcon size={17} color={colors.blue} />
                    </IconBox>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.manageRowTitle}>Rollarni o'zgartirish</Text>
                      <Text style={styles.manageRowSub} numberOfLines={1}>
                        {[roleLabels(manageUser.roles) || 'Rolsiz', manageUser.is_platform_admin ? 'Admin' : null].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                    <ChevronRightIcon size={16} color={colors.textMuted} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.manageRow}
                    activeOpacity={0.8}
                    disabled={busy}
                    onPress={() => doSetActive(manageUser, manageUser.is_active === false)}
                  >
                    <IconBox size={36} radius={10} background={manageUser.is_active === false ? tints.green14 : tints.red12}>
                      <LockIcon size={17} color={manageUser.is_active === false ? colors.green : colors.red} />
                    </IconBox>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.manageRowTitle}>{manageUser.is_active === false ? 'Blokni ochish' : 'Bloklash'}</Text>
                      <Text style={styles.manageRowSub}>{manageUser.is_active === false ? 'Hozir: bloklangan' : 'Hozir: faol'}</Text>
                    </View>
                    <ChevronRightIcon size={16} color={colors.textMuted} />
                  </TouchableOpacity>

                  <TouchableOpacity activeOpacity={0.7} onPress={() => setManageUser(null)}>
                    <Text style={styles.detailCancel}>Yopish</Text>
                  </TouchableOpacity>
                </View>
              ) : manageMode === 'premium' ? (
                <View style={styles.manageMenu}>
                  <Text style={styles.fieldLabel}>Premium turi</Text>
                  <View style={styles.chipRow}>
                    {[{ value: 'student', label: "O'quvchi" }, { value: 'organization', label: 'Tashkilot' }].map((o) => (
                      <TouchableOpacity
                        key={o.value}
                        activeOpacity={0.8}
                        onPress={() => setPremPlanType(o.value)}
                        style={[styles.chip, styles.chipFlex, premPlanType === o.value ? styles.chipActive : null]}
                      >
                        <Text style={[styles.chipText, premPlanType === o.value ? styles.chipTextActive : null]}>{o.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.fieldLabel}>Muddat</Text>
                  <View style={styles.chipWrap}>
                    {DURATION_OPTIONS.map((o) => {
                      const active = premDuration === o.value;
                      const danger = o.value === -1;
                      return (
                        <TouchableOpacity
                          key={o.value}
                          activeOpacity={0.8}
                          onPress={() => setPremDuration(o.value)}
                          style={[styles.chip, active ? (danger ? styles.chipDanger : styles.chipGold) : null]}
                        >
                          <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{o.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {premDuration > 0 ? (
                    <>
                      <Text style={styles.fieldLabel}>Tarif darajasi</Text>
                      <View style={styles.chipRow}>
                        {PLAN_NAMES.map((p) => (
                          <TouchableOpacity
                            key={p}
                            activeOpacity={0.8}
                            onPress={() => setPremPlanName(p)}
                            style={[styles.chip, styles.chipFlex, premPlanName === p ? styles.chipActive : null]}
                          >
                            <Text style={[styles.chipText, premPlanName === p ? styles.chipTextActive : null]}>{p}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  ) : null}

                  <View style={styles.detailActions}>
                    <Button title="Orqaga" variant="muted" height={44} radius={12} fontSize={13.5} style={styles.actionBtn} onPress={() => setManageMode('menu')} disabled={busy} />
                    <Button
                      title={busy ? 'Saqlanmoqda…' : premDuration === -1 ? 'Bekor qilish' : 'Saqlash'}
                      variant={premDuration === -1 ? 'danger' : 'primary'}
                      height={44}
                      radius={12}
                      fontSize={13.5}
                      style={styles.actionBtn}
                      onPress={doSavePremium}
                      disabled={busy}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.manageMenu}>
                  <Text style={styles.fieldLabel}>Rollar</Text>
                  <View style={styles.roleList}>
                    {ROLE_KEYS.map((o) => {
                      const checked = roleSel.includes(o.value);
                      return (
                        <TouchableOpacity
                          key={o.value}
                          activeOpacity={0.8}
                          onPress={() => toggleRole(o.value)}
                          style={[styles.roleRow, checked ? styles.roleRowActive : null]}
                        >
                          <View style={[styles.checkbox, checked ? styles.checkboxOn : null]}>
                            {checked ? <CheckIcon size={12} color={colors.white} /> : null}
                          </View>
                          <Text style={[styles.roleLabel, checked ? styles.roleLabelActive : null]}>{o.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={styles.detailActions}>
                    <Button title="Orqaga" variant="muted" height={44} radius={12} fontSize={13.5} style={styles.actionBtn} onPress={() => setManageMode('menu')} disabled={busy} />
                    <Button title={busy ? 'Saqlanmoqda…' : 'Saqlash'} variant="primary" height={44} radius={12} fontSize={13.5} style={styles.actionBtn} onPress={doSaveRoles} disabled={busy} />
                  </View>
                </View>
              )}
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
  content: {
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 19,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
  },
  adminBadge: {
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 10,
  },
  logoutBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: colors.surfaceDeep,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    marginTop: 20,
    marginBottom: 10,
  },
  emptyCard: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12.5,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
  },
  requestCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  requestText: {
    flex: 1,
  },
  moreBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.surfaceDeep,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestName: {
    fontSize: 14,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  requestSub: {
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
  userSearch: {
    marginBottom: 10,
  },
  userList: {
    gap: 8,
  },
  userCard: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userText: {
    flex: 1,
  },
  userName: {
    fontSize: 13.5,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  userSub: {
    fontSize: 11,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 2,
  },
  auditCard: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  auditRow: {
    flexDirection: 'row',
    gap: 11,
    paddingVertical: 11,
  },
  auditDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  auditDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  auditText: {
    flex: 1,
  },
  auditTitle: {
    fontSize: 12.5,
    fontFamily: FONTS.bold,
    color: colors.textBody,
  },
  auditMeta: {
    fontSize: 10.5,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
    marginTop: 2,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  detailSheet: {
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
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderDashed,
    alignSelf: 'center',
  },
  detailHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginTop: 16,
    marginBottom: 8,
  },
  detailName: {
    fontSize: 17,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  detailStatus: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: colors.orange,
    marginTop: 2,
  },
  detailField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  detailLabel: {
    fontSize: 11.5,
    fontFamily: FONTS.bold,
    color: colors.textMuted,
  },
  detailValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    marginLeft: 12,
  },
  detailActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  detailCancel: {
    textAlign: 'center',
    marginTop: 14,
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: colors.textMuted,
  },
  // Navigatsiya kartalari (Analitika / Support)
  navRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 12,
  },
  navCardTouch: {
    flex: 1,
  },
  navCard: {
    padding: 14,
    gap: 8,
  },
  navTitle: {
    fontSize: 13.5,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    marginTop: 2,
  },
  navSub: {
    fontSize: 10.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
  },
  // Foydalanuvchi boshqaruv modali
  manageHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    marginBottom: 4,
  },
  manageSub: {
    fontSize: 12,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 2,
  },
  manageMenu: {
    marginTop: 12,
    gap: 9,
  },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceDeep,
  },
  manageRowTitle: {
    fontSize: 13.5,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  manageRowSub: {
    fontSize: 11,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 11.5,
    fontFamily: FONTS.bold,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 2,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  chipFlex: {
    flex: 1,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  chipGold: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  chipDanger: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  chipText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.white,
    fontFamily: FONTS.extrabold,
  },
  roleList: {
    gap: 8,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceDeep,
  },
  roleRowActive: {
    borderColor: colors.blue,
    backgroundColor: tints.blue10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  roleLabel: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: colors.textBody,
  },
  roleLabelActive: {
    color: colors.text,
    fontFamily: FONTS.extrabold,
  },
});
