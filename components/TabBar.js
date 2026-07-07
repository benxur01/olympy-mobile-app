import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS } from '../constants/typography';
import { useTheme } from '../services/ThemeContext';

// Balandligi (icon qatori) — siljuvchi indicator ham shu balandlikda.
const ICON_ROW_H = 34;
// Pill kengligini o'lchangan tab kengligidan chiqaramiz (barcha tab flex:1 —
// bir xil kenglikda, shu bois pill kengligi tab almashganda sakramaydi).
const pillWidth = (itemW) => Math.min(64, Math.max(48, itemW - 8));

export default function TabBar({ items, activeKey, onPress, style }) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors, isDark);

  const activeIndex = Math.max(
    0,
    items.findIndex((it) => it.key === activeKey)
  );

  // Har bir tab tugmasining o'lchamlari (index -> {x, width}) onLayout orqali.
  const [layouts, setLayouts] = useState({});
  const [ready, setReady] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;
  const prevIndexRef = useRef(activeIndex);

  const activeLayout = layouts[activeIndex];
  const indicatorW = activeLayout ? pillWidth(activeLayout.width) : 56;

  useEffect(() => {
    if (!activeLayout) return;
    const target = activeLayout.x + (activeLayout.width - pillWidth(activeLayout.width)) / 2;
    const indexChanged = prevIndexRef.current !== activeIndex;
    prevIndexRef.current = activeIndex;

    if (!ready) {
      // Birinchi o'lchovda — sakrashsiz to'g'ri joyga qo'yamiz.
      translateX.setValue(target);
      setReady(true);
      return;
    }
    if (indexChanged) {
      // Tab almashdi — silliq siljish (native driver, translateX faqat).
      Animated.spring(translateX, {
        toValue: target,
        useNativeDriver: true,
        stiffness: 170,
        damping: 18,
        mass: 1,
      }).start();
    } else {
      // Layout / orientatsiya o'zgardi — animatsiyasiz moslaymiz.
      translateX.setValue(target);
    }
  }, [activeIndex, activeLayout, ready, translateX]);

  const handleItemLayout = (index) => (e) => {
    const { x, width } = e.nativeEvent.layout;
    setLayouts((prev) => {
      const cur = prev[index];
      if (cur && cur.x === x && cur.width === width) return prev;
      return { ...prev, [index]: { x, width } };
    });
  };

  return (
    <View
      style={[
        styles.wrap,
        { paddingBottom: Math.max(insets.bottom, 14) },
        style,
      ]}
    >
      <View style={styles.card}>
        {/* Siljib yuruvchi active-indicator (pill) */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            {
              width: indicatorW,
              opacity: ready ? 1 : 0,
              transform: [{ translateX }],
            },
          ]}
        />

        {items.map((item, index) => {
          const active = index === activeIndex;
          const color = active ? colors.blue : colors.textMuted;
          return (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.7}
              onPress={() => onPress && onPress(item.key)}
              onLayout={handleItemLayout(index)}
              style={styles.item}
            >
              <View style={styles.iconBox}>
                {item.icon(color)}
                {item.dot ? <View style={styles.dot} /> : null}
              </View>
              <Text
                style={[
                  styles.label,
                  { color, fontFamily: active ? FONTS.extrabold : FONTS.bold },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (colors, isDark) =>
  StyleSheet.create({
    // Tashqi konteyner — layout joyini egallaydi (kontent uning tepasida qoladi),
    // lekin foni shaffof: karta pastdan/yon tomondan suzib turgandek ko'rinadi.
    wrap: {
      backgroundColor: 'transparent',
      paddingHorizontal: 16,
      paddingTop: 6,
    },
    // "Suzuvchi" karta — yumaloq burchak + soya.
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.navBg,
      borderRadius: 26,
      paddingTop: 10,
      paddingBottom: 8,
      paddingHorizontal: 6,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.4 : 0.14,
      shadowRadius: 20,
      elevation: 12,
    },
    item: {
      flex: 1,
      alignItems: 'center',
      gap: 3,
    },
    // Siljuvchi pill — icon qatori orqasida (top: paddingTop bilan mos).
    indicator: {
      position: 'absolute',
      left: 0,
      top: 10,
      height: ICON_ROW_H,
      borderRadius: 999,
      backgroundColor: colors.secondaryContainer,
    },
    iconBox: {
      height: ICON_ROW_H,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dot: {
      position: 'absolute',
      top: -3,
      right: -5,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.red,
      borderWidth: 2,
      borderColor: colors.navBg,
    },
    label: {
      fontSize: 10,
    },
  });
