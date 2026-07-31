import React, { useCallback, useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Alert,
} from "react-native";
import { apiRequest } from "@/lib/api";
import { Complaint, ComplaintResponse, ComplaintsResponse } from "@/lib/types";
import { ComplaintCard } from "@/components/ComplaintCard";
import { CostModal } from "@/components/CostModal";

export default function ManagerComplaintsScreen() {
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [refreshing, setRefreshing] = useState(false);

    // Cost modal state
    const [costModalVisible, setCostModalVisible] = useState(false);
    const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

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

    const handleUpdateStatus = async (complaintId: string, newStatus: string) => {
        try {
            const res = await apiRequest<ComplaintResponse>(`/complaints/${complaintId}`, {
                method: "PUT",
                body: JSON.stringify({ status: newStatus }),
            });

            Alert.alert(
                "Status Updated!",
                newStatus === "resolved"
                    ? "Complaint marked as Resolved 🎉! Notification & thank-you email sent to staff."
                    : `Status updated to ${newStatus.replace("_", " ")}.`
            );

            setComplaints((prev) =>
                prev.map((c) => (c._id === complaintId ? res.complaint : c))
            );
        } catch (error) {
            Alert.alert(
                "Error",
                error instanceof Error ? error.message : "Failed to update status"
            );
        }
    };

    const handleOpenCostModal = (complaint: Complaint) => {
        setSelectedComplaint(complaint);
        setCostModalVisible(true);
    };

    return (
        <View style={styles.container}>
            {/* Filter Chips */}
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
                renderItem={({ item }) => (
                    <View style={styles.itemContainer}>
                        <ComplaintCard complaint={item} showCost />

                        {/* Manager Control Bar */}
                        <View style={styles.controlsRow}>
                            <TouchableOpacity
                                style={styles.costBtn}
                                onPress={() => handleOpenCostModal(item)}
                            >
                                <Text style={styles.costBtnText}>
                                    💰 {item.costDetails?.totalCost ? `Edit Cost (₹${item.costDetails.totalCost})` : "Add Cost Breakdown"}
                                </Text>
                            </TouchableOpacity>

                            <View style={styles.statusActionRow}>
                                {item.status !== "in_progress" && item.status !== "resolved" && (
                                    <TouchableOpacity
                                        style={[styles.statusBtn, { backgroundColor: "#dbeafe" }]}
                                        onPress={() => handleUpdateStatus(item._id, "in_progress")}
                                    >
                                        <Text style={{ color: "#2563eb", fontWeight: "700", fontSize: 12 }}>
                                            🛠️ Start Work
                                        </Text>
                                    </TouchableOpacity>
                                )}

                                {item.status !== "resolved" && (
                                    <TouchableOpacity
                                        style={[styles.statusBtn, { backgroundColor: "#dcfce7" }]}
                                        onPress={() => handleUpdateStatus(item._id, "resolved")}
                                    >
                                        <Text style={{ color: "#16a34a", fontWeight: "700", fontSize: 12 }}>
                                            ✅ Mark Resolved
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyIcon}>📦</Text>
                        <Text style={styles.emptyText}>No complaints match filter</Text>
                    </View>
                }
            />

            {/* Cost Modal */}
            {selectedComplaint && (
                <CostModal
                    visible={costModalVisible}
                    complaintId={selectedComplaint._id}
                    initialLaborCost={selectedComplaint.costDetails?.laborCost || 0}
                    initialMaterialCost={selectedComplaint.costDetails?.materialCost || 0}
                    initialOtherCost={selectedComplaint.costDetails?.otherCost || 0}
                    initialNotes={selectedComplaint.costDetails?.notes || ""}
                    onClose={() => {
                        setCostModalVisible(false);
                        setSelectedComplaint(null);
                    }}
                    onSuccess={(updatedComplaint) => {
                        setComplaints((prev) =>
                            prev.map((c) => (c._id === updatedComplaint._id ? updatedComplaint : c))
                        );
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8fafc",
        padding: 16,
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
        backgroundColor: "#2563eb",
        borderColor: "#1d4ed8",
    },
    filterText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#475569",
    },
    activeFilterText: {
        color: "#ffffff",
    },
    itemContainer: {
        marginBottom: 12,
    },
    controlsRow: {
        backgroundColor: "#ffffff",
        padding: 12,
        borderRadius: 12,
        marginTop: -6,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
    },
    costBtn: {
        backgroundColor: "#f0fdf4",
        borderWidth: 1,
        borderColor: "#bbf7d0",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    costBtnText: {
        color: "#166534",
        fontWeight: "700",
        fontSize: 12,
    },
    statusActionRow: {
        flexDirection: "row",
        gap: 6,
    },
    statusBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
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
