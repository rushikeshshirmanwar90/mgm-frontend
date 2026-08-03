import React, { useCallback, useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { apiRequest } from "@/lib/api";
import { Complaint, ComplaintsResponse, NotificationsResponse } from "@/lib/types";
import { ComplaintCard } from "@/components/ComplaintCard";
import { Colors, Radius, Shadow } from "@/constants/theme";
import {
    Banner,
    EmptyState,
    HowItWorks,
    Screen,
    SectionTitle,
    StatCard,
} from "@/components/ui";

export default function StaffDashboard() {
    const router = useRouter();

    const [recentComplaints, setRecentComplaints] = useState<Complaint[]>([]);
    const [stats, setStats] = useState({ pending: 0, in_progress: 0, resolved: 0 });
    const [unreadNotifs, setUnreadNotifs] = useState(0);
    const [refreshing, setRefreshing] = useState(false);

    const loadDashboardData = useCallback(async () => {
        setRefreshing(true);
        try {
            const data = await apiRequest<ComplaintsResponse>("/complaints");
            const complaints: Complaint[] = data.complaints || [];
            setRecentComplaints(complaints.slice(0, 3));

            const pending = complaints.filter((c) => c.status === "pending").length;
            const in_progress = complaints.filter((c) => c.status === "in_progress").length;
            const resolved = complaints.filter((c) => c.status === "resolved").length;
            setStats({ pending, in_progress, resolved });

            const notifData = await apiRequest<NotificationsResponse>("/notifications");
            setUnreadNotifs(notifData.unreadCount || 0);
        } catch (e) {
            console.error("Load dashboard data error", e);
        } finally {
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    return (
        <Screen scroll refreshing={refreshing} onRefresh={loadDashboardData}>
            {/* Primary action */}
            <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push("/(staff)/raise")}
                activeOpacity={0.9}
            >
                <View style={styles.actionIcon}>
                    <Ionicons name="camera" size={22} color="#FFFFFF" />
                </View>
                <View style={styles.actionText}>
                    <Text style={styles.actionTitle}>Report damage</Text>
                    <Text style={styles.actionSubtitle}>
                        Attach a photo and pick the building, floor and room
                    </Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            {unreadNotifs > 0 && (
                <Banner
                    tone="info"
                    icon="notifications"
                    title={`${unreadNotifs} unread notification${unreadNotifs === 1 ? "" : "s"}`}
                    message="Tap to see updates on your complaints."
                    onPress={() => router.push("/(staff)/notifications")}
                />
            )}

            {/* Orientation — this app is used rarely, so it re-explains itself */}
            <SectionTitle title="How it works" />
            <HowItWorks />

            {/* Stats */}
            <SectionTitle title="My complaints so far" />
            <View style={styles.statsRow}>
                <StatCard
                    icon="time-outline"
                    color={Colors.warning}
                    value={stats.pending}
                    label="Waiting"
                    layout="stack"
                    style={styles.statCard}
                />
                <StatCard
                    icon="construct-outline"
                    color={Colors.primary}
                    value={stats.in_progress}
                    label="Being fixed"
                    layout="stack"
                    style={styles.statCard}
                />
                <StatCard
                    icon="checkmark-done-outline"
                    color={Colors.success}
                    value={stats.resolved}
                    label="Done"
                    layout="stack"
                    style={styles.statCard}
                />
            </View>

            {/* Recent complaints */}
            <SectionTitle
                title="Recent complaints"
                action={
                    <TouchableOpacity
                        onPress={() => router.push("/(staff)/complaints")}
                        hitSlop={8}
                        style={styles.seeAll}
                    >
                        <Text style={styles.seeAllText}>See all</Text>
                        <Ionicons name="chevron-forward" size={13} color={Colors.primary} />
                    </TouchableOpacity>
                }
                style={styles.recentTitle}
            />

            {recentComplaints.length === 0 ? (
                <EmptyState
                    icon="cube-outline"
                    title="No complaints yet"
                    message="Tap “Report damage” above to submit your first issue."
                />
            ) : (
                recentComplaints.map((item) => (
                    <ComplaintCard
                        key={item._id}
                        complaint={item}
                        onPress={() => router.push(`/complaint/${item._id}`)}
                    />
                ))
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    actionCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        backgroundColor: Colors.primary,
        borderRadius: Radius.xxl,
        padding: 16,
        marginBottom: 20,
        ...Shadow.lg,
    },
    actionIcon: {
        width: 44,
        height: 44,
        borderRadius: Radius.lg,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center",
        justifyContent: "center",
    },
    actionText: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: "800",
        color: "#FFFFFF",
        letterSpacing: -0.3,
    },
    actionSubtitle: {
        fontSize: 11.5,
        color: "#D5E7F8",
        marginTop: 2,
        lineHeight: 16,
    },
    statsRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 22,
    },
    statCard: {
        flex: 1,
        paddingHorizontal: 10,
    },
    recentTitle: {
        marginTop: 4,
    },
    seeAll: {
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
    },
    seeAllText: {
        fontSize: 12,
        fontWeight: "700",
        color: Colors.primary,
    },
});
