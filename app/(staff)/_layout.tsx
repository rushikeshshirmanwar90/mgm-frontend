import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { Colors, Radius } from "@/constants/theme";
import { createTabBar, useTabScreenOptions } from "@/components/ui";

/**
 * Circular avatar-style button on the Home header, jumping straight to
 * Profile — the tab bar itself no longer carries a Profile button, and
 * every other staff screen is a tab away from Home anyway, so this one
 * shortcut is enough without repeating it on every header.
 */
import { Text, View } from "react-native";

function HeaderProfileButton() {
    const router = useRouter();
    const { user } = useAuth();
    const initial = user?.name ? user.name.trim().charAt(0).toUpperCase() : null;

    return (
        <TouchableOpacity
            onPress={() => router.push("/(staff)/profile")}
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

/** Back chevron for screens (Profile) that are pushed to rather than being a tab. */
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

const staffTabBar = createTabBar([
    { name: "index", icon: "home", label: "Home" },
    { name: "complaints", icon: "document-text", label: "My reports" },
    { name: "notifications", icon: "notifications", label: "Updates" },
]);

export default function StaffLayout() {
    const { user } = useAuth();

    // Pending staff can sign in but can't report anything, so the Report
    // screen is removed from the navigator rather than shown-and-disabled.
    // `Protected` drops the route entirely, so /(staff)/raise isn't
    // reachable by a direct link either. The server enforces the same rule
    // regardless.
    const canRaise = !!user?.isApproved;

    return (
        <Tabs screenOptions={useTabScreenOptions()} tabBar={staffTabBar}>
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                    headerRight: () => <HeaderProfileButton />,
                }}
            />
            <Tabs.Protected guard={canRaise}>
                <Tabs.Screen
                    name="raise"
                    options={{
                        title: "Report an issue",
                        // No tab bar button — reached only via the floating
                        // "+" button on the home screen now. The custom bar
                        // (see CustomTabBar) hides itself entirely on any
                        // screen that isn't one of its own tabs, which also
                        // takes care of keeping it off the keyboard here.
                        href: null,
                        // headerLeft (back) and headerRight (search) are set
                        // by the screen itself — see raise.tsx — since the
                        // search button needs to reach into that screen's own
                        // scroll position and input ref.
                    }}
                />
            </Tabs.Protected>
            <Tabs.Screen
                name="complaints"
                options={{
                    title: "My complaints",
                }}
            />
            <Tabs.Screen
                name="notifications"
                options={{
                    title: "Updates",
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "My profile",
                    // Still a real, linkable route — just no bottom tab
                    // button, since it's only ever opened from Home's
                    // profile shortcut.
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
