import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Button from '../components/Button';
import { BackIcon, QrIcon, CheckIcon, CloseIcon, QrSample } from '../components/icons/Icons';
import { publicApi } from '../services/api';

export default function CertVerifyScreen({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const inputRef = useRef(null);

  const onQrPress = () => {
    inputRef.current?.focus();
    Alert.alert(
      'Sertifikat kodi',
      "QR kodni kamera bilan skanerlash bu versiyada mavjud emas. Sertifikatdagi kodni (UUID) shu maydonga qo'lda kiriting.",
      [{ text: 'Yaxshi' }]
    );
  };

  const verify = async () => {
    const value = code.trim();
    if (!value) return;
    setLoading(true);
    setResult(null);
    setNotFound(false);
    try {
      const { data } = await publicApi.verifyCertificate(value);
      if (data?.valid) {
        setResult(data);
      } else {
        setNotFound(true);
      }
    } catch (e) {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()} style={styles.backBtn}>
            <BackIcon size={16} />
          </TouchableOpacity>
        </View>
        <View style={styles.header}>
          <Text style={styles.title}>Sertifikatni tekshirish</Text>
          <Text style={styles.subtitle}>Sertifikatdagi kodni (UUID) kiriting</Text>
        </View>
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.codeInput}
            placeholder="Sertifikat kodi"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            value={code}
            onChangeText={setCode}
          />
          <TouchableOpacity activeOpacity={0.7} style={styles.qrBtn} onPress={onQrPress}>
            <QrIcon size={20} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={verify}
          disabled={loading}
          style={[styles.verifyBtn, loading ? { opacity: 0.7 } : null]}
        >
          {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.verifyText}>Tekshirish</Text>}
        </TouchableOpacity>

        {result ? (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <View style={styles.checkCircle}>
                <CheckIcon size={18} color={colors.white} />
              </View>
              <Text style={styles.resultTitle}>Haqiqiy sertifikat</Text>
            </View>
            <View style={styles.resultBody}>
              <View style={styles.fields}>
                <View>
                  <Text style={styles.fieldLabel}>EGASI</Text>
                  <Text style={styles.fieldValue}>{result.student_name}</Text>
                </View>
                <View>
                  <Text style={styles.fieldLabel}>TADBIR</Text>
                  <Text style={styles.fieldValueSm}>{result.olympiad_name}</Text>
                </View>
                <View style={styles.fieldRow}>
                  <View>
                    <Text style={styles.fieldLabel}>BALL</Text>
                    <Text style={styles.fieldValue}>{result.score} / 100</Text>
                  </View>
                  <View>
                    <Text style={styles.fieldLabel}>SANA</Text>
                    <Text style={styles.fieldValue}>{result.date}</Text>
                  </View>
                </View>
                {result.center_name ? (
                  <View>
                    <Text style={styles.fieldLabel}>MARKAZ</Text>
                    <Text style={styles.fieldValueSm}>{result.center_name}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.qrCard}>
                <QrSample size={70} />
              </View>
            </View>
          </View>
        ) : null}

        {notFound ? (
          <View style={styles.errorCard}>
            <View style={styles.errorIcon}>
              <CloseIcon size={13} />
            </View>
            <Text style={styles.errorText}>
              "{code.trim()}" kodi bo'yicha haqiqiy sertifikat topilmadi
            </Text>
          </View>
        ) : null}
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
    paddingTop: 18,
    paddingHorizontal: 22,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    marginBottom: 8,
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
  header: {
    alignItems: 'center',
    marginTop: 8,
  },
  title: {
    fontSize: 21,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 5,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
  },
  codeInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: colors.blue,
    borderRadius: 13,
    backgroundColor: colors.surface,
    paddingHorizontal: 15,
    fontSize: 15,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    letterSpacing: 1,
  },
  qrBtn: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 13,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyBtn: {
    marginTop: 10,
    height: 50,
    borderRadius: 13,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyText: {
    fontSize: 15,
    fontFamily: FONTS.extrabold,
    color: colors.white,
  },
  resultCard: {
    marginTop: 22,
    borderWidth: 1,
    borderColor: tints.greenBorder40,
    borderRadius: 20,
    backgroundColor: tints.green07,
    padding: 20,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTitle: {
    fontSize: 16,
    fontFamily: FONTS.extrabold,
    color: colors.greenLight,
  },
  resultBody: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  fields: {
    flex: 1,
    gap: 10,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 18,
  },
  fieldLabel: {
    fontSize: 10,
    fontFamily: FONTS.extrabold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  fieldValue: {
    fontSize: 14,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    marginTop: 2,
  },
  fieldValueSm: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: colors.textBody,
    marginTop: 2,
  },
  qrCard: {
    width: 86,
    height: 86,
    borderRadius: 12,
    backgroundColor: colors.white,
    padding: 8,
  },
  errorCard: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: tints.redBorder35,
    borderRadius: 16,
    backgroundColor: tints.red06,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  errorIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: tints.red15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: colors.redSoftText,
    lineHeight: 17.4,
  },
});
