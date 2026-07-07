import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import ManagerHomeScreen from '../screens/ManagerHomeScreen';
import ApplicationsScreen from '../screens/ApplicationsScreen';
import ManagerStudentsScreen from '../screens/ManagerStudentsScreen';
import ManagerResultsScreen from '../screens/ManagerResultsScreen';
import ProctoringScreen from '../screens/ProctoringScreen';
import NavigationTabBar from './NavigationTabBar';
import { MANAGER_TABS } from './tabConfig';

const Tab = createBottomTabNavigator();

// Menejer paneli. O'qituvchi tab'laridan farqi — Asosiy'da markaz statistikasi,
// alohida o'quvchi boshqaruvi va natijalar/analitika ekranlari bor. Arizalar va
// jonli nazorat ekranlari o'qituvchi bilan umumiy (ular rol-asosli ishlaydi).
export default function ManagerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <NavigationTabBar {...props} items={MANAGER_TABS} />}
    >
      <Tab.Screen name="MAsosiy" component={ManagerHomeScreen} />
      <Tab.Screen name="MArizalar" component={ApplicationsScreen} />
      <Tab.Screen name="MOquvchilar" component={ManagerStudentsScreen} />
      <Tab.Screen name="MNatijalar" component={ManagerResultsScreen} />
      <Tab.Screen name="MNazorat" component={ProctoringScreen} />
    </Tab.Navigator>
  );
}
