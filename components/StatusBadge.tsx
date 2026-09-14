import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors, Radius, StatusColors } from "@/constants/theme";
import { ComplaintStatus } from "@/lib/types";

interface StatusBadgeProps {
    status: ComplaintStatus;
    size?: "sm" | "md";
}

/** Dot-and-label pill, matching the corner badge on Xsite's project cards. */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = "md" }) => {
    const tone = StatusColors[status] ?? {
        fg: Colors.textSecondary,
        bg: Colors.borderLight,
        dot: Colors.textTertiary,
        border: Colors.border,
        label: status,
    };

    return (
        <View
            style={[
                styles.badge,
                size === "sm" && styles.badgeSm,
                { backgroundColor: tone.bg, borderColor: tone.border },
            ]}
        >
            <View style={[styles.dot, { backgroundColor: tone.dot }]} />
            <Text style={[styles.text, size === "sm" && styles.textSm, { color: tone.fg }]}>
                {tone.label}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: Radius.full,
        borderWidth: 1,
        alignSelf: "flex-start",
    },
    badgeSm: {
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    text: {
        fontSize: 11,
        fontWeight: "700",
    },
    textSm: {
        fontSize: 10,
    },
});
