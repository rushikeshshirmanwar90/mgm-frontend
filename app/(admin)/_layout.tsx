import { Tabs } from "expo-router";
import { createTabBar, useTabScreenOptions } from "@/components/ui";

const adminTabBar = createTabBar([
    { name: "index", icon: "grid", label: "Overview" },
    { name: "buildings", icon: "business", label: "Campus" },
    // Shortened from "Complaints": the admin bar carries six tabs, so the
    // longest label decides whether any of them ellipsize on a narrow phone.
    { name: "complaints", icon: "cash", label: "Issues" },
    { name: "reports", icon: "pie-chart", label: "Reports" },
    { name: "users", icon: "people", label: "People" },
    { name: "profile", icon: "person-circle", label: "Profile" },
]);

export default function AdminLayout() {
    return (
        <Tabs screenOptions={useTabScreenOptions()} tabBar={adminTabBar}>
            <Tabs.Screen name="index" options={{ title: "Overview" }} />
            <Tabs.Screen name="buildings" options={{ title: "Buildings & rooms" }} />
            <Tabs.Screen name="complaints" options={{ title: "All complaints" }} />
            <Tabs.Screen name="reports" options={{ title: "Spending reports" }} />
            <Tabs.Screen name="users" options={{ title: "People" }} />
            <Tabs.Screen name="profile" options={{ title: "My profile" }} />
        </Tabs>
    );
}
