import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import StudentHomeScreen from '../screens/StudentHomeScreen';
import EventsScreen from '../screens/EventsScreen';
import PracticeScreen from '../screens/PracticeScreen';
import ResultsScreen from '../screens/ResultsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NavigationTabBar from './NavigationTabBar';
import { STUDENT_TABS } from './tabConfig';

const Tab = createBottomTabNavigator();

export default function StudentTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <NavigationTabBar {...props} items={STUDENT_TABS} />}
    >
      <Tab.Screen name="Asosiy" component={StudentHomeScreen} />
      <Tab.Screen name="Tadbirlar" component={EventsScreen} />
      <Tab.Screen name="Mashq" component={PracticeScreen} />
      <Tab.Screen name="Natijalar" component={ResultsScreen} />
      <Tab.Screen name="Profil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
