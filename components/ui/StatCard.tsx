import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { IconChip } from "./IconChip";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

interface StatCardProps {
    icon: IoniconName;
    color?: string;
    value: number | string;
    label: string;
    /**
     * `row` places the icon beside the figure and suits two-up grids;
     * `stack` puts it above and stays readable at three or four across.
     */
    layout?: "row" | "stack";
    style?: StyleProp<ViewStyle>;
}

/** Metric tile: tinted icon chip, bold figure, uppercase caption. */
export const StatCard: React.FC<StatCardProps> = ({
    icon,
    color = Colors.primary,
    value,
    label,
    layout = "row",
    style,
}) => {
    const stacked = layout === "stack";

    return (
        <View style={[styles.card, stacked && styles.cardStacked, style]}>
            <IconChip name={icon} color={color} size={32} />
            <View style={stacked ? styles.textBlockStacked : styles.textBlock}>
                <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
                    {value}
                </Text>
                <Text style={styles.label} numberOfLines={2}>
                    {label}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        paddingVertical: 12,
        paddingHorizontal: 12,
        gap: 10,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        ...Shadow.md,
    },
    cardStacked: {
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 8,
        paddingVertical: 14,
    },
    textBlock: {
        flexShrink: 1,
    },
    textBlockStacked: {
        alignSelf: "stretch",
    },
    value: {
        fontSize: 17,
        fontWeight: "800",
        color: Colors.textPrimary,
        letterSpacing: -0.3,
    },
    label: {
        fontSize: 10,
        fontWeight: "600",
        color: Colors.textTertiary,
        textTransform: "uppercase",
        letterSpacing: 0.3,
        marginTop: 2,
        lineHeight: 13,
    },
});
