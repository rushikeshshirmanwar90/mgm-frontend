import { Tabs } from "expo-router";
import { renderTabBar, tabIcon, useTabScreenOptions } from "@/components/ui";

export default function AdminLayout() {
    return (
        <Tabs tabBar={renderTabBar} screenOptions={useTabScreenOptions()}>
            <Tabs.Screen
                name="index"
                options={{
                    title: "Overview",
                    tabBarLabel: "Overview",
                    tabBarIcon: tabIcon("grid"),
                }}
            />
            <Tabs.Screen
                name="notifications"
                options={{
                    title: "Inbox",
                    tabBarLabel: "Inbox",
                    tabBarIcon: tabIcon("notifications"),
                }}
            />
            <Tabs.Screen
                name="buildings"
                options={{
                    title: "Buildings & rooms",
                    tabBarLabel: "Campus",
                    tabBarIcon: tabIcon("business"),
                }}
            />
            <Tabs.Screen
                name="complaints"
                options={{
                    title: "All complaints",
                    // Shortened from "Complaints": the admin bar carries six
                    // tabs, so the longest label decides whether any of them
                    // ellipsize on a narrow phone.
                    tabBarLabel: "Issues",
                    tabBarIcon: tabIcon("cash"),
                }}
            />
            <Tabs.Screen
                name="reports"
                options={{
                    title: "Spending reports",
                    tabBarLabel: "Reports",
                    tabBarIcon: tabIcon("pie-chart"),
                }}
            />
            <Tabs.Screen
                name="users"
                options={{
                    title: "People",
                    tabBarLabel: "People",
                    tabBarIcon: tabIcon("people"),
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
