import React, { useState, useRef } from 'react';
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
import Badge from '../components/Badge';
import { BackIcon, LockIcon, CheckIcon } from '../components/icons/Icons';
import { authApi } from '../services/api';
import { useAuth } from '../services/AuthContext';

// Backend detail xabarlari asosan o'zbekcha keladi ("Noto'g'ri kod",
// "Avval 2FA sozlang", ...) — throttle (429) holatini alohida o'zbekchaga
// o'giramiz.
const mapError = (e, fallback) => {
  if (e?.response?.status === 429) {
    return "Juda ko'p urinish. Bir daqiqadan so'ng qayta urinib ko'ring.";
  }
  return e?.response?.data?.detail || fallback;
};

export default function TwoFactorScreen({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const { user, reloadMe } = useAuth();
  const enabled = !!(user?.totp_enabled);

  // Yoqish oqimi: setup → {uri, secret}, so'ng 6 xonali kod bilan tasdiqlash.
  const [secret, setSecret] = useState('');
  const [uri, setUri] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);
  // O'chirish — backend joriy TOTP kodi yoki parolni talab qiladi.
  const [disableMode, setDisableMode] = useState(false);
  const [disableValue, setDisableValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // OTP grid — ForgotPasswordScreen'dagi bilan bir xil naqsh (avto-o'tish +
  // Backspace bilan orqaga qaytish).
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

  const startSetup = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await authApi.twoFactorSetup();
      setSecret(data?.secret || '');
      setUri(data?.uri || '');
      setOtp(['', '', '', '', '', '']);
    } catch (e) {
      setError(mapError(e, "2FA sozlab bo'lmadi. Qayta urinib ko'ring."));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (busy) return;
    const code = otp.join('');
    if (code.length !== 6) {
      setError("To'liq 6 raqamli kodni kiriting");
      return;
    }
    setBusy(true);
    setError('');
    try {
      await authApi.twoFactorVerify(code);
      // Holatni yangilaymiz — reloadMe orqali user.totp_enabled true bo'ladi.
      await reloadMe().catch(() => {});
      setSecret('');
      setUri('');
      setOtp(['', '', '', '', '', '']);
      setSuccess('Ikki bosqichli himoya yoqildi');
    } catch (e) {
      setError(mapError(e, "Noto'g'ri kod. Autentifikator ilovadagi joriy kodni kiriting."));
    } finally {
      setBusy(false);
    }
  };

  const cancelSetup = () => {
    setSecret('');
    setUri('');
    setOtp(['', '', '', '', '', '']);
    setError('');
  };

  const disable = async () => {
    if (busy) return;
    const value = disableValue.trim();
    if (!value) {
      setError('Joriy 6 raqamli kod yoki parolingizni kiriting');
      return;
    }
    // Faqat raqamlardan iborat va 6 ta bo'lsa — TOTP kodi; aks holda parol.
    const isCode = /^\d{6}$/.test(value);
    const credentials = isCode ? { totp_code: value } : { password: value };
    setBusy(true);
    setError('');
    try {
      await authApi.twoFactorDisable(credentials);
      await reloadMe().catch(() => {});
      setDisableMode(false);
      setDisableValue('');
      setSuccess("Ikki bosqichli himoya o'chirildi");
    } catch (e) {
      setError(mapError(e, "O'chirib bo'lmadi. Joriy kod yoki parolni tekshiring."));
    } finally {
      setBusy(false);
    }
  };

  const openAuthenticator = () => {
    if (uri) Linking.openURL(uri).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()} style={styles.backBtn}>
          <BackIcon size={16} />
        </TouchableOpacity>

        <Text style={styles.title}>Ikki bosqichli tasdiqlash</Text>
        <Text style={styles.subtitle}>
          Hisobingizni autentifikator ilovasi bilan qo'shimcha himoyalang — kirishda
          parol bilan birga bir martalik kod so'raladi.
        </Text>

        {/* Holat kartasi */}
        <View style={styles.statusCard}>
          <View style={[styles.statusIcon, enabled ? styles.statusIconOn : styles.statusIconOff]}>
            <LockIcon size={18} color={enabled ? colors.green : colors.textMuted} strokeWidth={2} />
          </View>
          <View style={styles.statusText}>
            <Text style={styles.statusTitle}>Holat</Text>
            <Text style={styles.statusHint}>
              {enabled ? 'Hisobingiz 2FA bilan himoyalangan' : "2FA hozircha o'chiq"}
            </Text>
          </View>
          <Badge
            label={enabled ? 'Yoqilgan' : "O'chiq"}
            color={enabled ? colors.green : colors.textMuted}
            background={enabled ? tints.green13 : colors.surfaceDeep}
            size={11}
            style={styles.statusBadge}
          />
        </View>

        {/* ── Yoqilgan: o'chirish oqimi ─────────────────────────────────── */}
        {enabled && !disableMode ? (
          <>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Kirishda autentifikator ilovangiz bergan 6 raqamli kodni kiritishingiz
                kerak bo'ladi. Ilovani almashtirsangiz yoki telefoningizni yo'qotsangiz,
                2FA'ni o'chirib qayta yoqing.
              </Text>
            </View>
            <Button
              title="2FA'ni o'chirish"
              variant="danger"
              height={54}
              radius={14}
              fontSize={16}
              style={styles.actionBtn}
              onPress={() => { setDisableMode(true); setError(''); setSuccess(''); }}
            />
          </>
        ) : null}

        {enabled && disableMode ? (
          <>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Xavfsizlik uchun o'chirishdan oldin autentifikator ilovangiz bergan
                joriy 6 raqamli kodni yoki hisobingiz parolini kiriting.
              </Text>
            </View>
            <Text style={styles.fieldLabel}>JORIY KOD YOKI PAROL</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="123456 yoki parolingiz"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
                value={disableValue}
                onChangeText={setDisableValue}
              />
            </View>
            <Button
              title={busy ? "O'chirilmoqda…" : "O'chirishni tasdiqlash"}
              variant="danger"
              height={54}
              radius={14}
              fontSize={16}
              style={styles.actionBtn}
              disabled={busy || !disableValue.trim()}
              onPress={disable}
            />
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.cancelBtn}
              disabled={busy}
              onPress={() => { setDisableMode(false); setDisableValue(''); setError(''); }}
            >
              <Text style={styles.cancelText}>Bekor qilish</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {/* ── O'chiq: yoqish oqimi ──────────────────────────────────────── */}
        {!enabled && !secret ? (
          <>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Google Authenticator, Authy yoki shunga o'xshash ilovani telefoningizga
                o'rnating. "2FA yoqish" tugmasini bosing — sizga maxfiy kalit beriladi.
              </Text>
            </View>
            <Button
              title={busy ? 'Tayyorlanmoqda…' : '2FA yoqish'}
              variant="primary"
              height={54}
              radius={14}
              fontSize={16}
              shadow
              style={styles.actionBtn}
              disabled={busy}
              onPress={startSetup}
            />
          </>
        ) : null}

        {!enabled && secret ? (
          <>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Autentifikator ilovangizga quyidagi maxfiy kalitni qo'shing, so'ng ilova
                bergan 6 raqamli kodni kiritib tasdiqlang.
              </Text>
            </View>

            <Text style={styles.fieldLabel}>MAXFIY KALIT</Text>
            <View style={styles.secretBox}>
              <Text style={styles.secretText} selectable>{secret}</Text>
            </View>
            <Text style={styles.secretHint}>Kalitni bosib turib nusxalang</Text>
            {uri ? (
              <TouchableOpacity activeOpacity={0.7} onPress={openAuthenticator} style={styles.linkWrap}>
                <Text style={styles.linkText}>Autentifikator ilovasida ochish</Text>
              </TouchableOpacity>
            ) : null}

            <Text style={styles.fieldLabel}>TASDIQLASH KODI</Text>
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

            <Button
              title={busy ? 'Tekshirilmoqda…' : 'Tasdiqlash'}
              variant="primary"
              height={54}
              radius={14}
              fontSize={16}
              shadow
              style={styles.actionBtn}
              disabled={busy || otp.join('').length !== 6}
              onPress={verify}
            />
            <TouchableOpacity activeOpacity={0.7} style={styles.cancelBtn} disabled={busy} onPress={cancelSetup}>
              <Text style={styles.cancelText}>Bekor qilish</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {success ? (
          <View style={styles.successBox}>
            <CheckIcon size={14} color={colors.greenLight} strokeWidth={3} />
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}

        {busy ? <ActivityIndicator color={colors.blue} style={styles.spinner} /> : null}
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
    paddingTop: 12,
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
  title: {
    fontSize: 23,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    marginTop: 18,
  },
  subtitle: {
    fontSize: 13.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 6,
    lineHeight: 19.5,
  },
  statusCard: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconOn: {
    backgroundColor: tints.green13,
  },
  statusIconOff: {
    backgroundColor: colors.surfaceDeep,
  },
  statusText: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 14,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  statusHint: {
    fontSize: 11.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  infoBox: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surfaceDeep,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  infoText: {
    fontSize: 12.5,
    fontFamily: FONTS.semibold,
    color: colors.textBody,
    lineHeight: 18.5,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: FONTS.extrabold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
  },
  inputRow: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 14,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: colors.text,
    padding: 0,
  },
  secretBox: {
    borderWidth: 1,
    borderColor: tints.blueBorder30,
    borderRadius: 14,
    backgroundColor: tints.blue08,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  secretText: {
    fontSize: 16,
    fontFamily: FONTS.extrabold,
    color: colors.blueSoftText,
    letterSpacing: 2,
    textAlign: 'center',
  },
  secretHint: {
    fontSize: 11,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
    marginTop: 7,
    textAlign: 'center',
  },
  linkWrap: {
    alignSelf: 'center',
    marginTop: 12,
  },
  linkText: {
    fontSize: 12.5,
    fontFamily: FONTS.extrabold,
    color: colors.blueLight,
    textDecorationLine: 'underline',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  otpBox: {
    flex: 1,
    height: 54,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    backgroundColor: colors.surface,
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
  actionBtn: {
    marginTop: 22,
  },
  cancelBtn: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 6,
  },
  cancelText: {
    fontSize: 13.5,
    fontFamily: FONTS.extrabold,
    color: colors.textSecondary,
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
  successBox: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: tints.greenBorder30,
    borderRadius: 12,
    backgroundColor: tints.green07,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  successText: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: FONTS.bold,
    color: colors.greenLight,
    lineHeight: 18.1,
  },
  spinner: {
    marginTop: 20,
  },
});
