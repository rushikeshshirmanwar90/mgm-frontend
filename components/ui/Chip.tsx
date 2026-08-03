import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { Colors, Radius } from "@/constants/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

interface ChipProps {
    label: string;
    selected?: boolean;
    onPress?: () => void;
    icon?: IoniconName;
    /** Right-hand affordances (edit/delete) shown inside the chip body. */
    actions?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

/** Selectable pill. Selected state fills with brand blue, as in Xsite. */
export const Chip: React.FC<ChipProps> = ({
    label,
    selected = false,
    onPress,
    icon,
    actions,
    style,
}) => (
    <View style={[styles.chip, selected && styles.chipSelected, style]}>
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.75}
            style={styles.chipTouch}
            disabled={!onPress}
        >
            {icon && (
                <Ionicons
                    name={icon}
                    size={14}
                    color={selected ? "#FFFFFF" : Colors.primary}
                />
            )}
            <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>
                {label}
            </Text>
        </TouchableOpacity>
        {actions}
    </View>
);

interface ChipOption {
    key: string;
    label: string;
    icon?: IoniconName;
}

interface ChipGroupProps {
    options: ChipOption[];
    value: string;
    onChange: (key: string) => void;
    /** Equal-width chips on one line instead of a horizontal scroller. */
    fill?: boolean;
    style?: StyleProp<ViewStyle>;
}

/** A row of mutually exclusive chips — the standard filter control. */
export const ChipGroup: React.FC<ChipGroupProps> = ({
    options,
    value,
    onChange,
    fill = false,
    style,
}) => {
    if (fill) {
        return (
            <View style={[styles.fillRow, style]}>
                {options.map((o) => (
                    <Chip
                        key={o.key}
                        label={o.label}
                        icon={o.icon}
                        selected={value === o.key}
                        onPress={() => onChange(o.key)}
                        style={styles.fillChip}
                    />
                ))}
            </View>
        );
    }

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.scrollRow, style]}
            contentContainerStyle={styles.scrollContent}
        >
            {options.map((o) => (
                <Chip
                    key={o.key}
                    label={o.label}
                    icon={o.icon}
                    selected={value === o.key}
                    onPress={() => onChange(o.key)}
                />
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    chip: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.full,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: 14,
        paddingVertical: 9,
    },
    chipSelected: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primaryDark,
    },
    chipTouch: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
    },
    chipText: {
        fontSize: 12.5,
        fontWeight: "700",
        color: Colors.textSecondary,
    },
    chipTextSelected: {
        color: "#FFFFFF",
    },
    fillRow: {
        flexDirection: "row",
        gap: 6,
    },
    fillChip: {
        flex: 1,
        paddingHorizontal: 6,
    },
    scrollRow: {
        flexGrow: 0,
    },
    scrollContent: {
        gap: 8,
        paddingRight: 4,
    },
});
