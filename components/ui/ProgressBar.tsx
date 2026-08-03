import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Colors } from "@/constants/theme";

interface ProgressBarProps {
    /** 0–100; values outside the range are clamped. */
    percent: number;
    color?: string;
    height?: number;
    style?: StyleProp<ViewStyle>;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
    percent,
    color = Colors.primary,
    height = 8,
    style,
}) => (
    <View style={[styles.track, { height, borderRadius: height / 2 }, style]}>
        <View
            style={{
                width: `${Math.max(0, Math.min(percent, 100))}%`,
                height: "100%",
                borderRadius: height / 2,
                backgroundColor: color,
            }}
        />
    </View>
);

const styles = StyleSheet.create({
    track: {
        backgroundColor: Colors.border,
        overflow: "hidden",
        width: "100%",
    },
});
