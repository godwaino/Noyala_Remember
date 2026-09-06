import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Profile } from "@noyala/domain";
import { useAuth } from "./auth";
import { getProfile } from "../data/profile";

interface ProfileContextValue {
  profile: Profile | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

/** Loads the signed-in user's `profiles` row once a session exists — Home
 * needs `timezone` for its date math, and onboarding-completion drives
 * whether the app shows onboarding or the tabs. */
export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user, isConfigured } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user || !isConfigured) {
      setProfile(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      setProfile(await getProfile());
    } finally {
      setIsLoading(false);
    }
  }, [user, isConfigured]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <ProfileContext.Provider value={{ profile, isLoading, refresh }}>{children}</ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within a ProfileProvider");
  return ctx;
}
