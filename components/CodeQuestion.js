import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../services/ThemeContext';
import { DARK_COLORS } from '../constants/colors';
import { FONTS } from '../constants/typography';
import Button from './Button';
import SegmentedControl from './SegmentedControl';
import { SparkleIcon } from './icons/Icons';
import { studentApi } from '../services/api';

// Judge0 qo'llab-quvvatlaydigan tillar (backend `judge0_service.LANGUAGE_MAP`
// bilan bir xil). Websaytdagi til tanlash ro'yxatiga mos.
const LANGS = [
  { key: 'python', label: 'Python' },
  { key: 'javascript', label: 'JS' },
  { key: 'java', label: 'Java' },
  { key: 'cpp', label: 'C++' },
  { key: 'c', label: 'C' },
];

// Monospace: iOS'da Menlo, Android/Web'da umumiy 'monospace' oilasi. Kod
// muharrirlarining odatiy ko'rinishi uchun (tekislangan ustunlar).
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

const PlayIcon = ({ size = 13, color = '#fff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M8 5v14l11-7z" />
  </Svg>
);

// IT (kod) savol javob bloki — ExamScreen ichida `question_type === 'code'`
// bo'lganda savol matni ostida render qilinadi. Faqat javob maydonini beradi
// (savol matni ExamScreen'da ko'rsatiladi). Til tanlash, quyuq kod muharriri
// (oddiy monospace TextInput — to'liq syntax highlighting yo'q), Judge0'da
// "Ishga tushirish" va AI "Tekshirish". Natija SAQLANMAYDI — yakuniy ball
// test yakunlanganda server tomonda hisoblanadi.
export default function CodeQuestion({
  question,
  code,
  onChangeCode,
  language,
  onChangeLanguage,
}) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);

  const [running, setRunning] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [review, setReview] = useState(null);

  // Unmount bo'lganda polling loop'ini to'xtatish uchun (setState leak'ini
  // oldini oladi — Judge0 30 soniyagacha polling qiladi).
  const cancelledRef = useRef(false);
  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const template = question?.code_template || '';
  const hasCode = String(code || '').trim().length > 0;
  const activeIndex = Math.max(0, LANGS.findIndex((l) => l.key === language));

  const handleRun = async () => {
    if (!hasCode || running) return;
    setRunning(true);
    setRunResult(null);
    try {
      const result = await studentApi.runCode(
        { source_code: code, language, question_id: question.id },
        () => cancelledRef.current,
      );
      if (result && !cancelledRef.current) setRunResult(result);
    } catch (e) {
      if (cancelledRef.current) return;
      const detail =
        e?.response?.data?.detail || e?.message || "Kodni ishga tushirib bo'lmadi.";
      setRunResult({ status: 'Xato', error: detail });
    } finally {
      if (!cancelledRef.current) setRunning(false);
    }
  };

  const handleReview = async () => {
    if (!hasCode || reviewing) return;
    setReviewing(true);
    setReview(null);
    try {
      const { data } = await studentApi.reviewCode({
        question_id: question.id,
        submitted_code: code,
        language,
      });
      if (!cancelledRef.current) setReview({ score: data?.score, review: data?.review || '' });
    } catch (e) {
      if (cancelledRef.current) return;
      const detail =
        e?.response?.data?.detail || e?.message || "AI tekshiruvni bajarib bo'lmadi.";
      setReview({ score: null, review: detail });
    } finally {
      if (!cancelledRef.current) setReviewing(false);
    }
  };

  const accepted = runResult && runResult.status === 'Accepted';
  const testResults = Array.isArray(runResult?.test_results) ? runResult.test_results : [];

  return (
    <View style={styles.wrap}>
      {/* Til tanlash */}
      <Text style={styles.label}>Dasturlash tili</Text>
      <SegmentedControl
        segments={LANGS.map((l) => l.label)}
        activeIndex={activeIndex}
        onChange={(i) => onChangeLanguage && onChangeLanguage(LANGS[i].key)}
        fontSize={11.5}
        style={styles.langControl}
      />

      {/* Boshlang'ich kod skelet (agar bor bo'lsa) — o'qish uchun, editorga
          yuklab olish tugmasi bilan. */}
      {template ? (
        <View style={styles.templateBox}>
          <View style={styles.templateHeader}>
            <Text style={styles.templateLabel}>Boshlang'ich kod</Text>
            {!hasCode ? (
              <TouchableOpacity activeOpacity={0.7} onPress={() => onChangeCode && onChangeCode(template)}>
                <Text style={styles.templateLoad}>Muharrirga yuklash</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <ScrollView style={styles.templateScroll} nestedScrollEnabled>
            <Text style={styles.templateText}>{template}</Text>
          </ScrollView>
        </View>
      ) : null}

      {/* Kod muharriri — quyuq fon + och matn (kod muharrirlarining odatiy
          ko'rinishi). To'liq syntax highlighting yo'q (monospace TextInput). */}
      <Text style={styles.label}>Kodingiz</Text>
      <TextInput
        style={styles.editor}
        placeholder={"// Kodingizni shu yerga yozing…"}
        placeholderTextColor={colors.textMuted}
        value={code != null ? String(code) : ''}
        onChangeText={(t) => onChangeCode && onChangeCode(t)}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        spellCheck={false}
        textAlignVertical="top"
      />

      {/* Tugmalar */}
      <View style={styles.actions}>
        <Button
          title={running ? 'Ishga tushirilmoqda…' : 'Ishga tushirish'}
          variant="dark"
          height={46}
          radius={12}
          fontSize={13}
          icon={
            running ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <PlayIcon size={13} color={colors.text} />
            )
          }
          disabled={running || !hasCode}
          onPress={handleRun}
          style={styles.actionBtn}
        />
        <Button
          title={reviewing ? 'Tekshirilmoqda…' : 'AI bilan tekshirish'}
          variant="muted"
          height={46}
          radius={12}
          fontSize={13}
          icon={
            reviewing ? (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            ) : (
              <SparkleIcon size={13} color={colors.purpleLight} />
            )
          }
          disabled={reviewing || !hasCode}
          onPress={handleReview}
          style={styles.actionBtn}
        />
      </View>

      {/* Judge0 natija paneli */}
      {runResult ? (
        <View style={styles.resultBox}>
          <View style={styles.resultHead}>
            <Text style={[styles.resultStatus, { color: accepted ? colors.greenLight : colors.red }]}>
              {'●'} {runResult.status || 'Xato'}
            </Text>
            {runResult.time > 0 ? (
              <Text style={styles.resultMeta}>
                {runResult.time}s · {runResult.memory} KB
              </Text>
            ) : null}
          </View>

          {/* Ulanish/Judge0 xatosi */}
          {runResult.error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{runResult.error}</Text>
            </View>
          ) : null}

          {/* stdout */}
          {runResult.stdout ? (
            <View style={styles.outBlock}>
              <Text style={styles.outLabel}>Natija:</Text>
              <ScrollView style={styles.codeScroll} nestedScrollEnabled>
                <Text style={[styles.codeOut, { color: colors.greenLight }]}>{runResult.stdout}</Text>
              </ScrollView>
            </View>
          ) : null}

          {/* stderr / compile error */}
          {runResult.stderr || runResult.compile_output ? (
            <View style={styles.outBlock}>
              <Text style={[styles.outLabel, { color: colors.red }]}>Xato:</Text>
              <ScrollView style={styles.codeScroll} nestedScrollEnabled>
                <Text style={[styles.codeOut, { color: colors.redSoftText }]}>
                  {runResult.stderr || runResult.compile_output}
                </Text>
              </ScrollView>
            </View>
          ) : null}

          {/* Test case natijalari */}
          {testResults.length > 0 ? (
            <View style={styles.testList}>
              <Text style={styles.outLabel}>Test natijalari:</Text>
              {testResults.map((t, i) => (
                <View
                  key={i}
                  style={[styles.testRow, t.passed ? styles.testPass : styles.testFail]}
                >
                  <Text style={[styles.testMark, { color: t.passed ? colors.greenLight : colors.red }]}>
                    {t.passed ? '✓' : '✗'} Test {i + 1}
                  </Text>
                  <Text style={styles.testDetail}>
                    {t.is_hidden
                      ? '(yashirin)'
                      : t.passed
                      ? "to'g'ri"
                      : `kutilgan: ${String(t.expected)}, olindi: ${String(t.got)}`}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <Text style={styles.hint}>Bu faqat sinov — yakuniy ball test yakunlanganda hisoblanadi.</Text>
        </View>
      ) : null}

      {/* AI tekshirish natija paneli */}
      {review ? (
        <View style={styles.reviewBox}>
          {typeof review.score === 'number' ? (
            <Text style={styles.reviewScore}>AI ball: {review.score}/100</Text>
          ) : null}
          <Text style={styles.reviewText}>{review.review}</Text>
          <Text style={styles.hint}>Bu faqat sinov — yakuniy ball test yakunlanganda hisoblanadi.</Text>
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (colors, tints) =>
  StyleSheet.create({
    wrap: {
      marginTop: 18,
      gap: 10,
    },
    label: {
      fontSize: 11.5,
      fontFamily: FONTS.extrabold,
      color: colors.textMuted,
      letterSpacing: 0.5,
      marginBottom: -2,
    },
    langControl: {
      marginBottom: 2,
    },
    templateBox: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surfaceDeep,
      padding: 10,
    },
    templateHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    templateLabel: {
      fontSize: 11,
      fontFamily: FONTS.bold,
      color: colors.textSecondary,
    },
    templateLoad: {
      fontSize: 11.5,
      fontFamily: FONTS.extrabold,
      color: colors.blue,
    },
    templateScroll: {
      maxHeight: 130,
    },
    templateText: {
      fontFamily: MONO,
      fontSize: 12.5,
      color: colors.textBody,
      lineHeight: 18,
    },
    editor: {
      minHeight: 200,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: 14,
      // Kod maydoni light/dark rejimda ham DOIM quyuq brend navy fon + och
      // matn (kod muharrirlarining odatiy ko'rinishi). Shu sababli theme
      // colors emas, aniq DARK_COLORS tokenlari ishlatiladi.
      backgroundColor: DARK_COLORS.bg,
      color: DARK_COLORS.text,
      padding: 14,
      fontFamily: MONO,
      fontSize: 13,
      lineHeight: 20,
    },
    actions: {
      flexDirection: 'row',
      gap: 9,
      marginTop: 2,
    },
    actionBtn: {
      flex: 1,
    },
    resultBox: {
      marginTop: 4,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      backgroundColor: colors.surface,
      padding: 13,
      gap: 9,
    },
    resultHead: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },
    resultStatus: {
      fontSize: 13.5,
      fontFamily: FONTS.extrabold,
    },
    resultMeta: {
      fontSize: 11,
      fontFamily: FONTS.semibold,
      color: colors.textMuted,
    },
    errorBanner: {
      backgroundColor: tints.red10,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 11,
    },
    errorBannerText: {
      fontSize: 12,
      fontFamily: FONTS.semibold,
      color: colors.redSoftText,
    },
    outBlock: {
      gap: 4,
    },
    outLabel: {
      fontSize: 11,
      fontFamily: FONTS.bold,
      color: colors.textMuted,
    },
    codeScroll: {
      maxHeight: 150,
      backgroundColor: DARK_COLORS.bg,
      borderRadius: 10,
      padding: 10,
    },
    codeOut: {
      fontFamily: MONO,
      fontSize: 12.5,
      lineHeight: 18,
    },
    testList: {
      gap: 5,
    },
    testRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 7,
      paddingVertical: 7,
      paddingHorizontal: 10,
      borderRadius: 9,
    },
    testPass: {
      backgroundColor: tints.green07,
    },
    testFail: {
      backgroundColor: tints.red07,
    },
    testMark: {
      fontSize: 12,
      fontFamily: FONTS.extrabold,
    },
    testDetail: {
      flex: 1,
      fontSize: 11,
      fontFamily: FONTS.semibold,
      color: colors.textSecondary,
    },
    hint: {
      fontSize: 10,
      fontFamily: FONTS.semibold,
      color: colors.textMuted,
    },
    reviewBox: {
      marginTop: 4,
      borderWidth: 1,
      borderColor: tints.purpleBorder35,
      borderRadius: 14,
      backgroundColor: tints.purple16,
      padding: 13,
      gap: 7,
    },
    reviewScore: {
      fontSize: 13.5,
      fontFamily: FONTS.extrabold,
      color: colors.purpleLight,
    },
    reviewText: {
      fontSize: 13,
      fontFamily: FONTS.semibold,
      color: colors.textBody,
      lineHeight: 19,
    },
  });
