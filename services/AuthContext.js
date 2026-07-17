import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, notificationsApi, setTokens, setAuthHandlers } from './api';
import { resetToLogin } from './navigationRef';
import { registerForPushNotificationsAsync } from './pushNotifications';
import { secureGet, secureSet, secureDelete } from './secureStorage';
import { devLog } from './logger';

const TOKEN_KEY = 'olympy_token';
const REFRESH_KEY = 'olympy_refresh';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  // Tarmoq xatosi bilan sessiya tiklanmasa — token saqlanib, foydalanuvchi
  // offline/retry holatini ko'rishi mumkin (butunlay logout emas).
  const [sessionError, setSessionError] = useState(null);

  const persistTokens = async (token, refresh) => {
    setTokens({ token, refresh });
    if (token) {
      await secureSet(TOKEN_KEY, token);
    } else {
      await secureDelete(TOKEN_KEY);
    }
    if (refresh) {
      await secureSet(REFRESH_KEY, refresh);
    } else {
      await secureDelete(REFRESH_KEY);
    }
  };

  const loadMe = useCallback(async () => {
    const { data } = await authApi.me();
    const me = data?.user || data;
    setUser(me);
    setSessionError(null);
    return me;
  }, []);

  // Foydalanuvchi autentifikatsiyadan o'tgach (login/register yoki sessiya
  // tiklangach) Expo push tokenni olib backendga ro'yxatdan o'tkazamiz.
  // Bu butunlay best-effort: xato bo'lsa ham auth oqimini bloklamaydi va
  // foydalanuvchiga xato ko'rsatmaydi (backend token bo'yicha idempotent).
  const registerPushToken = useCallback(async () => {
    try {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        await notificationsApi.subscribePush(token);
      }
    } catch (e) {
      devLog('[push] Tokenni ro\'yxatdan o\'tkazib bo\'lmadi:', e?.message || e);
    }
  }, []);

  // Axios interceptor bilan bog'lash: token jimgina yangilanganda diskka
  // saqlaymiz; refresh butunlay muvaffaqiyatsiz bo'lsa sessiyani tozalab
  // Login'ga qaytaramiz (item 17).
  useEffect(() => {
    setAuthHandlers({
      onRefresh: (token, refresh) => {
        if (token) secureSet(TOKEN_KEY, token).catch(() => {});
        if (refresh) secureSet(REFRESH_KEY, refresh).catch(() => {});
      },
      onFailure: async () => {
        await persistTokens(null, null);
        setUser(null);
        setSessionError(null);
        resetToLogin();
      },
    });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [token, refresh] = await Promise.all([
          secureGet(TOKEN_KEY),
          secureGet(REFRESH_KEY),
        ]);
        if (token) {
          setTokens({ token, refresh });
          try {
            await loadMe();
            registerPushToken();
          } catch (e) {
            const status = e?.response?.status;
            // 401/403 — token yaroqsiz: tozalaymiz.
            if (status === 401 || status === 403) {
              await persistTokens(null, null);
              setUser(null);
              setSessionError(null);
            } else {
              // Tarmoq / 5xx: tokenni diskda qoldiramiz, keyinroq qayta urinish.
              setTokens({ token, refresh });
              setUser(null);
              setSessionError(e);
            }
          }
        }
      } catch (e) {
        // Storage o'qish xatosi — sessiyasiz davom.
        setTokens({});
        setSessionError(null);
      } finally {
        setInitializing(false);
      }
    })();
  }, [loadMe, registerPushToken]);

  const retrySession = useCallback(async () => {
    const token = await secureGet(TOKEN_KEY);
    const refresh = await secureGet(REFRESH_KEY);
    if (!token) {
      setSessionError(null);
      return null;
    }
    setTokens({ token, refresh });
    try {
      const me = await loadMe();
      registerPushToken();
      return me;
    } catch (e) {
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        await persistTokens(null, null);
        setUser(null);
        setSessionError(null);
      } else {
        setSessionError(e);
      }
      throw e;
    }
  }, [loadMe, registerPushToken]);

  const login = async (phone, password, totpCode) => {
    const { data } = await authApi.login(phone, password, totpCode);
    if (data?.requires_2fa) {
      return { requires2fa: true };
    }
    await persistTokens(data.token, data.refresh);
    const me = data.user || (await loadMe());
    setUser(me);
    registerPushToken();
    return { user: me };
  };

  const register = async (payload) => {
    const { data } = await authApi.register(payload);
    await persistTokens(data.token, data.refresh);
    const me = data.user || (await loadMe());
    setUser(me);
    registerPushToken();
    return { user: me };
  };

  // Tashkilot/o'quv markaz ro'yxatdan o'tishi — direktor hisobi + markaz.
  // Backend odatdagi register bilan bir xil {token, refresh, user, center}
  // qaytaradi, shuning uchun tokenlarni xuddi register kabi saqlaymiz.
  const registerOrganization = async (payload) => {
    const { data } = await authApi.registerOrganization(payload);
    await persistTokens(data.token, data.refresh);
    const me = data.user || (await loadMe());
    setUser(me);
    registerPushToken();
    return { user: me };
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      // offline logout — baribir tozalaymiz
    }
    await persistTokens(null, null);
    setUser(null);
    setSessionError(null);
  };

  // Parol o'zgartirilganda backend yangi JWT juftligini qaytaradi (eski
  // tokenlar bekor qilinadi). Ularni saqlab qo'yamiz, aks holda keyingi
  // so'rovlar 401 bo'lardi.
  const applyAuthTokens = async (token, refresh) => {
    if (!token) return;
    await persistTokens(token, refresh);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        initializing,
        sessionError,
        login,
        register,
        registerOrganization,
        logout,
        reloadMe: loadMe,
        retrySession,
        applyAuthTokens,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
