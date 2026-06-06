import 'react-native-gesture-handler'
import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'

import { theme } from './src/theme'
import { AccountProvider, useAccount } from './src/context/AccountContext'
import HomeScreen from './src/screens/HomeScreen'
import TransferScreen from './src/screens/TransferScreen'
import ChatScreen from './src/screens/ChatScreen'
import AnalyticsScreen from './src/screens/AnalyticsScreen'
import SettingsScreen from './src/screens/SettingsScreen'
import SplashScreen from './src/screens/auth/SplashScreen'
import AuthScreen from './src/screens/auth/AuthScreen'

const Tab = createBottomTabNavigator()
const RootStack = createNativeStackNavigator()

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: theme.bg, card: theme.bgCard, border: theme.border },
}

const ICONS = {
  Home: 'home',
  Transfer: 'arrow-up-right',
  Chat: 'message-circle',
  Analytics: 'bar-chart-2',
  Settings: 'settings',
}

function Tabs() {
  const { t } = useAccount()
  const labels = {
    Home: t('tabHome'),
    Transfer: t('tabTransfer'),
    Chat: t('tabChat'),
    Analytics: t('tabAnalytics'),
    Settings: t('tabSettings'),
  }
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.gold,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarLabel: labels[route.name],
        tabBarStyle: {
          backgroundColor: theme.bgCard,
          borderTopColor: theme.border,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size }) => (
          <Feather name={ICONS[route.name]} size={size - 2} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Transfer" component={TransferScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  )
}

function Root() {
  return (
    <NavigationContainer theme={navTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Splash" component={SplashScreen} />
        <RootStack.Screen name="Auth" component={AuthScreen} />
        <RootStack.Screen name="Main" component={Tabs} />
      </RootStack.Navigator>
    </NavigationContainer>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AccountProvider>
        <Root />
      </AccountProvider>
    </SafeAreaProvider>
  )
}
