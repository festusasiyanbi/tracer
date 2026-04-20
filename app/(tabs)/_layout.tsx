import { useLocation } from "@/src/location/useLocation";
import { useActivity } from "@/src/motion/useActivity";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import React from "react";

function AppInit() {
  useLocation();
  useActivity();
  return null;
}

export default function TabLayout() {
  return (
    <>
      <AppInit />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#0f0f0f",
            borderTopColor: "#1a1a1a",
          },
          tabBarActiveTintColor: "#4ECDC4",
          tabBarInactiveTintColor: "#444",
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Observer",
            tabBarIcon: () => <Ionicons name="eye" size={24} color="#4ECDC4" />,
          }}
        />
        <Tabs.Screen
          name="debug"
          options={{
            title: "Debug",
            tabBarIcon: () => <Ionicons name="bug" size={24} color="#4ECDC4" />,
          }}
        />
      </Tabs>
    </>
  );
}
