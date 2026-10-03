import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors, Radius } from "@/constants/theme";
import { createTabBar, useTabScreenOptions } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";

function HeaderProfileButton() {
    const router = useRouter();
    const { user } = useAuth();
    const initial = user?.name ? user.name.trim().charAt(0).toUpperCase() : null;

    return (
        <TouchableOpacity
            onPress={() => router.push("/(director)/profile")}
            style={styles.profileBtn}
            hitSlop={8}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Open my profile"
        >
            {initial ? (
                <View style={styles.avatarInner}>
                    <Text style={styles.avatarText}>{initial}</Text>
                </View>
            ) : (
                <Ionicons name="person" size={18} color={Colors.primary} />
            )}
        </TouchableOpacity>
    );
}

function HeaderBackButton() {
    const router = useRouter();

    return (
        <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
        >
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
    );
}

const directorTabBar = createTabBar([
    { name: "index", icon: "checkmark-done-circle", label: "Approvals" },
    { name: "approved", icon: "file-tray-full", label: "Approved" },
    { name: "notifications", icon: "notifications", label: "Updates" },
]);

export default function DirectorLayout() {
    return (
        <Tabs screenOptions={useTabScreenOptions()} tabBar={directorTabBar}>
            <Tabs.Screen
                name="index"
                options={{
                    title: "Awaiting approval",
                    headerRight: () => <HeaderProfileButton />,
                }}
            />
            <Tabs.Screen
                name="approved"
                options={{
                    title: "Approved complaints",
                    headerRight: () => <HeaderProfileButton />,
                }}
            />
            <Tabs.Screen
                name="notifications"
                options={{
                    title: "Updates",
                    headerRight: () => <HeaderProfileButton />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "My profile",
                    href: null,
                    headerLeft: () => <HeaderBackButton />,
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    backBtn: {
        marginLeft: 16,
        padding: 4,
    },
    profileBtn: {
        width: 38,
        height: 38,
        borderRadius: Radius.full,
        borderWidth: 1.5,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 16,
        overflow: "hidden",
    },
    avatarInner: {
        width: "100%",
        height: "100%",
        borderRadius: Radius.full,
        backgroundColor: Colors.primary,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "800",
        letterSpacing: -0.5,
    },
});
