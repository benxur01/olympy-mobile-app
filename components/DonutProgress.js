import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../services/ThemeContext';

export default function DonutProgress({
  size = 62,
  radius,
  strokeWidth = 7,
  progress = 0,
  color,
  track,
  children,
}) {
  const { colors } = useTheme();
  const r = radius || (size - strokeWidth * 2) / 2 + strokeWidth / 2;
  const c = 2 * Math.PI * r;
  const filled = (progress / 100) * c;
  // Halqa teshigining ichki diametri — kontent (raqam/label) shundan
  // kengroq bo'lib ketsa, halqa chizig'idan tashqariga chiqib ketadi.
  const innerRadius = r - strokeWidth / 2;
  const safeContentSize = innerRadius * 2;
  return (
    <View style={{ width: size, height: size, overflow: 'hidden' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track || colors.barIdle} strokeWidth={strokeWidth} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color || colors.green}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[styles.center, { maxWidth: safeContentSize, maxHeight: safeContentSize }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
