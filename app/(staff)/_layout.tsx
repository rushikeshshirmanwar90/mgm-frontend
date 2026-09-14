import { Tabs } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { renderTabBar, tabIcon, useTabScreenOptions } from "@/components/ui";

export default function StaffLayout() {
    const { user } = useAuth();

    // Pending staff can sign in but can't report anything, so the Report tab is
    // removed from the navigator rather than shown-and-disabled. `Protected`
    // drops the route as well as the button, so /(staff)/raise isn't reachable
    // by a direct link either. The server enforces the same rule regardless.
    const canRaise = !!user?.isApproved;

    return (
        <Tabs tabBar={renderTabBar} screenOptions={useTabScreenOptions()}>
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                    tabBarLabel: "Home",
                    tabBarIcon: tabIcon("home"),
                }}
            />
            <Tabs.Protected guard={canRaise}>
                <Tabs.Screen
                    name="raise"
                    options={{
                        title: "Report an issue",
                        tabBarLabel: "Report",
                        tabBarIcon: tabIcon("add-circle"),
                        // The only tab with a real form on it. Dropping the bar
                        // while typing hands ~75-100pt back to the fields
                        // instead of parking a nav row on top of the keyboard.
                        tabBarHideOnKeyboard: true,
                    }}
                />
            </Tabs.Protected>
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
