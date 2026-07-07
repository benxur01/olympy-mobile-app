import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Button from '../components/Button';
import { authApi } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { CheckIcon } from '../components/icons/Icons';

const SUBJECTS = ['Matematika', 'Fizika', 'Kimyo', 'Biologiya', 'Ingliz tili', 'Tarix', 'Informatika', 'IT'];
const MATH_LEVELS = ["Boshlang'ich", "O'rta", "Ilg'or"];
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export default function OnboardingScreen({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const { reloadMe } = useAuth();
  const [selected, setSelected] = useState(['Matematika', 'Ingliz tili', 'Informatika']);
  const [mathLevel, setMathLevel] = useState("O'rta");
  const [cefrLevel, setCefrLevel] = useState('B1');
  const [saving, setSaving] = useState(false);

  const toggleSubject = (s) =>
    setSelected((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const finish = async () => {
    if (saving) return;
    setSaving(true);
    // Har bir tanlangan fan uchun daraja: Ingliz tili — CEFR, qolganlar —
    // Boshlang'ich/O'rta/Ilg'or (mathLevel bir xil to'plamdan).
    const subjectLevels = {};
    selected.forEach((s) => {
      subjectLevels[s] = s === 'Ingliz tili' ? cefrLevel : mathLevel;
    });
    try {
      if (selected.length) {
        await authApi.completeOnboarding({ subjects: selected, subject_levels: subjectLevels });
        await reloadMe().catch(() => {});
      }
    } catch (e) {
      // Onboarding foydalanuvchini bloklamasligi kerak — xato bo'lsa ham davom.
    } finally {
      setSaving(false);
      navigation.reset({ index: 0, routes: [{ name: 'StudentTabs' }] });
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.dotsRow}>
          <View style={[styles.dot, { backgroundColor: colors.blue }]} />
          <View style={[styles.dot, { backgroundColor: colors.blue }]} />
          <View style={[styles.dot, { backgroundColor: colors.barIdle }]} />
        </View>
        <Text style={styles.title}>Qaysi fanlarga qiziqasiz?</Text>
        <Text style={styles.subtitle}>Bir nechtasini tanlash mumkin</Text>
        <View style={styles.subjectsWrap}>
          {SUBJECTS.map((s) => {
            const active = selected.includes(s);
            return (
              <TouchableOpacity
                key={s}
                activeOpacity={0.8}
                onPress={() => toggleSubject(s)}
                style={[
                  styles.subject,
                  {
                    borderColor: active ? colors.blue : colors.borderStrong,
                    backgroundColor: active ? tints.blue14 : colors.surface,
                  },
                ]}
              >
                {active ? <CheckIcon size={13} color={colors.blueLight} /> : null}
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: active ? FONTS.extrabold : FONTS.bold,
                    color: active ? colors.blueLight : colors.textSecondary,
                  }}
                >
                  {s}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.sectionLabel}>DARAJANGIZNI BELGILANG</Text>
        <View style={styles.levelCard}>
          <Text style={styles.levelTitle}>Matematika</Text>
          <View style={styles.levelRow}>
            {MATH_LEVELS.map((l) => {
              const active = mathLevel === l;
              return (
                <TouchableOpacity
                  key={l}
                  activeOpacity={0.8}
                  onPress={() => setMathLevel(l)}
                  style={[
                    styles.levelOption,
                    {
                      borderColor: active ? colors.blue : colors.borderStrong,
                      backgroundColor: active ? tints.blue14 : colors.surfaceDeep,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 12.5,
                      fontFamily: active ? FONTS.extrabold : FONTS.bold,
                      color: active ? colors.blueLight : colors.textSecondary,
                    }}
                  >
                    {l}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <View style={[styles.levelCard, { marginTop: 10 }]}>
          <Text style={styles.levelTitle}>
            Ingliz tili <Text style={styles.cefrNote}>· CEFR</Text>
          </Text>
          <View style={[styles.levelRow, { gap: 6 }]}>
            {CEFR_LEVELS.map((l) => {
              const active = cefrLevel === l;
              return (
                <TouchableOpacity
                  key={l}
                  activeOpacity={0.8}
                  onPress={() => setCefrLevel(l)}
                  style={[
                    styles.levelOption,
                    {
                      borderColor: active ? colors.blue : colors.borderStrong,
                      backgroundColor: active ? tints.blue14 : colors.surfaceDeep,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 12.5,
                      fontFamily: active ? FONTS.extrabold : FONTS.bold,
                      color: active ? colors.blueLight : colors.textSecondary,
                    }}
                  >
                    {l}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Button
          title={saving ? 'Saqlanmoqda…' : 'Davom etish'}
          height={54}
          radius={14}
          fontSize={16}
          shadow
          disabled={saving || selected.length === 0}
          onPress={finish}
        />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors, tints) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingTop: 26,
    paddingHorizontal: 22,
    paddingBottom: 12,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
  },
  dot: {
    width: 24,
    height: 6,
    borderRadius: 3,
  },
  title: {
    fontSize: 23,
    fontFamily: FONTS.extrabold,
    color: colors.text,
    marginTop: 24,
  },
  subtitle: {
    fontSize: 13.5,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 4,
  },
  subjectsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginTop: 18,
  },
  subject: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: FONTS.extrabold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginTop: 26,
    marginBottom: 10,
  },
  levelCard: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 16,
    backgroundColor: colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  levelTitle: {
    fontSize: 14,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  cefrNote: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: colors.textMuted,
  },
  levelRow: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 10,
  },
  levelOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  footer: {
    paddingHorizontal: 22,
    paddingBottom: 36,
    paddingTop: 12,
  },
});
