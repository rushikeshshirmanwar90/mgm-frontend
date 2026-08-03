import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Radius, Shadow } from "@/constants/theme";

/**
 * Entry route (`/`).
 *
 * Deliberately renders nothing but the brand mark and a spinner: the guard in
 * `_layout.tsx` decides where to send people based on auth state. This file
 * exists so that `/` is owned by the app rather than falling through to
 * whatever route happens to be first — the leftover Expo starter tab screen
 * used to claim it, which left logged-out users on a "Welcome!" template page
 * with no way to reach login.
 */
export default function Index() {
    return (
        <View style={styles.container}>
            <View style={styles.logoMark}>
                <Ionicons name="business" size={30} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>MGM Maintenance</Text>
            <ActivityIndicator color={Colors.primary} style={styles.spinner} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: Colors.background,
    },
    logoMark: {
        width: 66,
        height: 66,
        borderRadius: Radius.xl,
        backgroundColor: Colors.primary,
        alignItems: "center",
        justifyContent: "center",
        ...Shadow.lg,
    },
    title: {
        fontSize: 17,
        fontWeight: "800",
        color: Colors.textPrimary,
        letterSpacing: -0.3,
        marginTop: 16,
    },
    spinner: {
        marginTop: 20,
    },
});
