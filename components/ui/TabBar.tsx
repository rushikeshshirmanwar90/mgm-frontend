import React, { useCallback, useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
    Animated,
    LayoutChangeEvent,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useFocusEffect } from "expo-router";
// Inline types to avoid importing @react-navigation (incompatible with expo-router SDK 57+)
type BottomTabNavigationOptions = {
    headerStyle?: object;
    headerTitleStyle?: object;
    headerTintColor?: string;
    [key: string]: unknown;
};
type BottomTabBarProps = {
    state: { routes: Array<{ key: string; name: string }>; index: number };
    navigation: { emit: (e: any) => any; navigate: (name: string) => void };
    insets: { bottom: number; top: number; left: number; right: number };
    [key: string]: unknown;
};
import { Colors, Radius, Shadow } from "@/constants/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

export interface TabMeta {
    /** Must match the screen's file-based route name (e.g. "index", "complaints"). */
    name: string;
    icon: IoniconName;
    label: string;
}

/** Header chrome shared by every role. The bar itself is fully custom — see `createTabBar`. */
export function useTabScreenOptions(): BottomTabNavigationOptions {
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
    };
}

/**
 * Fixed height of the pill itself. Deliberately NOT grown by the device's
 * safe-area inset (an earlier version did that, which is what made the pill
 * look badly proportioned — tall and lopsided on gesture-nav devices with a
 * big inset, since the icon row stayed the same size while the pill grew
 * around it). The inset is handled below purely as how far the whole pill
 * floats up from the bottom edge, so the pill's own proportions stay
 * identical on every device.
 */
const BAR_HEIGHT = 58;
/** Gap above the device's own safe-area inset (or above the raw screen edge, on the devices that report none). */
const MIN_BOTTOM_GAP = 12;
const EXTRA_BOTTOM_GAP = 8;
const SIDE_MARGIN = 16;
/** Gap kept between the sliding indicator and each edge of its tab's slot. */
const INDICATOR_INSET = 6;

/**
 * Total space any screen's scrollable content needs to reserve at the bottom
 * so the floating, hide-on-scroll bar never overlaps the last item. Generous
 * on purpose — a few extra points of breathing room cost nothing, an
 * uncovered list item does.
 */
export const TAB_BAR_CLEARANCE = BAR_HEIGHT + 80;

/**
 * 0 = shown, 1 = hidden. A single module-level value rather than context:
 * only one role's tab bar is ever mounted at a time in this app (a signed-in
 * user is always inside exactly one of the three role navigators), so there
 * is nothing for two bars to fight over.
 */
const hideProgress = new Animated.Value(0);
let lastY = 0;
let lastDir: "up" | "down" = "up";

/**
 * Wire the returned `onScroll`/`scrollEventThrottle` onto any ScrollView or
 * FlatList to hide the tab bar while scrolling down and bring it back on the
 * way up (or once content is scrolled back to the top). Also resets to
 * "shown" whenever the screen using it regains focus, so a bar left hidden
 * by scroll position on one tab never carries over when switching to another.
 */
export function useHideTabBarOnScroll() {
    useFocusEffect(
        useCallback(() => {
            lastY = 0;
            lastDir = "up";
            Animated.timing(hideProgress, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }).start();
        }, [])
    );

    const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const y = e.nativeEvent.contentOffset.y;
        const delta = y - lastY;

        if (y <= 4) {
            if (lastDir !== "up") {
                lastDir = "up";
                Animated.timing(hideProgress, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }).start();
            }
        } else if (Math.abs(delta) > 6) {
            const dir: "up" | "down" = delta > 0 ? "down" : "up";
            if (dir !== lastDir) {
                lastDir = dir;
                Animated.timing(hideProgress, {
                    toValue: dir === "down" ? 1 : 0,
                    duration: 220,
                    useNativeDriver: true,
                }).start();
            }
        }
        lastY = y;
    };

    return { onScroll, scrollEventThrottle: 16 };
}

/**
 * Builds a fully custom bottom tab bar for the given ordered list of visible
 * tabs. Pass it straight to `<Tabs tabBar={createTabBar([...])}>`. Any route
 * not named in `tabs` (Profile, Report) is simply never rendered here — no
 * `href: null` bookkeeping needed since this replaces the default bar
 * entirely.
 *
 * The "selected" look is a single pill that slides between tab slots
 * (measured off the bar's own width) rather than each tab fading its own
 * background in and out — that's what actually reads as one continuous
 * transition instead of two independent fades.
 */
