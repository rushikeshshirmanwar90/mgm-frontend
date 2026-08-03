import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Colors } from "@/constants/theme";

interface SectionTitleProps {
    title: string;
    /** Right-aligned slot for "See all" links or add buttons. */
    action?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

/** Uppercase micro-heading that separates blocks within a screen. */
export const SectionTitle: React.FC<SectionTitleProps> = ({ title, action, style }) => (
    <View style={[styles.row, style]}>
        <Text style={styles.title}>{title}</Text>
        {action}
    </View>
);

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 12,
    },
    title: {
        fontSize: 11.5,
        fontWeight: "700",
        color: Colors.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.6,
        flexShrink: 1,
    },
});
