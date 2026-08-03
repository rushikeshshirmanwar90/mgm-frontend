import React from "react";
import { RefreshControl, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Colors } from "@/constants/theme";

interface ScreenProps {
    children: React.ReactNode;
    /** Wraps content in a ScrollView. Turn off for screens owning a FlatList. */
    scroll?: boolean;
    refreshing?: boolean;
    onRefresh?: () => void;
    style?: StyleProp<ViewStyle>;
    contentStyle?: StyleProp<ViewStyle>;
}

/** Page shell: app background, consistent gutters and pull-to-refresh wiring. */
export const Screen: React.FC<ScreenProps> = ({
    children,
    scroll = false,
    refreshing,
    onRefresh,
    style,
    contentStyle,
}) => {
    const refreshControl = onRefresh ? (
        <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
        />
    ) : undefined;

    if (scroll) {
        return (
            <ScrollView
                style={[styles.page, style]}
                contentContainerStyle={[styles.content, contentStyle]}
                refreshControl={refreshControl}
                showsVerticalScrollIndicator={false}
            >
                {children}
            </ScrollView>
        );
    }

    return <View style={[styles.page, styles.content, style]}>{children}</View>;
};

const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        padding: 16,
        paddingBottom: 32,
    },
});
