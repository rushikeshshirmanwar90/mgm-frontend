import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Colors } from "@/constants/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

interface IconChipProps {
    name: IoniconName;
    color?: string;
    /** Chip edge length; the glyph is sized to roughly half of it. */
    size?: number;
    /** Defaults to a 10%-opacity wash of `color`. */
    background?: string;
    style?: StyleProp<ViewStyle>;
}

/** The rounded-square icon tile that fronts every row and label in Xsite. */
export const IconChip: React.FC<IconChipProps> = ({
    name,
    color = Colors.primary,
    size = 32,
    background,
    style,
}) => (
    <View
        style={[
            styles.chip,
            {
                width: size,
                height: size,
                borderRadius: size / 3,
                backgroundColor: background ?? `${color}1A`,
            },
            style,
        ]}
    >
        <Ionicons name={name} size={Math.round(size * 0.5)} color={color} />
    </View>
);

const styles = StyleSheet.create({
    chip: {
        alignItems: "center",
        justifyContent: "center",
    },
});
