import React from "react";
import { Ionicons } from "@expo/vector-icons";
import {
    ActivityIndicator,
    StyleProp,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewStyle,
} from "react-native";
import { Colors, Radius } from "@/constants/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

type Variant = "primary" | "secondary" | "success" | "danger" | "ghost";

interface ButtonProps {
    label: string;
    onPress?: () => void;
    variant?: Variant;
    icon?: IoniconName;
    /** Renders the icon after the label — use for "continue"-style arrows. */
    iconAfter?: boolean;
    loading?: boolean;
    disabled?: boolean;
    size?: "sm" | "md" | "lg";
    fullWidth?: boolean;
    style?: StyleProp<ViewStyle>;
}

const PALETTE: Record<Variant, { bg: string; fg: string; border?: string }> = {
    primary:   { bg: Colors.primary,      fg: "#FFFFFF" },
    secondary: { bg: Colors.primaryLight, fg: Colors.primaryDark, border: Colors.primaryBorder },
    success:   { bg: Colors.successLight, fg: Colors.successDark, border: Colors.successBorder },
    danger:    { bg: Colors.errorLight,   fg: Colors.errorDark,   border: Colors.errorBorder },
    ghost:     { bg: "transparent",       fg: Colors.textSecondary, border: Colors.border },
};

const SIZING = {
    sm: { paddingVertical: 8,  paddingHorizontal: 12, fontSize: 12, icon: 14, radius: Radius.sm },
    md: { paddingVertical: 12, paddingHorizontal: 16, fontSize: 14, icon: 16, radius: Radius.md },
    lg: { paddingVertical: 15, paddingHorizontal: 20, fontSize: 15, icon: 18, radius: 14 },
};

export const Button: React.FC<ButtonProps> = ({
    label,
    onPress,
    variant = "primary",
    icon,
    iconAfter = false,
    loading = false,
    disabled = false,
    size = "md",
    fullWidth = false,
    style,
}) => {
    const palette = PALETTE[variant];
    const dims = SIZING[size];
    const inert = disabled || loading;

    const glyph = icon ? <Ionicons name={icon} size={dims.icon} color={palette.fg} /> : null;

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={inert}
            activeOpacity={0.85}
            style={[
                styles.base,
                {
                    backgroundColor: palette.bg,
                    borderColor: palette.border ?? "transparent",
                    borderWidth: palette.border ? 1 : 0,
                    paddingVertical: dims.paddingVertical,
                    paddingHorizontal: dims.paddingHorizontal,
                    borderRadius: dims.radius,
                },
                fullWidth && styles.fullWidth,
                inert && styles.inert,
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator color={palette.fg} size="small" />
            ) : (
                <View style={styles.row}>
                    {!iconAfter && glyph}
                    <Text style={[styles.label, { color: palette.fg, fontSize: dims.fontSize }]}>
                        {label}
                    </Text>
                    {iconAfter && glyph}
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    base: {
        alignItems: "center",
        justifyContent: "center",
    },
    fullWidth: {
        alignSelf: "stretch",
    },
    inert: {
        opacity: 0.55,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    label: {
        fontWeight: "700",
        letterSpacing: 0.2,
    },
});
