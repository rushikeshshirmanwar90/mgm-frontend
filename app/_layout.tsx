import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { UserRole } from "@/lib/types";

/** Routes reachable without being signed in. */
const PUBLIC_ROUTES = ["login", "register", "verify-otp"];

/** The route group that owns each role's screens. */
const HOME_FOR_ROLE: Record<UserRole, string> = {
    admin: "/(admin)",
    manager: "/(manager)",
    staff: "/(staff)",
};

const GROUP_FOR_ROLE: Record<UserRole, string> = {
    admin: "(admin)",
    manager: "(manager)",
    staff: "(staff)",
};

function RootLayoutNav() {
    const { user, isLoading } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;

        const current = segments[0];
        const onPublicRoute = current !== undefined && PUBLIC_ROUTES.includes(current);

        if (!user) {
            // Anything that isn't an explicitly public route goes to login. The
            // previous version only redirected away from the three role groups,
            // so any other route (including `/`) left a signed-out user stuck on
            // a screen with no way back to the login form.
            if (!onPublicRoute) {
                router.replace("/login");
            }
            return;
        }

        // Signed in: keep users inside their own role's group, and bounce them
        // out of the public auth screens.
        const home = HOME_FOR_ROLE[user.role];
        if (current !== GROUP_FOR_ROLE[user.role]) {
            router.replace(home);
        }
    }, [user, isLoading, segments, router]);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="verify-otp" />
            <Stack.Screen name="(staff)" />
            <Stack.Screen name="(manager)" />
            <Stack.Screen name="(admin)" />
        </Stack>
    );
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <StatusBar style="dark" />
            <RootLayoutNav />
        </AuthProvider>
    );
}
