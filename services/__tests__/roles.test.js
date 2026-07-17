/**
 * Minimal roles unit tests:
 *   npm test
 */
const {
  routeForUser,
  canAccessRoute,
  allowedRoutesForUser,
  availableShellsForUser,
  PUBLIC_ROUTES,
} = require('../roles');

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assert failed');
}

// routeForUser
assert(routeForUser(null) === 'Login', 'null → Login');
assert(
  routeForUser({ is_platform_admin: true, roles: [] }) === 'Admin',
  'platform admin'
);
assert(routeForUser({ roles: ['owner'] }) === 'OwnerDashboard', 'owner');
assert(routeForUser({ roles: ['director'] }) === 'OwnerDashboard', 'director');
assert(routeForUser({ roles: ['manager', 'teacher'] }) === 'ManagerTabs', 'manager > teacher');
assert(routeForUser({ roles: ['teacher'] }) === 'TeacherTabs', 'teacher');
assert(routeForUser({ roles: ['parent'] }) === 'Parent', 'parent');
assert(
  routeForUser({
    roles: [],
    roles_detail: { student: { status: 'pending', centerId: 1 } },
  }) === 'PendingAccess',
  'pending access'
);
assert(
  routeForUser({ roles: ['student'], onboarding_completed: false }) === 'Onboarding',
  'onboarding'
);
assert(
  routeForUser({ roles: ['student'], onboarding_completed: true }) === 'StudentTabs',
  'student'
);

// multi-role shells
const multi = availableShellsForUser({
  roles: ['teacher', 'parent', 'student'],
  onboarding_completed: true,
});
assert(multi.length >= 3, 'multi shells count');
assert(multi.some((s) => s.route === 'TeacherTabs'), 'has teacher');
assert(multi.some((s) => s.route === 'Parent'), 'has parent');
assert(multi.some((s) => s.route === 'StudentTabs'), 'has student');

// canAccessRoute — multi-role user can open both shells
const teacherParent = { roles: ['teacher', 'parent'], onboarding_completed: true };
assert(canAccessRoute(teacherParent, 'TeacherTabs') === true, 'teacher shell');
assert(canAccessRoute(teacherParent, 'Parent') === true, 'parent shell for multi');
assert(canAccessRoute(null, 'Login') === true, 'public login');
assert(canAccessRoute(null, 'Admin') === false, 'admin requires auth');
assert(canAccessRoute({ roles: ['student'], onboarding_completed: true }, 'Admin') === false, 'student no admin');
assert(canAccessRoute({ is_platform_admin: true, roles: [] }, 'Admin') === true, 'admin ok');
assert(canAccessRoute({ roles: ['student'], onboarding_completed: true }, 'Exam') === true, 'student exam');
assert(PUBLIC_ROUTES.has('CertVerify'), 'cert public');

const ownerAllowed = allowedRoutesForUser({ roles: ['owner'] });
assert(ownerAllowed.has('OwnerDashboard'), 'owner dashboard allowed');
assert(!ownerAllowed.has('Admin'), 'owner no admin');

console.log('roles.test.js: OK');
