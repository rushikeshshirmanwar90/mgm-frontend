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
    /**
     * Inline validation message. Turns the box red and prints the reason
     * underneath, so a form can correct the user in place instead of throwing a
     * modal alert that hides the field being complained about.
     */
    error?: string | null;
    /** Muted guidance under the box. An `error` takes its place while one is set. */
    help?: string;
    /** Marks the field as satisfied — green border and a trailing tick. */
    success?: boolean;
    /** Adds the eye toggle and masks input until it is tapped. */
    isPassword?: boolean;
    /** Grows the box and top-aligns text for descriptions and notes. */
    multiline?: boolean;
    containerStyle?: StyleProp<ViewStyle>;
    /**
     * Forwarded to the inner TextInput, so a form can move focus from one field
     * to the next when the return key is pressed. Declared as a plain prop
     * rather than via forwardRef — React 19 passes refs straight through to
     * function components.
     */
    ref?: React.Ref<TextInput>;
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
    error,
    help,
    success = false,
    isPassword = false,
    multiline = false,
    containerStyle,
    style,
    onFocus,
    onBlur,
    ref,
    ...props
}) => {
    const [focused, setFocused] = useState(false);
    const [revealed, setRevealed] = useState(false);

    const invalid = !!error;
    // A complaint outranks everything: the user needs to see what to fix even
    // while the field is focused. Otherwise focus wins, then the satisfied tick.
    const iconColor = invalid
        ? Colors.error
        : focused
          ? Colors.primary
          : success
            ? Colors.success
            : Colors.textTertiary;

    return (
        <View style={styles.field}>
            {label ? (
                <View style={styles.labelRow}>
                    <Text style={[styles.label, invalid && styles.labelError]}>{label}</Text>
                    {hint ? <Text style={styles.hint}>{hint}</Text> : null}
                </View>
            ) : null}

            <View
                style={[
                    styles.container,
                    multiline && styles.containerMultiline,
                    success && styles.containerSuccess,
                    focused && styles.containerFocused,
                    invalid && styles.containerError,
                    containerStyle,
                ]}
            >
                {icon && (
                    <Ionicons
                        name={icon}
                        size={18}
                        color={iconColor}
                        style={[styles.icon, multiline && styles.iconMultiline]}
                    />
                )}

                <TextInput
                    accessibilityLabel={label}
                    {...props}
                    ref={ref}
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
                        accessibilityRole="button"
                        accessibilityLabel={revealed ? "Hide password" : "Show password"}
                    >
                        <Ionicons
                            name={revealed ? "eye-off-outline" : "eye-outline"}
                            size={18}
                            color={Colors.primary}
                        />
                    </TouchableOpacity>
                )}

                {success && !isPassword && (
                    <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={Colors.success}
                        style={styles.tick}
                    />
                )}
            </View>

            {invalid ? (
                <View style={styles.noteRow} accessibilityLiveRegion="polite">
                    <Ionicons name="alert-circle" size={13} color={Colors.error} />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : help ? (
                <View style={styles.noteRow}>
                    <Text style={styles.helpText}>{help}</Text>
                </View>
            ) : null}
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
    labelError: {
        color: Colors.errorDark,
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
    containerSuccess: {
        borderColor: Colors.successBorder,
        backgroundColor: Colors.successLight,
    },
    containerError: {
        borderColor: Colors.error,
        backgroundColor: Colors.errorLight,
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
    tick: {
        paddingHorizontal: 12,
    },
    noteRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        marginTop: 6,
        paddingHorizontal: 2,
    },
    errorText: {
        flex: 1,
        fontSize: 11.5,
        fontWeight: "600",
        color: Colors.errorDark,
        lineHeight: 15,
    },
    helpText: {
        flex: 1,
        fontSize: 11.5,
        color: Colors.textTertiary,
        lineHeight: 15,
    },
});