export function createTabBar(tabs: TabMeta[]) {
    const metaByName = new Map(tabs.map((t) => [t.name, t] as const));

    // `@react-navigation/bottom-tabs` calls the `tabBar` option as a plain
    // function — `tabBar({...props})`, not `<TabBar {...props} />` — so
    // whatever it invokes directly never becomes a real component fiber and
    // can't call hooks ("Invalid hook call"). The indirection below (return
    // a JSX element pointing at a real component) fixes that for *our own*
    // hooks, but isn't enough on its own: React Compiler auto-instruments
    // any capitalized function that returns JSX — including this one — by
    // injecting its own memoization hook, which then throws the exact same
    // error when this is invoked as a plain function. `"use no memo"` is the
    // compiler's official per-function opt-out, so this one stays a plain,
    // hook-free function while `TabBarInner` below is still compiled
    // normally.
    function CustomTabBar(props: BottomTabBarProps) {
        "use no memo";
        return <TabBarInner {...props} />;
    }

    return CustomTabBar;

    function TabBarInner({ state, navigation, insets }: BottomTabBarProps) {
        const visibleRoutes = state.routes.filter((r) => metaByName.has(r.name));

        // A screen that isn't one of the visible tabs (Report, Profile) has
        // no button of its own in this bar, so there's nothing to highlight
        // and no reason to keep the bar on screen competing with, say, the
        // report form's keyboard.
        const currentRoute = state.routes[state.index];
        const activeIndex = visibleRoutes.findIndex((r) => r.key === currentRoute.key);

        const [barWidth, setBarWidth] = useState(0);
        const indicatorX = useRef(new Animated.Value(0)).current;

        const slotWidth = visibleRoutes.length ? barWidth / visibleRoutes.length : 0;

        useEffect(() => {
            if (!slotWidth || activeIndex < 0) return;
            Animated.spring(indicatorX, {
                toValue: activeIndex * slotWidth,
                useNativeDriver: true,
                friction: 10,
                tension: 80,
            }).start();
        }, [activeIndex, slotWidth, indicatorX]);

        if (activeIndex < 0) {
            return null;
        }

        const bottomOffset = Math.max(insets.bottom, MIN_BOTTOM_GAP) + EXTRA_BOTTOM_GAP;

        const translateY = hideProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, BAR_HEIGHT + bottomOffset + 20],
        });

        const handleBarLayout = (e: LayoutChangeEvent) => {
            setBarWidth(e.nativeEvent.layout.width);
        };

        return (
            <Animated.View
                pointerEvents="box-none"
                style={[styles.wrap, { bottom: bottomOffset, transform: [{ translateY }] }]}
            >
                <View style={styles.bar} onLayout={handleBarLayout}>
                    {slotWidth > 0 && (
                        <Animated.View
                            pointerEvents="none"
                            style={[
                                styles.indicator,
                                {
                                    width: slotWidth - INDICATOR_INSET * 2,
                                    // A single combined node rather than two
                                    // `translateX` entries in one transform
                                    // array — the native driver doesn't like
                                    // (and threw on) a repeated transform key.
                                    transform: [
                                        { translateX: Animated.add(indicatorX, INDICATOR_INSET) },
                                    ],
                                },
                            ]}
                        />
                    )}

                    {visibleRoutes.map((route) => {
                        const meta = metaByName.get(route.name)!;
                        const routeIndex = state.routes.findIndex((r) => r.key === route.key);
                        const focused = state.index === routeIndex;

                        const onPress = () => {
                            const event = navigation.emit({
                                type: "tabPress",
                                target: route.key,
                                canPreventDefault: true,
                            });
                            if (!focused && !event.defaultPrevented) {
                                navigation.navigate(route.name);
                            }
                        };

                        return (
                            <TabButton
                                key={route.key}
                                icon={meta.icon}
                                label={meta.label}
                                focused={focused}
                                onPress={onPress}
                            />
                        );
                    })}
                </View>
            </Animated.View>
        );
    };
}

function TabButton({
    icon,
    label,
    focused,
    onPress,
}: {
    icon: IoniconName;
    label: string;
    focused: boolean;
    onPress: () => void;
}) {
    const outline = `${icon}-outline` as IoniconName;
    const anim = useRef(new Animated.Value(focused ? 1 : 0)).current;

    useEffect(() => {
        Animated.spring(anim, {
            toValue: focused ? 1 : 0,
            friction: 9,
            tension: 90,
            useNativeDriver: true,
        }).start();
    }, [focused, anim]);

    const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.04] });
    // White reads clearly on the solid indicator pill; dark purple reads
    // clearly on the bar's own faint background — no in-between state to
    // animate, so this can just switch instantly with the indicator sliding
    // underneath it.
    const color = focused ? "#FFFFFF" : Colors.primaryDark;

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            style={styles.tabItem}
        >
            <Animated.View style={[styles.tabContent, { transform: [{ scale }] }]}>
                <Ionicons name={focused ? icon : outline} size={24} color={color} />
                <Text
                    style={[styles.tabLabel, { color }, focused && styles.tabLabelFocused]}
                    numberOfLines={1}
                >
                    {label}
                </Text>
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    wrap: {
        position: "absolute",
        left: SIDE_MARGIN,
        right: SIDE_MARGIN,
    },
    bar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        height: BAR_HEIGHT,
        backgroundColor: Colors.primaryLight,
        borderRadius: Radius.full,
        overflow: "hidden",
        paddingHorizontal: 6,
        ...Shadow.lg,
    },
    indicator: {
        position: "absolute",
        left: 0,
        top: 6,
        bottom: 6,
        backgroundColor: Colors.primary,
        borderRadius: Radius.full,
        ...Shadow.md,
    },
    tabItem: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        minWidth: 0,
    },
    tabContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingHorizontal: 10,
        maxWidth: "100%",
    },
    tabLabel: {
        flexShrink: 1,
        fontSize: 13,
        lineHeight: 24,
        fontWeight: "600",
        letterSpacing: 0.1,
    },
    tabLabelFocused: {
        fontWeight: "800",
    },
});
