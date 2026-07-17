import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { devLog } from './logger';

// Foreground'da kelgan bildirishnomalar jimgina yutilib ketmasligi uchun banner
// ko'rsatamiz. Ushbu SDK versiyasida NotificationBehavior shakli o'zgargan:
// eski `shouldShowAlert` deprecated bo'lib, o'rniga `shouldShowBanner` va
// `shouldShowList` maydonlari kutiladi (node_modules/expo-notifications
// tiplaridan tasdiqlangan). Handler modul yuklanganda bir marta o'rnatiladi.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Expo push tokenni olishga urinadi. Bu best-effort operatsiya — hech qachon
// xato tashlamaydi, muvaffaqiyatsizlikda yoki ruxsat berilmasa null qaytaradi.
export async function registerForPushNotificationsAsync() {
  try {
    // Push tokenlar simulyator/web'da ishlamaydi (Expo cheklovi) — o'tkazib
    // yuboramiz.
    if (!Device.isDevice) {
      devLog('[push] Fizik qurilma emas — push tokenni o\'tkazib yuboramiz.');
      return null;
    }

    // Android'da kanal talab qilinadi; iOS'da zararsiz no-op.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      devLog('[push] Bildirishnoma ruxsati berilmadi.');
      return null;
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;
    if (!projectId) {
      devLog('[push] EAS projectId topilmadi — token olib bo\'lmadi.');
      return null;
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenResponse?.data ?? null;
  } catch (e) {
    devLog('[push] registerForPushNotificationsAsync xatosi:', e?.message || e);
    return null;
  }
}
