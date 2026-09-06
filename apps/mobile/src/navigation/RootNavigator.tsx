import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../lib/auth";
import { useProfile } from "../lib/profile";
import { StaticScreen } from "../components/Screen";
import { Text } from "../components/Text";
import { color } from "../theme";

import { AppTabs } from "./AppTabs";
import type { AuthStackParamList, RootStackParamList } from "./types";

import { WelcomeScreen } from "../screens/onboarding/WelcomeScreen";
import { SignInScreen } from "../screens/onboarding/SignInScreen";
import { ProfileSetupScreen } from "../screens/onboarding/ProfileSetupScreen";
import { PermissionsScreen } from "../screens/onboarding/PermissionsScreen";

import { PersonScreen } from "../screens/PersonScreen";
import { OccasionScreen } from "../screens/OccasionScreen";
import { MessageStudioScreen } from "../screens/MessageStudioScreen";
import { VoiceCaptureScreen } from "../screens/VoiceCaptureScreen";
import { ImportContactsScreen } from "../screens/ImportContactsScreen";
import { AddPersonScreen } from "../screens/AddPersonScreen";
import { AddMemoryScreen } from "../screens/AddMemoryScreen";
import { LogConnectionScreen } from "../screens/LogConnectionScreen";
import { CirclesScreen } from "../screens/CirclesScreen";
import { CircleDetailScreen } from "../screens/CircleDetailScreen";
import { ShareScreen } from "../screens/ShareScreen";
import { RemindersScreen } from "../screens/RemindersScreen";
import { PlanScreen } from "../screens/PlanScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { AccountScreen } from "../screens/AccountScreen";
import { DraftsScreen } from "../screens/DraftsScreen";
import { HistoryScreen } from "../screens/HistoryScreen";
import { GiftsScreen } from "../screens/GiftsScreen";

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

function AuthNavigator({ initialRouteName }: { initialRouteName: keyof AuthStackParamList }) {
  return (
    <AuthStack.Navigator initialRouteName={initialRouteName} screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="SignIn" component={SignInScreen} />
      <AuthStack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <AuthStack.Screen name="Permissions" component={PermissionsScreen} />
    </AuthStack.Navigator>
  );
}

function AppNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Tabs" component={AppTabs} />
      <RootStack.Screen name="Person" component={PersonScreen} />
      <RootStack.Screen name="Occasion" component={OccasionScreen} />
      <RootStack.Screen name="MessageStudio" component={MessageStudioScreen} options={{ presentation: "modal" }} />
      <RootStack.Screen name="VoiceCapture" component={VoiceCaptureScreen} options={{ presentation: "modal" }} />
      <RootStack.Screen name="ImportContacts" component={ImportContactsScreen} options={{ presentation: "modal" }} />
      <RootStack.Screen name="AddPerson" component={AddPersonScreen} options={{ presentation: "modal" }} />
      <RootStack.Screen name="AddMemory" component={AddMemoryScreen} options={{ presentation: "modal" }} />
      <RootStack.Screen name="LogConnection" component={LogConnectionScreen} options={{ presentation: "modal" }} />
      <RootStack.Screen name="Circles" component={CirclesScreen} />
      <RootStack.Screen name="CircleDetail" component={CircleDetailScreen} />
      <RootStack.Screen name="Share" component={ShareScreen} />
      <RootStack.Screen name="Reminders" component={RemindersScreen} />
      <RootStack.Screen name="Plan" component={PlanScreen} />
      <RootStack.Screen name="Settings" component={SettingsScreen} />
      <RootStack.Screen name="Account" component={AccountScreen} />
      <RootStack.Screen name="Drafts" component={DraftsScreen} />
      <RootStack.Screen name="History" component={HistoryScreen} />
      <RootStack.Screen name="Gifts" component={GiftsScreen} />
    </RootStack.Navigator>
  );
}

function NotConfiguredScreen() {
  return (
    <StaticScreen>
      <Text variant="screenTitle" style={{ marginBottom: 10 }}>
        Sign-in isn't configured yet
      </Text>
      <Text variant="bodyMuted">
        This build is missing EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY — see
        apps/mobile/.env.example.
      </Text>
    </StaticScreen>
  );
}

export function RootNavigator() {
  const { isConfigured, isLoading: authLoading, user } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();

  if (!isConfigured) {
    return (
      <NavigationContainer>
        <NotConfiguredScreen />
      </NavigationContainer>
    );
  }

  if (authLoading || (user && profileLoading)) {
    return (
      <NavigationContainer>
        <StaticScreen>
          <Text variant="bodyMuted" style={{ color: color.inkMuted }}>
            Loading…
          </Text>
        </StaticScreen>
      </NavigationContainer>
    );
  }

  const needsOnboarding = !user || !profile?.onboardingCompletedAt;

  return (
    <NavigationContainer>
      {needsOnboarding ? (
        <AuthNavigator initialRouteName={user ? "ProfileSetup" : "Welcome"} />
      ) : (
        <AppNavigator />
      )}
    </NavigationContainer>
  );
}
