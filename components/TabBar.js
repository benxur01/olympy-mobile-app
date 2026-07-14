import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS } from '../constants/typography';
import { useTheme } from '../services/ThemeContext';

// Balandligi (icon qatori) — siljuvchi indicator ham shu balandlikda.
const ICON_ROW_H = 34;
// Navbar tepasidagi so'nish (fade) zonasi balandligi — scroll qilingan
// kontent kartaning qattiq chegarasiga birdaniga urilib qolmasin, undan
// oldinroq asta-sekin ekran foniga aralashib bora boshlasin deb qo'yilgan.
const FADE_HEIGHT = 48;
// Tab bar balandligi (insets.bottom'siz, taxminiy) — endi u kontent ustida
// suzib turgani uchun ekranlardagi FAB kabi elementlar shu qiymat + insets
// asosida navbar tagida qolib ketmasligi kerak.
export const TAB_BAR_CONTENT_HEIGHT = 74;
// Pill kengligini o'lchangan tab kengligidan chiqaramiz (barcha tab flex:1 —
// bir xil kenglikda, shu bois pill kengligi tab almashganda sakramaydi).
const pillWidth = (itemW) => Math.min(64, Math.max(48, itemW - 8));

// Tab ekranlaridagi ScrollView/FlatList pastki bo'shlig'i uchun — shunda
// ro'yxat oxirigacha scroll qilinganda oxirgi element navbar ostida
// qolib qolmay, undan tepada to'liq ko'rinadigan bo'ladi.
export function useTabBarSpacing(extra = 24) {
  const insets = useSafeAreaInsets();
  return TAB_BAR_CONTENT_HEIGHT + Math.max(insets.bottom, 14) + extra;
}

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
      <View pointerEvents="none" style={styles.fade}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="tabBarFade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.bg} stopOpacity={0} />
              <Stop offset="1" stopColor={colors.bg} stopOpacity={0.95} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#tabBarFade)" />
        </Svg>
      </View>
      <View style={styles.cardShadow}>
        <BlurView intensity={60} tint={isDark ? 'dark' : 'light'} style={styles.card}>
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
                  {item.icon(color, active)}
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
        </BlurView>
      </View>
    </View>
  );
}

const makeStyles = (colors, isDark) =>
  StyleSheet.create({
    // Kontent ustida suzib turadi (o'z joyini egallamaydi) — scroll pastga
    // borganda oxirgi elementlar shaffof/blur karta orqasidan ko'rinib turadi.
    wrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'transparent',
      paddingHorizontal: 16,
      paddingTop: 6,
    },
    // Kartaning qattiq yuqori chegarasidan oldinroq boshlanadigan so'nish
    // zonasi — wrap'ning o'zidan yuqoriga chiqib turadi (top manfiy) va
    // uning gorizontal paddingini ham qoplaydi (left/right manfiy), shunda
    // butun ekran kengligida bir xilda so'nadi.
    fade: {
      position: 'absolute',
      top: -FADE_HEIGHT,
      left: -16,
      right: -16,
      height: FADE_HEIGHT,
    },
    // Soya alohida qatlamda — chunki BlurView'dagi overflow:'hidden' bilan
    // bitta stilda bo'lsa, Android soyani ham kesib tashlaydi. Android'da
    // elevation soyasi faqat shaffof bo'lmagan fonli View'da chiziladi —
    // shuning uchun bu qatlamga navBg beriladi (ustidagi BlurView xuddi shu
    // shaklda uni to'liq qoplab turadi, shu bois ko'rinmaydi, faqat soyasi
    // chiqadi).
    cardShadow: {
      borderRadius: 26,
      backgroundColor: colors.navBg,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.4 : 0.14,
      shadowRadius: 20,
      elevation: 40,
    },
    // "Suzuvchi" karta — yumaloq burchak, shaffof BlurView foni (Telegram
    // uslubidagi "muzlatilgan shisha"); ustiga o'qish uchun yengil tint
    // qo'yilgan, chunki sof blur turli fonlarda kontrastni pasaytiradi.
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: isDark ? 'rgba(15,24,48,0.98)' : 'rgba(255,255,255,0.98)',
      overflow: 'hidden',
      borderRadius: 26,
      paddingTop: 10,
      paddingBottom: 8,
      paddingHorizontal: 6,
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
