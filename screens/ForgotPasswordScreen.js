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
import { BackIcon, EyeIcon, OlympyLogo, TelegramIcon } from '../components/icons/Icons';
import { authApi } from '../services/api';

// Backend ba'zi detail xabarlarni inglizcha qaytaradi (OTP expired, ...) —
// foydalanuvchiga tushunarli o'zbekcha matnga o'giramiz. Allaqachon o'zbekcha
// bo'lgan xabarlar (OTP noto'g'ri, Foydalanuvchi topilmadi, ...) shundayligicha
// ko'rsatiladi.
const mapDetail = (detail, fallback) => {
  if (!detail) return fallback;
  const map = {
    'OTP expired': 'Kod muddati tugagan. Qaytadan kod yuboring.',
    'Too many attempts': "Juda ko'p urinish. Birozdan so'ng qayta urinib ko'ring.",
    'Verification not found': 'Kod topilmadi. Qaytadan kod yuboring.',
  };
  return map[detail] || detail;
};

export default function ForgotPasswordScreen({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [deepLink, setDeepLink] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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

  // Bosqich 1: telefonni yuborib, Telegram deep link olamiz va 2-bosqichga o'tamiz.
  const startReset = async () => {
    if (phone.replace(/\D/g, '').length < 9) {
      setError("To'liq telefon raqamni kiriting");
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await authApi.passwordResetStart(fullPhone());
      const link = data.telegram_deep_link || '';
      setDeepLink(link);
      setOtp(['', '', '', '', '', '']);
      setResendIn(60);
      setStep(2);
      if (link) Linking.openURL(link).catch(() => {});
    } catch (e) {
      setError(
        e.response?.data?.phone?.[0] ||
          mapDetail(e.response?.data?.detail, "Kod yuborishda xatolik — telefon raqamni tekshiring")
      );
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (resendIn > 0 || loading) return;
    setError('');
    try {
      const { data } = await authApi.passwordResetStart(fullPhone());
      const link = data.telegram_deep_link || '';
      setDeepLink(link);
      setOtp(['', '', '', '', '', '']);
      setResendIn(60);
      if (link) Linking.openURL(link).catch(() => {});
    } catch (e) {
      setError(
        mapDetail(e.response?.data?.detail, "Kodni qayta yuborib bo'lmadi. Keyinroq urinib ko'ring.")
      );
    }
  };

  const setOtpDigit = (i, val) => {
    const digit = (val || '').replace(/\D/g, '').slice(-1);
    setOtp((prev) => {
      const next = [...prev];
      next[i] = digit;
      return next;
    });
    if (digit && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const onOtpKey = (i, e) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
    }
  };

  // Bosqich 2: kod + yangi parolni tasdiqlab, parolni yangilaymiz.
  const submitReset = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      setError("Telegram bot yuborgan 6 xonali kodni kiriting");
      return;
    }
    if (password.length < 8) {
      setError("Yangi parol kamida 8 belgidan iborat bo'lishi kerak");
      return;
    }
    if (password !== confirm) {
      setError('Yangi parol va tasdiq mos kelmadi');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authApi.passwordResetConfirm(fullPhone(), code, password);
      // Muvaffaqiyat — Login ekraniga qaytamiz, u yerda yashil xabar chiqadi.
      navigation.navigate('Login', { resetSuccess: true });
    } catch (e) {
      setError(
        e.response?.data?.password?.[0] ||
          e.response?.data?.otp?.[0] ||
          mapDetail(e.response?.data?.detail, "Parolni yangilab bo'lmadi. Kodni tekshirib qayta urinib ko'ring.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => (step === 2 ? setStep(1) : navigation.goBack())}
          style={styles.backBtn}
        >
          <BackIcon size={16} />
        </TouchableOpacity>

        <View style={styles.logoRow}>
          <OlympyLogo size={40} />
          <Text style={styles.title}>{step === 1 ? 'Parolni tiklash' : 'Yangi parol'}</Text>
        </View>
        <Text style={styles.subtitle}>
          {step === 1
            ? 'Telefon raqamingizni kiriting — Telegram orqali tasdiqlash kodi yuboramiz'
            : 'Telegram botdagi 6 xonali kodni va yangi parolingizni kiriting'}
        </Text>

        <Text style={styles.fieldLabel}>TELEFON RAQAM</Text>
        <View style={styles.phoneRow}>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>+998</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="90 123 45 67"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            editable={step === 1}
          />
        </View>

        {step === 2 ? (
          <>
            <View style={styles.otpCard}>
              <View style={styles.otpHeader}>
                <View style={styles.tgIcon}>
                  <TelegramIcon size={20} />
                </View>
                <Text style={styles.otpInfo}>
                  Telegram botni oching — bot parolni tiklash uchun 6 xonali kod yuboradi
                </Text>
              </View>
              <Button
                title="Telegram botni ochish"
                height={44}
                radius={11}
                fontSize={13.5}
                style={styles.botBtn}
                disabled={!deepLink}
                onPress={() => deepLink && Linking.openURL(deepLink).catch(() => {})}
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
            </View>

            <Text style={styles.fieldLabel}>YANGI PAROL</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Kamida 8 belgi"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity activeOpacity={0.7} onPress={() => setShowPassword((v) => !v)}>
                <EyeIcon size={20} color={showPassword ? colors.blue : colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>YANGI PAROLNI TASDIQLANG</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Yangi parolni qayta kiriting"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                value={confirm}
                onChangeText={setConfirm}
              />
            </View>
          </>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={step === 1 ? startReset : submitReset}
          disabled={loading}
          style={[styles.submitBtn, loading ? { opacity: 0.7 } : null]}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitText}>
              {step === 1 ? 'Tasdiqlash kodini olish' : 'Parolni yangilash'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginLink}>
            Parolingiz esingizdami? <Text style={styles.loginLinkBold}>Kirish</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 26,
  },
  title: {
    fontSize: 23,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  subtitle: {
    fontSize: 13.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: FONTS.extrabold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 7,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 8,
  },
  codeBox: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  codeText: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: colors.text,
  },
  input: {
    flex: 1,
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
    lineHeight: 16.5,
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
  submitBtn: {
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
