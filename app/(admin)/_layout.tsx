import { Tabs } from "expo-router";
import { Text } from "react-native";

export default function AdminLayout() {
    return (
        <Tabs
            screenOptions={{
                headerStyle: { backgroundColor: "#ffffff" },
                headerTitleStyle: { fontWeight: "700", fontSize: 18 },
                tabBarActiveTintColor: "#be185d",
                tabBarInactiveTintColor: "#64748b",
                tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 6 },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Executive",
                    tabBarIcon: () => <Text style={{ fontSize: 20 }}>👑</Text>,
                }}
            />
            <Tabs.Screen
                name="buildings"
                options={{
                    title: "Campus Infrastructure",
                    tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏢</Text>,
                }}
            />
            <Tabs.Screen
                name="complaints"
                options={{
                    title: "Audit & Costs",
                    tabBarIcon: () => <Text style={{ fontSize: 20 }}>💰</Text>,
                }}
            />
            <Tabs.Screen
                name="reports"
                options={{
                    title: "Cost Reports",
                    tabBarIcon: () => <Text style={{ fontSize: 20 }}>📊</Text>,
                }}
            />
            <Tabs.Screen
                name="users"
                options={{
                    title: "User Management",
                    tabBarIcon: () => <Text style={{ fontSize: 20 }}>👥</Text>,
                }}
            />
        </Tabs>
    );
}
