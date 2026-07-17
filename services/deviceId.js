/**
 * Barqaror qurilma identifikatori (imtihon parallel-device himoyasi uchun).
 * Bir marta yaratiladi va AsyncStorage'da saqlanadi.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = 'olympy_device_id';

let cachedId = null;
let inflight = null;

function generateId() {
  const rand = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const ts = Date.now().toString(36);
  return `rn-${rand}${ts}`.slice(0, 48);
}

export async function getStableDeviceId() {
  if (cachedId) return cachedId;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (existing && existing.length >= 8) {
        cachedId = existing;
        return cachedId;
      }
    } catch (e) {
      // generate new
    }
    const id = generateId();
    try {
      await AsyncStorage.setItem(DEVICE_ID_KEY, id);
    } catch (e) {
      // memory-only for this session
    }
    cachedId = id;
    return id;
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}
