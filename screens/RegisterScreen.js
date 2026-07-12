import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Button from '../components/Button';
import Chip from '../components/Chip';
import SelectModal from '../components/SelectModal';
import { BackIcon, ChevronDownIcon, TelegramIcon, EyeIcon } from '../components/icons/Icons';
import { authApi } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { routeForUser } from '../services/roles';
import { UZBEKISTAN_REGIONS, UZBEKISTAN_DISTRICTS } from '../constants/uzbekistanDistricts';

const ORGANIZATION_TYPES = ["O'quv markaz", 'Maktab', 'Universitet/Kollej', 'Tashkilot', 'Online academy', 'Boshqa'];

export default function RegisterScreen({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const { register, registerOrganization } = useAuth();
  const [registrationType, setRegistrationType] = useState('student'); // 'student' | 'organization'
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1);
  // Tashkilot (step 3) maydonlari.
  const [centerName, setCenterName] = useState('');
  const [orgType, setOrgType] = useState(ORGANIZATION_TYPES[0]);
  const [region, setRegion] = useState('');
  const [district, setDistrict] = useState('');
  const [openPicker, setOpenPicker] = useState(null); // 'orgType' | 'region' | 'district'
  const [deepLink, setDeepLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // OTP kod kiritish (verifyOtp endpoint): 6 xonali, avtomatik keyingi maydon.
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const otpRefs = useRef([]);

  const fullPhone = () =>
    phone.trim().startsWith('+') ? phone.trim() : `+998${phone.replace(/\D/g, '')}`;

  // "Qayta yuborish" countdown'i (60 → 0).
  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const startVerification = async () => {
    if (!fullName.trim() || phone.replace(/\D/g, '').length < 9 || password.length < 8) {
      setError("Ism, telefon (to'liq) va kamida 8 belgili parol kiriting");
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await authApi.startTelegramVerification(fullPhone());
      setDeepLink(data.telegram_deep_link || '');
      setOtp(['', '', '', '', '', '']);
      setOtpVerified(false);
      setResendIn(60);
      setStep(2);
    } catch (e) {
      setError(
        e.response?.data?.detail ||
          e.response?.data?.phone?.[0] ||
          "Tasdiqlashni boshlashda xatolik — telefon raqamni tekshiring"
      );
    } finally {
      setLoading(false);
    }
  };

  const setOtpDigit = (i, val) => {
    const digit = (val || '').replace(/\D/g, '').slice(-1);
    setOtp((prev) => {
      const next = [...prev];
      next[i] = digit;
      return next;
    });
    setOtpVerified(false);
    if (digit && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const onOtpKey = (i, e) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
    }
  };

  const resendCode = async () => {
    if (resendIn > 0 || loading || otpVerifying) return;
    setError('');
    try {
      const { data } = await authApi.startTelegramVerification(fullPhone());
      setDeepLink(data.telegram_deep_link || '');
      setOtp(['', '', '', '', '', '']);
      setOtpVerified(false);
      setResendIn(60);
    } catch (e) {
      setError(e.response?.data?.detail || "Kodni qayta yuborib bo'lmadi. Keyinroq urinib ko'ring.");
    }
  };

  // Step 2 tasdiqlash: agar 6 xonali kod kiritilgan bo'lsa — avval verifyOtp,
  // so'ng ro'yxatdan o'tkazamiz. Kod kiritilmagan bo'lsa (bot kontakt-tasdiq
  // oqimi) — to'g'ridan-to'g'ri ro'yxatdan o'tishni yakunlaymiz (fallback).
  const submitStep2 = async () => {
    const code = otp.join('');
    if (code.length === 6 && !otpVerified) {
      setOtpVerifying(true);
      setError('');
      try {
        await authApi.verifyOtp(fullPhone(), code);
        setOtpVerified(true);
        setOtpVerifying(false);
        await afterVerify();
      } catch (e) {
        setOtpVerifying(false);
        setError(e.response?.data?.detail || "Kod noto'g'ri yoki muddati o'tgan. Qayta urinib ko'ring.");
      }
      return;
    }
    afterVerify();
  };

  // Telefon tasdiqlangach: o'quvchi to'g'ridan-to'g'ri ro'yxatdan o'tadi;
  // tashkilot uchun avval markaz ma'lumotlarini yig'amiz (step 3).
  const afterVerify = async () => {
    if (registrationType === 'organization') {
      setError('');
      setStep(3);
      return;
    }
    await finishRegister();
  };

  const finishRegister = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await register({
        full_name: fullName.trim(),
        phone: fullPhone(),
        password,
        role: 'student',
        // Ixtiyoriy taklif kodi — do'st bergan bo'lsa, backend ro'yxatdan
        // o'tishda ikkala tarafga ham bonus coin beradi (referral_code).
        ...(referralCode.trim() ? { referral_code: referralCode.trim().toUpperCase() } : {}),
      });
      navigation.reset({ index: 0, routes: [{ name: routeForUser(result.user) }] });
    } catch (e) {
      setError(
        e.response?.data?.detail ||
          "Ro'yxatdan o'tishda xatolik. Telegram botda telefonni tasdiqlaganingizga ishonch hosil qiling."
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 3 — tashkilot/markaz ma'lumotlarini yig'ib, direktor hisobi bilan
  // birga backendga yuboramiz. Muvaffaqiyat/xatolikni finishRegister kabi
  // qayta ishlaymiz, faqat endpoint va payload boshqacha.
  const finishOrganization = async () => {
    if (!centerName.trim() || !region || !district) {
      setError("Markaz nomi, viloyat va tumanni to'ldiring");
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await registerOrganization({
        full_name: fullName.trim(),
        phone: fullPhone(),
        password,
        ...(referralCode.trim() ? { referral_code: referralCode.trim().toUpperCase() } : {}),
        center: {
          name: centerName.trim(),
          organization_type: orgType,
          country: "O'zbekiston",
          region,
          district,
          city: district || region,
          subjects: [],
        },
      });
      navigation.reset({ index: 0, routes: [{ name: routeForUser(result.user) }] });
    } catch (e) {
      setError(
        e.response?.data?.detail ||
          "Ro'yxatdan o'tishda xatolik. Telegram botda telefonni tasdiqlaganingizga ishonch hosil qiling."
      );
    } finally {
      setLoading(false);
    }
  };

  const isOrg = registrationType === 'organization';
  const totalSteps = isOrg ? 4 : 3;
  const districtOptions = region ? UZBEKISTAN_DISTRICTS[region] || [] : [];

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => (step > 1 ? setStep(step - 1) : navigation.goBack())}
            style={styles.backBtn}
          >
            <BackIcon size={16} />
          </TouchableOpacity>
          <View style={styles.stepsRow}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <View
                key={i}
                style={[styles.step, { backgroundColor: step >= i + 1 ? colors.blue : colors.barIdle }]}
              />
            ))}
          </View>
          <Text style={styles.stepText}>{step}/{totalSteps}</Text>
        </View>
        <Text style={styles.title}>
          {step === 3 ? "Tashkilot ma'lumotlari" : "Ma'lumotlaringiz"}
        </Text>
        <Text style={styles.subtitle}>
          {step === 3
            ? "Markazingiz Platform Admin tasdiqlagach faollashadi"
            : 'Telefon raqamingizni Telegram orqali tasdiqlang'}
        </Text>

        {step === 1 ? (
          <View style={styles.modeRow}>
            <Chip
              label="O'quvchi"
              active={registrationType === 'student'}
              radius={12}
              style={styles.modeChip}
              onPress={() => setRegistrationType('student')}
            />
            <Chip
              label="Ta'lim markazi"
              active={registrationType === 'organization'}
              radius={12}
              style={styles.modeChip}
              onPress={() => setRegistrationType('organization')}
            />
          </View>
        ) : null}

        {step !== 3 ? (
          <>
        <Text style={styles.fieldLabel}>{isOrg ? "MAS'UL SHAXS ISMI" : "TO'LIQ ISM"}</Text>
        <TextInput
          style={styles.inputText}
          placeholder="Ismingiz va familiyangiz"
          placeholderTextColor={colors.textMuted}
          value={fullName}
          onChangeText={setFullName}
          editable={step === 1}
        />

        <Text style={styles.fieldLabel}>TELEFON RAQAM</Text>
        <View style={styles.phoneRow}>
          <View style={styles.codeInput}>
            <Text style={styles.codeText}>+998 </Text>
            <ChevronDownIcon size={10} />
          </View>
          <TextInput
            style={[styles.inputText, { flex: 1 }]}
            placeholder="90 123 45 67"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            editable={step === 1}
          />
        </View>

        <Text style={styles.fieldLabel}>PAROL</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Kamida 8 belgi"
            placeholderTextColor={colors.textMuted}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            editable={step === 1}
          />
          <TouchableOpacity activeOpacity={0.7} onPress={() => setShowPassword((v) => !v)}>
            <EyeIcon size={20} color={showPassword ? colors.blue : colors.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.fieldLabel}>TAKLIF KODI (IXTIYORIY)</Text>
        <TextInput
          style={styles.inputText}
          placeholder="Do'st bergan kod (bo'lmasa — bo'sh qoldiring)"
          placeholderTextColor={colors.textMuted}
          value={referralCode}
          onChangeText={(t) => setReferralCode(t.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={12}
          editable={step === 1}
        />
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Text style={styles.fieldLabel}>MARKAZ NOMI</Text>
            <TextInput
              style={styles.inputText}
              placeholder="Masalan: Smart Education"
              placeholderTextColor={colors.textMuted}
              value={centerName}
              onChangeText={setCenterName}
            />

            <Text style={styles.fieldLabel}>TASHKILOT TURI</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.selectField}
              onPress={() => setOpenPicker('orgType')}
            >
              <Text style={styles.selectValue}>{orgType}</Text>
              <ChevronDownIcon size={12} />
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>VILOYAT</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.selectField}
              onPress={() => setOpenPicker('region')}
            >
              <Text style={region ? styles.selectValue : styles.selectPlaceholder}>
                {region || 'Viloyatni tanlang'}
              </Text>
              <ChevronDownIcon size={12} />
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>TUMAN / SHAHAR</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.selectField, region ? null : styles.selectFieldDisabled]}
              onPress={() => region && setOpenPicker('district')}
              disabled={!region}
            >
              <Text style={district ? styles.selectValue : styles.selectPlaceholder}>
                {district || (region ? 'Tumanni tanlang' : 'Avval viloyatni tanlang')}
              </Text>
              <ChevronDownIcon size={12} />
            </TouchableOpacity>
          </>
        ) : null}

        {step === 2 ? (
          <View style={styles.otpCard}>
            <View style={styles.otpHeader}>
              <View style={styles.tgIcon}>
                <TelegramIcon size={20} />
              </View>
              <Text style={styles.otpInfo}>
                Telegram botni oching va tasdiqlang — bot 6 xonali kod yuboradi
              </Text>
            </View>
            <Button
              title="Telegram botni ochish"
              height={44}
              radius={11}
              fontSize={13.5}
              style={styles.botBtn}
              onPress={() => deepLink && Linking.openURL(deepLink)}
            />

            <Text style={styles.otpFieldLabel}>TASDIQLASH KODI</Text>
            <View style={styles.otpRow}>
              {otp.map((d, i) => (
                <TextInput
                  key={i}
                  ref={(el) => (otpRefs.current[i] = el)}
                  style={[styles.otpBox, d ? styles.otpBoxFilled : null]}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={d}
                  onChangeText={(v) => setOtpDigit(i, v)}
                  onKeyPress={(e) => onOtpKey(i, e)}
                  textAlign="center"
                  returnKeyType="done"
                />
              ))}
            </View>

            <View style={styles.resendRow}>
              <Text style={styles.otpHint}>Kod kelmadimi?</Text>
              <TouchableOpacity onPress={resendCode} disabled={resendIn > 0} activeOpacity={0.7}>
                <Text style={[styles.resendLink, resendIn > 0 ? styles.resendDisabled : null]}>
                  {resendIn > 0 ? `Qayta yuborish (${resendIn}s)` : 'Qayta yuborish'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.otpHint}>
              Bot kod yubormasa, tasdiqlaganingizdan so'ng pastdagi tugmani bosing.
            </Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={step === 1 ? startVerification : step === 2 ? submitStep2 : finishOrganization}
          disabled={loading || otpVerifying}
          style={[styles.submit, loading || otpVerifying ? { opacity: 0.7 } : null]}
        >
          {loading || otpVerifying ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitText}>
              {step === 1
                ? 'Tasdiqlash kodini olish'
                : step === 2 && isOrg
                ? 'Davom etish'
                : "Ro'yxatdan o'tishni yakunlash"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginLink}>
            Hisobingiz bormi? <Text style={styles.loginLinkBold}>Kirish</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <SelectModal
        visible={openPicker === 'orgType'}
        title="Tashkilot turi"
        options={ORGANIZATION_TYPES}
        selected={orgType}
        onSelect={(v) => {
          setOrgType(v);
          setOpenPicker(null);
        }}
        onClose={() => setOpenPicker(null)}
      />
      <SelectModal
        visible={openPicker === 'region'}
        title="Viloyatni tanlang"
        options={UZBEKISTAN_REGIONS}
        selected={region}
        onSelect={(v) => {
          setRegion(v);
          setDistrict('');
          setOpenPicker(null);
        }}
        onClose={() => setOpenPicker(null)}
      />
      <SelectModal
        visible={openPicker === 'district'}
        title="Tumanni tanlang"
        options={districtOptions}
        selected={district}
        onSelect={(v) => {
          setDistrict(v);
          setOpenPicker(null);
        }}
        onClose={() => setOpenPicker(null)}
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors, tints) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingTop: 20,
    paddingHorizontal: 22,
    paddingBottom: 40,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  stepsRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  step: {
    flex: 1,
    height: 5,
    borderRadius: 3,
  },
  stepText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: colors.textMuted,
  },
  title: {
    fontSize: 23,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    marginTop: 22,
  },
  subtitle: {
    fontSize: 13.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 4,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
  modeChip: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 12,
    alignSelf: 'auto',
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: FONTS.extrabold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 7,
  },
  inputText: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 14,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: colors.text,
  },
  selectField: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 14,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  selectFieldDisabled: {
    opacity: 0.55,
  },
  selectValue: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: colors.text,
  },
  selectPlaceholder: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: colors.textMuted,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 8,
  },
  codeInput: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 14,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 6,
  },
  codeText: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: colors.text,
  },
  passwordRow: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 14,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 10,
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: colors.text,
    padding: 0,
  },
  otpCard: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 16,
    backgroundColor: colors.surface,
    padding: 16,
  },
  otpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tgIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.blueDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpInfo: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
    lineHeight: 18.85,
  },
  botBtn: {
    marginTop: 14,
  },
  otpFieldLabel: {
    fontSize: 11,
    fontFamily: FONTS.extrabold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 9,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  otpBox: {
    flex: 1,
    height: 52,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    backgroundColor: colors.bg,
    fontSize: 21,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    padding: 0,
  },
  otpBoxFilled: {
    borderWidth: 1.5,
    borderColor: colors.blue,
    backgroundColor: tints.blue08,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  resendLink: {
    fontSize: 12.5,
    fontFamily: FONTS.extrabold,
    color: colors.blueLight,
  },
  resendDisabled: {
    color: colors.textMuted,
  },
  otpHint: {
    fontSize: 11.5,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
    marginTop: 12,
    lineHeight: 16.5,
  },
  errorBox: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: tints.redBorder35,
    borderRadius: 12,
    backgroundColor: tints.red07,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  errorText: {
    fontSize: 12.5,
    fontFamily: FONTS.bold,
    color: colors.redSoftText,
    lineHeight: 18.1,
  },
  submit: {
    marginTop: 22,
    height: 54,
    borderRadius: 14,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.blue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },
  submitText: {
    fontSize: 16,
    fontFamily: FONTS.extrabold,
    color: colors.white,
  },
  loginLink: {
    textAlign: 'center',
    marginTop: 18,
    fontSize: 13,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
  },
  loginLinkBold: {
    fontFamily: FONTS.extrabold,
    color: colors.blueLight,
  },
});
