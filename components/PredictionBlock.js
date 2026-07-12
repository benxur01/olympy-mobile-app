import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import DonutProgress from './DonutProgress';
import { SparkleIcon } from './icons/Icons';

// AI muvaffaqiyat bashorati (3 ta yo'nalish foizi + AI tavsiya). Ota-ona
// farzandi uchun (ParentScreen) va o'quvchi o'zi uchun (AnalyticsScreen)
// bir xil komponentni ishlatadi — `state` shakli: { loading, error, data:
// { predictions: {presidential_school, al_xorazmiy, dtm}, ai_analysis } }.
export default function PredictionBlock({ state }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  if (!state || state.loading) {
    return (
      <View style={styles.predLoadingRow}>
        <ActivityIndicator size="small" color={colors.blue} />
        <Text style={styles.predLoadingText}>Bashorat hisoblanmoqda…</Text>
      </View>
    );
  }
  if (state.error) {
    return <Text style={styles.predLoadingText}>Bashoratni yuklab bo'lmadi</Text>;
  }
  const p = state.data?.predictions || {};
  const items = [
    { key: 'presidential_school', label: 'Prezident\nmaktabi', value: p.presidential_school ?? 0, color: colors.blue },
    { key: 'al_xorazmiy', label: 'Al-Xorazmiy', value: p.al_xorazmiy ?? 0, color: colors.purple },
    { key: 'dtm', label: 'DTM testlari', value: p.dtm ?? 0, color: colors.green },
  ];
  const tip = state.data?.ai_analysis;
  return (
    <View>
      <View style={styles.predRow}>
        {items.map((it) => (
          <View key={it.key} style={styles.predItem}>
            <DonutProgress size={58} strokeWidth={6} progress={it.value} color={it.color}>
              <Text style={[styles.predPct, { color: it.color }]}>{it.value}%</Text>
            </DonutProgress>
            <Text style={styles.predLabel}>{it.label}</Text>
          </View>
        ))}
      </View>
      {tip ? (
        <View style={styles.aiTip}>
          <SparkleIcon size={12} color={colors.blueLight} />
          <Text style={styles.aiTipText}>{tip}</Text>
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (colors, tints) => StyleSheet.create({
  predRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  predItem: {
    alignItems: 'center',
    flex: 1,
  },
  predPct: {
    fontSize: 13,
    fontFamily: FONTS.extrabold,
  },
  predLabel: {
    fontSize: 10.5,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 7,
    lineHeight: 13,
  },
  predLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  predLoadingText: {
    fontSize: 12,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
    paddingVertical: 6,
  },
  aiTip: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tints.blueBorder30,
    backgroundColor: tints.blue06,
  },
  aiTipText: {
    flex: 1,
    fontSize: 11.5,
    fontFamily: FONTS.semibold,
    color: colors.blueSoftText,
    lineHeight: 17,
  },
});
