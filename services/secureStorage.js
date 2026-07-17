/**
 * Token / maxfiy qiymatlar saqlash.
 * Prefer: expo-secure-store (Keystore/Keychain).
 * Fallback: AsyncStorage — agar native modul yo'q yoki xato (eski APK).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

let SecureStore = null;
try {
  // eslint-disable-next-line global-require
  SecureStore = require('expo-secure-store');
} catch (e) {
  SecureStore = null;
}

const secureAvailable = async () => {
  if (!SecureStore?.isAvailableAsync) return false;
  try {
    return !!(await SecureStore.isAvailableAsync());
  } catch (e) {
    return false;
  }
};

export async function secureGet(key) {
  try {
    if (await secureAvailable()) {
      const v = await SecureStore.getItemAsync(key);
      if (v != null) return v;
    }
  } catch (e) {
    // fall through to AsyncStorage
  }
  try {
    return await AsyncStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

export async function secureSet(key, value) {
  if (value == null) {
    return secureDelete(key);
  }
  let secureOk = false;
  try {
    if (await secureAvailable()) {
      await SecureStore.setItemAsync(key, String(value));
      secureOk = true;
    }
  } catch (e) {
    secureOk = false;
  }
  // SecureStore yozilganda AsyncStorage'dagi eski nusxani tozalaymiz
  // (oldingi versiyadan migratsiya).
  try {
    if (secureOk) {
      await AsyncStorage.removeItem(key);
    } else {
      await AsyncStorage.setItem(key, String(value));
    }
  } catch (e) {
    if (!secureOk) throw e;
  }
}

export async function secureDelete(key) {
  try {
    if (await secureAvailable()) {
      await SecureStore.deleteItemAsync(key);
    }
  } catch (e) {
    // ignore
  }
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    // ignore
  }
}
