// Foydalanuvchining boshqaruv roli (owner/manager/teacher) tegishli bo'lgan
// markaz ID'sini `roles_detail` dan topadi. O'qituvchi/menejer ekranlari
// (arizalar, nazorat, essay) shu markaz bo'yicha ma'lumot so'raydi.
export function centerIdForUser(user) {
  const rd = user?.roles_detail || {};
  for (const role of ['owner', 'director', 'manager', 'teacher']) {
    if (rd[role] && rd[role].centerId) return rd[role].centerId;
  }
  for (const key of Object.keys(rd)) {
    if (rd[key] && rd[key].centerId) return rd[key].centerId;
  }
  return null;
}

/** Backend JSONField odatda list, lekin himoya uchun arrayga normalizatsiya. */
export function normalizeRoles(user) {
  const raw = user?.roles;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw) return [raw];
  return [];
}

/** Default (ustuvor) shell — login/splash yo'nalishi. */
export function routeForUser(user) {
  if (!user) return 'Login';
  const shells = availableShellsForUser(user);
  if (shells.length) return shells[0].route;
  return 'StudentTabs';
}

/**
 * Foydalanuvchi almashtira oladigan panellar (multi-role).
 * Tartib = ustuvorlik (birinchi = default home).
 */
export function availableShellsForUser(user) {
  if (!user) return [];
  const roles = normalizeRoles(user);
  const has = (r) => roles.includes(r);
  const shells = [];

  if (user.is_platform_admin || has('platform_admin')) {
    shells.push({ key: 'admin', label: 'Admin panel', route: 'Admin' });
  }
  if (has('owner') || has('director')) {
    shells.push({ key: 'owner', label: 'Direktor paneli', route: 'OwnerDashboard' });
  }
  if (has('manager')) {
    shells.push({ key: 'manager', label: 'Menejer paneli', route: 'ManagerTabs' });
  }
  if (has('teacher')) {
    shells.push({ key: 'teacher', label: "O'qituvchi paneli", route: 'TeacherTabs' });
  }
  if (has('parent')) {
    shells.push({ key: 'parent', label: 'Ota-ona paneli', route: 'Parent' });
  }

  // Pending / onboarding / student
  if (roles.length === 0) {
    const rd = user.roles_detail || {};
    const awaitingReview = Object.values(rd).some(
      (d) => d && (d.status === 'pending' || d.status === 'rejected')
    );
    if (awaitingReview) {
      shells.push({ key: 'pending', label: 'Ariza holati', route: 'PendingAccess' });
      return shells;
    }
  }
  if (user.onboarding_completed === false && (has('student') || roles.length === 0)) {
    shells.push({ key: 'onboarding', label: 'Boshlash', route: 'Onboarding' });
    return shells;
  }
  // Student shell — student roli yoki boshqa rollar bilan birga
  if (has('student') || shells.length === 0) {
    shells.push({ key: 'student', label: "O'quvchi paneli", route: 'StudentTabs' });
  }

  return shells;
}

/** Public (auth talab qilmaydigan) stack route nomlari. */
export const PUBLIC_ROUTES = new Set([
  'Splash',
  'Login',
  'Register',
  'ForgotPassword',
  'CertVerify',
]);

/**
 * Authenticated bo'lgandan keyin ham ochiq qoladigan umumiy ekranlar
 * (barcha rollar).
 */
const SHARED_AUTH_ROUTES = new Set([
  'Profile',
  'ChangePassword',
  'TwoFactor',
  'Notifications',
  'AiChat',
  'CertVerify',
]);

const SHELL_ROUTES = {
  Admin: [
    'Admin',
    'AdminAnalytics',
    'AdminSupport',
    'AdminSubjects',
  ],
  OwnerDashboard: [
    'OwnerDashboard',
    'OwnerPremium',
    'OwnerShop',
    'CenterRanking',
    'TeacherOlympiads',
    'CreateOlympiad',
    'QuestionCreator',
    'EssayGrading',
    'CodeReview',
    'QuestionDifficulty',
    'Proctoring',
    'Premium',
    'Shop',
    'Leaderboard',
  ],
  ManagerTabs: [
    'ManagerTabs',
    'TeacherOlympiads',
    'CreateOlympiad',
    'QuestionCreator',
    'EssayGrading',
    'CodeReview',
    'QuestionDifficulty',
    'CenterRanking',
    'OwnerPremium',
    'OwnerShop',
  ],
  TeacherTabs: [
    'TeacherTabs',
    'TeacherOlympiads',
    'CreateOlympiad',
    'QuestionCreator',
    'EssayGrading',
    'CodeReview',
    'QuestionDifficulty',
  ],
  Parent: ['Parent'],
  PendingAccess: ['PendingAccess'],
  Onboarding: ['Onboarding', 'StudentTabs'],
  StudentTabs: [
    'StudentTabs',
    'Onboarding',
    'PendingAccess',
    'Exam',
    'MockExam',
    'PracticeRunner',
    'DailyQuestions',
    'Leaderboard',
    'Shop',
    'Premium',
    'MyCompetitions',
    'MyCertificates',
    'Analytics',
    'Progress',
    'Mistakes',
    'JoinCenter',
    'CenterRanking',
    'DuelList',
    'DuelInvite',
    'DuelPlay',
    'DuelResult',
  ],
};

/**
 * Rol bo'yicha ruxsat etilgan asosiy shell + uning stack ekranlari.
 * Multi-role: barcha panellar birlashtiriladi (switcher ishlashi uchun).
 */
export function allowedRoutesForUser(user) {
  if (!user) return new Set(PUBLIC_ROUTES);
  const allowed = new Set(PUBLIC_ROUTES);
  SHARED_AUTH_ROUTES.forEach((r) => allowed.add(r));

  const shells = availableShellsForUser(user);
  shells.forEach((s) => {
    const routes = SHELL_ROUTES[s.route] || [s.route];
    routes.forEach((r) => allowed.add(r));
  });

  // Hech narsa topilmasa — student minimal
  if (shells.length === 0) {
    SHELL_ROUTES.StudentTabs.forEach((r) => allowed.add(r));
  }

  return allowed;
}

/**
 * Berilgan route foydalanuvchiga ruxsat etilganmi.
 * Auth talab qilinadigan route'da user yo'q bo'lsa — false.
 */
export function canAccessRoute(user, routeName) {
  if (!routeName) return false;
  if (PUBLIC_ROUTES.has(routeName)) return true;
  if (!user) return false;
  return allowedRoutesForUser(user).has(routeName);
}
