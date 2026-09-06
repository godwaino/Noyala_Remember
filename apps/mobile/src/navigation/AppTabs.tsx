import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { HomeScreen } from "../screens/HomeScreen";
import { PeopleScreen } from "../screens/PeopleScreen";
import { CalendarScreen } from "../screens/CalendarScreen";
import { MoreScreen } from "../screens/MoreScreen";
import { HomeIcon, PeopleIcon, CalendarIcon, MoreIcon } from "./TabIcons";
import { color, fontFamily } from "../theme";
import type { TabParamList } from "./types";

const Tab = createBottomTabNavigator<TabParamList>();

export function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.clay,
        tabBarInactiveTintColor: color.inkMuted,
        tabBarStyle: {
          backgroundColor: "rgba(251,248,244,0.96)",
          borderTopColor: color.border,
          borderTopWidth: 1,
          height: 84,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontFamily: fontFamily.sansSemiBold, fontSize: 11.5 },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: ({ color: c }) => <HomeIcon color={c} /> }} />
      <Tab.Screen name="People" component={PeopleScreen} options={{ tabBarIcon: ({ color: c }) => <PeopleIcon color={c} /> }} />
      <Tab.Screen name="Calendar" component={CalendarScreen} options={{ tabBarIcon: ({ color: c }) => <CalendarIcon color={c} /> }} />
      <Tab.Screen name="More" component={MoreScreen} options={{ tabBarIcon: ({ color: c }) => <MoreIcon color={c} /> }} />
    </Tab.Navigator>
  );
}
