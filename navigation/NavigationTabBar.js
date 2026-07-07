import React from 'react';
import TabBar from '../components/TabBar';

export default function NavigationTabBar({ state, navigation, items }) {
  const activeKey = state.routes[state.index].name;
  return (
    <TabBar
      items={items}
      activeKey={activeKey}
      onPress={(key) => {
        if (key !== activeKey) {
          navigation.navigate(key);
        }
      }}
    />
  );
}
