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

export function routeForUser(user) {
  if (!user) return 'Login';
  const roles = user.roles || [];
  const has = (r) => roles.includes(r);
  if (user.is_platform_admin || has('platform_admin')) return 'Admin';
  if (has('owner') || has('director')) return 'OwnerDashboard';
  // Menejer (markaz menejeri) o'qituvchidan kengroq alohida panelga tushadi:
  // markaz statistikasi, o'quvchi boshqaruvi, natijalar/analitika, nazorat.
  // Bir foydalanuvchida ham manager, ham teacher roli bo'lsa — kengroq
  // manager panelini ustun qo'yamiz.
  if (has('manager')) return 'ManagerTabs';
  if (has('teacher')) return 'TeacherTabs';
  if (has('parent')) return 'Parent';
  // Yangi ro'yxatdan o'tgan o'quvchi (onboarding tugallanmagan) avval fan/daraja
  // tanlash ekraniga tushadi, keyin StudentTabs'ga o'tadi. `onboarding_completed`
  // /api/me/ javobida keladi; false yoki mavjud bo'lmasa — Onboarding.
  if (user.onboarding_completed === false) return 'Onboarding';
  return 'StudentTabs';
}
