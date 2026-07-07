import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, setTokens, setAuthHandlers } from './api';
import { resetToLogin } from './navigationRef';

const TOKEN_KEY = 'olympy_token';
const REFRESH_KEY = 'olympy_refresh';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const persistTokens = async (token, refresh) => {
    setTokens({ token, refresh });
    if (token) {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } else {
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
    if (refresh) {
      await AsyncStorage.setItem(REFRESH_KEY, refresh);
    } else {
      await AsyncStorage.removeItem(REFRESH_KEY);
    }
  };

  const loadMe = useCallback(async () => {
    const { data } = await authApi.me();
    const me = data?.user || data;
    setUser(me);
    return me;
  }, []);

  // Axios interceptor bilan bog'lash: token jimgina yangilanganda diskка
  // saqlaymiz; refresh butunlay muvaffaqiyatsiz bo'lsa sessiyani tozalab
  // Login'ga qaytaramiz (item 17).
  useEffect(() => {
    setAuthHandlers({
      onRefresh: (token, refresh) => {
        if (token) AsyncStorage.setItem(TOKEN_KEY, token).catch(() => {});
        if (refresh) AsyncStorage.setItem(REFRESH_KEY, refresh).catch(() => {});
      },
      onFailure: async () => {
        await persistTokens(null, null);
        setUser(null);
        resetToLogin();
      },
    });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [token, refresh] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(REFRESH_KEY),
        ]);
        if (token) {
          setTokens({ token, refresh });
          await loadMe();
        }
      } catch (e) {
        setTokens({});
      } finally {
        setInitializing(false);
      }
    })();
  }, [loadMe]);

  const login = async (phone, password, totpCode) => {
    const { data } = await authApi.login(phone, password, totpCode);
    if (data?.requires_2fa) {
      return { requires2fa: true };
    }
    await persistTokens(data.token, data.refresh);
    const me = data.user || (await loadMe());
    setUser(me);
    return { user: me };
  };

  const register = async (payload) => {
    const { data } = await authApi.register(payload);
    await persistTokens(data.token, data.refresh);
    const me = data.user || (await loadMe());
    setUser(me);
    return { user: me };
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {}
    await persistTokens(null, null);
    setUser(null);
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
      value={{ user, initializing, login, register, logout, reloadMe: loadMe, applyAuthTokens }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
