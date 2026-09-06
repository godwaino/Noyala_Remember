import React, { useCallback, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts as useInterFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import {
  useFonts as useNewsreaderFonts,
  Newsreader_400Regular,
  Newsreader_500Medium,
  Newsreader_400Regular_Italic,
} from "@expo-google-fonts/newsreader";

import { AuthProvider } from "./src/lib/auth";
import { ProfileProvider } from "./src/lib/profile";
import { ToastProvider } from "./src/components/Toast";
import { RootNavigator } from "./src/navigation/RootNavigator";

SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden, or unsupported on this platform (web) — harmless.
});

export default function App() {
  const [interLoaded] = useInterFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold });
  const [newsreaderLoaded] = useNewsreaderFonts({
    Newsreader_400Regular,
    Newsreader_500Medium,
    Newsreader_400Regular_Italic,
  });
  const fontsLoaded = interLoaded && newsreaderLoaded;

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  const onLayoutRootView = useCallback(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <AuthProvider>
        <ProfileProvider>
          <ToastProvider>
            <RootNavigator />
            <StatusBar style="dark" />
          </ToastProvider>
        </ProfileProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
