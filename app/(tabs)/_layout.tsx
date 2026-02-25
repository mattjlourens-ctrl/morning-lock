import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#000000', borderTopColor: '#1C1C1C' },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#333333',
        tabBarLabelStyle: { fontSize: 9, letterSpacing: 2, textTransform: 'uppercase' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Lock' }} />
      <Tabs.Screen name="stats" options={{ title: 'Stats' }} />
    </Tabs>
  );
}
