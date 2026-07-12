import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Linking, Modal, Image, ActivityIndicator, TextInput, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import Chip from '../components/Chip';
import IconBox from '../components/IconBox';
import Button from '../components/Button';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import useFetch from '../services/useFetch';
import { studentApi, authApi } from '../services/api';
import { PRIVACY_POLICY_URL, API_BASE_URL, WEB_APP_URL } from '../services/config';
import { useAuth } from '../services/AuthContext';
import {
  ProfileBadgeIcon,
  MedalIcon,
  DownloadIcon,
  FlameIcon,
  StarIcon,
  CheckIcon,
  LockIcon,
  CalendarIcon,
  CameraIcon,
  ShareIcon,
  CoinIcon,
  TelegramIcon,
} from '../components/icons/Icons';
import Badge from '../components/Badge';
import SegmentedControl from '../components/SegmentedControl';

const TABS = ['Natijalar', 'Olimpiadalar', 'Sertifikatlar', 'Sozlamalar'];

// "Do'stlarni taklif qiling" bo'limi — websaytdagi ReferralWidget bilan bir xil
// mantiq: o'z kodini ulashish (React Native Share API orqali — Telegram, WhatsApp
// va h.k.), taklif qilingan do'stlar soni, hamda do'st kodini kiritib ikkalasiga
// ham bonus coin olish. Modul darajasida — ProfileScreen qayta render bo'lganda
// kiritilgan matn yo'qolmasin (nested komponent har render'da remount bo'lardi).
function ReferralSection({ referral, onUsed, styles, colors }) {
  const code = referral?.code || '';
  const bonus = referral?.bonus_coins || 50;
  const invited = referral?.invited_count || 0;
  const [codeInput, setCodeInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null); // { type: 'ok' | 'err', text }

  const shareCode = async () => {
    if (!code) return;
    const link = `${WEB_APP_URL}/?ref=${code}`;
    const message =
      `Olympy — olimpiadalarga tayyorlanish platformasiga qo'shil! 🎓\n\n` +
      `Mening taklif kodim: ${code}\n` +
      `Ro'yxatdan o'tayotganda shu kodni kiritsang, ikkalamiz ham ${bonus} coin olamiz.\n\n` +
      `${link}`;
    try {
      await Share.share({ message });
    } catch (e) {
      // Foydalanuvchi ulashishni bekor qildi yoki sheet ochilmadi — jim.
    }
  };

  const submitCode = async () => {
    const value = codeInput.trim().toUpperCase();
    if (!value || submitting) return;
    setSubmitting(true);
    setMsg(null);
    try {
      const { data } = await studentApi.useReferralCode(value);
      setMsg({ type: 'ok', text: data?.detail || "Tabriklaymiz! Bonus coin qo'shildi." });
      setCodeInput('');
      // Coin balansi va taklif statistikasi yangilanishi uchun profilni qayta
      // o'qiymiz (refresh — to'liq LoadingState ko'rsatmaydi, kontent qoladi).
      onUsed?.();
    } catch (e) {
      setMsg({
        type: 'err',
        text: e?.response?.data?.detail || "Kodni ishlatib bo'lmadi. Qayta urinib ko'ring.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Text style={styles.sectionTitle}>Do'stlarni taklif qiling</Text>
      <Card style={styles.referralCard}>
        <Text style={styles.referralDesc}>
          Kodingizni do'stingizga yuboring — u ro'yxatdan o'tib kodni ishlatsa,
          ikkalangiz ham {bonus} coin olasiz.
        </Text>

        <View style={styles.referralCodeRow}>
          <View style={styles.referralCodeBox}>
            <Text style={styles.referralCode} selectable>{code || '—'}</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.referralShareBtn}
            onPress={shareCode}
            disabled={!code}
          >
            <ShareIcon size={15} color={colors.white} />
            <Text style={styles.referralShareText}>Ulashish</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.referralStatRow}>
          <CoinIcon size={15} color={colors.gold} />
          <Text style={styles.referralStatText}>
            Siz <Text style={styles.referralStatStrong}>{invited}</Text> ta do'st taklif qildingiz
          </Text>
        </View>

        <View style={styles.referralDivider} />

        <Text style={styles.referralInputLabel}>DO'STINGIZ KODI BORMI?</Text>
        <View style={styles.referralInputRow}>
          <TextInput
            style={styles.referralInput}
            placeholder="Kodni kiriting"
            placeholderTextColor={colors.textMuted}
            value={codeInput}
            onChangeText={(t) => setCodeInput(t.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={12}
            editable={!submitting}
          />
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.referralSubmitBtn, (!codeInput.trim() || submitting) ? styles.referralSubmitDisabled : null]}
            onPress={submitCode}
            disabled={!codeInput.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.referralSubmitText}>Tasdiqlash</Text>
            )}
          </TouchableOpacity>
        </View>
        {msg ? (
          <Text style={[styles.referralMsg, msg.type === 'ok' ? styles.referralMsgOk : styles.referralMsgErr]}>
            {msg.text}
          </Text>
        ) : null}
      </Card>
    </>
  );
}

