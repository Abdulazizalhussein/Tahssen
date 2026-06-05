import 'react-native-gesture-handler'
import React from 'react'
import { Text } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { colors } from './src/theme'
import HomeScreen from './src/screens/HomeScreen'
import FeaturesScreen from './src/screens/FeaturesScreen'
import HowItWorksScreen from './src/screens/HowItWorksScreen'
import DemoScreen from './src/screens/DemoScreen'
import DashboardScreen from './src/screens/DashboardScreen'

const Tab = createBottomTabNavigator()

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.navy },
}

const tabIcons = {
  الرئيسية: '🏠',
  المميزات: '✨',
  'كيف يعمل': '⚙️',
  التجربة: '🧪',
  'لوحة التحكم': '📋',
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer theme={navTheme}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: colors.gold,
            tabBarInactiveTintColor: colors.textMuted,
            tabBarStyle: {
              backgroundColor: colors.navyLight,
              borderTopColor: 'rgba(255,255,255,0.08)',
              height: 64,
              paddingBottom: 8,
              paddingTop: 8,
            },
            tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 20, color }}>{tabIcons[route.name]}</Text>
            ),
          })}
        >
          <Tab.Screen name="الرئيسية" component={HomeScreen} />
          <Tab.Screen name="المميزات" component={FeaturesScreen} />
          <Tab.Screen name="كيف يعمل" component={HowItWorksScreen} />
          <Tab.Screen name="التجربة" component={DemoScreen} />
          <Tab.Screen name="لوحة التحكم" component={DashboardScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  )
}
