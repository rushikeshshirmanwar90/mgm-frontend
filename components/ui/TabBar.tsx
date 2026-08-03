import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";
import { Colors, Radius } from "@/constants/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

/** Height of the icon + label row, before any system inset is added. */
const TAB_CONTENT_HEIGHT = 50;

/** Breathing room under the labels when the device reports no bottom inset. */
const MIN_BOTTOM_PADDING = 10;

/**
 * Shared chrome for all three role tab bars, so a staff member and an admin see
 * the same header weight, bar height and active colour.
 *
 * This is a hook rather than a constant because the bar has to clear the system
 * navigation area. React Navigation's own BottomTabBar sets
 * `paddingBottom: insets.bottom`, but it applies `tabBarStyle` *after* that, so
 * any hardcoded height or paddingBottom here silently wins — which is what put
 * the tabs underneath the Android gesture bar. Reading the inset ourselves and
 * folding it into both values keeps the row tappable everywhere:
 *
 *   Android gesture nav  inset ~24  -> 74pt bar
 *   Android 3-button     inset ~48  -> 98pt bar
 *   iPhone home indicator inset 34  -> 84pt bar
 *   No inset (SE, older Android)    -> 60pt bar
 */
export function useTabScreenOptions(): BottomTabNavigationOptions {
    const insets = useSafeAreaInsets();
    const bottomPadding = Math.max(insets.bottom, MIN_BOTTOM_PADDING);

    return {
        headerStyle: {
            backgroundColor: Colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: Colors.borderLight,
            elevation: 0,
            shadowOpacity: 0,
        },
        headerTitleStyle: {
            fontWeight: "800",
            fontSize: 17,
            color: Colors.textPrimary,
            letterSpacing: -0.3,
        },
        headerTintColor: Colors.textPrimary,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopWidth: 1,
            borderTopColor: Colors.borderLight,
            height: TAB_CONTENT_HEIGHT + bottomPadding,
            paddingTop: 8,
            paddingBottom: bottomPadding,
        },
        tabBarLabelStyle: {
            fontSize: 10.5,
            fontWeight: "700",
            letterSpacing: 0.1,
        },
        tabBarItemStyle: {
            paddingTop: 2,
        },
    };
}

/**
 * Builds a tab icon that fills in and picks up a tinted pill when focused —
 * the same active treatment Xsite uses to mark the current section.
 */
export function tabIcon(name: IoniconName) {
    const outline = `${name}-outline` as IoniconName;

    const Icon = ({ color, focused }: { color: string; focused: boolean }) => (
        <View style={[styles.iconWrap, focused && styles.iconWrapFocused]}>
            <Ionicons name={focused ? name : outline} size={20} color={color} />
        </View>
    );
    Icon.displayName = `TabIcon(${name})`;
    return Icon;
}

const styles = StyleSheet.create({
    iconWrap: {
        // Grows to a comfortable pill but yields on the six-tab admin bar,
        // where a fixed 44pt would push the row wider than a narrow phone.
        minWidth: 38,
        maxWidth: 44,
        flexGrow: 1,
        height: 28,
        paddingHorizontal: 9,
        borderRadius: Radius.full,
        alignItems: "center",
        justifyContent: "center",
    },
    iconWrapFocused: {
        backgroundColor: Colors.primaryLight,
    },
});