export default function ProfileScreen({ navigation }) {
  const { colors, tints, mode, setThemeMode } = useTheme();
  const styles = makeStyles(colors, tints);
  const CERT_TINTS = [tints.gold13, tints.blue13, tints.green13];
  const CERT_COLORS = [colors.gold, colors.blue, colors.greenLight];
  const OLY_STATUS = {
    active: { label: 'Faol', color: colors.greenLight, bg: tints.green14 },
    finished: { label: 'Yakunlandi', color: colors.slate, bg: tints.slate14 },
    draft: { label: 'Kutilmoqda', color: colors.orange, bg: tints.orange14 },
    scheduled: { label: 'Kutilmoqda', color: colors.orange, bg: tints.orange14 },
  };
  const THEME_OPTIONS = ['light', 'dark', 'system'];
  const THEME_LABELS = ['Yorug\'', 'Tungi', 'Tizim'];
  const { user, logout, reloadMe } = useAuth();
  // Profil ekrani barcha rollarga ochiq (o'qituvchi/menejer/direktor/admin
  // menyu yoki header orqali kiradi), lekin natija/olimpiada/sertifikat/coin
  // va referral faqat o'quvchida mavjud. Non-student uchun student API'larni
  // umuman chaqirmaymiz va faqat umumiy bo'limlarni (tema, parol, 2FA,
  // maxfiylik, chiqish) ko'rsatamiz.
  const isStudent = (user?.roles || []).includes('student');
  const [tab, setTab] = useState(isStudent ? 'Sertifikatlar' : 'Sozlamalar');
  const [certImage, setCertImage] = useState(null);
  const [certLoading, setCertLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const { data, loading, error, reload, refresh } = useFetch(async () => {
    // Boshqa rollar uchun student endpoint'lari 403 qaytaradi — ularni
    // chaqirmaymiz (aks holda hammasi null bo'lib xato ekraniga tushardi).
    if (!isStudent) {
      return { stats: null, streak: null, results: [], coins: 0, olympiads: [], referral: null };
    }
    const [stats, streak, results, shop, olympiads, referral] = await Promise.all([
      studentApi.myStats().then((r) => r.data).catch(() => null),
      studentApi.myStreak().then((r) => r.data).catch(() => null),
      studentApi.myResults({ page_size: 10 }).then((r) => r.data).catch(() => null),
      studentApi.shopProducts().then((r) => r.data).catch(() => null),
      studentApi.olympiads().then((r) => r.data).catch(() => null),
      studentApi.getReferralInfo().then((r) => r.data).catch(() => null),
    ]);
    // Hammasi null bo'lsa — tarmoq/serverda umumiy nosozlik. Bo'sh ekran
    // o'rniga xatolikni ko'rsatamiz (item 16).
    if (stats === null && streak === null && results === null && shop === null) {
      throw new Error('profile_load_failed');
    }
    return {
      stats,
      streak,
      results: Array.isArray(results) ? results : results?.results || [],
      coins: shop?.coins ?? 0,
      olympiads: Array.isArray(olympiads) ? olympiads : olympiads?.results || olympiads?.entries || [],
      referral,
    };
  }, [isStudent]);

  if (loading) return <LoadingState message="Profil yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  const stats = data?.stats || {};
  const streak = data?.streak || {};
  const results = data?.results || [];
  const coins = data?.coins ?? 0;
  const olympiads = data?.olympiads || [];
  const isPremium = user?.is_premium || user?.is_premium_active;
  const twoFAEnabled = !!user?.totp_enabled;
  const telegramLinked = !!user?.telegram_linked;
  const [telegramLinking, setTelegramLinking] = useState(false);
  const telegramPollRef = useRef(null);

  // Telegram akkauntini ulash: deep link ochiladi (foydalanuvchi botga
  // telefon raqamini yuboradi), so'ng har 5s (5 daqiqagacha) profil qayta
  // yuklanib `telegram_linked` true bo'lishi kutiladi — RegisterScreen'dagi
  // OTP oqimi bilan bir xil polling naqshi.
  const linkTelegram = async () => {
    if (telegramLinking || telegramLinked) return;
    setTelegramLinking(true);
    try {
      const { data } = await authApi.startTelegramLink();
      if (!data?.telegram_deep_link) {
        Alert.alert('Xatolik', "Bot sozlanmagan. Keyinroq urinib ko'ring.");
        setTelegramLinking(false);
        return;
      }
      Linking.openURL(data.telegram_deep_link).catch(() => {});
      if (telegramPollRef.current) clearInterval(telegramPollRef.current);
      let tries = 0;
      const MAX_TRIES = 60;
      telegramPollRef.current = setInterval(async () => {
        tries += 1;
        try {
          const fresh = await reloadMe();
          if (fresh?.telegram_linked) {
            clearInterval(telegramPollRef.current);
            telegramPollRef.current = null;
            setTelegramLinking(false);
          }
        } catch (e) {
          // keyingi urinishda qayta tekshiriladi
        }
        if (tries >= MAX_TRIES) {
          clearInterval(telegramPollRef.current);
          telegramPollRef.current = null;
          setTelegramLinking(false);
        }
      }, 5000);
    } catch (e) {
      Alert.alert('Xatolik', "Ulanishni boshlab bo'lmadi. Qayta urinib ko'ring.");
      setTelegramLinking(false);
    }
  };
  const initial = (user?.full_name || 'O')[0].toUpperCase();
  // Backend `avatar_url` Cloudinary/S3 da absolyut, lokal storage'da nisbiy
  // (/media/..) bo'lishi mumkin — nisbiy bo'lsa API_BASE_URL bilan to'ldiramiz
  // (websaytdagi makeAssetUrl bilan bir xil mantiq).
  const rawAvatar = user?.avatar_url || '';
  const avatarUri = rawAvatar
    ? (/^https?:\/\//i.test(rawAvatar)
        ? rawAvatar
        : `${API_BASE_URL}${rawAvatar.startsWith('/') ? '' : '/'}${rawAvatar}`)
    : null;

  // "Olimpiadalar" tabi — foydalanuvchi qatnashgan tadbirlar (natijalardan),
  // holati mavjud olimpiadalar ro'yxatidan boyitiladi.
  const olyByTitle = {};
  olympiads.forEach((o) => {
    if (o?.title) olyByTitle[o.title] = o;
  });
  const participated = results.map((r) => {
    const title = r.olympiad_title || r.olympiad?.title || 'Tadbir';
    const oly = olyByTitle[title];
    return {
      id: r.id,
      title,
      subject: r.subject || oly?.subject,
      score: r.score,
      rank: r.rank,
      status: oly?.status || 'finished',
    };
  });

  // Galereyadan rasm tanlab, kvadrat qilib kesib (websaytdagi kabi), avatar
  // sifatida yuklaydi. Yuklangach reloadMe() bilan profil qayta o'qiladi.
  const pickAndUploadAvatar = async () => {
    if (avatarUploading) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Ruxsat kerak',
          "Rasm tanlash uchun sozlamalardan galereyaga ruxsat bering."
        );
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
      setAvatarUploading(true);
      await authApi.uploadAvatar(asset.uri, {
        name: asset.fileName || undefined,
        type: asset.mimeType || undefined,
      });
      await reloadMe();
    } catch (e) {
      const detail = e?.response?.data?.detail;
      Alert.alert('Xatolik', detail || "Rasmni yuklab bo'lmadi. Qayta urinib ko'ring.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const removeAvatar = async () => {
    if (avatarUploading) return;
    setAvatarUploading(true);
    try {
      await authApi.deleteAvatar();
      await reloadMe();
    } catch (e) {
      const detail = e?.response?.data?.detail;
      Alert.alert('Xatolik', detail || "Rasmni o'chirib bo'lmadi.");
    } finally {
      setAvatarUploading(false);
    }
  };

  // Avatarga bosilganda: rasm bor bo'lsa o'zgartirish/o'chirish tanlovi,
  // aks holda to'g'ridan-to'g'ri galereya ochiladi.
  const onAvatarPress = () => {
    if (avatarUploading) return;
    if (avatarUri) {
      Alert.alert('Profil rasmi', undefined, [
        { text: "Rasmni o'zgartirish", onPress: pickAndUploadAvatar },
        { text: "Rasmni o'chirish", style: 'destructive', onPress: removeAvatar },
        { text: 'Bekor qilish', style: 'cancel' },
      ]);
    } else {
      pickAndUploadAvatar();
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

  // Sertifikat PNG'sini autentifikatsiya bilan yuklab, ilova ichida ko'rsatamiz
  // (faqat 1-o'rin egasiga beriladi — aks holda backend 403 qaytaradi).
  const downloadCert = async (attempt) => {
    if (certLoading || !attempt?.id) return;
    setCertLoading(true);
    try {
      const res = await studentApi.certificatePng(attempt.id);
      const reader = new FileReader();
      reader.onload = () => {
        setCertImage(reader.result);
        setCertLoading(false);
      };
      reader.onerror = () => {
        setCertLoading(false);
        Alert.alert('Xatolik', "Sertifikatni ochib bo'lmadi.");
      };
      reader.readAsDataURL(res.data);
    } catch (e) {
      setCertLoading(false);
      const status = e?.response?.status;
      if (status === 403) {
        Alert.alert('Sertifikat', "Sertifikat faqat tadbirda 1-o'rinni egallagan o'quvchiga beriladi.");
      } else {
        Alert.alert('Xatolik', "Sertifikatni yuklab bo'lmadi. Internet aloqasini tekshiring.");
      }
    }
  };

  const openPrivacy = () => {
    Linking.openURL(PRIVACY_POLICY_URL).catch(() =>
      Alert.alert('Xatolik', "Havolani ochib bo'lmadi.")
    );
  };

  const confirmDelete = () => {
    Alert.alert(
      'Hisobni o\'chirish',
      "Hisobingiz va barcha ma'lumotlaringiz butunlay o'chiriladi. Bu amalni ortga qaytarib bo'lmaydi. Davom etasizmi?",
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
              const detail = e?.response?.data?.detail;
              Alert.alert('O\'chirilmadi', detail || "Hisobni o'chirib bo'lmadi. Keyinroq urinib ko'ring.");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.profileCard, isPremium ? styles.profilePremium : null]}>
          <TouchableOpacity activeOpacity={0.85} onPress={onAvatarPress} disabled={avatarUploading}>
            <Avatar
              letter={initial}
              uri={avatarUri}
              size={70}
              fontSize={26}
              borderColor={isPremium ? colors.gold : undefined}
              style={isPremium ? styles.premiumGlow : null}
            />
            {avatarUploading ? (
              <View style={styles.avatarLoadingOverlay}>
                <ActivityIndicator size="small" color={colors.white} />
              </View>
            ) : (
              <View style={styles.avatarCamBadge}>
                <CameraIcon size={13} color={colors.white} />
              </View>
            )}
            {isPremium ? (
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumText}>PREMIUM</Text>
              </View>
            ) : null}
          </TouchableOpacity>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{user?.full_name || 'Foydalanuvchi'}</Text>
            <Text style={styles.phone}>{user?.phone || ''}</Text>
            <Text style={styles.centerInfo}>{user?.center_name || 'Olympy platformasi'}</Text>
          </View>
          <TouchableOpacity activeOpacity={0.7} onPress={confirmLogout}>
            <ProfileBadgeIcon size={18} />
          </TouchableOpacity>
        </View>

        {isStudent ? (
          <View style={styles.statsGrid}>
            <Card radius={14} style={styles.statCell}>
              <Text style={styles.statValue}>{stats.average_score ?? 0}</Text>
              <Text style={styles.statLabel}>O'rtacha</Text>
            </Card>
            <Card radius={14} style={styles.statCell}>
              <Text style={styles.statValue}>{stats.best_rank ? `#${stats.best_rank}` : '—'}</Text>
              <Text style={styles.statLabel}>Reyting</Text>
            </Card>
            <Card radius={14} style={styles.statCell}>
              <Text style={[styles.statValue, { color: colors.orange }]}>{streak.streak_count ?? 0}</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </Card>
            <TouchableOpacity activeOpacity={0.85} style={styles.statTouch} onPress={() => navigation.navigate('Shop')}>
              <Card radius={14} style={[styles.statCell, { flex: 1 }]}>
                <Text style={[styles.statValue, { color: colors.gold }]}>{coins.toLocaleString('uz-UZ')}</Text>
                <Text style={styles.statLabel}>Coin</Text>
              </Card>
            </TouchableOpacity>
          </View>
        ) : null}

        {isStudent ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabs}
            contentContainerStyle={styles.tabsRow}
          >
            {TABS.map((t) => (
              <Chip key={t} label={t} active={tab === t} onPress={() => setTab(t)} />
            ))}
          </ScrollView>
        ) : null}

        {tab === 'Olimpiadalar' ? (
          participated.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>Hali olimpiadada qatnashmagansiz</Text>
            </Card>
          ) : (
            <View style={styles.certList}>
              {participated.map((o, i) => {
                const st = OLY_STATUS[o.status] || OLY_STATUS.finished;
                return (
                  <Card key={o.id || i} style={styles.certCard}>
                    <IconBox size={40} radius={12} background={tints.blue13}>
                      <CalendarIcon size={19} color={colors.blue} strokeWidth={2} />
                    </IconBox>
                    <View style={styles.certText}>
                      <Text style={styles.certTitle} numberOfLines={1}>{o.title}</Text>
                      <View style={styles.olyMeta}>
                        {o.subject ? <Text style={styles.certSub}>{o.subject}</Text> : null}
                        <Badge label={st.label} color={st.color} background={st.bg} size={9.5} style={styles.olyBadge} />
                      </View>
                    </View>
                    <View style={styles.olyScoreBox}>
                      <Text style={styles.olyScore}>{o.score ?? '—'}</Text>
                      <Text style={styles.olyScoreLabel}>{o.rank ? `#${o.rank}` : 'ball'}</Text>
                    </View>
                  </Card>
                );
              })}
            </View>
          )
        ) : tab === 'Sozlamalar' ? (
          <View style={styles.settingsList}>
            <Card style={styles.themeCard}>
              <Text style={styles.settingText}>Ko'rinish rejimi</Text>
              <SegmentedControl
                segments={THEME_LABELS}
                activeIndex={THEME_OPTIONS.indexOf(mode)}
                onChange={(i) => setThemeMode(THEME_OPTIONS[i])}
                style={styles.themeSegmented}
              />
            </Card>
            {isStudent && !isPremium ? (
              <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('Premium')}>
                <Card style={styles.settingRow}>
                  <Text style={styles.settingText}>Premiumga o'tish</Text>
                  <Text style={styles.settingArrow}>›</Text>
                </Card>
              </TouchableOpacity>
            ) : null}
            {isStudent ? (
              <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('JoinCenter')}>
                <Card style={styles.settingRow}>
                  <Text style={styles.settingText}>Boshqa markazga qo'shilish</Text>
                  <Text style={styles.settingArrow}>›</Text>
                </Card>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('ChangePassword')}>
              <Card style={styles.settingRow}>
                <Text style={styles.settingText}>Parolni o'zgartirish</Text>
                <Text style={styles.settingArrow}>›</Text>
              </Card>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('TwoFactor')}>
              <Card style={styles.settingRow}>
                <Text style={styles.settingText}>Ikki bosqichli tasdiqlash</Text>
                <View style={styles.settingRight}>
                  <Text style={[styles.twoFAStatus, twoFAEnabled ? styles.twoFAOn : styles.twoFAOff]}>
                    {twoFAEnabled ? 'Yoqilgan' : "O'chiq"}
                  </Text>
                  <Text style={styles.settingArrow}>›</Text>
                </View>
              </Card>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} disabled={telegramLinked || telegramLinking} onPress={linkTelegram}>
              <Card style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <TelegramIcon size={16} color={colors.blueLight} />
                  <Text style={styles.settingText}>Telegram</Text>
                </View>
                <View style={styles.settingRight}>
                  <Text style={[styles.twoFAStatus, telegramLinked ? styles.twoFAOn : styles.twoFAOff]}>
                    {telegramLinked ? 'Ulangan' : telegramLinking ? 'Kutilmoqda…' : 'Ulanmagan'}
                  </Text>
                  {!telegramLinked ? <Text style={styles.settingArrow}>›</Text> : null}
                </View>
              </Card>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} onPress={openPrivacy}>
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
              <Card style={[styles.settingRow, styles.deleteRow]}>
                <Text style={[styles.settingText, { color: colors.red }]}>Hisobni o'chirish</Text>
                <Text style={styles.deleteHint}>Butunlay o'chiriladi</Text>
              </Card>
            </TouchableOpacity>
          </View>
        ) : results.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Hali natija/sertifikat yo'q</Text>
          </Card>
        ) : (
          <View style={styles.certList}>
            {results.map((r, i) => (
              <Card key={r.id} style={styles.certCard}>
                <IconBox size={40} radius={12} background={CERT_TINTS[i % CERT_TINTS.length]}>
                  <MedalIcon size={19} color={CERT_COLORS[i % CERT_COLORS.length]} />
                </IconBox>
                <View style={styles.certText}>
                  <Text style={styles.certTitle} numberOfLines={1}>
                    {r.olympiad_title || r.olympiad?.title || 'Tadbir'}
                  </Text>
                  <Text style={styles.certSub}>{r.score} ball · {r.correct_count}/{r.total_questions} to'g'ri</Text>
                </View>
                <TouchableOpacity activeOpacity={0.7} style={styles.downloadBox} onPress={() => downloadCert(r)} disabled={certLoading}>
                  <DownloadIcon size={15} />
                </TouchableOpacity>
              </Card>
            ))}
          </View>
        )}

        {isStudent && data?.referral ? (
          <ReferralSection referral={data.referral} onUsed={refresh} styles={styles} colors={colors} />
        ) : null}

        {isStudent ? (
          <>
            <Text style={styles.sectionTitle}>Yutuqlar</Text>
            <View style={styles.achievements}>
              <View style={styles.achievement}>
                <View style={[styles.achCircle, streak.streak_count >= 7 ? { backgroundColor: tints.orange13, borderColor: tints.orangeBorder40 } : styles.achLocked]}>
                  <FlameIcon size={22} color={streak.streak_count >= 7 ? colors.orange : colors.textMuted} />
                </View>
                <Text style={styles.achLabel}>7 kun streak</Text>
              </View>
              <View style={styles.achievement}>
                <View style={[styles.achCircle, stats.best_rank && stats.best_rank <= 20 ? { backgroundColor: tints.blue13, borderColor: tints.blueBorder30 } : styles.achLocked]}>
                  <StarIcon size={22} color={stats.best_rank && stats.best_rank <= 20 ? colors.blue : colors.textMuted} />
                </View>
                <Text style={styles.achLabel}>Top 20</Text>
              </View>
              <View style={styles.achievement}>
                <View style={[styles.achCircle, (stats.average_score || 0) >= 90 ? { backgroundColor: tints.green13, borderColor: tints.greenBorder40 } : styles.achLocked]}>
                  <CheckIcon size={22} color={(stats.average_score || 0) >= 90 ? colors.greenLight : colors.textMuted} />
                </View>
                <Text style={styles.achLabel}>90%+ natija</Text>
              </View>
              <View style={styles.achievement}>
                <View style={[styles.achCircle, (stats.total_attempts || 0) >= 50 ? { backgroundColor: tints.purple16, borderColor: tints.purpleBorder35 } : styles.achLocked]}>
                  <LockIcon size={20} color={(stats.total_attempts || 0) >= 50 ? colors.purple : colors.textMuted} />
                </View>
                <Text style={[styles.achLabel, (stats.total_attempts || 0) >= 50 ? null : { color: colors.textMuted }]}>50 tadbir</Text>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>

      {certLoading ? (
        <View style={styles.certOverlay} pointerEvents="auto">
          <ActivityIndicator color={colors.white} size="large" />
        </View>
      ) : null}

      <Modal visible={!!certImage} transparent animationType="fade" onRequestClose={() => setCertImage(null)}>
        <View style={styles.certModalWrap}>
          <View style={styles.certModalCard}>
            {certImage ? (
              <Image source={{ uri: certImage }} style={styles.certImage} resizeMode="contain" />
            ) : null}
            <Text style={styles.certHint}>Sertifikatni saqlash uchun ekran suratini oling</Text>
            <Button
              title="Yopish"
              variant="dark"
              height={46}
              radius={12}
              fontSize={14}
              style={styles.certCloseBtn}
              onPress={() => setCertImage(null)}
            />
          </View>
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
    paddingBottom: 22,
  },
  profileCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    backgroundColor: colors.surface,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profilePremium: {
    borderColor: tints.goldBorder30,
  },
  premiumGlow: {
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  premiumBadge: {
    position: 'absolute',
    bottom: -4,
    alignSelf: 'center',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: colors.gold,
  },
  avatarCamBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.blue,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumText: {
    fontSize: 8.5,
    fontFamily: FONTS.extrabold,
    color: colors.goldText,
    letterSpacing: 0.5,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  phone: {
    fontSize: 12,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 2,
  },
  centerInfo: {
    fontSize: 11.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  statTouch: {
    flex: 1,
  },
  statCell: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  statLabel: {
    fontSize: 9.5,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
  },
  tabs: {
    marginTop: 18,
    flexGrow: 0,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 7,
    paddingRight: 4,
  },
  themeCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  themeSegmented: {
    marginTop: 2,
  },
  settingsList: {
    gap: 8,
    marginTop: 12,
  },
  settingRow: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingText: {
    fontSize: 14,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  settingArrow: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: colors.textMuted,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  twoFAStatus: {
    fontSize: 11.5,
    fontFamily: FONTS.extrabold,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 8,
    overflow: 'hidden',
  },
  twoFAOn: {
    color: colors.greenLight,
    backgroundColor: tints.green13,
  },
  twoFAOff: {
    color: colors.textMuted,
    backgroundColor: colors.surfaceDeep,
  },
  deleteRow: {
    borderColor: tints.redBorder35,
  },
  deleteHint: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: colors.textMuted,
  },
  certOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  certModalWrap: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  certModalCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
  },
  certImage: {
    width: '100%',
    height: 240,
    borderRadius: 10,
    backgroundColor: colors.surfaceDeep,
  },
  certHint: {
    fontSize: 12,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  certCloseBtn: {
    marginTop: 14,
  },
  certList: {
    gap: 8,
    marginTop: 12,
  },
  certCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  certText: {
    flex: 1,
  },
  certTitle: {
    fontSize: 13.5,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  certSub: {
    fontSize: 11,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
  },
  olyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 3,
  },
  olyBadge: {
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 6,
  },
  olyScoreBox: {
    alignItems: 'center',
  },
  olyScore: {
    fontSize: 16,
    fontFamily: FONTS.extrabold,
    color: colors.blue,
  },
  olyScoreLabel: {
    fontSize: 9.5,
    fontFamily: FONTS.bold,
    color: colors.textMuted,
  },
  downloadBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.surfaceDeep,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    marginTop: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    marginTop: 22,
    marginBottom: 10,
  },
  referralCard: {
    padding: 16,
  },
  referralDesc: {
    fontSize: 12.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  referralCodeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  referralCodeBox: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  referralCode: {
    fontSize: 18,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    letterSpacing: 3,
  },
  referralShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.blue,
  },
  referralShareText: {
    fontSize: 13.5,
    fontFamily: FONTS.extrabold,
    color: colors.white,
  },
  referralStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  referralStatText: {
    fontSize: 12,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
  },
  referralStatStrong: {
    fontFamily: FONTS.extrabold,
    color: colors.gold,
  },
  referralDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  referralInputLabel: {
    fontSize: 11,
    fontFamily: FONTS.extrabold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  referralInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  referralInput: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bg,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: colors.text,
    letterSpacing: 1.5,
  },
  referralSubmitBtn: {
    paddingHorizontal: 18,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 104,
  },
  referralSubmitDisabled: {
    opacity: 0.5,
  },
  referralSubmitText: {
    fontSize: 13.5,
    fontFamily: FONTS.extrabold,
    color: colors.white,
  },
  referralMsg: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    marginTop: 10,
    lineHeight: 17,
  },
  referralMsgOk: {
    color: colors.greenLight,
  },
  referralMsgErr: {
    color: colors.redSoftText,
  },
  achievements: {
    flexDirection: 'row',
    gap: 10,
  },
  achievement: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  achCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achLocked: {
    backgroundColor: colors.surfaceDeep,
    borderColor: colors.borderStrong,
  },
  achLabel: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: colors.textBody,
    textAlign: 'center',
  },
});
