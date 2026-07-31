import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface StatusBadgeProps {
    status: "pending" | "in_progress" | "resolved" | "rejected";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const getBadgeStyle = () => {
        switch (status) {
            case "pending":
                return { bg: "#fef3c7", text: "#d97706", label: "Pending" };
            case "in_progress":
                return { bg: "#dbeafe", text: "#2563eb", label: "In Progress" };
            case "resolved":
                return { bg: "#dcfce7", text: "#16a34a", label: "Resolved 🎉" };
            case "rejected":
                return { bg: "#fee2e2", text: "#dc2626", label: "Rejected" };
            default:
                return { bg: "#f3f4f6", text: "#4b5563", label: status };
        }
    };

    const style = getBadgeStyle();

    return (
        <View style={[styles.badge, { backgroundColor: style.bg }]}>
            <Text style={[styles.text, { color: style.text }]}>{style.label}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: "flex-start",
    },
    text: {
        fontSize: 12,
        fontWeight: "600",
    },
});
