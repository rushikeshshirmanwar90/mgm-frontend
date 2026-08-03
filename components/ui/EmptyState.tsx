import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Colors, Radius } from "@/constants/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

interface EmptyStateProps {
    icon: IoniconName;
    title: string;
    message?: string;
    color?: string;
    /** Slot for a recovery action, e.g. a button back to the form. */
    action?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

/** Consistent "nothing here" panel for lists and dashboards. */
export const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    message,
    color = Colors.primary,
    action,
    style,
}) => (
    <View style={[styles.box, style]}>
        <View style={[styles.iconRing, { backgroundColor: `${color}14` }]}>
            <Ionicons name={icon} size={26} color={color} />
        </View>
        <Text style={styles.title}>{title}</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {action ? <View style={styles.action}>{action}</View> : null}
    </View>
);

const styles = StyleSheet.create({
    box: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 44,
        paddingHorizontal: 28,
        backgroundColor: Colors.surface,
        borderRadius: Radius.xl,
        borderWidth: 1,
        borderColor: Colors.borderCard,
        borderStyle: "dashed",
    },
    iconRing: {
        width: 58,
        height: 58,
        borderRadius: Radius.lg,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
    },
    title: {
        fontSize: 15,
        fontWeight: "800",
        color: Colors.textPrimary,
        letterSpacing: -0.2,
        textAlign: "center",
    },
    message: {
        fontSize: 12.5,
        color: Colors.textTertiary,
        textAlign: "center",
        marginTop: 5,
        lineHeight: 18,
    },
    action: {
        marginTop: 16,
    },
});
