import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { FONTS } from '../constants/typography';
import { SearchIcon } from './icons/Icons';
import { useTheme } from '../services/ThemeContext';

export default function SearchBar({ placeholder, value, onChangeText, style }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={[styles.bar, style]}>
      <SearchIcon size={15} color={colors.textMuted} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    bar: {
      height: 44,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: 13,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      paddingHorizontal: 14,
    },
    input: {
      flex: 1,
      fontSize: 13,
      fontFamily: FONTS.semibold,
      color: colors.text,
      padding: 0,
    },
  });
