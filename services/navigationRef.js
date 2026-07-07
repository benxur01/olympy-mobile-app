import { createNavigationContainerRef } from '@react-navigation/native';

// Ekran komponentlaridan tashqarida (masalan, axios interceptor'ida token
// yaroqsiz bo'lganda) navigatsiyani boshqarish uchun global ref.
export const navigationRef = createNavigationContainerRef();

export function resetToLogin() {
  if (navigationRef.isReady()) {
    // Container ref'ining resetRoot metodi ildiz stack holatini to'liq
    // almashtiradi — Login'ga qaytamiz.
    navigationRef.resetRoot({ index: 0, routes: [{ name: 'Login' }] });
  }
}
