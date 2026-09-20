import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { apiRequest } from "@/lib/api";
import { Complaint, ComplaintsResponse, UsersResponse } from "@/lib/types";
import { ComplaintCard } from "@/components/ComplaintCard";
import { Colors } from "@/constants/theme";
import {
    Banner,
    EmptyState,
    Screen,
    SectionTitle,
    StatCard,
} from "@/components/ui";

export default function ManagerDashboard() {
    const router = useRouter();

    const [stats, setStats] = useState({
        pending: 0,
        in_progress: 0,
        resolved: 0,
        pendingApprovals: 0,
    });
    const [recentComplaints, setRecentComplaints] = useState<Complaint[]>([]);
    // The full list's ids, not just the 3 shown — so swiping through a
    // complaint opened from here can move past those 3.
    const [allComplaintIds, setAllComplaintIds] = useState<string[]>([]);
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
            setAllComplaintIds(complaints.map((c) => c._id));

            const pending = complaints.filter((c) => c.status === "pending").length;
            const in_progress = complaints.filter((c) => c.status === "in_progress").length;
            const resolved = complaints.filter((c) => c.status === "resolved").length;

            // Fetch pending staff approvals
            const usersData = await apiRequest<UsersResponse>("/users?status=pending");
            const pendingApprovals = (usersData.users || []).length;

            setStats({ pending, in_progress, resolved, pendingApprovals });
        } catch (e) {
            console.error("Manager dashboard error", e);
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <Screen scroll refreshing={refreshing} onRefresh={loadData}>
            {stats.pendingApprovals > 0 && (
                <Banner
                    tone="warning"
                    icon="person-add"
                    title={`${stats.pendingApprovals} staff registration${
                        stats.pendingApprovals === 1 ? "" : "s"
                    } pending`}
                    message="Review and approve new staff accounts."
                    onPress={() => router.push("/(manager)/approvals")}
                />
            )}

            {/* Stats */}
            <SectionTitle title="Campus maintenance summary" />
            <View style={styles.statsGrid}>
                <StatCard
                    icon="time-outline"
                    color={Colors.warning}
                    value={stats.pending}
                    label="Pending action"
                    style={styles.statCard}
                />
                <StatCard
                    icon="construct-outline"
                    color={Colors.primary}
                    value={stats.in_progress}
                    label="In progress"
                    style={styles.statCard}
                />
                <StatCard
                    icon="checkmark-done-outline"
                    color={Colors.success}
                    value={stats.resolved}
                    label="Resolved"
                    style={styles.statCard}
                />
                <StatCard
                    icon="people-outline"
                    color={Colors.textSecondary}
                    value={stats.pendingApprovals}
                    label="Awaiting approval"
                    style={styles.statCard}
                />
            </View>

            {/* Recent */}
            <SectionTitle title="Recent issues reported" />
            {recentComplaints.length === 0 ? (
                <EmptyState
                    icon="cube-outline"
                    title="No complaints recorded yet"
                    message="New reports from staff will appear here."
                />
            ) : (
                recentComplaints.map((item) => (
                    <ComplaintCard
                        key={item._id}
                        complaint={item}
                        showCost
                        onPress={() =>
                            router.push(
                                `/complaint/${item._id}?ids=${allComplaintIds.join(",")}`
                            )
                        }
                    />
                ))
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        marginBottom: 20,
    },
    statCard: {
        width: "47.5%",
        flexGrow: 1,
    },
});
