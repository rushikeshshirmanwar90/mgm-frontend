import React, { useState, useEffect } from "react";
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
import { Complaint, ComplaintsResponse, UsersResponse } from "@/lib/types";
import { ComplaintCard } from "@/components/ComplaintCard";

export default function ManagerDashboard() {
    const { user, logout } = useAuth();
    const router = useRouter();

    const [stats, setStats] = useState({
        pending: 0,
        in_progress: 0,
        resolved: 0,
        totalCost: 0,
        pendingApprovals: 0,
    });
    const [recentComplaints, setRecentComplaints] = useState<Complaint[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setRefreshing(true);
        try {
            const data = await apiRequest<ComplaintsResponse>("/complaints");
            const complaints: Complaint[] = data.complaints || [];
            setRecentComplaints(complaints.slice(0, 3));

            const pending = complaints.filter((c) => c.status === "pending").length;
            const in_progress = complaints.filter((c) => c.status === "in_progress").length;
            const resolved = complaints.filter((c) => c.status === "resolved").length;

            const totalCost = complaints.reduce(
                (sum, c) => sum + (c.costDetails?.totalCost || 0),
                0
            );

            // Fetch pending staff approvals
            const usersData = await apiRequest<UsersResponse>("/users?status=pending");
            const pendingApprovals = (usersData.users || []).length;

            setStats({ pending, in_progress, resolved, totalCost, pendingApprovals });
        } catch (e) {
            console.error("Manager dashboard error", e);
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={loadData} />
            }
        >
            {/* Greeting Header */}
            <View style={styles.headerCard}>
                <View>
                    <Text style={styles.greeting}>Estate Manager Portal 👔</Text>
                    <Text style={styles.userName}>{user?.name}</Text>
                    <Text style={styles.userRole}>MGM Campus Maintenance Overseer</Text>
                </View>
                <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>

            {/* Pending Approvals Alert Banner */}
            {stats.pendingApprovals > 0 && (
                <TouchableOpacity
                    style={styles.alertBanner}
                    onPress={() => router.push("/(manager)/approvals")}
                >
                    <Text style={styles.alertIcon}>⚠️</Text>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.alertTitle}>
                            {stats.pendingApprovals} Staff Registration(s) Pending
                        </Text>
                        <Text style={styles.alertSub}>Tap to review and approve staff registrations.</Text>
                    </View>
                    <Text style={styles.alertArrow}>→</Text>
                </TouchableOpacity>
            )}

            {/* Stats Overview */}
            <Text style={styles.sectionHeader}>Campus Maintenance Summary</Text>
            <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: "#fef3c7" }]}>
                    <Text style={[styles.statNum, { color: "#d97706" }]}>{stats.pending}</Text>
                    <Text style={styles.statLbl}>Pending Action</Text>
                </View>

                <View style={[styles.statCard, { backgroundColor: "#dbeafe" }]}>
                    <Text style={[styles.statNum, { color: "#2563eb" }]}>{stats.in_progress}</Text>
                    <Text style={styles.statLbl}>In Progress</Text>
                </View>

                <View style={[styles.statCard, { backgroundColor: "#dcfce7" }]}>
                    <Text style={[styles.statNum, { color: "#16a34a" }]}>{stats.resolved}</Text>
                    <Text style={styles.statLbl}>Resolved 🎉</Text>
                </View>

                <View style={[styles.statCard, { backgroundColor: "#f3e8ff" }]}>
                    <Text style={[styles.statNum, { color: "#7e22ce" }]}>₹{stats.totalCost}</Text>
                    <Text style={styles.statLbl}>Total Maintenance Cost</Text>
                </View>
            </View>

            {/* Quick Link Card */}
            <TouchableOpacity
                style={styles.manageBtn}
                onPress={() => router.push("/(manager)/complaints")}
            >
                <Text style={styles.manageBtnText}>🛠️ Manage All Campus Complaints & Costs →</Text>
            </TouchableOpacity>

            {/* Recent Complaints List */}
            <Text style={[styles.sectionHeader, { marginTop: 20 }]}>Recent Issues Reported</Text>
            {recentComplaints.length === 0 ? (
                <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>No complaints recorded yet.</Text>
                </View>
            ) : (
                recentComplaints.map((item) => (
                    <ComplaintCard key={item._id} complaint={item} showCost />
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
    headerCard: {
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
    greeting: {
        fontSize: 13,
        color: "#64748b",
        fontWeight: "600",
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
    alertBanner: {
        backgroundColor: "#fff7ed",
        borderWidth: 1,
        borderColor: "#ffedd5",
        borderRadius: 14,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    alertIcon: {
        fontSize: 22,
        marginRight: 10,
    },
    alertTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#c2410c",
    },
    alertSub: {
        fontSize: 12,
        color: "#ea580c",
    },
    alertArrow: {
        fontSize: 18,
        fontWeight: "700",
        color: "#c2410c",
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1e293b",
        marginBottom: 12,
    },
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        marginBottom: 16,
    },
    statCard: {
        width: "48%",
        borderRadius: 14,
        padding: 14,
        alignItems: "center",
    },
    statNum: {
        fontSize: 22,
        fontWeight: "800",
    },
    statLbl: {
        fontSize: 12,
        fontWeight: "600",
        color: "#374151",
        marginTop: 2,
    },
    manageBtn: {
        backgroundColor: "#2563eb",
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center",
    },
    manageBtnText: {
        color: "#ffffff",
        fontSize: 15,
        fontWeight: "700",
    },
    emptyCard: {
        backgroundColor: "#ffffff",
        borderRadius: 12,
        padding: 20,
        alignItems: "center",
    },
    emptyText: {
        fontSize: 14,
        color: "#64748b",
    },
});
