export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL || 'https://olympy-api.onrender.com'
).replace(/\/+$/, '');

export const API_TIMEOUT = 20000;

// Maxfiylik siyosati (Privacy Policy) URL'i. Google Play talabi.
// Hostlangan sahifa: https://prolymp.uz/privacy
export const PRIVACY_POLICY_URL = 'https://prolymp.uz/privacy';

// Foydalanish shartlari (ixtiyoriy) — mavjud bo'lsa profil sozlamalarida ko'rsatiladi.
export const TERMS_URL = 'https://prolymp.uz/terms';

// Web ilova manzili — referral (do'stni taklif qilish) havolasi shu yerga
// `?ref=CODE` bilan yo'naltiriladi (websayt bu paramni o'qib ro'yxatdan o'tishda
// bonus coin beradi).
export const WEB_APP_URL = 'https://prolymp.uz';
