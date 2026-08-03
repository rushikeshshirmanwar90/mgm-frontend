import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { Colors, Radius } from "@/constants/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];
type Tone = "info" | "warning" | "success" | "error";

const TONES: Record<Tone, { bg: string; border: string; fg: string; icon: IoniconName }> = {
    info:    { bg: Colors.primaryLight, border: Colors.primaryBorder, fg: Colors.primaryDark, icon: "information-circle" },
    warning: { bg: Colors.warningLight, border: Colors.warningBorder, fg: Colors.warningDark, icon: "alert-circle" },
    success: { bg: Colors.successLight, border: Colors.successBorder, fg: Colors.successDark, icon: "checkmark-circle" },
    error:   { bg: Colors.errorLight,   border: Colors.errorBorder,   fg: Colors.errorDark,   icon: "close-circle" },
};

interface BannerProps {
    title: string;
    message?: string;
    tone?: Tone;
    icon?: IoniconName;
    /** Makes the whole banner tappable and reveals a trailing chevron. */
    onPress?: () => void;
    style?: StyleProp<ViewStyle>;
}

/** Inline callout for counts needing attention, notices and load errors. */
export const Banner: React.FC<BannerProps> = ({
    title,
    message,
    tone = "info",
    icon,
    onPress,
    style,
}) => {
    const t = TONES[tone];

    const body = (
        <View style={[styles.banner, { backgroundColor: t.bg, borderColor: t.border }, style]}>
            <Ionicons name={icon ?? t.icon} size={19} color={t.fg} />
            <View style={styles.textCol}>
                <Text style={[styles.title, { color: t.fg }]}>{title}</Text>
                {message ? (
                    <Text style={[styles.message, { color: t.fg }]}>{message}</Text>
                ) : null}
            </View>
            {onPress && <Ionicons name="chevron-forward" size={16} color={t.fg} />}
        </View>
    );

    if (!onPress) return body;

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
            {body}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    banner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 11,
        borderWidth: 1,
        borderRadius: Radius.lg,
        paddingVertical: 13,
        paddingHorizontal: 14,
        marginBottom: 16,
    },
    textCol: {
        flex: 1,
    },
    title: {
        fontSize: 13,
        fontWeight: "700",
    },
    message: {
        fontSize: 11.5,
        marginTop: 2,
        opacity: 0.85,
        lineHeight: 16,
    },
});
