import React, { useCallback, useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "expo-router";
import { apiRequest } from "@/lib/api";
import { Complaint, ComplaintsResponse, NotificationsResponse } from "@/lib/types";
import { ComplaintCard } from "@/components/ComplaintCard";

export default function StaffDashboard() {
    const { user, logout } = useAuth();
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
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={loadDashboardData} />
            }
        >
            {/* User Greeting Card */}
            <View style={styles.welcomeCard}>
                <View style={styles.welcomeTextCol}>
                    <Text style={styles.greeting}>Welcome back 👋</Text>
                    <Text style={styles.userName}>{user?.name}</Text>
                    <Text style={styles.userRole}>Staff • {user?.department || "MGM Faculty"}</Text>
                </View>
                <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>

            {/* Quick Action Button */}
            <TouchableOpacity
                style={styles.raiseActionCard}
                onPress={() => router.push("/(staff)/raise")}
                activeOpacity={0.85}
            >
                <View style={styles.actionIconBg}>
                    <Text style={styles.actionIcon}>📸</Text>
                </View>
                <View style={styles.actionTextCol}>
                    <Text style={styles.actionTitle}>Report Infrastructure Damage</Text>
                    <Text style={styles.actionSubtitle}>
                        Click photo & select Building / Floor / Room (G-1, F-1, Washroom, etc.)
                    </Text>
                </View>
                <Text style={styles.actionArrow}>→</Text>
            </TouchableOpacity>

            {/* Stats Row */}
            <Text style={styles.sectionHeader}>My Maintenance Overview</Text>
            <View style={styles.statsRow}>
                <View style={[styles.statBox, { backgroundColor: "#fef3c7" }]}>
                    <Text style={[styles.statNumber, { color: "#d97706" }]}>{stats.pending}</Text>
                    <Text style={[styles.statLabel, { color: "#b45309" }]}>Pending</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: "#dbeafe" }]}>
                    <Text style={[styles.statNumber, { color: "#2563eb" }]}>{stats.in_progress}</Text>
                    <Text style={[styles.statLabel, { color: "#1e40af" }]}>In Progress</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: "#dcfce7" }]}>
                    <Text style={[styles.statNumber, { color: "#16a34a" }]}>{stats.resolved}</Text>
                    <Text style={[styles.statLabel, { color: "#15803d" }]}>Resolved 🎉</Text>
                </View>
            </View>

            {/* Surface unread notifications rather than leaving the count unused —
                this is how staff learn a complaint of theirs was resolved. */}
            {unreadNotifs > 0 && (
                <TouchableOpacity
                    style={styles.notifBanner}
                    onPress={() => router.push("/(staff)/notifications")}
                >
                    <Text style={styles.notifBannerText}>
                        🔔 You have {unreadNotifs} unread notification
                        {unreadNotifs === 1 ? "" : "s"}
                    </Text>
                    <Text style={styles.notifBannerCta}>View</Text>
                </TouchableOpacity>
            )}

            {/* Recent Complaints */}
            <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionHeader}>Recent Complaints</Text>
                <TouchableOpacity onPress={() => router.push("/(staff)/complaints")}>
                    <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
            </View>

            {recentComplaints.length === 0 ? (
                <View style={styles.emptyCard}>
                    <Text style={styles.emptyIcon}>📦</Text>
                    <Text style={styles.emptyText}>No complaints raised yet.</Text>
                    <Text style={styles.emptySub}>
                        Tap &quot;Report Infrastructure Damage&quot; to submit your first issue.
                    </Text>
                </View>
            ) : (
                recentComplaints.map((item) => (
                    <ComplaintCard key={item._id} complaint={item} />
                ))
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8fafc",
        padding: 16,
    },
    welcomeCard: {
        backgroundColor: "#ffffff",
        borderRadius: 16,
        padding: 18,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    welcomeTextCol: {
        flex: 1,
    },
    greeting: {
        fontSize: 13,
        color: "#64748b",
        fontWeight: "500",
    },
    userName: {
        fontSize: 20,
        fontWeight: "800",
        color: "#0f172a",
        marginTop: 2,
    },
    userRole: {
        fontSize: 12,
        color: "#2563eb",
        fontWeight: "600",
        marginTop: 2,
    },
    logoutBtn: {
        backgroundColor: "#fee2e2",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    logoutText: {
        color: "#dc2626",
        fontSize: 12,
        fontWeight: "700",
    },
    raiseActionCard: {
        backgroundColor: "#2563eb",
        borderRadius: 16,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
        elevation: 4,
    },
    actionIconBg: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 14,
    },
    actionIcon: {
        fontSize: 22,
    },
    actionTextCol: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: "800",
        color: "#ffffff",
    },
    actionSubtitle: {
        fontSize: 12,
        color: "#bfdbfe",
        marginTop: 2,
    },
    actionArrow: {
        fontSize: 22,
        color: "#ffffff",
        fontWeight: "700",
        marginLeft: 8,
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1e293b",
        marginBottom: 10,
    },
    notifBanner: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#eff6ff",
        borderWidth: 1,
        borderColor: "#bfdbfe",
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
    },
    notifBannerText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#1d4ed8",
        flex: 1,
    },
    notifBannerCta: {
        fontSize: 13,
        fontWeight: "800",
        color: "#1d4ed8",
    },
    sectionTitleRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 10,
        marginBottom: 8,
    },
    seeAllText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#2563eb",
    },
    statsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 10,
        marginBottom: 20,
    },
    statBox: {
        flex: 1,
        borderRadius: 14,
        padding: 14,
        alignItems: "center",
    },
    statNumber: {
        fontSize: 22,
        fontWeight: "800",
    },
    statLabel: {
        fontSize: 12,
        fontWeight: "600",
        marginTop: 2,
    },
    emptyCard: {
        backgroundColor: "#ffffff",
        borderRadius: 14,
        padding: 30,
        alignItems: "center",
        marginVertical: 10,
    },
    emptyIcon: {
        fontSize: 40,
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
