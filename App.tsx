import 'react-native-gesture-handler';
// Import locationService first so the background task is registered before the app renders
import './src/services/locationService';

import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { ThemeProvider, useTheme } from './src/theme';
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
import { hasCompletedOnboarding, setOnboardingCompleted } from './src/services/storageService';

import HomeScreen from './src/screens/HomeScreen';
import GroceryListScreen from './src/screens/GroceryListScreen';
import MapScreen from './src/screens/MapScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import PaywallScreen from './src/screens/PaywallScreen';
import BrandedLoadingScreen from './src/components/BrandedLoadingScreen';

const Tab = createBottomTabNavigator();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface TabMeta {
  label: string;          // visible under the icon
  active: IoniconName;
  inactive: IoniconName;
}

const TAB_META: Record<string, TabMeta> = {
  Home:     { label: 'Home',     active: 'home',     inactive: 'home-outline' },
  List:     { label: 'List',     active: 'cart',     inactive: 'cart-outline' },
  Map:      { label: 'Stores',   active: 'map',      inactive: 'map-outline' },
  History:  { label: 'Trips',    active: 'time',     inactive: 'time-outline' },
  Settings: { label: 'Settings', active: 'settings', inactive: 'settings-outline' },
};

function MainTabs() {
  const { Colors, isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Tab.Navigator
        screenOptions={({ route }) => {
          const meta = TAB_META[route.name];
          return {
            headerShown: false,
            tabBarShowLabel: true,
            tabBarLabel: meta.label,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? meta.active : meta.inactive}
                size={size ?? 15}
                color={color}
              />
            ),
            tabBarActiveTintColor: Colors.tabActive,
            tabBarInactiveTintColor: Colors.tabInactive,
            tabBarStyle: {
              height: 72,
              paddingBottom: 12,
              paddingTop: 3,
              backgroundColor: Colors.tabBar,
              borderTopColor: Colors.border,
              borderTopWidth: 1.5,
            },
            tabBarLabelStyle: {
              fontSize: 10.5,
              fontWeight: '800',
              letterSpacing: 0,
              marginTop: 2,
              includeFontPadding: false,
            },
            tabBarItemStyle: {
              paddingVertical: 4,
            },
          };
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="List" component={GroceryListScreen} />
        <Tab.Screen name="Map" component={MapScreen} />
        <Tab.Screen name="History" component={HistoryScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </>
  );
}

// Minimum time to keep the branded splash on screen so users see the
// brand impression even on fast loads. Storage usually resolves in <100ms.
const MIN_SPLASH_MS = 1400;

function AppContent() {
  const { useSubscription } = require('./src/contexts/SubscriptionContext');
  const { isPremium, isLoading: subLoading } = useSubscription();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const [splashReady, setSplashReady] = useState(false);

  useEffect(() => {
    const startedAt = Date.now();
    (async () => {
      const done = await hasCompletedOnboarding();
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, MIN_SPLASH_MS - elapsed);
      setTimeout(() => {
        setOnboardingDone(done);
        setSplashReady(true);
      }, remaining);
    })();
  }, []);

  const handleOnboardingComplete = async () => {
    await setOnboardingCompleted();
    setOnboardingDone(true);
  };

  // Splash until both AsyncStorage warm-ups have resolved
  if (!splashReady || onboardingDone === null || subLoading) {
    return <BrandedLoadingScreen />;
  }

  // First-launch tour
  if (!onboardingDone) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  // Subscription gate — the app is paid-to-use. No subscription, no app.
  // The paywall here runs in `required` mode (no dismiss button).
  if (!isPremium) {
    return <PaywallScreen required />;
  }

  return (
    <NavigationContainer>
      <MainTabs />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <SubscriptionProvider>
          <AppContent />
        </SubscriptionProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
