import React from 'react';
import { Modal, View, Text, TouchableOpacity, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { FONTS } from '../constants/typography';
import { useTheme } from '../services/ThemeContext';

// Header'dagi hamburger tugmasi bosilganda ochiladigan yengil tez-menyu.
// Drawer navigatsiya o'rniga — chapdan pastga ochiluvchi kichik kartochka.
// `items`: [{ label, icon, onPress, danger }]
export default function QuickMenu({ visible, onClose, items = [], title }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { width, height } = useWindowDimensions();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* StyleSheet.absoluteFillObject (top/left/right/bottom: 0) modal ichida
          o'lchamga aylanmayapti — Modal'ning ildiz konteyneri aniq o'lcham
          bermaydi, shu sabab overlay ko'rinmas va bosilmas edi. Ekran
          o'lchamini aniq width/height sifatida berish orqali tuzatildi. */}
      <Pressable
        style={[styles.overlay, { width, height }]}
        onPress={onClose}
      />
      <View style={styles.menu}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {items.map((it, i) => (
          <TouchableOpacity
            key={i}
            activeOpacity={0.75}
            onPress={() => {
              onClose && onClose();
              it.onPress && it.onPress();
            }}
            style={[styles.item, i < items.length - 1 ? styles.itemBorder : null]}
          >
            {it.icon ? <View style={styles.iconBox}>{it.icon}</View> : null}
            <Text style={[styles.label, it.danger ? { color: colors.red } : null]}>{it.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Modal>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      backgroundColor: colors.overlay,
    },
    menu: {
      position: 'absolute',
      top: 96,
      left: 20,
      width: 226,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: 16,
      paddingVertical: 4,
      paddingHorizontal: 4,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 22,
      elevation: 10,
    },
    title: {
      fontSize: 10.5,
      fontFamily: FONTS.extrabold,
      color: colors.textMuted,
      letterSpacing: 0.6,
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 4,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      paddingVertical: 13,
      paddingHorizontal: 12,
      borderRadius: 12,
    },
    itemBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    iconBox: {
      width: 22,
      alignItems: 'center',
    },
    label: {
      fontSize: 13.5,
      fontFamily: FONTS.extrabold,
      color: colors.text,
    },
  });
