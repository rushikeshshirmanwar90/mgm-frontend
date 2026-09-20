import { Tabs } from "expo-router";
import { createTabBar, useTabScreenOptions } from "@/components/ui";

const managerTabBar = createTabBar([
    { name: "index", icon: "stats-chart", label: "Overview" },
    { name: "complaints", icon: "construct", label: "Complaints" },
    { name: "approvals", icon: "people", label: "New staff" },
    { name: "profile", icon: "person-circle", label: "Profile" },
]);

export default function ManagerLayout() {
    return (
        <Tabs screenOptions={useTabScreenOptions()} tabBar={managerTabBar}>
            <Tabs.Screen name="index" options={{ title: "Overview" }} />
            <Tabs.Screen name="complaints" options={{ title: "All complaints" }} />
            <Tabs.Screen name="approvals" options={{ title: "New staff requests" }} />
            <Tabs.Screen name="profile" options={{ title: "My profile" }} />
        </Tabs>
    );
}
