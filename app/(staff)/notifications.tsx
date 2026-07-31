import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
} from "react-native";
import { apiRequest } from "@/lib/api";
import { AppNotification, NotificationsResponse } from "@/lib/types";

export default function NotificationsScreen() {
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

    return (
        <View style={styles.container}>
            {notifications.some((n) => !n.isRead) && (
                <TouchableOpacity style={styles.readAllBtn} onPress={handleReadAll}>
                    <Text style={styles.readAllText}>✓ Mark All as Read</Text>
                </TouchableOpacity>
            )}

            <FlatList
                data={notifications}
                keyExtractor={(item) => item._id}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={loadNotifications} />
                }
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[styles.notifCard, !item.isRead && styles.unreadCard]}
                        onPress={() => handleMarkRead(item._id)}
                    >
                        <View style={styles.iconCol}>
                            <Text style={styles.iconText}>
                                {item.type === "complaint_resolved"
                                    ? "🎉"
                                    : item.type === "registration_approved"
                                    ? "✅"
                                    : "🔔"}
                            </Text>
                        </View>
                        <View style={styles.textCol}>
                            <Text style={styles.notifTitle}>{item.title}</Text>
                            <Text style={styles.notifMessage}>{item.message}</Text>
                            <Text style={styles.notifDate}>
                                {new Date(item.createdAt).toLocaleString()}
                            </Text>
                        </View>
                        {!item.isRead && <View style={styles.unreadDot} />}
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyIcon}>🔔</Text>
                        <Text style={styles.emptyText}>No notifications yet</Text>
                        <Text style={styles.emptySub}>
                            You will receive updates here when your complaints are resolved.
                        </Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8fafc",
        padding: 16,
    },
    readAllBtn: {
        alignSelf: "flex-end",
        marginBottom: 10,
    },
    readAllText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#2563eb",
    },
    notifCard: {
        backgroundColor: "#ffffff",
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    unreadCard: {
        backgroundColor: "#eff6ff",
        borderColor: "#bfdbfe",
    },
    iconCol: {
        marginRight: 12,
    },
    iconText: {
        fontSize: 24,
    },
    textCol: {
        flex: 1,
    },
    notifTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: "#0f172a",
        marginBottom: 2,
    },
    notifMessage: {
        fontSize: 13,
        color: "#334155",
        lineHeight: 18,
    },
    notifDate: {
        fontSize: 11,
        color: "#94a3b8",
        marginTop: 4,
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: "#2563eb",
        marginLeft: 8,
    },
    emptyBox: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 80,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#334155",
    },
    emptySub: {
        fontSize: 13,
        color: "#64748b",
        textAlign: "center",
        marginTop: 4,
    },
});
