import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { StyleProp, StyleSheet, TextInput, TouchableOpacity, View, ViewStyle } from "react-native";
import { Colors, Radius } from "@/constants/theme";

interface SearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    style?: StyleProp<ViewStyle>;
}

export const SearchBar: React.FC<SearchBarProps> = ({
    value,
    onChangeText,
    placeholder = "Search",
    style,
}) => {
    const [focused, setFocused] = useState(false);

    return (
        <View style={[styles.bar, focused && styles.barFocused, style]}>
            <Ionicons
                name="search"
                size={16}
                color={focused ? Colors.primary : Colors.textTertiary}
            />
            <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
            />
            {value.length > 0 && (
                <TouchableOpacity onPress={() => onChangeText("")} hitSlop={10}>
                    <Ionicons name="close-circle" size={16} color={Colors.textTertiary} />
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    bar: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: Colors.surface,
        borderWidth: 1.5,
        borderColor: Colors.border,
        borderRadius: Radius.md,
        paddingHorizontal: 12,
        height: 44,
    },
    barFocused: {
        borderColor: Colors.primary,
    },
    input: {
        flex: 1,
        fontSize: 14,
        color: Colors.textBody,
        padding: 0,
    },
});
