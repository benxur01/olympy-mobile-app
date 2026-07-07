import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import TeacherHomeScreen from '../screens/TeacherHomeScreen';
import ApplicationsScreen from '../screens/ApplicationsScreen';
import ProctoringScreen from '../screens/ProctoringScreen';
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
      <Tab.Screen name="Oquvchilar" component={ProctoringScreen} />
      <Tab.Screen name="Savollar" component={QuestionCreatorScreen} />
      <Tab.Screen name="Baholash" component={EssayGradingScreen} />
    </Tab.Navigator>
  );
}
