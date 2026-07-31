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
import { apiRequest } from "@/lib/api";
import { BuildingsResponse, Complaint, ComplaintsResponse } from "@/lib/types";

export default function AdminDashboard() {
    const { user, logout } = useAuth();

    const [stats, setStats] = useState({
        totalComplaints: 0,
        pending: 0,
        in_progress: 0,
        resolved: 0,
        laborCost: 0,
        materialCost: 0,
        otherCost: 0,
        grandTotalCost: 0,
        totalBuildings: 0,
    });
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadAdminData();
    }, []);

    const loadAdminData = async () => {
        setRefreshing(true);
        try {
            const data = await apiRequest<ComplaintsResponse>("/complaints");
            const complaints: Complaint[] = data.complaints || [];

            const pending = complaints.filter((c) => c.status === "pending").length;
            const in_progress = complaints.filter((c) => c.status === "in_progress").length;
            const resolved = complaints.filter((c) => c.status === "resolved").length;

            let labor = 0;
            let material = 0;
            let other = 0;

            complaints.forEach((c) => {
                if (c.costDetails) {
                    labor += c.costDetails.laborCost || 0;
                    material += c.costDetails.materialCost || 0;
                    other += c.costDetails.otherCost || 0;
                }
            });

            const bData = await apiRequest<BuildingsResponse>("/buildings");
            const totalBuildings = (bData.buildings || []).length;

            setStats({
                totalComplaints: complaints.length,
                pending,
                in_progress,
                resolved,
                laborCost: labor,
                materialCost: material,
                otherCost: other,
                grandTotalCost: labor + material + other,
                totalBuildings,
            });
        } catch (e) {
            console.error("Admin dashboard error", e);
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={loadAdminData} />
            }
        >
            {/* Admin Header */}
            <View style={styles.headerCard}>
                <View>
                    <Text style={styles.greeting}>Administrator Portal 👑</Text>
                    <Text style={styles.userName}>{user?.name}</Text>
                    <Text style={styles.userRole}>MGM Campus Executive & Financial Controller</Text>
                </View>
                <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>

            {/* Financial Overview Card */}
            <Text style={styles.sectionHeader}>Campus Maintenance Expenditure</Text>
            <View style={styles.costSummaryCard}>
                <Text style={styles.costSummaryTitle}>Grand Total Repair Costs</Text>
                <Text style={styles.costSummaryNum}>₹{stats.grandTotalCost.toLocaleString()}</Text>

                <View style={styles.costBreakdownRow}>
                    <View style={styles.costBoxItem}>
                        <Text style={styles.costBoxLabel}>Labor Costs</Text>
                        <Text style={styles.costBoxNum}>₹{stats.laborCost.toLocaleString()}</Text>
                    </View>

                    <View style={styles.costBoxItem}>
                        <Text style={styles.costBoxLabel}>Material Costs</Text>
                        <Text style={styles.costBoxNum}>₹{stats.materialCost.toLocaleString()}</Text>
                    </View>

                    <View style={styles.costBoxItem}>
                        <Text style={styles.costBoxLabel}>Other Expenses</Text>
                        <Text style={styles.costBoxNum}>₹{stats.otherCost.toLocaleString()}</Text>
                    </View>
                </View>
            </View>

            {/* System Overview Grid */}
            <Text style={styles.sectionHeader}>Campus Infrastructure Overview</Text>
            <View style={styles.statsGrid}>
                <View style={[styles.statBox, { backgroundColor: "#fce7f3" }]}>
                    <Text style={[styles.statNum, { color: "#be185d" }]}>{stats.totalBuildings}</Text>
                    <Text style={styles.statLbl}>Active Buildings</Text>
                </View>

                <View style={[styles.statBox, { backgroundColor: "#fef3c7" }]}>
                    <Text style={[styles.statNum, { color: "#d97706" }]}>{stats.pending}</Text>
                    <Text style={styles.statLbl}>Pending Issues</Text>
                </View>

                <View style={[styles.statBox, { backgroundColor: "#dbeafe" }]}>
                    <Text style={[styles.statNum, { color: "#2563eb" }]}>{stats.in_progress}</Text>
                    <Text style={styles.statLbl}>In Progress</Text>
                </View>

                <View style={[styles.statBox, { backgroundColor: "#dcfce7" }]}>
                    <Text style={[styles.statNum, { color: "#16a34a" }]}>{stats.resolved}</Text>
                    <Text style={styles.statLbl}>Resolved 🎉</Text>
                </View>
            </View>
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
        color: "#be185d",
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
    sectionHeader: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1e293b",
        marginBottom: 12,
        marginTop: 6,
    },
    costSummaryCard: {
        backgroundColor: "#831843",
        borderRadius: 18,
        padding: 20,
        marginBottom: 20,
        elevation: 4,
    },
    costSummaryTitle: {
        fontSize: 13,
        color: "#fbcfe8",
        fontWeight: "600",
    },
    costSummaryNum: {
        fontSize: 32,
        fontWeight: "800",
        color: "#ffffff",
        marginVertical: 4,
    },
    costBreakdownRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        borderTopWidth: 1,
        borderTopColor: "rgba(255,255,255,0.2)",
        paddingTop: 14,
        marginTop: 10,
    },
    costBoxItem: {
        flex: 1,
    },
    costBoxLabel: {
        fontSize: 11,
        color: "#fbcfe8",
    },
    costBoxNum: {
        fontSize: 16,
        fontWeight: "700",
        color: "#ffffff",
        marginTop: 2,
    },
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        marginBottom: 20,
    },
    statBox: {
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
});
