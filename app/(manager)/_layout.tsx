import { Tabs } from "expo-router";
import { tabIcon, useTabScreenOptions } from "@/components/ui";

export default function ManagerLayout() {
    return (
        <Tabs screenOptions={useTabScreenOptions()}>
            <Tabs.Screen
                name="index"
                options={{
                    title: "Overview",
                    tabBarLabel: "Overview",
                    tabBarIcon: tabIcon("stats-chart"),
                }}
            />
            <Tabs.Screen
                name="complaints"
                options={{
                    title: "All complaints",
                    tabBarLabel: "Complaints",
                    tabBarIcon: tabIcon("construct"),
                }}
            />
            <Tabs.Screen
                name="approvals"
                options={{
                    title: "New staff requests",
                    tabBarLabel: "New staff",
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
