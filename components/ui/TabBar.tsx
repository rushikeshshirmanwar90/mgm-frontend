import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View, type ColorValue } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomTabBar, type BottomTabBarProps, type BottomTabNavigationOptions } from "expo-router/js-tabs";
import { Colors, Radius } from "@/constants/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

/** Height of the icon + label row, before any system inset is added. */
const TAB_CONTENT_HEIGHT = 50;

/** Gap between the labels and whatever sits below the bar. */
const BOTTOM_PADDING = 6;

/** Wider gap for devices that reserve nothing below the bar (opaque nav bar). */
const BOTTOM_PADDING_NO_INSET = 10;

/**
 * Tab bar for all three role navigators. Pass as `tabBar` on `<Tabs>`.
 *
 * The stock BottomTabBar pads itself by the *root* SafeAreaProvider's bottom
 * inset. On Android with edge-to-edge that value is not always what the bar
 * actually needs — with the three-button navigation bar in particular the
 * labels ended up underneath the back/home/recents buttons. Wrapping the bar in
 * a native SafeAreaView sidesteps that: it measures its own overlap with the
 * system navigation area on the native side, so the padding matches the bar's
 * real position on screen (48dp under three buttons, ~24dp under the gesture
 * pill, 34pt above the iPhone home indicator, 0 when nothing is drawn there).
 * The inner bar is told its inset is 0 so the space isn't reserved twice.
 *
 * When `tabBarHideOnKeyboard` slides the bar away, the app window has already
 * shrunk to sit above the keyboard, so the wrapper measures no overlap and
 * collapses with it instead of leaving a blank strip.
 */
export function renderTabBar(props: BottomTabBarProps) {
    return (
        <SafeAreaView edges={["bottom"]} style={styles.tabBarSafeArea}>
            <BottomTabBar {...props} insets={{ ...props.insets, bottom: 0 }} />
        </SafeAreaView>
    );
}

/**
 * Shared chrome for all three role tab bars, so a staff member and an admin see
 * the same header weight, bar height and active colour.
 *
 * `renderTabBar` handles the system inset, so the height here is only the
 * content row plus a small gap. That gap widens slightly when the device
 * reports no bottom inset at all, since nothing else separates the labels from
 * the screen edge in that case.
 */
export function useTabScreenOptions(): BottomTabNavigationOptions {
    const insets = useSafeAreaInsets();
    const bottomPadding = insets.bottom > 0 ? BOTTOM_PADDING : BOTTOM_PADDING_NO_INSET;

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

    const Icon = ({ color, focused }: { color: ColorValue; focused: boolean }) => (
        <View style={[styles.iconWrap, focused && styles.iconWrapFocused]}>
            <Ionicons name={focused ? name : outline} size={20} color={color} />
        </View>
    );
    Icon.displayName = `TabIcon(${name})`;
    return Icon;
}

const styles = StyleSheet.create({
    tabBarSafeArea: {
        backgroundColor: Colors.surface,
    },
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
