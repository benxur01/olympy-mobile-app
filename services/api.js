import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT } from './config';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

let accessToken = null;
let refreshToken = null;

export const setTokens = ({ token, refresh } = {}) => {
  accessToken = token || null;
  refreshToken = refresh || null;
};

// AuthContext bu handlerlarni ro'yxatdan o'tkazadi: token yangilanganda uni
// diskка (AsyncStorage) saqlash va refresh butunlay muvaffaqiyatsiz bo'lganda
// foydalanuvchini chiqarib Login'ga yo'naltirish uchun.
let authHandlers = { onRefresh: null, onFailure: null };
export const setAuthHandlers = (handlers = {}) => {
  authHandlers = { ...authHandlers, ...handlers };
};

client.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && refreshToken && original && !original._retry) {
      original._retry = true;
      try {
        const { data } = await axios.post(
          `${API_BASE_URL}/api/auth/token/refresh/`,
          { refresh: refreshToken },
          { timeout: API_TIMEOUT }
        );
        const newToken = data.token || data.access;
        const newRefresh = data.refresh || refreshToken;
        setTokens({ token: newToken, refresh: newRefresh });
        if (authHandlers.onRefresh) {
          try {
            authHandlers.onRefresh(newToken, newRefresh);
          } catch (e) {}
        }
        original.headers.Authorization = `Bearer ${accessToken}`;
        return client(original);
      } catch (refreshError) {
        // Refresh token ham yaroqsiz — sessiyani tozalab, foydalanuvchini
        // Login ekraniga qaytaramiz (AuthContext orqali).
        setTokens({});
        if (authHandlers.onFailure) {
          try {
            authHandlers.onFailure();
          } catch (e) {}
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (phone, password, totpCode) =>
    client.post('/api/auth/login/', { phone, password, ...(totpCode ? { totp_code: totpCode } : {}) }),
  register: (payload) => client.post('/api/auth/register/', payload),
  logout: () => client.post('/api/auth/logout/'),
  startTelegramVerification: (phone) =>
    client.post('/api/auth/phone/start-telegram-verification/', { phone }),
  verifyOtp: (phone, code) => client.post('/api/auth/phone/verify-otp/', { phone, code }),
  // Parolni tiklash — websaytdagi bilan bir xil telefon + Telegram OTP oqimi.
  // start: {phone} → {telegram_deep_link, bot_username, ...}; foydalanuvchi deep
  // link orqali botni ochadi, bot 6 xonali kod yuboradi. confirm: {phone, otp,
  // password} → to'g'ri kod bilan yangi parol o'rnatiladi.
  passwordResetStart: (phone) =>
    client.post('/api/auth/password-reset/start/', { phone }),
  passwordResetConfirm: (phone, code, newPassword) =>
    client.post('/api/auth/password-reset/confirm/', { phone, otp: code, password: newPassword }),
  refresh: (refresh) => client.post('/api/auth/token/refresh/', { refresh }),
  me: () => client.get('/api/me/'),
  changePassword: (payload) => client.post('/api/auth/me/change-password/', payload),
  completeOnboarding: (payload) => client.post('/api/me/complete-onboarding/', payload),
  deleteAccount: () => client.delete('/api/auth/me/'),
  // TOTP 2FA — profilda yoqish/o'chirish (websaytdagi bilan bir xil oqim).
  // Client interceptor Bearer tokenni avtomatik qo'shadi. setup: {uri, secret}
  // qaytaradi; verify: {code} qabul qiladi va 2FA'ni yoqadi; disable backend
  // xavfsizligi uchun {totp_code} YOKI {password} talab qiladi (token o'g'irlansa
  // tajovuzkor 2FA'ni o'chira olmasin).
  twoFactorSetup: () => client.post('/api/auth/2fa/setup/'),
  twoFactorVerify: (code) => client.post('/api/auth/2fa/verify/', { code }),
  twoFactorDisable: (credentials) => client.post('/api/auth/2fa/disable/', credentials || {}),
  // Profil avatarini yuklash — websaytdagi bilan bir xil `avatar` field nomi va
  // POST /api/auth/me/avatar/ endpoint'i (multipart/form-data). React Native'da
  // FormData'ga fayl { uri, name, type } obyekti sifatida qo'shiladi (backend
  // content_type'ni image/* ekanini tekshiradi va Pillow bilan tasdiqlaydi).
  // Javob yangilangan foydalanuvchi obyekti (`avatar_url` bilan) — chaqiruvchi
  // reloadMe() orqali profilni yangilaydi.
  uploadAvatar: (imageUri, meta = {}) => {
    const name = meta.name || (imageUri ? imageUri.split('/').pop() : '') || 'avatar.jpg';
    const type = meta.type || 'image/jpeg';
    const formData = new FormData();
    formData.append('avatar', { uri: imageUri, name, type });
    return client.post('/api/auth/me/avatar/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  // Avatarni o'chirish — DELETE /api/auth/me/avatar/ (yangilangan user qaytadi).
  deleteAvatar: () => client.delete('/api/auth/me/avatar/'),
};

export const studentApi = {
  myStats: () => client.get('/api/results/me/stats/'),
  myResults: (params) => client.get('/api/results/me/', { params }),
  myStreak: () => client.get('/api/me/streak/'),
  dailyGoal: () => client.get('/api/me/daily-goal/'),
  dailyQuestions: () => client.get('/api/daily-questions/'),
  answerDailyQuestion: (dailyId, payload) =>
    client.post(`/api/daily-questions/${dailyId}/answer/`, payload),
  weeklyContest: () => client.get('/api/weekly-contest/'),
  rivalActivity: () => client.get('/api/me/rival-activity/'),
  achievements: () => client.get('/api/me/achievements/'),
  olympiads: (params) => client.get('/api/olympiads/', { params }),
  olympiadDetail: (id) => client.get(`/api/olympiads/${id}/`),
  olympiadQuestions: (id) => client.get(`/api/olympiads/${id}/questions/`),
  submitAttempt: (payload) => client.post('/api/attempts/', payload),
  attemptDetail: (attemptId) => client.get(`/api/attempts/${attemptId}/`),
  attemptAiAnalysis: (attemptId) => client.get(`/api/attempts/${attemptId}/ai-analysis/`),
  // Sertifikat PNG'sini (faqat 1-o'rin egasiga) autentifikatsiya bilan yuklab
  // olib, ilova ichida ko'rsatish uchun blob sifatida qaytaramiz
  // (FileReader.readAsDataURL bilan data-URI ga aylantiriladi).
  certificatePng: (attemptId) =>
    client.get(`/api/certificates/${attemptId}/download/`, { responseType: 'blob' }),
  reportCheating: (payload) => client.post('/api/attempts/cheating/', payload),
  sessionPing: (payload) => client.post('/api/attempts/ping/', payload),
  practiceSubjects: () => client.get('/api/practice/subjects/'),
  practiceStart: (payload) => client.post('/api/practice/start/', payload),
  practiceSubmit: (payload) => client.post('/api/practice/submit/', payload),
  wrongAnswerSubjects: () => client.get('/api/practice/wrong-answers/'),
  wrongAnswerStart: (payload) => client.post('/api/practice/wrong-answers/start/', payload),
  mistakes: () => client.get('/api/attempts/mistakes/'),
  explainAllMistakes: () => client.post('/api/attempts/mistakes/explain/'),
  leaderboard: (params) => client.get('/api/leaderboard/', { params }),
  shopProducts: () => client.get('/api/shop/products/'),
  rewards: () => client.get('/api/me/rewards/'),
  redeemReward: (payload) => client.post('/api/me/rewards/redeem/', payload),
  myRedemptions: () => client.get('/api/me/rewards/my-redemptions/'),
  // Referral (do'stni taklif qilish) — websaytdagi bilan bir xil oqim.
  // getReferralInfo → { code, bonus_coins, invited_count } (kod yo'q bo'lsa
  // backend avtomatik yaratadi). useReferralCode boshqa do'st kodini ishlatadi:
  // muvaffaqiyatda { detail, bonus_coins, coins } (ikkalasiga ham bonus coin),
  // xato holatlar `detail` bilan qaytadi (kod topilmadi / o'zining kodi / allaqachon
  // ishlatilgan).
  getReferralInfo: () => client.get('/api/me/referral/'),
  useReferralCode: (code) => client.post('/api/me/referral/use/', { code }),

  // ── IT (kod) savollari: test paytida kodni sinash ────────────────────
  // Websaytdagi bilan bir xil endpointlar. Natija SAQLANMAYDI — bu faqat
  // o'quvchiga feedback; yakuniy ball submit paytida (code_answers) server
  // tomonda Judge0 test-case'lari bilan hisoblanadi. Qo'llab-quvvatlanadigan
  // tillar: python, javascript, java, cpp, c.
  //
  // AI baholash SINXRON: { question_id, submitted_code, language } →
  // { score (0-100|null), review }. Rate limit 10/soat.
  reviewCode: (payload) => client.post('/api/questions/code-review/', payload),
  // Judge0 run ASINXRON: start → { task_id }, keyin status polling.
  startCodeRun: (payload) => client.post('/api/questions/run-code/start/', payload),
  codeRunStatus: (taskId) => client.get(`/api/questions/run-code/status/${taskId}/`),
  // start + status pollingни (har 1s, maks ~30s) o'raydi. `isCancelled` —
  // ixtiyoriy callback; true qaytarsa (komponent unmount bo'ldi) polling
  // to'xtaydi va null qaytadi. Muvaffaqiyatda natija:
  // { stdout, stderr, compile_output, status, time, memory, test_results }.
  // test_results element: { passed, is_hidden, input?, expected?, got? }.
  runCode: async (payload, isCancelled) => {
    const cancelled = () => (typeof isCancelled === 'function' ? isCancelled() : false);
    const { data: startData } = await client.post('/api/questions/run-code/start/', payload);
    const taskId = startData?.task_id;
    if (!taskId) {
      throw new Error(startData?.detail || "Kodni ishga tushirib bo'lmadi");
    }
    for (let i = 0; i < 30; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (cancelled()) return null;
      const { data: state } = await client.get(`/api/questions/run-code/status/${taskId}/`);
      if (state?.status === 'COMPLETED') return state.result;
      if (state?.status === 'FAILED') {
        throw new Error(state?.error || "Kodni ishga tushirishda xatolik yuz berdi");
      }
    }
    throw new Error("Kod ishga tushirish vaqti tugadi");
  },
};

// Shaxsiy AI-tahlil / Analytics paneli (StudentHomeScreen → "AI Tahlil").
// Endpointlar `/api/me/...` ostida (accounts/urls_me.py). Har biri faqat
// autentifikatsiyalangan foydalanuvchining O'Z ma'lumotini qaytaradi.
//
// Premium siyosati backend'da har xil:
//  • weeklySummary / subjectReadiness / strengthCard — premium TALAB QILINMAYDI.
//  • weakestTopics — 200 qaytaradi, lekin premium bo'lmasa { premium:false,
//    locked:true, topics:[] } (403 EMAS — frontend "locked" holatini ko'rsatadi).
//  • competitorAnalysis / errorNotebook / recommendedOlympiads / studyPlan /
//    olympiadPrepPlan — premium bo'lmasa 403 { detail, upgrade_required:true }.
//  • studyPlan / olympiadPrepPlan — POST + AI (Gemini), server tomonda throttled
//    (mos ravishda 'ai' va 'ai_prep' scope). Shu sababli ular ekran ochilganda
//    avtomatik CHAQIRILMAYDI — foydalanuvchi tugma bosganda ishga tushadi.
export const analyticsApi = {
  // GET — { premium, locked, topics: [{ subject, correct, total, pct, recommendation }] }
  getWeakestTopics: () => client.get('/api/me/weakest-topics/'),
  // GET ?olympiad_id= (ixtiyoriy; berilmasa so'nggi urinish). Premium (403).
  // { olympiad_id, olympiad_name, my_rank, my_score, total,
  //   above_me: { name, score, diff } | null, percentile }
  getCompetitorAnalysis: (olympiadId) =>
    client.get('/api/me/competitor-analysis/', {
      params: olympiadId ? { olympiad_id: olympiadId } : {},
    }),
  // GET — premium EMAS. [{ subject, readiness_percent, attempts_count, recommendation }]
  getSubjectReadiness: () => client.get('/api/me/subject-readiness/'),
  // GET ?olympiad_id= (MAJBURIY). Premium (403). Tayyorlik foizi + zaif/kuchli
  // fanlar. Bu ekranda subject-readiness afzal ko'riladi (olympiad_id talab
  // qilmaydi), lekin muayyan olimpiada uchun kerak bo'lsa mavjud.
  getReadiness: (olympiadId) =>
    client.get('/api/me/readiness/', { params: { olympiad_id: olympiadId } }),
  // GET — premium EMAS. { user, top_subjects: [{ subject, avg_score, attempts }], share_text }
  getStrengthCard: () => client.get('/api/me/strength-card/'),
  // GET ?student_id= (ixtiyoriy; berilmasa o'zim). Premium EMAS.
  // { full_name, olympiads_count, average_score, streak, best_score }
  getWeeklySummary: () => client.get('/api/me/weekly-summary/'),
  // GET ?subject=&page= — premium (403). { count, page, page_size,
  //   results: [{ question_id, question_text, subject, wrong_answer,
  //   wrong_answer_text, correct_answer, correct_answer_text, attempt_date,
  //   olympiad_name }] } — sahifada 20 ta.
  getErrorNotebook: (params) => client.get('/api/me/error-notebook/', { params: params || {} }),
  // GET — premium (403). [{ olympiad_id, name, subject, starts_at, center_name, reason }]
  getRecommendedOlympiads: () => client.get('/api/me/recommended-olympiads/'),
  // POST (body yo'q) — premium (403), AI throttled. { plan: ["1. ...", ...], weak_subjects }
  getStudyPlan: () => client.post('/api/me/study-plan/'),
  // POST { olympiad_id } — premium (403), AI throttled.
  // { olympiad_name, days_left, focus_subjects, daily_plan: [{ day, tasks: [...] }] }
  getOlympiadPrepPlan: (olympiadId) =>
    client.post('/api/me/olympiad-prep-plan/', { olympiad_id: olympiadId }),
};

// Duel (1v1 musobaqa) — premium o'quvchilar uchun. Backend oqimi real-time
// WEBSOCKET emas, POLLING'ga mos: challenger duel yaratadi (10 ta tasodifiy
// savol tanlanadi, agar fan berilsa shu fandan), ikkala o'quvchi ham savollarga
// javob beradi, ikkalasi tugatgach duel avtomatik yakunlanadi (ko'p to'g'ri
// javob bergan g'olib, teng bo'lsa durang). Alohida "qabul qilish/rad etish"
// bosqichi YO'Q — raqib shunchaki duelni ochib javob bera boshlaydi. Raqib
// holatini kuzatish uchun DuelPlayScreen "kutish" bosqichida `detail`ni har
// bir necha soniyada qayta so'raydi (status 'completed' bo'lguncha).
export const duelApi = {
  // POST /api/duels/ — { opponent_id, subject }. Premium bo'lmasa 403
  // ({ detail, upgrade_required: true }). Javob — yangi duel detali.
  create: (payload) => client.post('/api/duels/', payload),
  // GET /api/me/duels/ — o'z duellari tarixi (pending + completed). Premium
  // talab qilinmaydi — faqat yaratish premium.
  myDuels: () => client.get('/api/me/duels/'),
  // GET /api/duels/<id>/ — holat + savollar (to'g'ri javobsiz) + o'z progressim.
  detail: (id) => client.get(`/api/duels/${id}/`),
  // POST /api/duels/<id>/answer/ — { question_id, selected_option }. Har savolga
  // bir marta. Javob: { is_correct, correct_answer, my_answered, total_questions,
  // my_finished, duel_status }.
  answer: (id, payload) => client.post(`/api/duels/${id}/answer/`, payload),
  // GET /api/duels/<id>/result/ — natija (g'olib/durang, ikki tomon ball
  // taqqoslashi, my_outcome: win/loss/draw/pending).
  result: (id) => client.get(`/api/duels/${id}/result/`),
};

export const billingApi = {
  plans: () => client.get('/api/billing/plans/'),
  checkout: (payload) => client.post('/api/billing/checkout/', payload),
  subscriptionStatus: () => client.get('/api/billing/subscription/status/'),
  currentSubscription: () => client.get('/api/billing/subscription/current/'),
  history: () => client.get('/api/billing/history/'),
};

export const teacherApi = {
  myOlympiads: () => client.get('/api/me/teacher/olympiads/'),
  myStudents: () => client.get('/api/me/teacher/students/'),
  createOlympiad: (payload) => client.post('/api/olympiads/', payload),
  publishOlympiad: (id) => client.post(`/api/olympiads/${id}/publish/`),
  finishOlympiad: (id) => client.post(`/api/olympiads/${id}/finish/`),
  olympiadStats: (id) => client.get(`/api/olympiads/${id}/stats/`),
  questions: (params) => client.get('/api/questions/', { params }),
  createQuestion: (payload) => client.post('/api/questions/', payload),
  generateAiQuestions: (payload) => client.post('/api/questions/generate-ai/', payload),
  // Excel/CSV to'g'ridan-to'g'ri import (sinxron, polling YO'Q). `params` orqali
  // ?center=&subject= query uzatiladi. Javob: { created, errors, error_count }.
  importExcel: (formData, params) =>
    client.post('/api/questions/import/', formData, {
      params: params || {},
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  importWord: (formData) =>
    client.post('/api/questions/import-word/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  // PDFdan AI yordamida savol ajratish. Backend Celery task boshlaydi va
  // { task_id } qaytaradi; runCode naqshiga o'xshab natija tayyor bo'lguncha
  // polling qilamiz (har 2s, maks 150 × 2s = 5 daqiqa). `formData`da fayl `pdf`
  // key bilan va center/subject/difficulty/question_type matn maydonlari bilan
  // keladi. Muvaffaqiyatda { status:'COMPLETED', questions, provider, warning,
  // ... } qaytadi. Xato/timeout'da throw qiladi.
  extractPdfQuestions: async (formData) => {
    const { data: startData } = await client.post('/api/questions/pdf-preview/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const taskId = startData?.task_id;
    // Orqaga moslik: eski backend to'g'ridan-to'g'ri natija qaytarsa task_id yo'q.
    if (!taskId) return startData;
    for (let i = 0; i < 150; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const { data: state } = await client.get(`/api/questions/pdf-preview/${taskId}/status/`);
      if (state?.status === 'COMPLETED') return state;
      if (state?.status === 'FAILED') {
        throw new Error(state?.detail || state?.error || "PDFdan savollarni ajratib bo'lmadi");
      }
    }
    throw new Error("PDF tahlil qilish vaqti tugadi");
  },
  // Word (.docx) matnidan AI yordamida savol ajratish. extractPdfQuestions bilan
  // bir xil oqim; fayl `word` key bilan word-ai-preview/ ga yuboriladi, status
  // esa AYNAN pdf-preview/<task_id>/status/ orqali o'qiladi (backend keshi bir xil).
  extractWordAiQuestions: async (formData) => {
    const { data: startData } = await client.post('/api/questions/word-ai-preview/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const taskId = startData?.task_id;
    if (!taskId) return startData;
    for (let i = 0; i < 150; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const { data: state } = await client.get(`/api/questions/pdf-preview/${taskId}/status/`);
      if (state?.status === 'COMPLETED') return state;
      if (state?.status === 'FAILED') {
        throw new Error(state?.detail || state?.error || "Word matnidan savollarni ajratib bo'lmadi");
      }
    }
    throw new Error("Word tahlil qilish vaqti tugadi");
  },
  explainQuestion: (questionId) => client.post(`/api/questions/${questionId}/explain/`),
};

export const managerApi = {
  // Markaz umumiy statistikasi: o'rtacha ball, eng yuqori, qatnashuvchilar va
  // tadbirlar breakdown'i. `centerId` berilmasa backend menejer/egasi
  // a'zoligidan avtomatik tanlaydi. `params` orqali pagination (page_size)
  // uzatiladi — hamma tadbirlarni olish uchun page_size=200 ishlatamiz.
  stats: (centerId, params) =>
    client.get('/api/manager/stats/', {
      params: { ...(centerId ? { center: centerId } : {}), ...(params || {}) },
    }),
  liveProctoring: (olympiadId) => client.get(`/api/manager/olympiads/${olympiadId}/live/`),
  pendingMemberships: (centerId) => client.get(`/api/centers/${centerId}/memberships/pending/`),
  approveStudent: (centerId, payload) =>
    client.post(`/api/centers/${centerId}/approve-student/`, payload),
  removeMembership: (centerId, membershipId) =>
    client.delete(`/api/centers/${centerId}/memberships/${membershipId}/`),
  studentsMemberships: (centerId) =>
    client.get(`/api/centers/${centerId}/memberships/students/`),
  // Bitta o'quvchi profili (menejer "Ko'rish" modali uchun): profil, statistika,
  // so'nggi urinishlar. Membership ID orqali.
  studentDetail: (membershipId) => client.get(`/api/centers/students/${membershipId}/`),
  // O'quvchiga guruh/sinf tegi berish (masalan "9-A") — menejer o'quvchilarni
  // guruhlash uchun.
  setGroupTag: (centerId, membershipId, groupTag) =>
    client.post(`/api/centers/${centerId}/members/${membershipId}/group-tag/`, { group_tag: groupTag }),
  // Eng ko'p noto'g'ri javob berilgan savollar (menejer analitikasi).
  questionAnalytics: (centerId) =>
    client.get('/api/questions/analytics/', { params: { center: centerId } }),
  // Markazning eng yaxshi o'quvchilari (premium markazlar uchun — bo'lmasa 403).
  topStudents: (centerId) => client.get(`/api/centers/${centerId}/top-students/`),
  // Essay baholash: olimpiadaning barcha yozma javoblari + bitta javobga ball.
  olympiadEssayAnswers: (olympiadId, params) =>
    client.get(`/api/manager/olympiads/${olympiadId}/essay-answers/`, { params }),
  gradeEssayAnswer: (attemptId, questionId, payload) =>
    client.post(`/api/attempts/${attemptId}/essay-answers/${questionId}/grade/`, payload),
};

export const ownerApi = {
  myCenters: () => client.get('/api/centers/mine/'),
  centerStats: (centerId) => client.get(`/api/centers/${centerId}/stats/`),
  activityTrend: (centerId) => client.get(`/api/centers/${centerId}/activity-trend/`),
  topStudents: (centerId) => client.get(`/api/centers/${centerId}/top-students/`),
  staffMemberships: (centerId) => client.get(`/api/centers/${centerId}/memberships/staff/`),
  createTeacher: (centerId, payload) =>
    client.post(`/api/centers/${centerId}/teachers/create/`, payload),
  createManager: (centerId, payload) =>
    client.post(`/api/centers/${centerId}/managers/create/`, payload),

  // ── Premium analitika va hisobotlar (OwnerPremiumScreen) ─────────────
  // Barchasi markaz owner/manager uchun; ba'zilari `center.is_premium` talab
  // qiladi va premium bo'lmasa 403 { detail, upgrade_required:true } qaytaradi
  // (ekranda "Premium" qulf holati ko'rsatiladi). churn-risk / mock-olympiads
  // premium talab qilmaydi; manager-logs faqat OWNER (menejerga 403).
  //
  // report-json → { center_name, period, period_label, date, students_count,
  //   olympiads_count, average_score, total_attempts,
  //   top_students: [{ rank, full_name, avg_score, attempts }] }  (premium)
  reportJson: (centerId, period = 'week') =>
    client.get(`/api/centers/${centerId}/report-json/`, { params: { period } }),
  // region-rank → { average_score, region, region_rank, region_total,
  //   global_rank, global_total }  (premium)
  regionRank: (centerId) => client.get(`/api/centers/${centerId}/region-rank/`),
  // rating-history → [{ month: '2026-01', rank, score }]  (premium)
  ratingHistory: (centerId, months = 6) =>
    client.get(`/api/centers/${centerId}/rating-history/`, { params: { months } }),
  // churn-risk → [{ user_id, full_name, phone_masked, group_tag,
  //   prev_activity, recent_activity, risk_level: 'high'|'medium' }] (premium EMAS)
  churnRisk: (centerId, days = 14) =>
    client.get(`/api/centers/${centerId}/churn-risk/`, { params: { days } }),
  // member-comparison → [{ user_id, full_name, group_tag, total_score,
  //   attempt_count, avg_score, rank }]  (premium). tag/subject/period filtrlar.
  memberComparison: (centerId, params) =>
    client.get(`/api/centers/${centerId}/member-comparison/`, { params: params || {} }),
  // student-dynamics → [{ month: '2026-01', joined, total }]  (premium)
  studentDynamics: (centerId) =>
    client.get(`/api/centers/${centerId}/student-dynamics/`),
  // mock-olympiads → [{ id, title, subject, time_limit_minutes, is_active,
  //   created_at, question_count }]  (premium EMAS)
  mockOlympiads: (centerId) =>
    client.get(`/api/centers/${centerId}/mock-olympiads/`),
  // question-bank → [{ id, text, options:[{text,correct}], subject,
  //   difficulty, created_at }]  (premium)
  questionBank: (centerId) =>
    client.get(`/api/centers/${centerId}/question-bank/`),
  // manager-logs → [{ id, manager_id, manager_name, action_type,
  //   target_user_id, target_name, description, created_at }]  (faqat OWNER)
  managerLogs: (centerId, params) =>
    client.get(`/api/centers/${centerId}/manager-logs/`, { params: params || {} }),
};

export const adminApi = {
  centers: (params) => client.get('/api/admin/centers/', { params }),
  approveCenter: (centerId) => client.post(`/api/admin/centers/${centerId}/approve/`),
  rejectCenter: (centerId) => client.post(`/api/admin/centers/${centerId}/reject/`),
  users: (params) => client.get('/api/admin/users/', { params }),
  auditLog: (params) => client.get('/api/admin/audit-log/', { params }),

  // ── Platforma analitikasi (faqat platform admin; barchasi GET) ───────
  // Websaytdagi Admin "Tahlil" tabi bilan bir xil endpointlar. Har biri
  // mustaqil chaqiriladi — bittasi 403/xato bersa qolganlari ishlashda davom
  // etadi (ekranda Promise.allSettled ishlatiladi).
  // metrics → { retention, conversion, premium: { total_users, active_users,
  //   premium_active, premium_pct }, signups, cache_minutes }
  getMetrics: () => client.get('/api/analytics/metrics/'),
  // revenue-trend → [{ month: '2026-01', amount: 450000 }, ...] (12 oy)
  getRevenueTrend: () => client.get('/api/analytics/revenue-trend/'),
  // attempts-trend → [{ date: '2026-06-01', count: 42 }, ...] (30 kun)
  getAttemptsTrend: () => client.get('/api/analytics/attempts-trend/'),
  // olympiad-stats → [{ name, participants, avg_score }, ...] (top-10)
  getOlympiadStats: () => client.get('/api/analytics/olympiad-stats/'),
  // question-stats → { by_subject: [{ name, count }], by_source: [{ name, label, count }] }
  getQuestionStats: () => client.get('/api/analytics/question-stats/'),
  // center-stats → { by_region: [{ name, count }], premium_vs_free: [{ month,
  //   premium, free }], dq_trend: [{ week, count }], top_centers_rating: [{
  //   center_id, name, points: [{ date, score }] }] }
  getCenterStats: () => client.get('/api/analytics/center-stats/'),

  // ── AI Support yozishmalari (admin foydalanuvchiga javob beradi) ─────
  // getSupportChats → { threads: [{ chat_key, is_guest, full_name, phone,
  //   last_message, last_message_role, updated_at }] }
  getSupportChats: () => client.get('/api/admin/support/chats/'),
  // getSupportChatMessages → { messages: [{ role, text, created_at }] }
  //   role: 'user' | 'model' (AI) | 'admin'. Admin javobi foydalanuvchining
  //   AiChatScreen'ida oltin "Platforma Admini" bubble sifatida ko'rinadi.
  getSupportChatMessages: (chatKey) =>
    client.get(`/api/admin/support/chats/${chatKey}/`),
  // sendSupportReply → POST { text } → { status: 'sent', message }
  sendSupportReply: (chatKey, message) =>
    client.post(`/api/admin/support/chats/${chatKey}/reply/`, { text: message }),

  // ── Foydalanuvchi boshqaruvi ────────────────────────────────────────
  // Bloklash / blokdan chiqarish (yangilangan user qaytadi).
  setUserActive: (userId, isActive) =>
    client.post(`/api/admin/users/${userId}/set-active/`, { is_active: isActive }),
  // Premium boshqaruvi. payload berilmasa — oddiy toggle (yoq/o'chir);
  // { duration, plan_type, plan_name } berilsa muddatli obuna beriladi
  // (duration: 30|90|180|365 kun, 0 = umrbod, -1 = bekor qilish).
  toggleUserPremium: (userId, payload) =>
    client.post(`/api/admin/users/${userId}/toggle-premium/`, payload || {}),
  // System-wide rollarni almashtirish. `admin` alohida is_platform_admin
  // flag'iga yoziladi (PATCH).
  setUserRoles: (userId, { roles, isPlatformAdmin } = {}) =>
    client.patch(`/api/admin/users/${userId}/set-roles/`, {
      roles: roles || [],
      is_platform_admin: !!isPlatformAdmin,
    }),
};

export const parentApi = {
  children: () => client.get('/api/me/parent/children/'),
  linkChild: (payload) => client.post('/api/me/parent/link/', payload),
  // Farzand bilan bog'lanishni bekor qilish — DELETE, 204 qaytaradi.
  unlinkChild: (studentId) => client.delete(`/api/me/parent/link/${studentId}/`),
  childReportPdf: (studentId) => client.get(`/api/me/parent/children/${studentId}/report/`),
  // Farzandning AI muvaffaqiyat bashorati. Javob:
  // { avg_score, attempts_count, subject_performance,
  //   predictions: { presidential_school, al_xorazmiy, dtm }, ai_analysis }
  childPredictions: (studentId) => client.get(`/api/me/parent/children/${studentId}/predictions/`),
  toggleWeeklyDigest: (studentId, enabled) =>
    client.post(`/api/me/parent/children/${studentId}/toggle-digest/`, { enabled }),
  // Menga kelgan ota-ona kuzatuv so'rovlari (kimdir meni "farzand" sifatida
  // qo'shmoqchi — websaytda StudentDashboard'da ko'rsatiladi). Har biri:
  // { link_id, parent_id, parent_name, parent_username, avatar_url, created_at }
  parentRequests: () => client.get('/api/me/parent-requests/'),
  // So'rovga javob: accept=true tasdiqlaydi (is_confirmed=True),
  // accept=false rad etadi (link o'chadi).
  respondParentRequest: (linkId, accept) =>
    client.post(`/api/me/parent-requests/${linkId}/respond/`, { accept: !!accept }),
  // respond'ning muqobili — link_id yoki parent_id orqali tasdiqlash/rad etish.
  confirmParent: (payload) => client.post('/api/me/confirm-parent/', payload || {}),
};

export const publicApi = {
  verifyCertificate: (certUuid) => client.get(`/api/certificates/verify/${certUuid}/`),
  health: () => client.get('/api/health/'),
};

export const supportApi = {
  // GET /api/support/chat/ → { messages: [{ role, parts: [{ text }] }] }
  history: () => client.get('/api/support/chat/'),
  // POST /api/support/chat/ — Gemini-uslubidagi to'liq suhbatni yuboradi,
  // { reply } qaytaradi (yoki 503 bo'lsa ham { reply } bo'ladi).
  send: (messages) => client.post('/api/support/chat/', { messages }),
};

export const notificationsApi = {
  list: () => client.get('/api/notifications/'),
  markRead: (id) => client.post(`/api/notifications/${id}/read/`),
  markAllRead: () => client.post('/api/notifications/read-all/'),
};

export default client;
