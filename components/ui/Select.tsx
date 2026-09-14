import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    StyleProp,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Radius, Shadow } from "@/constants/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

export interface SelectOption {
    key: string;
    label: string;
    /** Smaller muted line under the label — codes, prefixes, room types. */
    description?: string;
    icon?: IoniconName;
}

interface SelectProps {
    options: SelectOption[];
    value: string | null;
    onChange: (key: string) => void;
    label?: string;
    /** Rendered next to the label in muted type — use for "(optional)" hints. */
    hint?: string;
    /** Shown in the box until something is chosen. */
    placeholder?: string;
    /** Leading icon in the box, as on TextField. */
    icon?: IoniconName;
    /** Title of the picker sheet. Falls back to the label. */
    sheetTitle?: string;
    /** Shows a spinner in place of the chevron and blocks opening. */
    loading?: boolean;
    disabled?: boolean;
    /** Marks the field as satisfied — green border and a trailing tick. */
    success?: boolean;
    /** Muted guidance under the box. */
    help?: string;
    containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Dropdown counterpart to TextField. The closed box shares TextField's chrome
 * so a form of text inputs and selects reads as one control set; tapping it
 * opens a bottom sheet list rather than a native picker, which gives every
 * platform the same look and leaves room for an icon and description per row.
 */
export const Select: React.FC<SelectProps> = ({
    options,
    value,
    onChange,
    label,
    hint,
    placeholder = "Select…",
    icon,
    sheetTitle,
    loading = false,
    disabled = false,
    success = false,
    help,
    containerStyle,
}) => {
    const [open, setOpen] = useState(false);
    const insets = useSafeAreaInsets();

    const selected = options.find((o) => o.key === value) ?? null;
    const canOpen = !disabled && !loading && options.length > 0;

    const iconColor = open
        ? Colors.primary
        : success
          ? Colors.success
          : Colors.textTertiary;

    return (
        <View style={styles.field}>
            {label ? (
                <View style={styles.labelRow}>
                    <Text style={styles.label}>{label}</Text>
                    {hint ? <Text style={styles.hint}>{hint}</Text> : null}
                </View>
            ) : null}

            <TouchableOpacity
                activeOpacity={0.8}
                disabled={!canOpen}
                onPress={() => setOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ disabled: !canOpen, expanded: open }}
                style={[
                    styles.container,
                    success && styles.containerSuccess,
                    open && styles.containerFocused,
                    !canOpen && styles.containerDisabled,
                    containerStyle,
                ]}
            >
                {icon && (
                    <Ionicons name={icon} size={18} color={iconColor} style={styles.icon} />
                )}

                <Text
                    style={[styles.valueText, !selected && styles.placeholderText]}
                    numberOfLines={1}
                >
                    {selected ? selected.label : placeholder}
                </Text>

                {success && selected && !loading && (
                    <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                )}
                {/* The chevron stays even once satisfied, so the box still reads as changeable. */}
                {loading ? (
                    <ActivityIndicator size="small" color={Colors.primary} style={styles.trailing} />
                ) : (
                    <Ionicons
                        name={open ? "chevron-up" : "chevron-down"}
                        size={18}
                        color={open ? Colors.primary : Colors.textTertiary}
                        style={styles.trailing}
                    />
                )}
            </TouchableOpacity>

            {help ? (
                <View style={styles.noteRow}>
                    <Text style={styles.helpText}>{help}</Text>
                </View>
            ) : null}

            <Modal
                visible={open}
                animationType="slide"
                transparent
                onRequestClose={() => setOpen(false)}
            >
                <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
                    {/* Stops a tap inside the sheet from falling through to the overlay. */}
                    <Pressable
                        style={[styles.sheet, { paddingBottom: 12 + insets.bottom }]}
                        onPress={() => {}}
                    >
                        <View style={styles.grabber} />
                        <View style={styles.sheetHeader}>
                            <Text style={styles.sheetTitle}>{sheetTitle ?? label ?? "Select"}</Text>
                            <TouchableOpacity
                                onPress={() => setOpen(false)}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                accessibilityRole="button"
                                accessibilityLabel="Close"
                            >
                                <Ionicons name="close" size={22} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={options}
                            keyExtractor={(o) => o.key}
                            style={styles.list}
                            contentContainerStyle={styles.listContent}
                            ItemSeparatorComponent={() => <View style={styles.separator} />}
                            renderItem={({ item }) => {
                                const active = item.key === value;
                                return (
                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        onPress={() => {
                                            onChange(item.key);
                                            setOpen(false);
                                        }}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected: active }}
                                        style={[styles.row, active && styles.rowActive]}
                                    >
                                        {item.icon && (
                                            <View
                                                style={[styles.rowIcon, active && styles.rowIconActive]}
                                            >
                                                <Ionicons
                                                    name={item.icon}
                                                    size={16}
                                                    color={active ? "#FFFFFF" : Colors.primary}
                                                />
                                            </View>
                                        )}
                                        <View style={styles.rowText}>
                                            <Text
                                                style={[styles.rowLabel, active && styles.rowLabelActive]}
                                                numberOfLines={1}
                                            >
                                                {item.label}
                                            </Text>
                                            {item.description ? (
                                                <Text style={styles.rowDescription} numberOfLines={1}>
                                                    {item.description}
                                                </Text>
                                            ) : null}
                                        </View>
                                        {active && (
                                            <Ionicons
                                                name="checkmark-circle"
                                                size={20}
                                                color={Colors.primary}
                                            />
                                        )}
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    </Pressable>
                </Pressable>
            </Modal>
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
    containerFocused: {
        borderColor: Colors.primary,
        backgroundColor: "#F0F9FF",
    },
    containerSuccess: {
        borderColor: Colors.successBorder,
        backgroundColor: Colors.successLight,
    },
    containerDisabled: {
        opacity: 0.6,
    },
    icon: {
        paddingHorizontal: 10,
    },
    valueText: {
        flex: 1,
        paddingVertical: 13,
        paddingHorizontal: 10,
        fontSize: 15,
        fontWeight: "600",
        color: Colors.textBody,
    },
    placeholderText: {
        fontWeight: "400",
        color: Colors.textTertiary,
    },
    trailing: {
        paddingHorizontal: 12,
    },
    noteRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        marginTop: 6,
        paddingHorizontal: 2,
    },
    helpText: {
        flex: 1,
        fontSize: 11.5,
        color: Colors.textTertiary,
        lineHeight: 15,
    },

    // Sheet — same overlay and radius as CostModal so pickers and forms match.
    overlay: {
        flex: 1,
        backgroundColor: "rgba(15,23,42,0.55)",
        justifyContent: "flex-end",
    },
    sheet: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingTop: 10,
        maxHeight: "70%",
        ...Shadow.lg,
    },
    grabber: {
        alignSelf: "center",
        width: 40,
        height: 4,
        borderRadius: Radius.full,
        backgroundColor: Colors.border,
        marginBottom: 10,
    },
    sheetHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    sheetTitle: {
        fontSize: 16,
        fontWeight: "800",
        color: Colors.textPrimary,
    },
    list: {
        flexGrow: 0,
    },
    listContent: {
        paddingHorizontal: 12,
        paddingTop: 8,
    },
    separator: {
        height: 4,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: Radius.md,
    },
    rowActive: {
        backgroundColor: Colors.primaryLight,
    },
    rowIcon: {
        width: 32,
        height: 32,
        borderRadius: Radius.full,
        backgroundColor: Colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
    },
    rowIconActive: {
        backgroundColor: Colors.primary,
    },
    rowText: {
        flex: 1,
    },
    rowLabel: {
        fontSize: 15,
        fontWeight: "600",
        color: Colors.textBody,
    },
    rowLabelActive: {
        color: Colors.primaryDark,
        fontWeight: "700",
    },
    rowDescription: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 1,
    },
});
