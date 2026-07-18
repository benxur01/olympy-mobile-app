import React, { useCallback, useRef } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { navigationRef } from '../services/navigationRef';
import { useTheme } from '../services/ThemeContext';
import { useAuth } from '../services/AuthContext';
import { canAccessRoute, routeForUser, PUBLIC_ROUTES } from '../services/roles';
import { linkingConfig } from '../services/linking';
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import PendingAccessScreen from '../screens/PendingAccessScreen';
import StudentTabs from './StudentTabs';
import TeacherTabs from './TeacherTabs';
import ManagerTabs from './ManagerTabs';
import ProfileScreen from '../screens/ProfileScreen';
import ExamScreen from '../screens/ExamScreen';
import MockExamScreen from '../screens/MockExamScreen';
import PracticeRunnerScreen from '../screens/PracticeRunnerScreen';
import DailyQuestionsScreen from '../screens/DailyQuestionsScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import ShopScreen from '../screens/ShopScreen';
import PremiumScreen from '../screens/PremiumScreen';
import MyCompetitionsScreen from '../screens/MyCompetitionsScreen';
import MyCertificatesScreen from '../screens/MyCertificatesScreen';
import CertVerifyScreen from '../screens/CertVerifyScreen';
import AiChatScreen from '../screens/AiChatScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import ProgressScreen from '../screens/ProgressScreen';
import OwnerDashboardScreen from '../screens/OwnerDashboardScreen';
import OwnerPremiumScreen from '../screens/OwnerPremiumScreen';
import OwnerShopScreen from '../screens/OwnerShopScreen';
import CenterRankingScreen from '../screens/CenterRankingScreen';
import JoinCenterScreen from '../screens/JoinCenterScreen';
import AdminScreen from '../screens/AdminScreen';
import AdminAnalyticsScreen from '../screens/AdminAnalyticsScreen';
import AdminSupportScreen from '../screens/AdminSupportScreen';
import AdminSubjectsScreen from '../screens/AdminSubjectsScreen';
import ParentScreen from '../screens/ParentScreen';
import MistakesScreen from '../screens/MistakesScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import TwoFactorScreen from '../screens/TwoFactorScreen';
import TeacherOlympiadsScreen from '../screens/TeacherOlympiadsScreen';
import CreateOlympiadScreen from '../screens/CreateOlympiadScreen';
import QuestionCreatorScreen from '../screens/QuestionCreatorScreen';
import EssayGradingScreen from '../screens/EssayGradingScreen';
import CodeReviewScreen from '../screens/CodeReviewScreen';
import QuestionDifficultyScreen from '../screens/QuestionDifficultyScreen';
import DuelListScreen from '../screens/DuelListScreen';
import DuelInviteScreen from '../screens/DuelInviteScreen';
import DuelPlayScreen from '../screens/DuelPlayScreen';
import DuelResultScreen from '../screens/DuelResultScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { colors, isDark } = useTheme();
  const { user, initializing } = useAuth();
  const userRef = useRef(user);
  userRef.current = user;
  const guardBusy = useRef(false);

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.bg,
      card: colors.bg,
      border: colors.border,
      primary: colors.blue,
      text: colors.text,
    },
  };

  // Deep link / navigate chaqiruvlarida rol tekshiruvi.
  // Unauthorized → Login yoki foydalanuvchining home shell'iga reset.
  const enforceAccess = useCallback(() => {
    if (initializing || guardBusy.current) return;
    if (!navigationRef.isReady()) return;
    const state = navigationRef.getRootState();
    if (!state?.routes?.length) return;
    const route = state.routes[state.index];
    const name = route?.name;
    if (!name) return;

    const currentUser = userRef.current;
    if (canAccessRoute(currentUser, name)) return;

    guardBusy.current = true;
    try {
      if (!currentUser) {
        if (!PUBLIC_ROUTES.has(name)) {
          navigationRef.resetRoot({ index: 0, routes: [{ name: 'Login' }] });
        }
      } else {
        const home = routeForUser(currentUser);
        if (name !== home) {
          navigationRef.resetRoot({ index: 0, routes: [{ name: home }] });
        }
      }
    } catch (e) {
      // resetRoot navigatsiya hali tayyor bo'lmagan holatda xato tashlashi
      // mumkin — bu butun ilovani ErrorBoundary'ga yiqitmasligi kerak.
      // eslint-disable-next-line no-console
      console.error('[enforceAccess]', e);
    } finally {
      // microtask — ketma-ket state o'zgarishlarida loopdan saqlaymiz
      setTimeout(() => {
        guardBusy.current = false;
      }, 0);
    }
  }, [initializing]);

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navTheme}
      linking={linkingConfig}
      onReady={enforceAccess}
      onStateChange={enforceAccess}
    >
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="PendingAccess" component={PendingAccessScreen} />
        <Stack.Screen name="StudentTabs" component={StudentTabs} />
        <Stack.Screen name="TeacherTabs" component={TeacherTabs} />
        <Stack.Screen name="ManagerTabs" component={ManagerTabs} />
        <Stack.Screen name="Exam" component={ExamScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="MockExam" component={MockExamScreen} />
        <Stack.Screen name="PracticeRunner" component={PracticeRunnerScreen} />
        <Stack.Screen name="DailyQuestions" component={DailyQuestionsScreen} />
        <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
        <Stack.Screen name="Shop" component={ShopScreen} />
        <Stack.Screen name="Premium" component={PremiumScreen} />
        <Stack.Screen name="MyCompetitions" component={MyCompetitionsScreen} />
        <Stack.Screen name="MyCertificates" component={MyCertificatesScreen} />
        <Stack.Screen name="CertVerify" component={CertVerifyScreen} />
        <Stack.Screen name="AiChat" component={AiChatScreen} />
        <Stack.Screen name="Analytics" component={AnalyticsScreen} />
        <Stack.Screen name="Progress" component={ProgressScreen} />
        <Stack.Screen name="OwnerDashboard" component={OwnerDashboardScreen} />
        <Stack.Screen name="OwnerPremium" component={OwnerPremiumScreen} />
        <Stack.Screen name="OwnerShop" component={OwnerShopScreen} />
        <Stack.Screen name="CenterRanking" component={CenterRankingScreen} />
        <Stack.Screen name="JoinCenter" component={JoinCenterScreen} />
        <Stack.Screen name="Admin" component={AdminScreen} />
        <Stack.Screen name="AdminAnalytics" component={AdminAnalyticsScreen} />
        <Stack.Screen name="AdminSupport" component={AdminSupportScreen} />
        <Stack.Screen name="AdminSubjects" component={AdminSubjectsScreen} />
        <Stack.Screen name="Parent" component={ParentScreen} />
        <Stack.Screen name="Mistakes" component={MistakesScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <Stack.Screen name="TwoFactor" component={TwoFactorScreen} />
        {/* Profil ekrani — Student uchun tab ichida ochiladi; boshqa rollar
            (o'qituvchi/menejer/direktor/admin) menyu yoki header orqali shu
            stack ekraniga o'tadi. ProfileScreen o'zi rolga qarab moslashadi. */}
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="TeacherOlympiads" component={TeacherOlympiadsScreen} />
        <Stack.Screen name="CreateOlympiad" component={CreateOlympiadScreen} />
        <Stack.Screen name="QuestionCreator" component={QuestionCreatorScreen} />
        <Stack.Screen name="EssayGrading" component={EssayGradingScreen} />
        <Stack.Screen name="CodeReview" component={CodeReviewScreen} />
        <Stack.Screen name="QuestionDifficulty" component={QuestionDifficultyScreen} />
        <Stack.Screen name="DuelList" component={DuelListScreen} />
        <Stack.Screen name="DuelInvite" component={DuelInviteScreen} />
        <Stack.Screen name="DuelPlay" component={DuelPlayScreen} />
        <Stack.Screen name="DuelResult" component={DuelResultScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
