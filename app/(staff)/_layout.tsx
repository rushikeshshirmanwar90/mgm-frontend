import { Tabs } from "expo-router";
import { Text } from "react-native";

export default function StaffLayout() {
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
                    tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🏠</Text>,
                }}
            />
            <Tabs.Screen
                name="raise"
                options={{
                    title: "Raise Complaint",
                    tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>➕</Text>,
                }}
            />
            <Tabs.Screen
                name="complaints"
                options={{
                    title: "My Complaints",
                    tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📋</Text>,
                }}
            />
            <Tabs.Screen
                name="notifications"
                options={{
                    title: "Notifications",
                    tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🔔</Text>,
                }}
            />
        </Tabs>
    );
}
