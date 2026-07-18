/**
 * Deep link + push navigatsiya konfiguratsiyasi.
 * Scheme: olympy://  (app.json / AndroidManifest)
 *
 * Misollar:
 *   olympy://notifications
 *   olympy://premium
 *   olympy://exam/123
 *   olympy://duel/45
 *   olympy://leaderboard
 */
export const linkingConfig = {
  prefixes: ['olympy://', 'https://prolymp.uz', 'https://www.prolymp.uz'],
  config: {
    screens: {
      Splash: 'splash',
      Login: 'login',
      Register: 'register',
      ForgotPassword: 'forgot-password',
      StudentTabs: {
        path: 'student',
        screens: {
          Asosiy: 'home',
          Musobaqalar: 'events',
          Mashq: 'practice',
          Natijalar: 'results',
          Profil: 'profile',
        },
      },
      TeacherTabs: 'teacher',
      ManagerTabs: 'manager',
      OwnerDashboard: 'owner',
      Admin: 'admin',
      Parent: 'parent',
      Notifications: 'notifications',
      Premium: 'premium',
      Shop: 'shop',
      Leaderboard: 'leaderboard',
      Progress: 'progress',
      Analytics: 'analytics',
      AiChat: 'ai-chat',
      CertVerify: 'cert/:certUuid?',
      Exam: 'exam/:olympiadId',
      MockExam: 'mock/:mockId',
      DuelList: 'duels',
      DuelPlay: 'duel/:duelId',
      DuelResult: 'duel/:duelId/result',
      JoinCenter: 'join-center',
      CenterRanking: 'center-ranking',
      Profile: 'settings/profile',
      ChangePassword: 'settings/password',
      TwoFactor: 'settings/2fa',
    },
  },
};

/**
 * Push notification data → stack route.
 * Backend odatda { type, id, ... } yuboradi.
 */
export function routeFromPushData(data) {
  if (!data || typeof data !== 'object') return null;
  const type = String(data.type || data.screen || data.route || '').toLowerCase();
  const id = data.id || data.olympiad_id || data.duel_id || data.olympiadId;

  switch (type) {
    case 'notification':
    case 'notifications':
      return { name: 'Notifications' };
    case 'premium':
    case 'billing':
      return { name: 'Premium' };
    case 'olympiad':
    case 'exam':
    case 'event':
      if (id) return { name: 'Exam', params: { olympiadId: id, title: data.title } };
      return { name: 'StudentTabs', params: { screen: 'Musobaqalar' } };
    case 'duel':
      if (id) return { name: 'DuelPlay', params: { duelId: id } };
      return { name: 'DuelList' };
    case 'leaderboard':
    case 'rating':
      return { name: 'Leaderboard' };
    case 'shop':
      return { name: 'Shop' };
    case 'ai':
    case 'support':
    case 'chat':
      return { name: 'AiChat' };
    case 'parent':
      return { name: 'Parent' };
    case 'analytics':
      return { name: 'Analytics' };
    default:
      if (data.olympiad_id || data.olympiadId) {
        return {
          name: 'Exam',
          params: { olympiadId: data.olympiad_id || data.olympiadId, title: data.title },
        };
      }
      return { name: 'Notifications' };
  }
}
