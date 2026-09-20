import React, { useCallback, useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Complaint, ComplaintsResponse, NotificationsResponse } from "@/lib/types";
import { ComplaintCard } from "@/components/ComplaintCard";
import { ApprovalStatusNotice } from "@/components/ApprovalStatusNotice";
import { Colors, Radius, Shadow } from "@/constants/theme";
import {
    Banner,
    EmptyState,
    Screen,
    SectionTitle,
    StatCard,
    TAB_BAR_CLEARANCE,
} from "@/components/ui";

export default function StaffDashboard() {
    const router = useRouter();
    const { user, refreshUser } = useAuth();

    const [recentComplaints, setRecentComplaints] = useState<Complaint[]>([]);
    // The full list's ids, not just the 3 shown — so swiping through a
    // complaint opened from here can move past those 3.
    const [allComplaintIds, setAllComplaintIds] = useState<string[]>([]);
    const [stats, setStats] = useState({ pending: 0, in_progress: 0, resolved: 0 });
    const [unreadNotifs, setUnreadNotifs] = useState(0);
    const [refreshing, setRefreshing] = useState(false);

    const isApproved = !!user?.isApproved;

    const loadDashboardData = useCallback(async () => {
        setRefreshing(true);
        try {
            // Pull the account down too, so a pull-to-refresh is enough to
            // notice an approval that has just landed.
            await refreshUser();

            const data = await apiRequest<ComplaintsResponse>("/complaints");
            const complaints: Complaint[] = data.complaints || [];
            setRecentComplaints(complaints.slice(0, 3));
            setAllComplaintIds(complaints.map((c) => c._id));

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
    }, [refreshUser]);

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    // Until they're approved there is nothing to count and nothing to report,
    // so the status card is the whole screen rather than a note above empty tiles.
    if (!isApproved) {
        return (
            <Screen scroll refreshing={refreshing} onRefresh={loadDashboardData}>
                <ApprovalStatusNotice />
            </Screen>
        );
    }

    return (
        <View style={styles.flex}>
            <Screen scroll refreshing={refreshing} onRefresh={loadDashboardData}>
            {unreadNotifs > 0 && (
                <Banner
                    tone="info"
                    icon="notifications"
                    title={`${unreadNotifs} unread notification${unreadNotifs === 1 ? "" : "s"}`}
                    message="Tap to see updates on your complaints."
                    onPress={() => router.push("/(staff)/notifications")}
                />
            )}

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
                    message="Tap the + button below to submit your first issue."
                />
            ) : (
                recentComplaints.map((item) => (
                    <ComplaintCard
                        key={item._id}
                        complaint={item}
                        onPress={() =>
                            router.push(
                                `/complaint/${item._id}?ids=${allComplaintIds.join(",")}`
                            )
                        }
                    />
                ))
            )}
        </Screen>

            {/* Report an issue. Lives here instead of on the tab bar so the
                bar itself stays a plain 3-item navigator; this is the one
                primary action on the screen that deserves to stand out. */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push("/(staff)/raise")}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Report an issue"
            >
                <Ionicons name="add" size={28} color="#FFFFFF" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    fab: {
        position: "absolute",
        right: 20,
        // Cleared above the floating tab bar's own footprint rather than a
        // flat guess, so it stays clear of it however tall the bar ends up
        // on a given device's safe-area inset.
        bottom: TAB_BAR_CLEARANCE - 30,
        width: 56,
        height: 56,
        borderRadius: Radius.full,
        backgroundColor: Colors.primary,
        alignItems: "center",
        justifyContent: "center",
        ...Shadow.lg,
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

