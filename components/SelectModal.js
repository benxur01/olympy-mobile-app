import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { FONTS } from '../constants/typography';
import { useTheme } from '../services/ThemeContext';
import { CheckIcon } from './icons/Icons';

// Yengil, qayta ishlatiladigan tanlash oynasi (dropdown o'rnida). Bosilganda
// pastdan chiqadigan varaq ochiladi, ro'yxatdan biri tanlanganda onSelect
// chaqiriladi va oyna yopiladi. Region/tuman/tashkilot turi uchun ishlatiladi.
export default function SelectModal({ visible, options = [], selected, onSelect, onClose, title }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {options.length ? (
            options.map((opt) => {
              const active = opt === selected;
              return (
                <TouchableOpacity
                  key={opt}
                  activeOpacity={0.8}
                  style={[styles.row, active ? styles.rowActive : null]}
                  onPress={() => onSelect(opt)}
                >
                  <Text style={[styles.rowLabel, active ? styles.rowLabelActive : null]} numberOfLines={1}>
                    {opt}
                  </Text>
                  {active ? <CheckIcon size={14} color={colors.blueLight} /> : null}
                </TouchableOpacity>
              );
            })
          ) : (
            <Text style={styles.empty}>Ro'yxat bo'sh</Text>
          )}
        </ScrollView>
        <TouchableOpacity activeOpacity={0.7} onPress={onClose}>
          <Text style={styles.cancel}>Bekor qilish</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const makeStyles = (colors, tints) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 26,
      maxHeight: '72%',
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.barIdle,
      marginBottom: 14,
    },
    title: {
      fontSize: 15,
      fontFamily: FONTS.extrabold,
      color: colors.text,
      marginBottom: 12,
    },
    scroll: {
      flexGrow: 0,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.bg,
      marginBottom: 8,
    },
    rowActive: {
      borderColor: colors.blue,
      backgroundColor: tints.blue08,
    },
    rowLabel: {
      flex: 1,
      fontSize: 14,
      fontFamily: FONTS.bold,
      color: colors.text,
    },
    rowLabelActive: {
      fontFamily: FONTS.extrabold,
      color: colors.blueLight,
    },
    empty: {
      fontSize: 13,
      fontFamily: FONTS.semibold,
      color: colors.textMuted,
      textAlign: 'center',
      paddingVertical: 24,
    },
    cancel: {
      textAlign: 'center',
      marginTop: 12,
      fontSize: 14,
      fontFamily: FONTS.extrabold,
      color: colors.textSecondary,
    },
  });
