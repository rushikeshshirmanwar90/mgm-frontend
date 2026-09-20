import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { UserRole } from "@/lib/types";
import { Colors } from "@/constants/theme";

/**
 * Routes reachable without being signed in.
 *
 * Password recovery belongs here for the same reason login does: the user by
 * definition cannot authenticate yet. Leaving it out made the guard below
 * replace the screen with /login the instant it mounted, so tapping "Forgot
 * password?" appeared to do nothing at all.
 */
const PUBLIC_ROUTES = ["login", "register", "verify-otp", "forgot-password"];

/**
 * The route group that owns each role's screens. Left `as const` rather than
 * widened to `string` so expo-router's typed-routes check accepts these paths
 * at the `router.replace` call below.
 */
const HOME_FOR_ROLE = {
    admin: "/(admin)",
    manager: "/(manager)",
    staff: "/(staff)",
} as const satisfies Record<UserRole, string>;

const GROUP_FOR_ROLE: Record<UserRole, string> = {
    admin: "(admin)",
    manager: "(manager)",
    staff: "(staff)",
};

/**
 * Signed-in routes that sit outside the per-role groups because every role uses
 * the same screen. Without this the guard below would treat the complaint detail
 * route as "wrong group" and bounce anyone who opened a complaint straight back
 * to their dashboard. Access within these screens is still enforced server-side
 * (staff can only fetch their own complaints).
 */
const SHARED_ROUTES = ["complaint"];

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
        const onSharedRoute = current !== undefined && SHARED_ROUTES.includes(current);
        if (current !== GROUP_FOR_ROLE[user.role] && !onSharedRoute) {
            router.replace(home);
        }
    }, [user, isLoading, segments, router]);

    if (isLoading) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: Colors.background,
                }}
            >
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: Colors.background },
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="verify-otp" />
            <Stack.Screen name="forgot-password" />
            <Stack.Screen name="(staff)" />
            <Stack.Screen name="(manager)" />
            <Stack.Screen name="(admin)" />
            <Stack.Screen
                name="complaint/[id]"
                options={{
                    // This screen renders its own header (back button + a
                    // "2 of 5, swipe for more" subtitle above the swipeable
                    // ticket pager), since that subtitle needs to react to
                    // which page is active.
                    headerShown: false,
                }}
            />
        </Stack>
    );
}

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <AuthProvider>
                <StatusBar style="dark" />
                <RootLayoutNav />
            </AuthProvider>
        </SafeAreaProvider>
    );
}
