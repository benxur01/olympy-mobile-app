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
import { SafeAreaView } from 'react-native-safe-area-context';
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
import useFetch from '../services/useFetch';
import { ownerApi, managerApi, authApi } from '../services/api';
import { PRIVACY_POLICY_URL } from '../services/config';
import { useAuth } from '../services/AuthContext';
import { PlusIcon, HomeIcon, UsersIcon, BarsIcon, SettingsIcon, ChevronRightIcon, CrownIcon } from '../components/icons/Icons';

const OWNER_TABS = [
  { key: 'Panel', label: 'Panel', icon: (color) => <HomeIcon size={23} color={color} /> },
  { key: 'Jamoa', label: 'Jamoa', icon: (color) => <UsersIcon size={23} color={color} /> },
  { key: 'Hisobot', label: 'Hisobot', icon: (color) => <BarsIcon size={23} color={color} /> },
  { key: 'Sozlama', label: 'Sozlama', icon: (color) => <SettingsIcon size={23} color={color} /> },
];

const makeAVATAR_COLORS = (colors, tints) => ([colors.purple, colors.blue, colors.green, colors.orange]);
const asArray = (data) => (Array.isArray(data) ? data : data?.results || data?.members || []);
const initialOf = (name) => (name || '?').trim()[0]?.toUpperCase() || '?';
const memberName = (m) => m.full_name || m.user_name || m.user?.full_name || "A'zo";
const roleLabelOf = (role) =>
  role === 'manager' ? 'Menejer' : role === 'teacher' ? "O'qituvchi" : role || '';

export default function OwnerDashboardScreen({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const AVATAR_COLORS = makeAVATAR_COLORS(colors, tints);
  const { user, logout } = useAuth();
  const { data, loading, error, reload } = useFetch(async () => {
    const centersData = await ownerApi.myCenters().then((r) => r.data).catch(() => null);
    const centers = asArray(centersData);
    const center = centers[0];
    if (!center) return { center: null, stats: null, staff: [] };
    const [stats, staff, trend] = await Promise.all([
      ownerApi.centerStats(center.id).then((r) => r.data).catch(() => null),
      ownerApi.staffMemberships(center.id).then((r) => r.data).catch(() => null),
      // Panel tabida ham kichik grafik ko'rsatish uchun faollik trendini
      // oldindan yuklaymiz (premium bo'lmasa 403 → bo'sh).
      ownerApi.activityTrend(center.id).then((r) => r.data).catch(() => null),
    ]);
    return { center, stats, staff: asArray(staff), trend: Array.isArray(trend) ? trend : [] };
  }, []);

  const [tab, setTab] = useState('Panel');
  const [member, setMember] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [staffRole, setStaffRole] = useState('teacher');
  const [form, setForm] = useState({ full_name: '', phone: '', password: '', subject: '' });
  const [saving, setSaving] = useState(false);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const center = data?.center;
  const stats = data?.stats || {};
  const staff = data?.staff || [];

  // Hisobot tabi ochilganda (bir marta) top o'quvchilar va faollik trendini
  // yuklaymiz. Premium bo'lmagan markazda backend 403 qaytaradi — buni
  // alohida ko'rsatamiz.
  useEffect(() => {
    if (tab !== 'Hisobot' || !center || report) return;
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
  }, [tab, center, report]);

  if (loading) return <LoadingState message="Panel yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  if (!center) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Sizga biriktirilgan markaz topilmadi</Text>
        </View>
      </SafeAreaView>
    );
  }

  const setField = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

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
      const payload = { full_name: form.full_name.trim(), phone, password: form.password };
      if (staffRole === 'teacher') {
        await ownerApi.createTeacher(center.id, { ...payload, subject: form.subject.trim() });
      } else {
        await ownerApi.createManager(center.id, payload);
      }
      setAddOpen(false);
      setForm({ full_name: '', phone: '', password: '', subject: '' });
      Alert.alert('Qo\'shildi', `Yangi ${roleLabelOf(staffRole).toLowerCase()} yaratildi.`);
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

  const confirmDelete = () => {
    Alert.alert(
      "Hisobni o'chirish",
      "Hisobingiz butunlay o'chiriladi. Davom etasizmi?",
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: "O'chirish",
          style: 'destructive',
          onPress: async () => {
            try {
              await authApi.deleteAccount();
              await logout();
              navigation.reset({ index: 0, routes: [{ name: 'Splash' }] });
            } catch (e) {
              Alert.alert('O\'chirilmadi', e?.response?.data?.detail || "Hisobni o'chirib bo'lmadi.");
            }
          },
        },
      ]
    );
  };

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

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{stats.name || center.name}</Text>
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

        {tab === 'Hisobot' ? (
          <View style={styles.reportWrap}>
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
          </View>
        ) : null}

        {tab === 'Sozlama' ? (
          <View style={styles.settingsWrap}>
            <Card style={styles.centerInfoCard}>
              <Text style={styles.centerInfoName}>{center.name}</Text>
              <Text style={styles.centerInfoSub}>
                {[center.region, center.status === 'approved' || center.status === 'active' ? 'Tasdiqlangan' : center.status].filter(Boolean).join(' · ')}
              </Text>
            </Card>
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
                  <Text style={styles.memberDetailName}>{memberName(member)}</Text>
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
              <Button title="Markazdan chiqarish" variant="danger" height={48} radius={12} fontSize={14} style={{ marginTop: 16 }} onPress={removeMember} />
              <TouchableOpacity activeOpacity={0.7} onPress={() => setMember(null)}>
                <Text style={styles.cancel}>Yopish</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors, tints) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 100 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13, fontFamily: FONTS.semibold, color: colors.textMuted },
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
  settingText: { fontSize: 14, fontFamily: FONTS.extrabold, color: colors.text },
  settingArrow: { fontSize: 20, fontFamily: FONTS.bold, color: colors.textMuted },
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
