import { View, ActivityIndicator, StyleSheet } from "react-native";

/**
 * Entry route (`/`).
 *
 * Deliberately renders nothing but a spinner: the guard in `_layout.tsx` decides
 * where to send people based on auth state. This file exists so that `/` is
 * owned by the app rather than falling through to whatever route happens to be
 * first — the leftover Expo starter tab screen used to claim it, which left
 * logged-out users on a "Welcome!" template page with no way to reach login.
 */
export default function Index() {
    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#2563eb" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f8fafc",
    },
});
