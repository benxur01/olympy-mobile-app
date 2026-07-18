import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import StudentHomeScreen from '../screens/StudentHomeScreen';
import EventsScreen from '../screens/EventsScreen';
import PracticeScreen from '../screens/PracticeScreen';
import ResultsScreen from '../screens/ResultsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NavigationTabBar from './NavigationTabBar';
import { STUDENT_TABS } from './tabConfig';

const Tab = createMaterialTopTabNavigator();

export default function StudentTabs() {
  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      screenOptions={{ swipeEnabled: true, animationEnabled: true, lazy: true }}
      tabBar={(props) => <NavigationTabBar {...props} items={STUDENT_TABS} />}
    >
      <Tab.Screen name="Asosiy" component={StudentHomeScreen} />
      <Tab.Screen name="Musobaqalar" component={EventsScreen} />
      <Tab.Screen name="Mashq" component={PracticeScreen} />
      <Tab.Screen name="Natijalar" component={ResultsScreen} />
      <Tab.Screen name="Profil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
