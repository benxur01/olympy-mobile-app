import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FONTS } from '../constants/typography';
import { useTheme } from '../services/ThemeContext';

export default function SegmentedControl({ segments, icons, activeIndex = 0, onChange, fontSize = 12.5, compact = false, style }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={[styles.wrap, style]}>
      {segments.map((seg, i) => {
        const active = i === activeIndex;
        const iconColor = active ? colors.white : colors.textSecondary;
        return (
          <TouchableOpacity
            key={i}
            activeOpacity={0.8}
            onPress={() => onChange && onChange(i)}
            style={[styles.segment, compact ? styles.segmentCompact : null, active ? styles.active : null]}
          >
            {icons && icons[i] ? icons[i](iconColor) : null}
            <Text
              style={{
                fontSize,
                fontFamily: active ? FONTS.extrabold : FONTS.bold,
                color: iconColor,
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
      flexDirection: 'row',
      gap: 6,
      paddingVertical: 8,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentCompact: {
      gap: 4,
      paddingVertical: 5,
    },
    active: {
      backgroundColor: colors.blue,
    },
  });
