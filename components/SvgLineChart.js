import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polyline, Polygon, Circle, Line } from 'react-native-svg';
import { useTheme } from '../services/ThemeContext';

// Kutubxonasiz oddiy chiziqli grafik (websaytdagi SvgLineChart ekvivalenti).
// `points` = [{ value (0..100) }]. Kenglik konteynerdan onLayout orqali olinadi,
// shu bois grafik ota-View eniga moslashadi. O'q/gridline/tooltip yo'q — faqat
// chiziq, yengil to'ldirish va har nuqtada nuqtacha.
export default function SvgLineChart({ points = [], height = 150, stroke, style }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const lineColor = stroke || colors.blue;

  const padX = 10;
  const padTop = 12;
  const padBottom = 12;
  const innerW = Math.max(0, width - padX * 2);
  const innerH = height - padTop - padBottom;
  const n = points.length;

  const xAt = (i) => (n <= 1 ? width / 2 : padX + (innerW * i) / (n - 1));
  const yAt = (v) => padTop + innerH - (innerH * Math.max(0, Math.min(100, v))) / 100;

  const coords = points.map((p, i) => `${xAt(i).toFixed(1)},${yAt(p.value || 0).toFixed(1)}`);
  const areaCoords = width
    ? `${padX},${padTop + innerH} ${coords.join(' ')} ${padX + innerW},${padTop + innerH}`
    : '';

  return (
    <View style={[styles.wrap, { height }, style]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && n > 0 ? (
        <Svg width={width} height={height}>
          {[0, 50, 100].map((g) => (
            <Line
              key={g}
              x1={padX}
              x2={padX + innerW}
              y1={yAt(g)}
              y2={yAt(g)}
              stroke={colors.border}
              strokeWidth={1}
            />
          ))}
          {n > 1 ? <Polygon points={areaCoords} fill={lineColor} fillOpacity={0.12} /> : null}
          {n > 1 ? (
            <Polyline
              points={coords.join(' ')}
              fill="none"
              stroke={lineColor}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}
          {points.map((p, i) => (
            <Circle
              key={i}
              cx={xAt(i)}
              cy={yAt(p.value || 0)}
              r={3.5}
              fill={lineColor}
              stroke={colors.surface}
              strokeWidth={1.5}
            />
          ))}
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
});
