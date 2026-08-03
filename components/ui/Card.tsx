import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Colors, Radius, Shadow } from "@/constants/theme";

interface CardProps {
    children: React.ReactNode;
    /** Draws the 4px brand bar across the top edge, as on Xsite's project cards. */
    accent?: boolean;
    accentColor?: string;
    /** `flat` drops the drop shadow and leans on the border instead. */
    variant?: "raised" | "flat";
    style?: StyleProp<ViewStyle>;
    /** Applied to the inner padded area rather than the clipped shell. */
    contentStyle?: StyleProp<ViewStyle>;
    padded?: boolean;
}

/**
 * The surface every screen builds on: a clipped, rounded shell with an optional
 * accent bar. The shadow lives on an outer wrapper because `overflow: hidden`
 * on the shell (needed so the accent bar follows the corner radius) would
 * otherwise clip the shadow on Android.
 */
export const Card: React.FC<CardProps> = ({
    children,
    accent = false,
    accentColor = Colors.primary,
    variant = "raised",
    style,
    contentStyle,
    padded = true,
}) => (
    <View style={[variant === "raised" ? styles.shadowWrap : styles.flatWrap, style]}>
        <View style={styles.shell}>
            {accent && <View style={[styles.accentBar, { backgroundColor: accentColor }]} />}
            <View style={[padded && styles.inner, contentStyle]}>{children}</View>
        </View>
    </View>
);

const styles = StyleSheet.create({
    shadowWrap: {
        borderRadius: Radius.xl,
        backgroundColor: Colors.surface,
        ...Shadow.md,
    },
    flatWrap: {
        borderRadius: Radius.xl,
        backgroundColor: Colors.surface,
    },
    shell: {
        borderRadius: Radius.xl,
        overflow: "hidden",
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.borderCard,
    },
    accentBar: {
        height: 4,
        width: "100%",
    },
    inner: {
        padding: 18,
    },
});
