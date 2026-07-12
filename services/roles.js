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
  // Markazga a'zolik arizasi bergan, ammo hali tasdiqlanmagan (yoki rad etilgan)
  // foydalanuvchi: `roles` (faqat tasdiqlangan rollar) bo'sh, biroq
  // `roles_detail`da kutilayotgan/rad etilgan ariza bor. Ularni bo'sh
  // StudentTabs o'rniga bloklovchi "ariza ko'rib chiqilmoqda" ekraniga
  // yo'naltiramiz. Muhim: markazsiz to'g'ridan-to'g'ri ro'yxatdan o'tgan
  // yangi o'quvchida `roles_detail` umuman bo'sh bo'ladi — u bu tekshiruvdan
  // o'tib, quyidagi Onboarding oqimida qoladi.
  if (roles.length === 0) {
    const rd = user.roles_detail || {};
    const awaitingReview = Object.values(rd).some(
      (d) => d && (d.status === 'pending' || d.status === 'rejected')
    );
    if (awaitingReview) return 'PendingAccess';
  }
  // Yangi ro'yxatdan o'tgan o'quvchi (onboarding tugallanmagan) avval fan/daraja
  // tanlash ekraniga tushadi, keyin StudentTabs'ga o'tadi. `onboarding_completed`
  // /api/me/ javobida keladi; false yoki mavjud bo'lmasa — Onboarding.
  if (user.onboarding_completed === false) return 'Onboarding';
  return 'StudentTabs';
}
