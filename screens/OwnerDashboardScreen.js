import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView, SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import StatCard from '../components/StatCard';
import TabBar from '../components/TabBar';
import ActivityBarChart from '../components/ActivityBarChart';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useFetch from '../services/useFetch';
import { ownerApi, managerApi, authApi, billingApi, downloadOlympiadResults } from '../services/api';
import { PRIVACY_POLICY_URL } from '../services/config';
import { useAuth } from '../services/AuthContext';
import SelectModal from '../components/SelectModal';
import { UZBEKISTAN_REGIONS, UZBEKISTAN_DISTRICTS } from '../constants/uzbekistanDistricts';
import ApplicationsScreen from './ApplicationsScreen';
import ProctoringScreen from './ProctoringScreen';
import ManagerStudentsScreen from './ManagerStudentsScreen';
import OwnerPremiumScreen from './OwnerPremiumScreen';
import OwnerShopScreen from './OwnerShopScreen';
import ProgressBar from '../components/ProgressBar';
import { PlusIcon, HomeIcon, UsersIcon, BarsIcon, SettingsIcon, ChevronRightIcon, CrownIcon, InboxIcon, EyeIcon, EditIcon, ShirtIcon, DownloadIcon, TrophyIcon, WarningIcon, BuildingIcon } from '../components/icons/Icons';

