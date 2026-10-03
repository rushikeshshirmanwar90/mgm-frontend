import React from "react";
import { Linking, StyleProp, StyleSheet, Text, TextStyle } from "react-native";
import { Colors } from "@/constants/theme";

const EXPONENTOR_URL = "https://exponentor.com";

/** "Designed and developed by" line shown at the foot of login and tab screens. */
export function Credit({ style }: { style?: StyleProp<TextStyle> }) {
    return (
        <Text style={[styles.credit, style]}>
            Designed and developed by{" "}
            <Text
                style={styles.brand}
                onPress={() => Linking.openURL(EXPONENTOR_URL).catch(() => {})}
                accessibilityRole="link"
                suppressHighlighting
            >
                The Exponentor
            </Text>
        </Text>
    );
}

const styles = StyleSheet.create({
    credit: {
        fontSize: 11.5,
        color: Colors.textSecondary,
        textAlign: "center",
        marginTop: 24,
    },
    brand: {
        fontWeight: "700",
        color: Colors.primary,
    },
});
