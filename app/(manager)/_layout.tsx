import { Tabs } from "expo-router";
import { Text } from "react-native";

export default function ManagerLayout() {
    return (
        <Tabs
            screenOptions={{
                headerStyle: { backgroundColor: "#ffffff" },
                headerTitleStyle: { fontWeight: "700", fontSize: 18 },
                tabBarActiveTintColor: "#2563eb",
                tabBarInactiveTintColor: "#64748b",
                tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 6 },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Dashboard",
                    tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📊</Text>,
                }}
            />
            <Tabs.Screen
                name="complaints"
                options={{
                    title: "Manage Complaints",
                    tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🛠️</Text>,
                }}
            />
            <Tabs.Screen
                name="approvals"
                options={{
                    title: "Staff Approvals",
                    tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>👥</Text>,
                }}
            />
        </Tabs>
    );
}
