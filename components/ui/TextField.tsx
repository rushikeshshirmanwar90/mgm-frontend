import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
    Platform,
    StyleProp,
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    TouchableOpacity,
    View,
    ViewStyle,
} from "react-native";
import { Colors, Radius } from "@/constants/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

interface TextFieldProps extends TextInputProps {
    label?: string;
    /** Rendered next to the label in muted type — use for "(optional)" hints. */
    hint?: string;
    icon?: IoniconName;
    /** Adds the eye toggle and masks input until it is tapped. */
    isPassword?: boolean;
    /** Grows the box and top-aligns text for descriptions and notes. */
    multiline?: boolean;
    containerStyle?: StyleProp<ViewStyle>;
}

/**
 * The single text input used across the app. It carries the focus treatment
 * from Xsite — the border and leading icon both shift to brand blue and the
 * fill picks up a faint blue tint — so every form field reacts identically.
 */
export const TextField: React.FC<TextFieldProps> = ({
    label,
    hint,
    icon,
    isPassword = false,
    multiline = false,
    containerStyle,
    style,
    onFocus,
    onBlur,
    ...props
}) => {
    const [focused, setFocused] = useState(false);
    const [revealed, setRevealed] = useState(false);

    return (
        <View style={styles.field}>
            {label ? (
                <View style={styles.labelRow}>
                    <Text style={styles.label}>{label}</Text>
                    {hint ? <Text style={styles.hint}>{hint}</Text> : null}
                </View>
            ) : null}

            <View
                style={[
                    styles.container,
                    multiline && styles.containerMultiline,
                    focused && styles.containerFocused,
                    containerStyle,
                ]}
            >
                {icon && (
                    <Ionicons
                        name={icon}
                        size={18}
                        color={focused ? Colors.primary : Colors.textTertiary}
                        style={[styles.icon, multiline && styles.iconMultiline]}
                    />
                )}

                <TextInput
                    {...props}
                    multiline={multiline}
                    secureTextEntry={isPassword && !revealed}
                    placeholderTextColor={Colors.textTertiary}
                    style={[styles.input, multiline && styles.inputMultiline, style]}
                    onFocus={(e) => {
                        setFocused(true);
                        onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        setFocused(false);
                        onBlur?.(e);
                    }}
                />

                {isPassword && (
                    <TouchableOpacity
                        onPress={() => setRevealed((v) => !v)}
                        style={styles.toggle}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons
                            name={revealed ? "eye-off-outline" : "eye-outline"}
                            size={18}
                            color={Colors.primary}
                        />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    field: {
        marginBottom: 14,
    },
    labelRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 7,
    },
    label: {
        fontSize: 11,
        fontWeight: "700",
        color: Colors.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    hint: {
        fontSize: 11,
        fontWeight: "500",
        color: Colors.textTertiary,
    },
    container: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.borderLight,
        borderWidth: 1.5,
        borderColor: Colors.border,
        borderRadius: Radius.md,
        paddingHorizontal: 4,
        minHeight: 50,
    },
    containerMultiline: {
        alignItems: "flex-start",
        minHeight: 96,
    },
    containerFocused: {
        borderColor: Colors.primary,
        backgroundColor: "#F0F9FF",
    },
    icon: {
        paddingHorizontal: 10,
    },
    iconMultiline: {
        paddingTop: 15,
    },
    input: {
        flex: 1,
        paddingVertical: 13,
        paddingHorizontal: 10,
        fontSize: 15,
        color: Colors.textBody,
        ...Platform.select({
            android: { includeFontPadding: false, textAlignVertical: "center" },
        }),
    },
    inputMultiline: {
        minHeight: 90,
        paddingTop: 13,
        ...Platform.select({
            android: { textAlignVertical: "top" },
        }),
    },
    toggle: {
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
});
