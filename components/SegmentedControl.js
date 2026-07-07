import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FONTS } from '../constants/typography';
import { useTheme } from '../services/ThemeContext';

export default function SegmentedControl({ segments, activeIndex = 0, onChange, fontSize = 12.5, style }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={[styles.wrap, style]}>
      {segments.map((seg, i) => {
        const active = i === activeIndex;
        return (
          <TouchableOpacity
            key={i}
            activeOpacity={0.8}
            onPress={() => onChange && onChange(i)}
            style={[styles.segment, active ? styles.active : null]}
          >
            <Text
              style={{
                fontSize,
                fontFamily: active ? FONTS.extrabold : FONTS.bold,
                color: active ? colors.white : colors.textSecondary,
                textAlign: 'center',
              }}
            >
              {seg}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: 12,
      backgroundColor: colors.surface,
      padding: 3,
    },
    segment: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    active: {
      backgroundColor: colors.blue,
    },
  });
