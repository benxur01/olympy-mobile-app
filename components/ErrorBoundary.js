import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FONTS } from '../constants/typography';

/**
 * React error boundary — JS xatolikda butun app oq ekran o'rniga
 * qayta urinish UI ko'rsatadi.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Doim logga yozamiz (dev bo'lmasa ham) — aks holda production'da xato
    // sababini adb logcat orqali ham bilib bo'lmaydi.
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      const colors = this.props.colors || {
        bg: '#0B1220',
        text: '#EDF2FA',
        textSecondary: '#8FA0BC',
        blue: '#2E90FA',
        white: '#FFFFFF',
        surface: '#131C2E',
        border: '#1E2A44',
      };
      return (
        <View style={[styles.wrap, { backgroundColor: colors.bg }]} accessibilityRole="alert">
          <Text style={[styles.title, { color: colors.text }]}>Nimadir xato ketdi</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            Ilova kutilmagan xatolik tufayli to‘xtadi. Qayta urinib ko‘ring.
          </Text>
          {typeof __DEV__ !== 'undefined' && __DEV__ && this.state.error?.message ? (
            <Text style={[styles.dev, { color: colors.textSecondary }]} numberOfLines={6}>
              {String(this.state.error.message)}
            </Text>
          ) : null}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Qayta urinish"
            style={[styles.btn, { backgroundColor: colors.blue }]}
            onPress={this.handleRetry}
            activeOpacity={0.85}
          >
            <Text style={[styles.btnText, { color: colors.white }]}>Qayta urinish</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: FONTS.extrabold,
    textAlign: 'center',
  },
  sub: {
    fontSize: 14,
    fontFamily: FONTS.semibold,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 320,
  },
  dev: {
    fontSize: 11,
    fontFamily: FONTS.regular || FONTS.semibold,
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.8,
  },
  btn: {
    marginTop: 16,
    height: 48,
    paddingHorizontal: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 15,
    fontFamily: FONTS.extrabold,
  },
});
