import React, { useCallback, useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
} from "react-native";
import { apiRequest } from "@/lib/api";
import { Complaint, ComplaintsResponse } from "@/lib/types";
import { ComplaintCard } from "@/components/ComplaintCard";

export default function AdminComplaintsScreen() {
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [refreshing, setRefreshing] = useState(false);

    const loadComplaints = useCallback(async () => {
        setRefreshing(true);
        try {
            const url = statusFilter !== "all" ? `/complaints?status=${statusFilter}` : "/complaints";
            const data = await apiRequest<ComplaintsResponse>(url);
            setComplaints(data.complaints || []);
        } catch (e) {
            console.error("Fetch complaints error", e);
        } finally {
            setRefreshing(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        loadComplaints();
    }, [loadComplaints]);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>All Campus Complaints & Cost Audit 💰</Text>

            {/* Filter Row */}
            <View style={styles.filterRow}>
                {["all", "pending", "in_progress", "resolved"].map((st) => (
                    <TouchableOpacity
                        key={st}
                        style={[styles.filterChip, statusFilter === st && styles.activeFilterChip]}
                        onPress={() => setStatusFilter(st)}
                    >
                        <Text style={[styles.filterText, statusFilter === st && styles.activeFilterText]}>
                            {st === "all" ? "All" : st === "in_progress" ? "In Progress" : st.toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <FlatList
                data={complaints}
                keyExtractor={(item) => item._id}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={loadComplaints} />
                }
                renderItem={({ item }) => <ComplaintCard complaint={item} showCost />}
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyIcon}>📋</Text>
                        <Text style={styles.emptyText}>No complaints found</Text>
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
    title: {
        fontSize: 18,
        fontWeight: "800",
        color: "#0f172a",
        marginBottom: 12,
    },
    filterRow: {
        flexDirection: "row",
        gap: 6,
        marginBottom: 12,
    },
    filterChip: {
        flex: 1,
        backgroundColor: "#ffffff",
        paddingVertical: 8,
        borderRadius: 20,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#cbd5e1",
    },
    activeFilterChip: {
        backgroundColor: "#be185d",
        borderColor: "#9d174d",
    },
    filterText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#475569",
    },
    activeFilterText: {
        color: "#ffffff",
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
});
