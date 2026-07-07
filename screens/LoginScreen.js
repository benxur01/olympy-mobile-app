import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import { BackIcon, EyeIcon, OlympyLogo } from '../components/icons/Icons';
import { useAuth } from '../services/AuthContext';
import { routeForUser } from '../services/roles';

export default function LoginScreen({ navigation, route }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [requires2fa, setRequires2fa] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ForgotPasswordScreen parolni yangilagach shu ekranga { resetSuccess: true }
  // bilan qaytaradi — yashil xabar ko'rsatamiz va paramni tozalaymiz.
  useEffect(() => {
    if (route?.params?.resetSuccess) {
      setSuccess('Parolingiz muvaffaqiyatli yangilandi. Endi yangi parol bilan kiring.');
      setError('');
      navigation.setParams({ resetSuccess: undefined });
    }
  }, [route?.params?.resetSuccess]);

  const handleLogin = async () => {
    if (!phone.trim() || !password) {
      setError('Telefon raqam va parolni kiriting');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const fullPhone = phone.trim().startsWith('+') ? phone.trim() : `+998${phone.replace(/\D/g, '')}`;
      const result = await login(fullPhone, password, requires2fa ? totpCode : undefined);
      if (result.requires2fa) {
        setRequires2fa(true);
        setError('2FA kodi kerak — Authenticator ilovadagi kodni kiriting');
      } else {
        navigation.reset({ index: 0, routes: [{ name: routeForUser(result.user) }] });
      }
    } catch (e) {
      setError(
        e.response?.data?.detail ||
          (e.response?.status === 400 || e.response?.status === 401
            ? "Telefon raqam yoki parol noto'g'ri"
            : "Ulanishda xatolik — internetni tekshiring")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()} style={styles.backBtn}>
          <BackIcon size={16} />
        </TouchableOpacity>
        <View style={styles.logoRow}>
          <OlympyLogo size={40} />
          <Text style={styles.title}>Kirish</Text>
        </View>
        <Text style={styles.subtitle}>Olympy hisobingiz bilan kiring — websaytdagi bilan bir xil</Text>

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
          />
        </View>

        <Text style={styles.fieldLabel}>PAROL</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Parolingiz"
            placeholderTextColor={colors.textMuted}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity activeOpacity={0.7} onPress={() => setShowPassword((v) => !v)}>
            <EyeIcon size={20} color={showPassword ? colors.blue : colors.textMuted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('ForgotPassword')}
          style={styles.forgotWrap}
        >
          <Text style={styles.forgotLink}>Parolni unutdingizmi?</Text>
        </TouchableOpacity>

        {requires2fa ? (
          <>
            <Text style={styles.fieldLabel}>2FA KOD</Text>
            <TextInput
              style={styles.totpInput}
              placeholder="6 xonali kod"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={6}
              value={totpCode}
              onChangeText={setTotpCode}
            />
          </>
        ) : null}

        {success ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleLogin}
          disabled={loading}
          style={[styles.submitBtn, loading ? { opacity: 0.7 } : null]}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitText}>Kirish</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.registerLink}>
            Hisobingiz yo'qmi? <Text style={styles.registerLinkBold}>Ro'yxatdan o'tish</Text>
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
  passwordRow: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 14,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
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
  totpInput: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.blue,
    borderRadius: 14,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    fontSize: 18,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    letterSpacing: 3,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: 12,
  },
  forgotLink: {
    fontSize: 12.5,
    fontFamily: FONTS.extrabold,
    color: colors.blueLight,
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
  },
  successText: {
    fontSize: 12.5,
    fontFamily: FONTS.bold,
    color: colors.greenLight,
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
  registerLink: {
    textAlign: 'center',
    marginTop: 18,
    fontSize: 13,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
  },
  registerLinkBold: {
    fontFamily: FONTS.extrabold,
    color: colors.blueLight,
  },
});
