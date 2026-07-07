import React, { useState } from 'react';
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
import { BackIcon, EyeIcon } from '../components/icons/Icons';
import { authApi } from '../services/api';
import { useAuth } from '../services/AuthContext';

export default function ChangePasswordScreen({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const { applyAuthTokens } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!oldPassword || !newPassword) {
      setError('Eski va yangi parolni kiriting');
      return;
    }
    if (newPassword.length < 8) {
      setError("Yangi parol kamida 8 belgidan iborat bo'lishi kerak");
      return;
    }
    if (newPassword !== confirm) {
      setError('Yangi parol va tasdiq mos kelmadi');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await authApi.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });
      // Backend eski JWT'larni bekor qiladi va yangi juftlikni qaytaradi —
      // ularni saqlaymiz, aks holda keyingi so'rovlar 401 bo'lardi.
      if (data?.token) {
        await applyAuthTokens(data.token, data.refresh);
      }
      navigation.goBack();
    } catch (e) {
      const detail =
        e?.response?.data?.detail ||
        e?.response?.data?.new_password?.[0] ||
        e?.response?.data?.old_password?.[0];
      setError(detail || "Parolni o'zgartirib bo'lmadi. Qayta urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()} style={styles.backBtn}>
          <BackIcon size={16} />
        </TouchableOpacity>
        <Text style={styles.title}>Parolni o'zgartirish</Text>
        <Text style={styles.subtitle}>Xavfsizlik uchun kamida 8 belgili yangi parol tanlang</Text>

        <Text style={styles.fieldLabel}>ESKI PAROL</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Joriy parolingiz"
            placeholderTextColor={colors.textMuted}
            secureTextEntry={!show}
            value={oldPassword}
            onChangeText={setOldPassword}
          />
        </View>

        <Text style={styles.fieldLabel}>YANGI PAROL</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Yangi parol"
            placeholderTextColor={colors.textMuted}
            secureTextEntry={!show}
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TouchableOpacity activeOpacity={0.7} onPress={() => setShow((v) => !v)}>
            <EyeIcon size={20} color={show ? colors.blue : colors.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.fieldLabel}>YANGI PAROLNI TASDIQLANG</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Yangi parolni qayta kiriting"
            placeholderTextColor={colors.textMuted}
            secureTextEntry={!show}
            value={confirm}
            onChangeText={setConfirm}
          />
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={submit}
          disabled={loading}
          style={[styles.submitBtn, loading ? { opacity: 0.7 } : null]}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitText}>Parolni saqlash</Text>
          )}
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
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: FONTS.extrabold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 7,
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
});
