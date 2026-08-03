import { Tabs } from "expo-router";
import { tabIcon, useTabScreenOptions } from "@/components/ui";

export default function StaffLayout() {
    return (
        <Tabs screenOptions={useTabScreenOptions()}>
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                    tabBarLabel: "Home",
                    tabBarIcon: tabIcon("home"),
                }}
            />
            <Tabs.Screen
                name="raise"
                options={{
                    title: "Report an issue",
                    tabBarLabel: "Report",
                    tabBarIcon: tabIcon("add-circle"),
                }}
            />
            <Tabs.Screen
                name="complaints"
                options={{
                    title: "My complaints",
                    tabBarLabel: "My reports",
                    tabBarIcon: tabIcon("document-text"),
                }}
            />
            <Tabs.Screen
                name="notifications"
                options={{
                    title: "Updates",
                    tabBarLabel: "Updates",
                    tabBarIcon: tabIcon("notifications"),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "My profile",
                    tabBarLabel: "Profile",
                    tabBarIcon: tabIcon("person-circle"),
                }}
            />
        </Tabs>
    );
}