// Brend rangi uchun tayyor palitra (websaytdagi urg'u ranglariga mos). To'liq
// rang g'ildiragi o'rniga tanlanadigan namunalar — sodda va yetarli.
const BRAND_SWATCHES = ['#2E90FA', '#7C58FA', '#10B981', '#F2B01E', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6'];

// Tashkilot turlari — RegisterScreen'dagi bilan bir xil ro'yxat (yangi markaz
// qo'shishda ishlatiladi).
const ORGANIZATION_TYPES = ["O'quv markaz", 'Maktab', 'Universitet/Kollej', 'Tashkilot', 'Online academy', 'Boshqa'];

// Direktor paneli tab'lari. Arizalar (o'quvchi/o'qituvchi arizalari) va Nazorat
// (jonli imtihon kuzatuvi) menejer bilan umumiy — ular markaz bo'yicha ishlaydi,
// shu bois to'g'ridan-to'g'ri ManagerStudents/Applications/Proctoring ekranlarini
// qayta ishlatamiz. Hisobot alohida tab emas — Panel'dan modal orqali ochiladi
// (jami 5 ta tabni saqlash uchun).
const OWNER_TABS = [
  { key: 'Panel', label: 'Panel', icon: (color) => <HomeIcon size={23} color={color} /> },
  { key: 'Jamoa', label: 'Jamoa', icon: (color) => <UsersIcon size={23} color={color} /> },
  { key: 'Arizalar', label: 'Arizalar', dot: true, icon: (color) => <InboxIcon size={23} color={color} /> },
  { key: 'Nazorat', label: 'Nazorat', icon: (color) => <EyeIcon size={23} color={color} /> },
  { key: 'Sozlama', label: 'Sozlama', icon: (color) => <SettingsIcon size={23} color={color} /> },
];

// Tarif limiti bloklari (billing/limits). Har biri { used, limit, unlimited,
// near_limit }; unlimited yoki limit yo'q — cheksiz (bar chizilmaydi).
const LIMIT_ITEMS = [
  { key: 'students', label: "Talabalar" },
  { key: 'teachers', label: "Ustozlar" },
  { key: 'olympiads', label: "Olimpiadalar" },
  { key: 'ai_generations', label: "AI Savollar" },
];

const makeAVATAR_COLORS = (colors, tints) => ([colors.purple, colors.blue, colors.green, colors.orange]);
const asArray = (data) => (Array.isArray(data) ? data : data?.results || data?.members || []);
const initialOf = (name) => (name || '?').trim()[0]?.toUpperCase() || '?';
const memberName = (m) => m.full_name || m.user_name || m.user?.full_name || "A'zo";
const roleLabelOf = (role) =>
  role === 'manager' ? 'Menejer' : role === 'teacher' ? "O'qituvchi" : role || '';

const OWNER_CENTER_KEY = 'olympy_owner_selected_center';

export default function OwnerDashboardScreen({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const AVATAR_COLORS = makeAVATAR_COLORS(colors, tints);
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  // Ko'p markaz: tanlangan markaz ID (AsyncStorage'da saqlanadi).
  const [selectedCenterId, setSelectedCenterId] = useState(null);
  const [centerPickerOpen, setCenterPickerOpen] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(OWNER_CENTER_KEY)
      .then((id) => {
        if (id) setSelectedCenterId(Number(id) || id);
      })
      .catch(() => {});
  }, []);

  const selectCenter = async (id) => {
    setSelectedCenterId(id);
    setCenterPickerOpen(false);
    try {
      await AsyncStorage.setItem(OWNER_CENTER_KEY, String(id));
    } catch (e) {
      // ignore
    }
  };

  const { data, loading, error, reload } = useFetch(async () => {
    const centersData = await ownerApi.myCenters().then((r) => r.data).catch(() => null);
    const centers = asArray(centersData);
    if (!centers.length) return { centers: [], center: null, stats: null, staff: [] };
    // Saqlangan ID ro'yxatda bo'lsa shuni, aks holda birinchi markaz.
    const center =
      (selectedCenterId != null && centers.find((c) => String(c.id) === String(selectedCenterId))) ||
      centers[0];
    const [stats, staff, trend, limits] = await Promise.all([
      ownerApi.centerStats(center.id).then((r) => r.data).catch(() => null),
      ownerApi.staffMemberships(center.id).then((r) => r.data).catch(() => null),
      // Panel tabida ham kichik grafik ko'rsatish uchun faollik trendini
      // oldindan yuklaymiz (premium bo'lmasa 403 → bo'sh).
      ownerApi.activityTrend(center.id).then((r) => r.data).catch(() => null),
      // Tarif limitlari (premium EMAS — reja meta-ma'lumoti). Xato → null.
      billingApi.limits(center.id).then((r) => r.data).catch(() => null),
    ]);
    return {
      centers,
      center,
      stats,
      staff: asArray(staff),
      trend: Array.isArray(trend) ? trend : [],
      limits: limits && typeof limits === 'object' ? limits : null,
    };
  }, [selectedCenterId]);

  const [tab, setTab] = useState('Panel');
  // Jamoa tabidagi segmentli almashtirgich: xodimlar ro'yxati yoki o'quvchilar.
  const [jamoaView, setJamoaView] = useState('staff');
  const [member, setMember] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [staffRole, setStaffRole] = useState('teacher');
  const [form, setForm] = useState({ full_name: '', phone: '', password: '', subject: '' });
  const [saving, setSaving] = useState(false);
  // Hisobot endi alohida tab emas — Panel'dan ochiladigan modal.
  const [reportOpen, setReportOpen] = useState(false);
  // Premium tahlil va Do'kon boshqaruvini alohida ekranga o'tmasdan, shu
  // yerning o'zida (to'liq ekranli modal orqali) ochish uchun.
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  // Hisobot modalida natijalar eksporti uchun olimpiadalar ro'yxati.
  const [olympiads, setOlympiads] = useState(null);
  const [exporting, setExporting] = useState(null); // `${olympiadId}-${format}`

  // Markazni tahrirlash modali (nom, viloyat/tuman, brend rangi, logotip).
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', region: '', district: '', brand_color: '' });
  const [logo, setLogo] = useState(null); // { uri, name, type } — yangi tanlangan logotip
  const [editSaving, setEditSaving] = useState(false);
  const [regionPicker, setRegionPicker] = useState(false);
  const [districtPicker, setDistrictPicker] = useState(false);

  // Yangi (qo'shimcha) markaz qo'shish modali. Tahrirlash modaliga o'xshash,
  // faqat tashkilot turi maydoni bor va qiymatlar oldindan to'ldirilmaydi.
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', organization_type: ORGANIZATION_TYPES[0], region: '', district: '' });
  const [createSaving, setCreateSaving] = useState(false);
  const [createOrgPicker, setCreateOrgPicker] = useState(false);
  const [createRegionPicker, setCreateRegionPicker] = useState(false);
  const [createDistrictPicker, setCreateDistrictPicker] = useState(false);
  // Hooks Rules: loading/error early return dan OLDIN e'lon qilinadi.
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);

  const centers = data?.centers || [];
  const center = data?.center;
  const stats = data?.stats || {};
  const staff = data?.staff || [];

  // Hisobot modali ochilganda (bir marta) top o'quvchilar va faollik trendini
  // yuklaymiz. Premium bo'lmagan markazda backend 403 qaytaradi — buni
  // alohida ko'rsatamiz.
  useEffect(() => {
    if (!reportOpen || !center || report) return;
    setReportLoading(true);
    Promise.all([
      ownerApi.topStudents(center.id).then((r) => r.data).catch((e) => ({ __err: e })),
      ownerApi.activityTrend(center.id).then((r) => r.data).catch((e) => ({ __err: e })),
    ])
      .then(([top, trend]) => {
        const blocked =
          top?.__err?.response?.status === 403 || trend?.__err?.response?.status === 403;
        setReport({
          top: Array.isArray(top) ? top : [],
          trend: Array.isArray(trend) ? trend : [],
          premiumBlocked: blocked,
        });
      })
      .finally(() => setReportLoading(false));
  }, [reportOpen, center, report]);

  // Hisobot modali ochilganda markaz olimpiadalarini (natijalar eksporti uchun)
  // bir marta yuklaymiz. Xato bo'lsa bo'sh ro'yxat qoladi.
  useEffect(() => {
    if (!reportOpen || olympiads !== null) return;
    ownerApi
      .olympiads()
      .then((r) => {
        const raw = Array.isArray(r.data) ? r.data : r.data?.results || [];
        setOlympiads(raw);
      })
      .catch(() => setOlympiads([]));
  }, [reportOpen, olympiads]);

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

  if (loading) return <LoadingState message="Panel yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  if (!center) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <EmptyState
          icon={<BuildingIcon size={24} color={colors.blueLight} />}
          title="Sizga biriktirilgan markaz topilmadi"
          message="Hisobingizga hali biror o'quv markazi bog'lanmagan. Internet aloqasini tekshirib qayta urinib ko'ring, muammo davom etsa administratsiyaga murojaat qiling."
          actionLabel="Qayta urinish"
          onAction={reload}
        />
        <TouchableOpacity activeOpacity={0.7} style={styles.emptyLogout} onPress={confirmLogout}>
          <Text style={styles.emptyLogoutText}>Hisobdan chiqish</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const setField = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let out = '';
    for (let i = 0; i < 10; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  };

  const submitStaff = async () => {
    if (saving) return;
    if (!form.full_name.trim() || !form.phone.trim() || form.password.length < 8) {
      Alert.alert('Maydonlar', "Ism, telefon va kamida 8 belgili parolni to'ldiring.");
      return;
    }
    const phone = form.phone.trim().startsWith('+')
      ? form.phone.trim()
      : `+998${form.phone.replace(/\D/g, '')}`;
    setSaving(true);
    try {
      const usedPassword = form.password;
      const payload = { full_name: form.full_name.trim(), phone, password: usedPassword };
      if (staffRole === 'teacher') {
        await ownerApi.createTeacher(center.id, { ...payload, subject: form.subject.trim() });
      } else {
        await ownerApi.createManager(center.id, payload);
      }
      setAddOpen(false);
      setForm({ full_name: '', phone: '', password: '', subject: '' });
      Alert.alert(
        "Xodim qo'shildi",
        `Yangi ${roleLabelOf(staffRole).toLowerCase()} yaratildi.\n\nParol: ${usedPassword}\n\nXavfsizlik: parolni xodimga bering va birinchi kirishda o'zgartirishni so'rang.`,
      );
      reload();
    } catch (e) {
      if (e?.response?.data?.upgrade_required) {
        Alert.alert('Limit', e.response.data.detail || "O'qituvchilar limiti tugagan.", [
          { text: 'Bekor' },
          { text: 'Premium', onPress: () => navigation.navigate('Premium') },
        ]);
      } else {
        const err = e?.response?.data;
        const detail = err?.detail || err?.phone?.[0] || err?.password?.[0];
        Alert.alert('Xatolik', detail || "Xodim qo'shib bo'lmadi.");
      }
    } finally {
      setSaving(false);
    }
  };

  const removeMember = () => {
    if (!member) return;
    Alert.alert('Chiqarish', `${memberName(member)} markazdan chiqarilsinmi?`, [
      { text: 'Bekor', style: 'cancel' },
      {
        text: 'Chiqarish',
        style: 'destructive',
        onPress: async () => {
          try {
            await managerApi.removeMembership(center.id, member.membership_id || member.id);
            setMember(null);
            reload();
          } catch (e) {
            Alert.alert('Xatolik', e?.response?.data?.detail || "Chiqarib bo'lmadi.");
          }
        },
      },
    ]);
  };

  const confirmDelete = () => {
    setDeletePassword('');
    setDeleteOpen(true);
  };

  const submitDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      Alert.alert('Parol kerak', "Hisobni o'chirish uchun joriy parolingizni kiriting.");
      return;
    }
    setDeleteBusy(true);
    try {
      // Re-auth: parol to'g'riligini login orqali tekshiramiz (2FA yo'q bo'lsa).
      // Backend totp talab qilsa, foydalanuvchi Profile → 2FA oqimidan o'tadi.
      const phone = user?.phone;
      if (phone) {
        try {
          const { data: loginData } = await authApi.login(phone, deletePassword.trim());
          if (loginData?.requires_2fa) {
            Alert.alert(
              '2FA yoqilgan',
              "Hisobni o'chirish uchun avval 2FA ni o'chiring yoki qo'llab-quvvatlashga murojaat qiling."
            );
            return;
          }
        } catch (e) {
          const status = e?.response?.status;
          if (status === 400 || status === 401) {
            Alert.alert("Parol noto'g'ri", "Joriy parolni to'g'ri kiriting.");
            return;
          }
          Alert.alert('Xatolik', "Parolni tekshirib bo'lmadi. Internetni tekshiring.");
          return;
        }
      }
      await authApi.deleteAccount();
      setDeleteOpen(false);
      await logout();
      navigation.reset({ index: 0, routes: [{ name: 'Splash' }] });
    } catch (e) {
      Alert.alert("O'chirilmadi", e?.response?.data?.detail || "Hisobni o'chirib bo'lmadi.");
    } finally {
      setDeleteBusy(false);
    }
  };

  const openEdit = () => {
    setEditForm({
      name: center.name || '',
      region: center.region || '',
      district: center.district || '',
      brand_color: center.brand_color || '',
    });
    setLogo(null);
    setEditOpen(true);
  };

  const setEditField = (k, v) => setEditForm((prev) => ({ ...prev, [k]: v }));

  const pickLogo = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Ruxsat kerak', "Rasm tanlash uchun galereyaga ruxsat bering.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;
      setLogo({ uri: asset.uri, name: asset.fileName || undefined, type: asset.mimeType || undefined });
    } catch (e) {
      Alert.alert('Xatolik', "Rasmni tanlab bo'lmadi.");
    }
  };

  const submitEdit = async () => {
    if (editSaving) return;
    if (!editForm.name.trim()) {
      Alert.alert('Maydonlar', 'Markaz nomini kiriting.');
      return;
    }
    setEditSaving(true);
    try {
      const payload = { name: editForm.name.trim() };
      if (editForm.region) payload.region = editForm.region;
      if (editForm.district) {
        payload.district = editForm.district;
        payload.city = editForm.district;
      }
      await ownerApi.updateCenter(center.id, payload);
      if (editForm.brand_color) {
        await ownerApi.updateCenterBranding(center.id, editForm.brand_color);
      }
      if (logo?.uri) {
        await ownerApi.uploadCenterImage(center.id, logo.uri, { name: logo.name, type: logo.type });
      }
      setEditOpen(false);
      setLogo(null);
      Alert.alert('Saqlandi', "Markaz ma'lumotlari yangilandi.");
      reload();
    } catch (e) {
      const err = e?.response?.data;
      Alert.alert('Xatolik', err?.detail || err?.name?.[0] || "Markazni saqlab bo'lmadi.");
    } finally {
      setEditSaving(false);
    }
  };

  // Xodim rolini o'zgartirish (o'qituvchi ↔ menejer). A'zo tafsilot modalidan
  // chaqiriladi; tasdiqlangach reload qilamiz.
  const changeRole = (targetRole) => {
    if (!member) return;
    const mid = member.membership_id || member.id;
    Alert.alert(
      "Rolni o'zgartirish",
      `${memberName(member)} ${roleLabelOf(targetRole).toLowerCase()} qilinsinmi?`,
      [
        { text: 'Bekor', style: 'cancel' },
        {
          text: 'Ha',
          onPress: async () => {
            try {
              await ownerApi.changeMemberRole(center.id, mid, targetRole);
              setMember(null);
              reload();
            } catch (e) {
              Alert.alert('Xatolik', e?.response?.data?.detail || "Rolni o'zgartirib bo'lmadi.");
            }
          },
        },
      ]
    );
  };

  const openCreate = () => {
    setCreateForm({ name: '', organization_type: ORGANIZATION_TYPES[0], region: '', district: '' });
    setCreateOpen(true);
  };

  const setCreateField = (k, v) => setCreateForm((prev) => ({ ...prev, [k]: v }));

  const submitCreate = async () => {
    if (createSaving) return;
    if (!createForm.name.trim() || !createForm.region || !createForm.district) {
      Alert.alert('Maydonlar', "Markaz nomi, viloyat va tumanni to'ldiring.");
      return;
    }
    setCreateSaving(true);
    try {
      await ownerApi.registerCenter({
        name: createForm.name.trim(),
        organization_type: createForm.organization_type,
        country: "O'zbekiston",
        region: createForm.region,
        district: createForm.district,
        city: createForm.district || createForm.region,
        subjects: [],
      });
      setCreateOpen(false);
      Alert.alert('Qo\'shildi', "Yangi markaz yaratildi. Tasdiqlangach faollashadi.");
      reload();
    } catch (e) {
      const err = e?.response?.data;
      Alert.alert('Xatolik', err?.detail || err?.name?.[0] || "Markazni qo'shib bo'lmadi.");
    } finally {
      setCreateSaving(false);
    }
  };

  const createDistricts = createForm.region ? UZBEKISTAN_DISTRICTS[createForm.region] || [] : [];

  const doExport = async (olyId, fmt) => {
    if (exporting) return;
    setExporting(`${olyId}-${fmt}`);
    try {
      await downloadOlympiadResults(olyId, fmt);
    } catch (e) {
      Alert.alert('Xatolik', e?.response?.data?.detail || e?.message || "Natijalarni eksport qilib bo'lmadi.");
    } finally {
      setExporting(null);
    }
  };

  const editDistricts = editForm.region ? UZBEKISTAN_DISTRICTS[editForm.region] || [] : [];

  const premiumCount = stats.premium_students_count ?? stats.premium_count ?? stats.premium_students;
  const studentsCount = stats.students_count ?? 0;
  const premiumShare =
    premiumCount != null && studentsCount ? Math.round((premiumCount / studentsCount) * 100) : null;

  const renderKpis = () => (
    <>
      <View style={styles.kpiGrid}>
        <StatCard label="O'quvchilar" value={studentsCount} note={`${stats.unique_participants ?? 0} faol`} noteColor={colors.greenLight} style={styles.kpi} />
        <StatCard label="O'qituvchilar" value={stats.teachers_count ?? 0} note={`${stats.managers_count ?? 0} menejer`} style={styles.kpi} />
        <StatCard label="Tadbirlar" value={stats.olympiads_total ?? 0} note={`${stats.total_attempts ?? 0} urinish`} noteColor={colors.greenLight} style={styles.kpi} />
        <StatCard
          label="O'rtacha ball"
          value={stats.average_score ?? 0}
          valueColor={colors.gold}
          note={`${stats.pending_requests ?? 0} kutilayotgan`}
          borderColor={tints.goldBorder30}
          background={tints.gold06}
          style={styles.kpi}
        />
      </View>
      <Card style={styles.premiumKpi} radius={18} borderColor={tints.purpleBorder35} background={tints.purple16}>
        <View style={styles.premiumKpiIcon}>
          <CrownIcon size={20} color={colors.purple} />
        </View>
        <View style={styles.premiumKpiText}>
          <Text style={styles.premiumKpiLabel}>Premium o'quvchilar</Text>
          <Text style={styles.premiumKpiValue}>
            {premiumCount != null ? premiumCount : '—'}
            {premiumShare != null ? <Text style={styles.premiumKpiShare}>  ·  {premiumShare}% ulush</Text> : null}
          </Text>
        </View>
      </Card>
    </>
  );

  const limits = data?.limits;

  // Limit ogohlantirish banneri: biror resurs near_limit yoki to'la bo'lsa
  // ko'rsatiladi (eng jiddiy holat rangni belgilaydi — to'la > tugayapti).
  const renderLimitBanner = () => {
    if (!limits) return null;
    const flagged = LIMIT_ITEMS.map(({ key, label }) => {
      const b = limits[key];
      if (!b || b.unlimited || !b.limit) return null;
      const used = b.used || 0;
      const full = used >= b.limit;
      const near = !!b.near_limit;
      if (!full && !near) return null;
      return { label, used, limit: b.limit, full };
    }).filter(Boolean);
    if (flagged.length === 0) return null;
    const anyFull = flagged.some((f) => f.full);
    const names = flagged.map((f) => f.label.toLowerCase()).join(', ');
    return (
      <Card
        style={styles.limitBanner}
        borderColor={anyFull ? tints.redBorder35 : tints.orangeBorder35}
        background={anyFull ? tints.red12 : tints.orange13}
      >
        <View style={styles.limitBannerHead}>
          <WarningIcon size={17} color={anyFull ? colors.red : colors.orange} />
          <Text style={[styles.limitBannerTitle, { color: anyFull ? colors.redSoftText : colors.orangeSoftText }]}>
            {anyFull ? "Tarif limiti to'ldi" : 'Tarif limiti tugayapti'}
          </Text>
        </View>
        <Text style={styles.limitBannerText}>
          {names} bo'yicha limit {anyFull ? "to'ldi" : 'tugayapti'}. Yangi qo'shish uchun tarifni yangilang.
        </Text>
        <Button
          title="Tarifni yangilash"
          variant={anyFull ? 'danger' : 'gold'}
          height={42}
          radius={11}
          fontSize={13.5}
          style={{ marginTop: 12 }}
          onPress={() => navigation.navigate('OwnerPremium', { centerId: center.id, centerName: stats.name || center.name })}
        />
      </Card>
    );
  };

  const renderLimitGrid = () => {
    if (!limits) return null;
    return (
      <View style={styles.limitGrid}>
        {LIMIT_ITEMS.map(({ key, label }) => {
          const b = limits[key] || {};
          const unlimited = !!b.unlimited;
          const limit = b.limit;
          const used = b.used || 0;
          const capped = !unlimited && limit > 0;
          const pct = capped ? Math.min(100, Math.round((used / limit) * 100)) : 0;
          const full = capped && used >= limit;
          const near = !!b.near_limit;
          const barColor = full ? colors.red : near ? colors.orange : colors.blue;
          return (
            <Card key={key} style={styles.limitCard}>
              <Text style={styles.limitLabel} numberOfLines={1}>{label}</Text>
              <Text style={styles.limitValue}>
                {used}
                {unlimited ? <Text style={styles.limitInfinity}>  ∞</Text> : limit ? <Text style={styles.limitCap}> / {limit}</Text> : null}
              </Text>
              {capped ? <ProgressBar progress={pct} color={barColor} height={6} style={{ marginTop: 8 }} /> : null}
            </Card>
          );
        })}
      </View>
    );
  };

  const renderJamoaToggle = () => (
    <View style={styles.segment}>
      {[['staff', 'Xodimlar'], ['students', "O'quvchilar"]].map(([key, label]) => (
        <TouchableOpacity
          key={key}
          activeOpacity={0.85}
          onPress={() => setJamoaView(key)}
          style={[styles.segmentOption, jamoaView === key ? styles.segmentOptionOn : null]}
        >
          <Text style={[styles.segmentText, jamoaView === key ? styles.segmentTextOn : null]}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTeamRow = (m, i) => (
    <TouchableOpacity key={m.membership_id || m.id || i} activeOpacity={0.85} onPress={() => setMember(m)}>
      <Card style={styles.memberCard}>
        <Avatar letter={initialOf(memberName(m))} size={38} fontSize={14} background={AVATAR_COLORS[i % AVATAR_COLORS.length]} />
        <View style={styles.memberText}>
          <Text style={styles.memberName} numberOfLines={1}>{memberName(m)}</Text>
          <Text style={styles.memberSub} numberOfLines={1}>
            {[roleLabelOf(m.role), m.subject].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <ChevronRightIcon size={14} />
      </Card>
    </TouchableOpacity>
  );

  // Arizalar / Nazorat va Jamoa'ning "O'quvchilar" ko'rinishi — to'liq ekranli,
  // o'z SafeAreaView'iga ega bo'lgan qayta ishlatilgan ekranlar. Ularni asosiy
  // ScrollView ichiga joylash mumkin emas (ichma-ich scroll/safe-area), shu bois
  // alohida return orqali TabBar bilan birga to'g'ridan-to'g'ri render qilamiz.
  if (tab === 'Arizalar' || tab === 'Nazorat' || (tab === 'Jamoa' && jamoaView === 'students')) {
    return (
      <View style={styles.screen}>
        {tab === 'Arizalar' ? (
          <ApplicationsScreen />
        ) : tab === 'Nazorat' ? (
          <ProctoringScreen />
        ) : (
          <SafeAreaView style={styles.screen} edges={['top']}>
            <View style={styles.jamoaBar}>{renderJamoaToggle()}</View>
            {/* ManagerStudentsScreen o'z SafeAreaView(top)'iga ega — yuqoridagi
                segment allaqachon safe-area'ni egallagani uchun bu yerda top
                inset'ni 0 ga tushirib ikki karra bo'shliqning oldini olamiz. */}
            <SafeAreaInsetsContext.Provider
              value={{ top: 0, bottom: insets.bottom, left: insets.left, right: insets.right }}
            >
              <ManagerStudentsScreen />
            </SafeAreaInsetsContext.Provider>
          </SafeAreaView>
        )}
        <TabBar items={OWNER_TABS} activeKey={tab} onPress={setTab} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <TouchableOpacity
              activeOpacity={centers.length > 1 ? 0.75 : 1}
              disabled={centers.length <= 1}
              onPress={() => setCenterPickerOpen(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Text style={styles.title}>{stats.name || center.name}</Text>
              {centers.length > 1 ? (
                <Text style={{ color: colors.blue, fontFamily: FONTS.bold, fontSize: 13 }}>▾</Text>
              ) : null}
            </TouchableOpacity>
            <Text style={styles.subtitle}>Direktor paneli</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Profile')}
            accessibilityRole="button"
            accessibilityLabel="Profil"
          >
            <Avatar letter={initialOf(user?.full_name)} size={38} fontSize={15} background={colors.gold} color={colors.goldText} />
          </TouchableOpacity>
        </View>

        {tab === 'Panel' ? (
          <>
            {renderKpis()}
            {renderLimitBanner()}
            {renderLimitGrid()}
            {data?.trend?.length ? (
              <Card style={styles.panelChart}>
                <Text style={styles.cardHeading}>Faollik — so'nggi {data.trend.length} oy</Text>
                <ActivityBarChart
                  style={{ marginTop: 12 }}
                  height={90}
                  data={data.trend.map((t, i) => ({
                    value: Math.max(3, Math.round(t.avg_score || 0)),
                    label: (t.month || '').slice(5),
                    color: colors.blue,
                    active: i === data.trend.length - 1,
                    glow: i === data.trend.length - 1,
                  }))}
                />
              </Card>
            ) : null}
            <TouchableOpacity activeOpacity={0.85} onPress={() => setReportOpen(true)}>
              <Card style={styles.reportEntry}>
                <View style={styles.reportEntryIcon}>
                  <BarsIcon size={19} color={colors.blue} />
                </View>
                <View style={styles.reportEntryText}>
                  <Text style={styles.reportEntryTitle}>Hisobot va tahlil</Text>
                  <Text style={styles.reportEntrySub}>Top o'quvchilar, faollik trendi, premium</Text>
                </View>
                <ChevronRightIcon size={15} color={colors.textMuted} />
              </Card>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('CenterRanking')}>
              <Card style={styles.reportEntry}>
                <View style={[styles.reportEntryIcon, { backgroundColor: tints.gold10 }]}>
                  <TrophyIcon size={19} color={colors.gold} />
                </View>
                <View style={styles.reportEntryText}>
                  <Text style={styles.reportEntryTitle}>Markazlar reytingi</Text>
                  <Text style={styles.reportEntrySub}>Barcha markazlar o'rtacha ball bo'yicha</Text>
                </View>
                <ChevronRightIcon size={15} color={colors.textMuted} />
              </Card>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('QuestionDifficulty')}>
              <Card style={styles.reportEntry}>
                <View style={[styles.reportEntryIcon, { backgroundColor: tints.purple16 }]}>
                  <BarsIcon size={19} color={colors.purple} />
                </View>
                <View style={styles.reportEntryText}>
                  <Text style={styles.reportEntryTitle}>Savollar tahlili</Text>
                  <Text style={styles.reportEntrySub}>Qiyinlik darajasi bo'yicha to'g'rilik</Text>
                </View>
                <ChevronRightIcon size={15} color={colors.textMuted} />
              </Card>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} onPress={() => setPremiumOpen(true)}>
              <Card style={styles.reportEntry} borderColor={tints.goldBorder30} background={tints.gold06}>
                <View style={[styles.reportEntryIcon, { backgroundColor: tints.gold10 }]}>
                  <CrownIcon size={19} color={colors.gold} />
                </View>
                <View style={styles.reportEntryText}>
                  <Text style={styles.reportEntryTitle}>Premium tahlil</Text>
                  <Text style={styles.reportEntrySub}>Reyting tarixi, xavf tahlili, mock testlar, savollar banki</Text>
                </View>
                <ChevronRightIcon size={15} color={colors.gold} />
              </Card>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} onPress={() => setShopOpen(true)}>
              <Card style={styles.reportEntry}>
                <View style={[styles.reportEntryIcon, { backgroundColor: tints.blue14 }]}>
                  <ShirtIcon size={19} color={colors.blueLight} />
                </View>
                <View style={styles.reportEntryText}>
                  <Text style={styles.reportEntryTitle}>Do'kon boshqaruvi</Text>
                  <Text style={styles.reportEntrySub}>Mahsulotlar, narx va zaxira</Text>
                </View>
                <ChevronRightIcon size={15} color={colors.textMuted} />
              </Card>
            </TouchableOpacity>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Jamoa</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => setTab('Jamoa')}>
                <Text style={styles.sectionAction}>Barchasi</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.team}>
              {staff.length === 0 ? (
                <Card style={styles.memberCard}>
                  <Text style={styles.emptyInline}>Jamoa a'zolari hali qo'shilmagan</Text>
                </Card>
              ) : (
                staff.slice(0, 4).map(renderTeamRow)
              )}
            </View>
          </>
        ) : null}

        {tab === 'Jamoa' ? (
          <>
            <View style={styles.jamoaToggleWrap}>{renderJamoaToggle()}</View>
            <Text style={styles.sectionTitle}>Jamoa a'zolari</Text>
            <View style={styles.team}>
              {staff.length === 0 ? (
                <Card style={styles.memberCard}>
                  <Text style={styles.emptyInline}>Jamoa a'zolari hali qo'shilmagan</Text>
                </Card>
              ) : (
                staff.map(renderTeamRow)
              )}
              <TouchableOpacity activeOpacity={0.8} style={styles.addBtn} onPress={() => setAddOpen(true)}>
                <PlusIcon size={14} color={colors.blueLight} strokeWidth={2.4} />
                <Text style={styles.addBtnText}>Xodim qo'shish</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}

        <Modal visible={reportOpen} animationType="slide" onRequestClose={() => setReportOpen(false)}>
          <SafeAreaView style={styles.screen} edges={['top']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Hisobot</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => setReportOpen(false)}>
                <Text style={styles.modalClose}>Yopish</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate('OwnerPremium', { centerId: center.id, centerName: stats.name || center.name })}
            >
              <Card style={styles.premiumEntry} borderColor={tints.goldBorder30} background={tints.gold06}>
                <View style={styles.premiumEntryIcon}>
                  <CrownIcon size={20} color={colors.gold} />
                </View>
                <View style={styles.premiumEntryText}>
                  <Text style={styles.premiumEntryTitle}>Premium tahlil</Text>
                  <Text style={styles.premiumEntrySub}>Hisobot, reyting tarixi, xavf tahlili, mock testlar</Text>
                </View>
                <ChevronRightIcon size={15} color={colors.gold} />
              </Card>
            </TouchableOpacity>
            {reportLoading ? (
              <ActivityIndicator color={colors.blue} style={{ marginTop: 40 }} />
            ) : report?.premiumBlocked ? (
              <Card style={styles.premiumCard}>
                <Text style={styles.premiumTitle}>Batafsil hisobotlar — Premium</Text>
                <Text style={styles.premiumText}>
                  Top o'quvchilar reytingi va faollik trendi premium markazlar uchun. Markazni premiumga o'tkazing.
                </Text>
                <Button title="Premium haqida" variant="gold" height={44} radius={12} fontSize={14} style={{ marginTop: 14 }} onPress={() => navigation.navigate('Premium')} />
              </Card>
            ) : (
              <>
                {report?.trend?.length ? (
                  <Card style={styles.chartCard}>
                    <Text style={styles.cardHeading}>Faollik trendi (o'rtacha ball)</Text>
                    <ActivityBarChart
                      style={{ marginTop: 14 }}
                      data={report.trend.map((t, i) => ({
                        value: Math.max(3, Math.round(t.avg_score || 0)),
                        label: (t.month || '').slice(5),
                        color: colors.blue,
                        active: i === report.trend.length - 1,
                        glow: i === report.trend.length - 1,
                      }))}
                    />
                  </Card>
                ) : null}
                <Text style={styles.sectionTitle}>Top o'quvchilar</Text>
                {report?.top?.length ? (
                  <View style={styles.team}>
                    {report.top.map((s, i) => (
                      <Card key={s.user_id || i} style={styles.memberCard}>
                        <View style={styles.rankBadge}>
                          <Text style={styles.rankText}>{s.rank || i + 1}</Text>
                        </View>
                        <View style={styles.memberText}>
                          <Text style={styles.memberName} numberOfLines={1}>{s.name}</Text>
                          <Text style={styles.memberSub}>{s.attempts} urinish</Text>
                        </View>
                        <Text style={styles.avgScore}>{s.avg_score}</Text>
                      </Card>
                    ))}
                  </View>
                ) : (
                  <Card style={styles.memberCard}>
                    <Text style={styles.emptyInline}>Hozircha ma'lumot yo'q</Text>
                  </Card>
                )}
              </>
            )}

            <Text style={styles.sectionTitle}>Natijalarni eksport qilish</Text>
            {olympiads === null ? (
              <ActivityIndicator color={colors.blue} style={{ marginTop: 16 }} />
            ) : olympiads.length === 0 ? (
              <Card style={styles.memberCard}>
                <Text style={styles.emptyInline}>Eksport uchun tadbir topilmadi</Text>
              </Card>
            ) : (
              <View style={styles.team}>
                {olympiads.map((o) => (
                  <Card key={o.id} style={styles.exportCard}>
                    <Text style={styles.exportName} numberOfLines={1}>{o.title || o.name || 'Tadbir'}</Text>
                    <View style={styles.exportBtns}>
                      {[['csv', 'CSV'], ['xlsx', 'Excel'], ['pdf', 'PDF']].map(([fmt, label]) => (
                        <TouchableOpacity
                          key={fmt}
                          activeOpacity={0.8}
                          disabled={!!exporting}
                          onPress={() => doExport(o.id, fmt)}
                          style={styles.exportBtn}
                        >
                          {exporting === `${o.id}-${fmt}` ? (
                            <ActivityIndicator size="small" color={colors.blueLight} />
                          ) : (
                            <>
                              <DownloadIcon size={12} color={colors.blueLight} />
                              <Text style={styles.exportBtnText}>{label}</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </Card>
                ))}
              </View>
            )}
            </ScrollView>
          </SafeAreaView>
        </Modal>

        <Modal visible={premiumOpen} animationType="slide" onRequestClose={() => setPremiumOpen(false)}>
          <SafeAreaView style={styles.screen} edges={['top']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Premium tahlil</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => setPremiumOpen(false)}>
                <Text style={styles.modalClose}>Yopish</Text>
              </TouchableOpacity>
            </View>
            <OwnerPremiumScreen route={{ params: { centerId: center.id, centerName: stats.name || center.name } }} embedded />
          </SafeAreaView>
        </Modal>

        <Modal visible={shopOpen} animationType="slide" onRequestClose={() => setShopOpen(false)}>
          <SafeAreaView style={styles.screen} edges={['top']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Do'kon boshqaruvi</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => setShopOpen(false)}>
                <Text style={styles.modalClose}>Yopish</Text>
              </TouchableOpacity>
            </View>
            <OwnerShopScreen route={{ params: { centerId: center.id } }} embedded />
          </SafeAreaView>
        </Modal>

        {tab === 'Sozlama' ? (
          <View style={styles.settingsWrap}>
            <Card style={styles.centerInfoCard}>
              <Text style={styles.centerInfoName}>{center.name}</Text>
              <Text style={styles.centerInfoSub}>
                {[center.region, center.status === 'approved' || center.status === 'active' ? 'Tasdiqlangan' : center.status].filter(Boolean).join(' · ')}
              </Text>
            </Card>
            <TouchableOpacity activeOpacity={0.85} onPress={openEdit}>
              <Card style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <EditIcon size={16} color={colors.blueLight} />
                  <Text style={styles.settingText}>Markazni tahrirlash</Text>
                </View>
                <Text style={styles.settingArrow}>›</Text>
              </Card>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} onPress={openCreate}>
              <Card style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <PlusIcon size={16} color={colors.blueLight} strokeWidth={2.4} />
                  <Text style={styles.settingText}>Yangi markaz qo'shish</Text>
                </View>
                <Text style={styles.settingArrow}>›</Text>
              </Card>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('OwnerShop', { centerId: center.id })}>
              <Card style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <ShirtIcon size={16} color={colors.blueLight} />
                  <Text style={styles.settingText}>Do'kon boshqaruvi</Text>
                </View>
                <Text style={styles.settingArrow}>›</Text>
              </Card>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('Profile')}>
              <Card style={styles.settingRow}>
                <Text style={styles.settingText}>Profil</Text>
                <Text style={styles.settingArrow}>›</Text>
              </Card>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('ChangePassword')}>
              <Card style={styles.settingRow}>
                <Text style={styles.settingText}>Parolni o'zgartirish</Text>
                <Text style={styles.settingArrow}>›</Text>
              </Card>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} onPress={() => Linking.openURL(PRIVACY_POLICY_URL).catch(() => {})}>
              <Card style={styles.settingRow}>
                <Text style={styles.settingText}>Maxfiylik siyosati</Text>
                <Text style={styles.settingArrow}>›</Text>
              </Card>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} onPress={confirmLogout}>
              <Card style={styles.settingRow}>
                <Text style={[styles.settingText, { color: colors.red }]}>Hisobdan chiqish</Text>
              </Card>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} onPress={confirmDelete}>
              <Card style={[styles.settingRow, { borderColor: tints.redBorder35 }]}>
                <Text style={[styles.settingText, { color: colors.red }]}>Hisobni o'chirish</Text>
              </Card>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>

      <TabBar items={OWNER_TABS} activeKey={tab} onPress={setTab} />

      {/* Markaz tanlash (ko'p markaz egasi) — SelectModal string options ishlatadi */}
      <SelectModal
        visible={centerPickerOpen}
        title="Markazni tanlang"
        options={centers.map((c) => c.name || `Markaz #${c.id}`)}
        selected={center?.name || (center ? `Markaz #${center.id}` : '')}
        onSelect={(label) => {
          const match = centers.find((c) => (c.name || `Markaz #${c.id}`) === label);
          if (match) selectCenter(match.id);
          else setCenterPickerOpen(false);
        }}
        onClose={() => setCenterPickerOpen(false)}
      />

      {/* Hisobni o'chirish — parol bilan re-auth */}
      <Modal visible={deleteOpen} transparent animationType="fade" onRequestClose={() => setDeleteOpen(false)}>
        <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={() => setDeleteOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Hisobni o'chirish</Text>
          <Text style={{ color: colors.textSecondary, fontFamily: FONTS.semibold, fontSize: 13, marginBottom: 12, lineHeight: 18 }}>
            Bu amalni ortga qaytarib bo'lmaydi. Davom etish uchun joriy parolingizni kiriting.
          </Text>
          <TextInput
            style={styles.sheetInput}
            placeholder="Joriy parol"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            value={deletePassword}
            onChangeText={setDeletePassword}
            autoCapitalize="none"
          />
          <Button
            title={deleteBusy ? 'O\'chirilmoqda…' : "Hisobni o'chirish"}
            variant="danger"
            height={50}
            radius={13}
            fontSize={15}
            style={{ marginTop: 14 }}
            disabled={deleteBusy}
            onPress={submitDeleteAccount}
          />
          <TouchableOpacity activeOpacity={0.7} onPress={() => setDeleteOpen(false)}>
            <Text style={styles.cancel}>Bekor qilish</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Xodim qo'shish modal */}
      <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => setAddOpen(false)}>
        <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={() => setAddOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Xodim qo'shish</Text>
          <View style={styles.roleRow}>
            {['teacher', 'manager'].map((r) => (
              <TouchableOpacity
                key={r}
                activeOpacity={0.8}
                onPress={() => setStaffRole(r)}
                style={[styles.roleOption, staffRole === r ? styles.roleOptionOn : null]}
              >
                <Text style={[styles.roleText, staffRole === r ? styles.roleTextOn : null]}>
                  {r === 'teacher' ? "O'qituvchi" : 'Menejer'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={styles.sheetInput} placeholder="To'liq ism" placeholderTextColor={colors.textMuted} value={form.full_name} onChangeText={(v) => setField('full_name', v)} />
          <View style={styles.phoneRow}>
            <View style={styles.codeBox}><Text style={styles.codeText}>+998</Text></View>
            <TextInput style={[styles.sheetInput, styles.phoneInput]} placeholder="90 123 45 67" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" value={form.phone} onChangeText={(v) => setField('phone', v)} />
          </View>
          <TextInput style={styles.sheetInput} placeholder="Parol (kamida 8 belgi)" placeholderTextColor={colors.textMuted} secureTextEntry value={form.password} onChangeText={(v) => setField('password', v)} />
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setField('password', generateTempPassword())}
            style={{ marginTop: 6, marginBottom: 4 }}
          >
            <Text style={{ color: colors.blue, fontFamily: FONTS.bold, fontSize: 13 }}>
              Vaqtinchalik parol yaratish
            </Text>
          </TouchableOpacity>
          <Text style={{ color: colors.textMuted, fontFamily: FONTS.semibold, fontSize: 11.5, lineHeight: 16, marginBottom: 4 }}>
            Xavfsizlik: parolni xodimga xavfsiz yo‘l bilan bering va birinchi kirishda o‘zgartirishni so‘rang.
          </Text>
          {staffRole === 'teacher' ? (
            <TextInput style={styles.sheetInput} placeholder="Fan (ixtiyoriy)" placeholderTextColor={colors.textMuted} value={form.subject} onChangeText={(v) => setField('subject', v)} />
          ) : null}
          <Button title={saving ? 'Saqlanmoqda…' : 'Qo\'shish'} variant="success" height={50} radius={13} fontSize={15} style={{ marginTop: 14 }} disabled={saving} onPress={submitStaff} />
          <TouchableOpacity activeOpacity={0.7} onPress={() => setAddOpen(false)}>
            <Text style={styles.cancel}>Bekor qilish</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* A'zo tafsiloti modal */}
      <Modal visible={!!member} transparent animationType="fade" onRequestClose={() => setMember(null)}>
        <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={() => setMember(null)} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          {member ? (
            <>
              <View style={styles.memberDetailHead}>
                <Avatar letter={initialOf(memberName(member))} size={54} fontSize={20} background={colors.purple} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberDetailName} numberOfLines={1}>{memberName(member)}</Text>
                  <Text style={styles.memberDetailSub}>
                    {[roleLabelOf(member.role), member.subject].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Badge label="Faol" color={colors.greenLight} background={tints.green14} />
              </View>
              {member.user?.phone ? (
                <View style={styles.detailField}>
                  <Text style={styles.detailLabel}>TELEFON</Text>
                  <Text style={styles.detailValue}>{member.user.phone}</Text>
                </View>
              ) : null}
              {member.role === 'teacher' || member.role === 'manager' ? (
                <Button
                  title={member.role === 'manager' ? "O'qituvchi qilish" : 'Menejer qilish'}
                  variant="dark"
                  height={48}
                  radius={12}
                  fontSize={14}
                  style={{ marginTop: 16 }}
                  onPress={() => changeRole(member.role === 'manager' ? 'teacher' : 'manager')}
                />
              ) : null}
              <Button title="Markazdan chiqarish" variant="danger" height={48} radius={12} fontSize={14} style={{ marginTop: 10 }} onPress={removeMember} />
              <TouchableOpacity activeOpacity={0.7} onPress={() => setMember(null)}>
                <Text style={styles.cancel}>Yopish</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </Modal>

      {/* Markazni tahrirlash modal */}
      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => (editSaving ? null : setEditOpen(false))}>
        <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={() => (editSaving ? null : setEditOpen(false))} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Markazni tahrirlash</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={styles.editScroll}>
            <TextInput style={styles.sheetInput} placeholder="Markaz nomi" placeholderTextColor={colors.textMuted} value={editForm.name} onChangeText={(v) => setEditField('name', v)} />
            <TouchableOpacity activeOpacity={0.8} style={styles.selectField} onPress={() => setRegionPicker(true)}>
              <Text style={editForm.region ? styles.selectValue : styles.selectPlaceholder}>
                {editForm.region || 'Viloyat'}
              </Text>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.selectField, !editForm.region ? styles.selectDisabled : null]}
              disabled={!editForm.region}
              onPress={() => setDistrictPicker(true)}
            >
              <Text style={editForm.district ? styles.selectValue : styles.selectPlaceholder}>
                {editForm.district || 'Tuman'}
              </Text>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>

            <Text style={styles.editLabel}>Brend rangi</Text>
            <View style={styles.swatchRow}>
              {BRAND_SWATCHES.map((hex) => (
                <TouchableOpacity
                  key={hex}
                  activeOpacity={0.8}
                  onPress={() => setEditField('brand_color', hex)}
                  style={[
                    styles.swatch,
                    { backgroundColor: hex },
                    editForm.brand_color === hex ? styles.swatchOn : null,
                  ]}
                />
              ))}
            </View>

            <Text style={styles.editLabel}>Logotip</Text>
            <TouchableOpacity activeOpacity={0.85} style={styles.logoBtn} onPress={pickLogo}>
              <Text style={styles.logoBtnText}>{logo ? 'Logotip tanlandi ✓' : 'Galereyadan rasm tanlash'}</Text>
            </TouchableOpacity>
          </ScrollView>
          <Button
            title={editSaving ? 'Saqlanmoqda…' : 'Saqlash'}
            variant="success"
            height={50}
            radius={13}
            fontSize={15}
            style={{ marginTop: 14 }}
            disabled={editSaving}
            onPress={submitEdit}
          />
          <TouchableOpacity activeOpacity={0.7} onPress={() => (editSaving ? null : setEditOpen(false))}>
            <Text style={styles.cancel}>Bekor qilish</Text>
          </TouchableOpacity>
        </View>
        <SelectModal
          visible={regionPicker}
          title="Viloyat"
          options={UZBEKISTAN_REGIONS}
          selected={editForm.region}
          onSelect={(v) => {
            setEditForm((prev) => ({ ...prev, region: v, district: '' }));
            setRegionPicker(false);
          }}
          onClose={() => setRegionPicker(false)}
        />
        <SelectModal
          visible={districtPicker}
          title="Tuman"
          options={editDistricts}
          selected={editForm.district}
          onSelect={(v) => {
            setEditField('district', v);
            setDistrictPicker(false);
          }}
          onClose={() => setDistrictPicker(false)}
        />
      </Modal>

      {/* Yangi markaz qo'shish modal */}
      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => (createSaving ? null : setCreateOpen(false))}>
        <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={() => (createSaving ? null : setCreateOpen(false))} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Yangi markaz qo'shish</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={styles.editScroll}>
            <TextInput style={styles.sheetInput} placeholder="Markaz nomi" placeholderTextColor={colors.textMuted} value={createForm.name} onChangeText={(v) => setCreateField('name', v)} />
            <TouchableOpacity activeOpacity={0.8} style={styles.selectField} onPress={() => setCreateOrgPicker(true)}>
              <Text style={createForm.organization_type ? styles.selectValue : styles.selectPlaceholder}>
                {createForm.organization_type || 'Tashkilot turi'}
              </Text>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} style={styles.selectField} onPress={() => setCreateRegionPicker(true)}>
              <Text style={createForm.region ? styles.selectValue : styles.selectPlaceholder}>
                {createForm.region || 'Viloyat'}
              </Text>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.selectField, !createForm.region ? styles.selectDisabled : null]}
              disabled={!createForm.region}
              onPress={() => setCreateDistrictPicker(true)}
            >
              <Text style={createForm.district ? styles.selectValue : styles.selectPlaceholder}>
                {createForm.district || 'Tuman'}
              </Text>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>
          </ScrollView>
          <Button
            title={createSaving ? 'Saqlanmoqda…' : "Markaz qo'shish"}
            variant="success"
            height={50}
            radius={13}
            fontSize={15}
            style={{ marginTop: 14 }}
            disabled={createSaving}
            onPress={submitCreate}
          />
          <TouchableOpacity activeOpacity={0.7} onPress={() => (createSaving ? null : setCreateOpen(false))}>
            <Text style={styles.cancel}>Bekor qilish</Text>
          </TouchableOpacity>
        </View>
        <SelectModal
          visible={createOrgPicker}
          title="Tashkilot turi"
          options={ORGANIZATION_TYPES}
          selected={createForm.organization_type}
          onSelect={(v) => {
            setCreateField('organization_type', v);
            setCreateOrgPicker(false);
          }}
          onClose={() => setCreateOrgPicker(false)}
        />
        <SelectModal
          visible={createRegionPicker}
          title="Viloyat"
          options={UZBEKISTAN_REGIONS}
          selected={createForm.region}
          onSelect={(v) => {
            setCreateForm((prev) => ({ ...prev, region: v, district: '' }));
            setCreateRegionPicker(false);
          }}
          onClose={() => setCreateRegionPicker(false)}
        />
        <SelectModal
          visible={createDistrictPicker}
          title="Tuman"
          options={createDistricts}
          selected={createForm.district}
          onSelect={(v) => {
            setCreateField('district', v);
            setCreateDistrictPicker(false);
          }}
          onClose={() => setCreateDistrictPicker(false)}
        />
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors, tints) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 100 },
  emptyLogout: { alignSelf: 'center', marginBottom: 28, paddingVertical: 10, paddingHorizontal: 16 },
  emptyLogoutText: { fontSize: 13, fontFamily: FONTS.extrabold, color: colors.red },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1 },
  title: { fontSize: 19, fontFamily: FONTS.extrabold, color: colors.text },
  subtitle: { fontSize: 12, fontFamily: FONTS.semibold, color: colors.textSecondary },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  kpi: { flexBasis: '47%', flexGrow: 1 },
  premiumKpi: { marginTop: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  premiumKpiIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  premiumKpiText: { flex: 1 },
  premiumKpiLabel: { fontSize: 11.5, fontFamily: FONTS.bold, color: colors.textSecondary },
  premiumKpiValue: { fontSize: 22, fontFamily: FONTS.extrabold, color: colors.purple, marginTop: 2 },
  premiumKpiShare: { fontSize: 12, fontFamily: FONTS.bold, color: colors.textSecondary },
  limitBanner: { marginTop: 12, padding: 14 },
  limitBannerHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  limitBannerTitle: { fontSize: 13.5, fontFamily: FONTS.extrabold },
  limitBannerText: { fontSize: 11.5, fontFamily: FONTS.semibold, color: colors.textSecondary, marginTop: 6, lineHeight: 16 },
  limitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  limitCard: { flexBasis: '47%', flexGrow: 1, paddingVertical: 12, paddingHorizontal: 14 },
  limitLabel: { fontSize: 11, fontFamily: FONTS.bold, color: colors.textSecondary },
  limitValue: { fontSize: 17, fontFamily: FONTS.extrabold, color: colors.text, marginTop: 3 },
  limitCap: { fontSize: 12, fontFamily: FONTS.bold, color: colors.textMuted },
  limitInfinity: { fontSize: 15, fontFamily: FONTS.extrabold, color: colors.blueLight },
  panelChart: { padding: 16, marginTop: 12 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontFamily: FONTS.extrabold, color: colors.text, marginTop: 22, marginBottom: 10 },
  sectionAction: { fontSize: 12, fontFamily: FONTS.bold, color: colors.blue },
  team: { gap: 8 },
  memberCard: { paddingVertical: 13, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  emptyInline: { fontSize: 12.5, fontFamily: FONTS.semibold, color: colors.textMuted },
  memberText: { flex: 1 },
  memberName: { fontSize: 13.5, fontFamily: FONTS.extrabold, color: colors.text },
  memberSub: { fontSize: 11, fontFamily: FONTS.semibold, color: colors.textSecondary },
  avgScore: { fontSize: 16, fontFamily: FONTS.extrabold, color: colors.gold },
  rankBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: tints.blue14, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 13, fontFamily: FONTS.extrabold, color: colors.blue },
  addBtn: {
    height: 46,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderDashed,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 4,
  },
  addBtnText: { fontSize: 13, fontFamily: FONTS.extrabold, color: colors.blueLight },
  reportWrap: { marginTop: 4 },
  segment: { flexDirection: 'row', gap: 8 },
  segmentOption: { flex: 1, height: 40, borderRadius: 11, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceDeep, alignItems: 'center', justifyContent: 'center' },
  segmentOptionOn: { borderColor: colors.blue, backgroundColor: tints.blue14 },
  segmentText: { fontSize: 13, fontFamily: FONTS.bold, color: colors.textSecondary },
  segmentTextOn: { fontFamily: FONTS.extrabold, color: colors.blueLight },
  jamoaToggleWrap: { marginTop: 16, marginBottom: 4 },
  jamoaBar: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  reportEntry: { marginTop: 22, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  reportEntryIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: tints.blue14, alignItems: 'center', justifyContent: 'center' },
  reportEntryText: { flex: 1 },
  reportEntryTitle: { fontSize: 14.5, fontFamily: FONTS.extrabold, color: colors.text },
  reportEntrySub: { fontSize: 11, fontFamily: FONTS.semibold, color: colors.textSecondary, marginTop: 2 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  modalTitle: { fontSize: 19, fontFamily: FONTS.extrabold, color: colors.text },
  modalClose: { fontSize: 14, fontFamily: FONTS.bold, color: colors.blue },
  premiumEntry: { marginTop: 16, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  premiumEntryIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: tints.gold10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumEntryText: { flex: 1 },
  premiumEntryTitle: { fontSize: 14.5, fontFamily: FONTS.extrabold, color: colors.text },
  premiumEntrySub: { fontSize: 11, fontFamily: FONTS.semibold, color: colors.textSecondary, marginTop: 2 },
  chartCard: { padding: 16, marginTop: 16 },
  cardHeading: { fontSize: 13.5, fontFamily: FONTS.extrabold, color: colors.text },
  premiumCard: { padding: 20, marginTop: 20, alignItems: 'center' },
  premiumTitle: { fontSize: 15, fontFamily: FONTS.extrabold, color: colors.text },
  premiumText: { fontSize: 12.5, fontFamily: FONTS.semibold, color: colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 18 },
  settingsWrap: { marginTop: 16, gap: 8 },
  centerInfoCard: { padding: 18 },
  centerInfoName: { fontSize: 16, fontFamily: FONTS.extrabold, color: colors.text },
  centerInfoSub: { fontSize: 12, fontFamily: FONTS.semibold, color: colors.textSecondary, marginTop: 3 },
  settingRow: { paddingVertical: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingText: { fontSize: 14, fontFamily: FONTS.extrabold, color: colors.text },
  settingArrow: { fontSize: 20, fontFamily: FONTS.bold, color: colors.textMuted },
  exportCard: { paddingVertical: 13, paddingHorizontal: 15 },
  exportName: { fontSize: 13.5, fontFamily: FONTS.extrabold, color: colors.text },
  exportBtns: { flexDirection: 'row', gap: 8, marginTop: 10 },
  exportBtn: {
    flex: 1,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceDeep,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  exportBtnText: { fontSize: 12, fontFamily: FONTS.extrabold, color: colors.blueLight },
  editScroll: { maxHeight: 360 },
  selectField: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 9,
  },
  selectDisabled: { opacity: 0.5 },
  selectValue: { fontSize: 14, fontFamily: FONTS.bold, color: colors.text },
  selectPlaceholder: { fontSize: 14, fontFamily: FONTS.bold, color: colors.textMuted },
  editLabel: { fontSize: 12, fontFamily: FONTS.extrabold, color: colors.textSecondary, marginTop: 8, marginBottom: 8 },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'transparent' },
  swatchOn: { borderColor: colors.text },
  logoBtn: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderDashed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  logoBtnText: { fontSize: 13, fontFamily: FONTS.extrabold, color: colors.blueLight },
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
  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  roleOption: { flex: 1, height: 42, borderRadius: 11, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceDeep, alignItems: 'center', justifyContent: 'center' },
  roleOptionOn: { borderColor: colors.blue, backgroundColor: tints.blue14 },
  roleText: { fontSize: 13, fontFamily: FONTS.bold, color: colors.textSecondary },
  roleTextOn: { fontFamily: FONTS.extrabold, color: colors.blueLight },
  sheetInput: {
    height: 48,
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
  phoneRow: { flexDirection: 'row', gap: 8 },
  codeBox: { height: 48, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12, backgroundColor: colors.surfaceDeep, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, marginBottom: 9 },
  codeText: { fontSize: 14, fontFamily: FONTS.bold, color: colors.text },
  phoneInput: { flex: 1 },
  cancel: { textAlign: 'center', marginTop: 14, fontSize: 13, fontFamily: FONTS.bold, color: colors.textMuted },
  memberDetailHead: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 16 },
  memberDetailName: { fontSize: 17, fontFamily: FONTS.extrabold, color: colors.text },
  memberDetailSub: { fontSize: 12.5, fontFamily: FONTS.semibold, color: colors.textSecondary, marginTop: 2 },
  detailField: { marginTop: 16 },
  detailLabel: { fontSize: 10.5, fontFamily: FONTS.extrabold, color: colors.textSecondary, letterSpacing: 0.5 },
  detailValue: { fontSize: 14, fontFamily: FONTS.bold, color: colors.text, marginTop: 3 },
});
