import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiRequest } from "@/lib/api";
import { AppNotification, NotificationsResponse } from "@/lib/types";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { EmptyState, IconChip, TAB_BAR_CLEARANCE, useHideTabBarOnScroll } from "@/components/ui";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

/** Icon + tint per notification kind, so the type reads at a glance. */
const NOTIF_STYLES: Record<string, { icon: IoniconName; color: string }> = {
    complaint_resolved: { icon: "checkmark-done-outline", color: Colors.success },
    complaint_update: { icon: "sync-outline", color: Colors.primary },
    new_complaint: { icon: "megaphone-outline", color: Colors.warning },
    registration_approved: { icon: "shield-checkmark-outline", color: Colors.success },
    registration_rejected: { icon: "close-circle-outline", color: Colors.error },
};

export default function NotificationsScreen() {
    const { onScroll, scrollEventThrottle } = useHideTabBarOnScroll();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        setRefreshing(true);
        try {
            const data = await apiRequest<NotificationsResponse>("/notifications");
            setNotifications(data.notifications || []);
        } catch (e) {
            console.error("Fetch notifications error", e);
        } finally {
            setRefreshing(false);
        }
    };

    const handleMarkRead = async (id: string) => {
        try {
            await apiRequest(`/notifications/${id}`, { method: "PUT" });
            setNotifications((prev) =>
                prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
            );
        } catch (e) {
            console.error("Mark read error", e);
        }
    };

    const handleReadAll = async () => {
        try {
            await apiRequest("/notifications/read-all", { method: "PUT" });
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        } catch (e) {
            console.error("Mark read all error", e);
        }
    };

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return (
        <View style={styles.container}>
            {unreadCount > 0 && (
                <View style={styles.headerBar}>
                    <Text style={styles.unreadLabel}>
                        {unreadCount} unread
                    </Text>
                    <TouchableOpacity
                        style={styles.readAllBtn}
                        onPress={handleReadAll}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="checkmark-done" size={14} color={Colors.primaryDark} />
                        <Text style={styles.readAllText}>Mark all read</Text>
                    </TouchableOpacity>
                </View>
            )}

            <FlatList
                data={notifications}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={scrollEventThrottle}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={loadNotifications}
                        tintColor={Colors.primary}
                        colors={[Colors.primary]}
                    />
                }
                renderItem={({ item }) => {
                    const tone = NOTIF_STYLES[item.type] ?? {
                        icon: "notifications-outline" as IoniconName,
                        color: Colors.primary,
                    };

                    return (
                        <TouchableOpacity
                            style={[styles.card, !item.isRead && styles.cardUnread]}
                            onPress={() => handleMarkRead(item._id)}
                            activeOpacity={item.isRead ? 1 : 0.85}
                            disabled={item.isRead}
                        >
                            <IconChip name={tone.icon} color={tone.color} size={38} />

                            <View style={styles.textCol}>
                                <Text style={styles.title} numberOfLines={2}>
                                    {item.title}
                                </Text>
                                <Text style={styles.message} numberOfLines={3}>
                                    {item.message}
                                </Text>
                                <Text style={styles.date}>
                                    {new Date(item.createdAt).toLocaleString("en-IN", {
                                        day: "numeric",
                                        month: "short",
                                        hour: "numeric",
                                        minute: "2-digit",
                                    })}
                                </Text>
                            </View>

                            {!item.isRead && <View style={styles.unreadDot} />}
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={
                    <EmptyState
                        icon="notifications-outline"
                        title="No notifications yet"
                        message="Updates land here when your complaints move forward or get resolved."
                        style={styles.empty}
                    />
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    headerBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 10,
    },
    unreadLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: Colors.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    readAllBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: Radius.full,
        backgroundColor: Colors.primaryLight,
        borderWidth: 1,
        borderColor: Colors.primaryBorder,
    },
    readAllText: {
        fontSize: 11.5,
        fontWeight: "700",
        color: Colors.primaryDark,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 6,
        paddingBottom: TAB_BAR_CLEARANCE,
    },
    card: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: Colors.surface,
        borderRadius: Radius.xl,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: Colors.borderCard,
        ...Shadow.sm,
    },
    cardUnread: {
        borderColor: Colors.primaryBorder,
        backgroundColor: "#FBFDFF",
    },
    textCol: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: "800",
        color: Colors.textPrimary,
        letterSpacing: -0.2,
    },
    message: {
        fontSize: 12.5,
        color: Colors.textSecondary,
        lineHeight: 18,
        marginTop: 2,
    },
    date: {
        fontSize: 10.5,
        color: Colors.textTertiary,
        fontWeight: "600",
        marginTop: 6,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.primary,
    },
    empty: {
        marginTop: 60,
    },
});
