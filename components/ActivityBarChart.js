import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FONTS } from '../constants/typography';
import { useTheme } from '../services/ThemeContext';

export default function ActivityBarChart({ data, height = 110, gap = 9, barRadius = 6, style }) {
  const { colors } = useTheme();
  const styles = makeStyles();
  return (
    <View style={[styles.row, { height, gap }, style]}>
      {data.map((item, i) => (
        <View key={i} style={styles.col}>
          <View
            style={[
              {
                width: '100%',
                height: `${item.value}%`,
                borderTopLeftRadius: barRadius,
                borderTopRightRadius: barRadius,
                backgroundColor: item.color || colors.blue,
              },
              item.glow
                ? {
                    shadowColor: colors.blue,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.22,
                    shadowRadius: 10,
                    elevation: 3,
                  }
                : null,
            ]}
          />
          <Text
            style={[
              styles.label,
              { color: item.active ? colors.blueLight : colors.textMuted },
              item.active ? { fontFamily: FONTS.extrabold } : null,
            ]}
          >
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const makeStyles = () =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    col: {
      flex: 1,
      height: '100%',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 6,
    },
    label: {
      fontSize: 9.5,
      fontFamily: FONTS.bold,
    },
  });
