import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Card from './Card';
import ProgressBar from './ProgressBar';
import useFetch from '../services/useFetch';
import { studentApi } from '../services/api';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';

// F4 (kunlik maqsad qismi). Web: pages/RetentionWidgets.jsx (150-263).
// Streak kartochkasi StudentHomeScreen sarlavhasida allaqachon bor — bu yerda
// faqat kunlik maqsad qo'yish/o'zgartirish qismi ko'chiriladi.
const DAILY_GOAL_OPTIONS = [1, 3, 5, 10];

export default function DailyGoalCard() {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const { data, loading, reload } = useFetch(() => studentApi.dailyGoal().then((r) => r.data), []);
  const [saving, setSaving] = useState(false);

  const setGoal = async (n) => {
    if (saving) return;
    setSaving(true);
    try {
      await studentApi.setDailyGoal(n);
      reload();
    } catch (e) {
      // jim — keyingi yuklashda holat tiklanadi
    } finally {
      setSaving(false);
    }
  };

  if (loading || !data) return null;

  const target = data.target_questions || 0;
  const completed = data.completed_questions || 0;
  const isAchieved = !!data.is_achieved;
  const pct = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;

  return (
    <Card radius={16} elevated={false} background={tints.blue08} borderColor={tints.blueBorder30} style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>🎯 Kunlik maqsad</Text>
        {target > 0 ? (
          <Text style={[styles.count, isAchieved ? { color: colors.greenLight } : { color: colors.blueLight }]}>
            {completed}/{target} savol
          </Text>
        ) : null}
      </View>

      {target > 0 ? (
        <>
          <ProgressBar
            progress={pct}
            height={9}
            color={isAchieved ? colors.green : colors.blue}
            style={styles.bar}
          />
          <Text style={styles.hint}>
            {isAchieved ? (
              <Text style={{ color: colors.greenLight, fontFamily: FONTS.bold }}>✓ Bugungi maqsad bajarildi! Ajoyib.</Text>
            ) : (
              <>
                Bugun yana <Text style={styles.hintStrong}>{data.remaining || 0}</Text> ta savol yeching.
              </>
            )}
          </Text>
          <Text style={styles.changeLabel}>Maqsadni o'zgartirish:</Text>
          <View style={styles.optionsRow}>
            {DAILY_GOAL_OPTIONS.map((n) => {
              const active = n === target;
              return (
                <TouchableOpacity
                  key={n}
                  activeOpacity={0.8}
                  disabled={saving}
                  onPress={() => setGoal(n)}
                  style={[styles.pill, active ? styles.pillActive : null, saving ? styles.pillDisabled : null]}
                >
                  <Text style={[styles.pillText, active ? styles.pillTextActive : null]}>{n}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      ) : (
        <>
          <Text style={styles.hint}>Bugungi maqsadingizni belgilang — har kuni nechta savol yechasiz?</Text>
          <View style={styles.optionsRow}>
            {DAILY_GOAL_OPTIONS.map((n) => (
              <TouchableOpacity
                key={n}
                activeOpacity={0.8}
                disabled={saving}
                onPress={() => setGoal(n)}
                style={[styles.pillLarge, saving ? styles.pillDisabled : null]}
              >
                <Text style={styles.pillLargeText}>{n} savol</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </Card>
  );
}

const makeStyles = (colors, tints) =>
  StyleSheet.create({
    card: {
      padding: 16,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    heading: {
      fontSize: 14,
      fontFamily: FONTS.extrabold,
      color: colors.text,
    },
    count: {
      fontSize: 11.5,
      fontFamily: FONTS.extrabold,
    },
    bar: {
      marginTop: 2,
    },
    hint: {
      fontSize: 11.5,
      fontFamily: FONTS.semibold,
      color: colors.textSecondary,
      marginTop: 10,
      lineHeight: 16,
    },
    hintStrong: {
      color: colors.text,
      fontFamily: FONTS.extrabold,
    },
    changeLabel: {
      fontSize: 10.5,
      fontFamily: FONTS.bold,
      color: colors.textMuted,
      marginTop: 12,
    },
    optionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    pill: {
      minWidth: 40,
      alignItems: 'center',
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: colors.surfaceDeep,
    },
    pillActive: {
      backgroundColor: colors.blue,
    },
    pillDisabled: {
      opacity: 0.5,
    },
    pillText: {
      fontSize: 12.5,
      fontFamily: FONTS.extrabold,
      color: colors.textSecondary,
    },
    pillTextActive: {
      color: colors.white,
    },
    pillLarge: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: colors.surfaceDeep,
    },
    pillLargeText: {
      fontSize: 13,
      fontFamily: FONTS.extrabold,
      color: colors.text,
    },
  });
