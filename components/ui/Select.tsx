import React, { useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
    Dimensions,
    FlatList,
    Modal,
    StyleProp,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewStyle,
} from "react-native";
import { Colors, Radius, Shadow } from "@/constants/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

export interface SelectOption {
    key: string;
    label: string;
    icon?: IoniconName;
}

interface SelectProps {
    label?: string;
    icon?: IoniconName;
    placeholder?: string;
    options: SelectOption[];
    value: string | null;
    onChange: (key: string) => void;
    disabled?: boolean;
    emptyText?: string;
    containerStyle?: StyleProp<ViewStyle>;
}

/** Space kept between the menu and the screen edge it's closest to. */
const EDGE_MARGIN = 12;
/** Caps how tall the option list can get before it scrolls. */
const MAX_MENU_HEIGHT = 260;
const MENU_ITEM_HEIGHT = 46;

interface Anchor {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * A tap-to-open dropdown styled to match TextField's box. The menu pops open
 * directly below (or, if there isn't room, above) the field itself — like a
 * native `<select>` — rather than as a bottom sheet, so it reads as "this
 * field expanded" instead of a separate screen sliding up.
 */
export const Select: React.FC<SelectProps> = ({
    label,
    icon,
    placeholder = "Select…",
    options,
    value,
    onChange,
    disabled = false,
    emptyText = "No options available.",
    containerStyle,
}) => {
    const [open, setOpen] = useState(false);
    const [anchor, setAnchor] = useState<Anchor | null>(null);
    const triggerRef = useRef<View>(null);

    const selected = options.find((o) => o.key === value) ?? null;

    const handleOpen = () => {
        triggerRef.current?.measureInWindow((x, y, width, height) => {
            setAnchor({ x, y, width, height });
            setOpen(true);
        });
    };

    const menuHeight = Math.min(
        MAX_MENU_HEIGHT,
        Math.max(options.length, 1) * MENU_ITEM_HEIGHT + 8
    );
    const screenHeight = Dimensions.get("window").height;
    const dropUp = !!anchor && anchor.y + anchor.height + menuHeight + EDGE_MARGIN > screenHeight;

    return (
        <View style={styles.field}>
            {label ? (
                <View style={styles.labelRow}>
                    <Text style={styles.label}>{label}</Text>
                </View>
            ) : null}

            <TouchableOpacity
                ref={triggerRef}
                activeOpacity={0.75}
                disabled={disabled}
                onPress={handleOpen}
                style={[styles.container, disabled && styles.containerDisabled, containerStyle]}
            >
                {icon && (
                    <Ionicons
                        name={icon}
                        size={18}
                        color={selected ? Colors.primary : Colors.textTertiary}
                        style={styles.icon}
                    />
                )}
                <Text style={[styles.value, !selected && styles.placeholder]} numberOfLines={1}>
                    {selected ? selected.label : placeholder}
                </Text>
                <Ionicons
                    name={open ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={Colors.textTertiary}
                    style={styles.chevron}
                />
            </TouchableOpacity>

            <Modal
                visible={open}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={() => setOpen(false)}
            >
                {/* Tapping anywhere outside the menu dismisses it; the menu
                    below stops the touch from reaching this since RN doesn't
                    bubble presses. */}
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={() => setOpen(false)}
                >
                    {anchor && (
                        <View
                            style={[
                                styles.menu,
                                {
                                    left: anchor.x,
                                    width: anchor.width,
                                    maxHeight: menuHeight,
                                },
                                dropUp
                                    ? { bottom: screenHeight - anchor.y + 6 }
                                    : { top: anchor.y + anchor.height + 6 },
                            ]}
                        >
                            {options.length === 0 ? (
                                <Text style={styles.emptyText}>{emptyText}</Text>
                            ) : (
                                <FlatList
                                    data={options}
                                    keyExtractor={(o) => o.key}
                                    showsVerticalScrollIndicator={false}
                                    renderItem={({ item }) => {
                                        const active = item.key === value;
                                        return (
                                            <TouchableOpacity
                                                style={styles.row}
                                                activeOpacity={0.7}
                                                onPress={() => {
                                                    onChange(item.key);
                                                    setOpen(false);
                                                }}
                                            >
                                                {item.icon && (
                                                    <Ionicons
                                                        name={item.icon}
                                                        size={17}
                                                        color={active ? Colors.primary : Colors.textSecondary}
                                                        style={styles.rowIcon}
                                                    />
                                                )}
                                                <Text
                                                    style={[styles.rowLabel, active && styles.rowLabelActive]}
                                                    numberOfLines={1}
                                                >
                                                    {item.label}
                                                </Text>
                                                {active && (
                                                    <Ionicons
                                                        name="checkmark"
                                                        size={16}
                                                        color={Colors.primary}
                                                    />
                                                )}
                                            </TouchableOpacity>
                                        );
                                    }}
                                />
                            )}
                        </View>
                    )}
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    field: {
        marginBottom: 4,
    },
    labelRow: {
        marginBottom: 7,
    },
    label: {
        fontSize: 11,
        fontWeight: "700",
        color: Colors.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    container: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.borderLight,
        borderWidth: 1.5,
        borderColor: Colors.border,
        borderRadius: Radius.md,
        paddingHorizontal: 14,
        minHeight: 50,
    },
    containerDisabled: {
        opacity: 0.5,
    },
    icon: {
        marginRight: 10,
    },
    value: {
        flex: 1,
        fontSize: 15,
        fontWeight: "600",
        color: Colors.textBody,
    },
    placeholder: {
        fontWeight: "500",
        color: Colors.textTertiary,
    },
    chevron: {
        marginLeft: 8,
    },
    menu: {
        position: "absolute",
        backgroundColor: Colors.surface,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingVertical: 4,
        overflow: "hidden",
        ...Shadow.lg,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 9,
        height: MENU_ITEM_HEIGHT,
        paddingHorizontal: 14,
    },
    rowIcon: {
        width: 18,
    },
    rowLabel: {
        flex: 1,
        fontSize: 14,
        fontWeight: "600",
        color: Colors.textBody,
    },
    rowLabelActive: {
        color: Colors.primary,
        fontWeight: "700",
    },
    emptyText: {
        fontSize: 12.5,
        color: Colors.textTertiary,
        fontStyle: "italic",
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
});
