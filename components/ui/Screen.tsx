import React from "react";
import { RefreshControl, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Colors } from "@/constants/theme";
import { TAB_BAR_CLEARANCE, useHideTabBarOnScroll } from "./TabBar";

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
export const Screen = React.forwardRef<ScrollView, ScreenProps>(function Screen(
    { children, scroll = false, refreshing, onRefresh, style, contentStyle },
    ref
) {
    // Also resets the floating tab bar to visible whenever this screen gains
    // focus, so it never stays hidden from a scroll position left over on a
    // different tab — harmless to call even on the one screen (complaint
    // detail) that isn't inside a tab navigator at all.
    const { onScroll, scrollEventThrottle } = useHideTabBarOnScroll();

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
                ref={ref}
                style={[styles.page, style]}
                contentContainerStyle={[styles.content, contentStyle]}
                refreshControl={refreshControl}
                showsVerticalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={scrollEventThrottle}
            >
                {children}
            </ScrollView>
        );
    }

    return <View style={[styles.page, styles.content, style]}>{children}</View>;
});

const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        padding: 16,
        paddingBottom: TAB_BAR_CLEARANCE,
    },
});
