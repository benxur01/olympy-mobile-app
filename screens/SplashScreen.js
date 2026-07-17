import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Button from '../components/Button';
import { OlympyLogo } from '../components/icons/Icons';
import { useAuth } from '../services/AuthContext';
import { routeForUser } from '../services/roles';

export default function SplashScreen({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const { user, initializing, sessionError, retrySession } = useAuth();
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!initializing && user) {
      navigation.reset({ index: 0, routes: [{ name: routeForUser(user) }] });
    }
  }, [initializing, user, navigation]);

  const onRetry = async () => {
    setRetrying(true);
    try {
      const me = await retrySession();
      if (me) {
        navigation.reset({ index: 0, routes: [{ name: routeForUser(me) }] });
      }
    } catch (e) {
      // sessionError AuthContext'da yangilanadi
    } finally {
      setRetrying(false);
    }
  };

  // Token bor, lekin /me tarmoq xatosi — offline/retry UI (token tozalanmagan).
  const showSessionRetry = !initializing && !user && !!sessionError;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.hero}>
        <View style={styles.logoBox}>
          <OlympyLogo size={52} />
        </View>
        <Text style={styles.title}>Olympy</Text>
        <Text style={styles.subtitle}>
          Olimpiadalar, reyting va sertifikatlar — bitta platformada.
        </Text>
      </View>
      {initializing || (user && !sessionError) ? (
        // Sessiya tekshirilayotgan (yoki allaqachon login qilingan, hozir
        // rolga yo'naltirilayotgan) paytda "Kirish/Ro'yxatdan o'tish"
        // tugmalarini ko'rsatmaymiz — aks holda har safar ilova ochilganda
        // allaqachon login qilingan foydalanuvchiga ham lip qilib shu
        // "birinchi marta kirish" ekrani ko'rinib ketardi.
        <View style={[styles.actions, styles.loadingBox]}>
          <ActivityIndicator color={colors.blue} />
        </View>
      ) : showSessionRetry ? (
        <View style={styles.actions}>
          <Text style={styles.retryHint}>
            Serverga ulanib bo‘lmadi. Internetni tekshirib qayta urinib ko‘ring.
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onRetry}
            style={styles.primaryBtn}
            disabled={retrying}
          >
            {retrying ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryBtnText}>Qayta urinish</Text>
            )}
          </TouchableOpacity>
          <Button
            title="Boshqa hisob bilan kirish"
            variant="dark"
            height={54}
            radius={14}
            fontSize={16}
            onPress={() => navigation.navigate('Login')}
          />
        </View>
      ) : (
        <View style={styles.actions}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Login')}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>Kirish</Text>
          </TouchableOpacity>
          <Button
            title="Ro'yxatdan o'tish"
            variant="dark"
            height={54}
            radius={14}
            fontSize={16}
            onPress={() => navigation.navigate('Register')}
          />
          <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('CertVerify')}>
            <Text style={styles.certLink}>Sertifikatni tekshirish →</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors, tints) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: 70,
    paddingHorizontal: 28,
    paddingBottom: 48,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  logoBox: {
    width: 96,
    height: 96,
    borderRadius: 26,
    backgroundColor: colors.logoBg,
    borderWidth: 1,
    borderColor: colors.logoBorder,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 12,
  },
  title: {
    fontSize: 34,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    lineHeight: 24.8,
    maxWidth: 290,
    textAlign: 'center',
  },
  actions: {
    gap: 10,
  },
  loadingBox: {
    alignItems: 'center',
    height: 54,
    justifyContent: 'center',
  },
  primaryBtn: {
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
  primaryBtnText: {
    fontSize: 16,
    fontFamily: FONTS.extrabold,
    color: colors.white,
  },
  certLink: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 12.5,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
  },
  retryHint: {
    textAlign: 'center',
    fontSize: 13.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
});
