import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { OnboardingInput } from "@noyala/domain";

export type AuthStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  ProfileSetup: undefined;
  /** Onboarding only actually completes (writes `profiles`, flips
   * RootNavigator over to the app) once this last step finishes — the
   * draft travels as a param rather than being written early, so
   * RootNavigator doesn't swap navigators out from under a screen the
   * user hasn't seen yet. */
  Permissions: { draft: OnboardingInput };
};

export type TabParamList = {
  Home: undefined;
  People: undefined;
  Calendar: undefined;
  More: undefined;
};

export type RootStackParamList = {
  Tabs: undefined;
  Person: { personId: string; tab?: "overview" | "memories" | "timeline" | "gifts" };
  Occasion: { importantDateId: string };
  MessageStudio: { personId: string; importantDateId?: string };
  VoiceCapture: { personId?: string };
  ImportContacts: undefined;
  AddPerson: undefined;
  AddMemory: { personId: string };
  LogConnection: { personId: string };
  Circles: undefined;
  CircleDetail: { circleId: string };
  Share: { personId: string };
  Reminders: undefined;
  Plan: undefined;
  Settings: undefined;
  Account: undefined;
  Drafts: undefined;
  History: undefined;
  Gifts: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

export type AuthStackScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<
  AuthStackParamList,
  T
>;
