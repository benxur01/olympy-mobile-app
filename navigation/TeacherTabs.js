import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import TeacherHomeScreen from '../screens/TeacherHomeScreen';
import ApplicationsScreen from '../screens/ApplicationsScreen';
import ManagerStudentsScreen from '../screens/ManagerStudentsScreen';
import QuestionCreatorScreen from '../screens/QuestionCreatorScreen';
import EssayGradingScreen from '../screens/EssayGradingScreen';
import NavigationTabBar from './NavigationTabBar';
import { TEACHER_TABS } from './tabConfig';

const Tab = createBottomTabNavigator();

export default function TeacherTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <NavigationTabBar {...props} items={TEACHER_TABS} />}
    >
      <Tab.Screen name="TAsosiy" component={TeacherHomeScreen} />
      <Tab.Screen name="Arizalar" component={ApplicationsScreen} />
      {/* Bug tuzatildi: bu tab avval noto'g'ri ProctoringScreen'ni ko'rsatardi
          (web'da o'qituvchida umuman jonli nazorat huquqi yo'q). Endi Owner/
          Manager bilan bir xil — markazdagi o'quvchilar ro'yxati. */}
      <Tab.Screen name="Oquvchilar" component={ManagerStudentsScreen} />
      <Tab.Screen name="Savollar" component={QuestionCreatorScreen} />
      <Tab.Screen name="Baholash" component={EssayGradingScreen} />
    </Tab.Navigator>
  );
}
