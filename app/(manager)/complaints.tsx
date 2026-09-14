import React, { useCallback, useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert } from "react-native";
import { useRouter } from "expo-router";
import { apiRequest } from "@/lib/api";
import { Complaint, ComplaintResponse, ComplaintsResponse } from "@/lib/types";
import { searchComplaints } from "@/lib/complaint-search";
import { ComplaintCard } from "@/components/ComplaintCard";
import { Colors } from "@/constants/theme";
import { Button, ChipGroup, EmptyState, SearchBar } from "@/components/ui";

const STATUS_FILTERS = [
    { key: "all", label: "All" },
    { key: "pending", label: "Needs action" },
    { key: "on_hold", label: "On hold" },
    { key: "in_progress", label: "In progress" },
    { key: "resolved", label: "Resolved" },
] as const;

export default function ManagerComplaintsScreen() {
    const router = useRouter();

    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [query, setQuery] = useState("");
    const [refreshing, setRefreshing] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

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

    const visible = useMemo(
        () => searchComplaints(complaints, query),
        [complaints, query]
    );

    const handleUpdateStatus = async (complaintId: string, newStatus: string) => {
        setBusyId(complaintId);
        try {
            const res = await apiRequest<ComplaintResponse>(`/complaints/${complaintId}`, {
                method: "PUT",
                body: JSON.stringify({ status: newStatus }),
            });
            setComplaints((prev) =>
                prev.map((c) => (c._id === complaintId ? res.complaint : c))
            );
        } catch (error) {
            Alert.alert(
                "Error",
                error instanceof Error ? error.message : "Failed to update status"
            );
        } finally {
            setBusyId(null);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <SearchBar
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search by issue, place or reporter"
                    style={styles.search}
                />
                <ChipGroup
                    options={[...STATUS_FILTERS]}
                    value={statusFilter}
                    onChange={setStatusFilter}
                />
                <Text style={styles.hint}>
                    Tap any complaint to see photos, record costs or close it.
                </Text>
            </View>

            <FlatList
                data={visible}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={loadComplaints}
                        tintColor={Colors.primary}
                        colors={[Colors.primary]}
                    />
                }
                renderItem={({ item }) => {
                    // One button for the single next step, rather than a row of
                    // three competing actions. Everything else lives on the
                    // detail screen, which has room to explain itself.
                    const nextStep =
                        item.status === "pending" || item.status === "on_hold"
                            ? { label: "Start work", status: "in_progress", icon: "construct-outline" as const }
                            : item.status === "in_progress"
                              ? { label: "Mark resolved", status: "resolved", icon: "checkmark-circle-outline" as const }
                              : null;

                    return (
                        <ComplaintCard
                            complaint={item}
                            showCost
                            onPress={() => router.push(`/complaint/${item._id}`)}
                            footer={
                                nextStep ? (
                                    <View style={styles.actionBar}>
                                        <Button
                                            label={nextStep.label}
                                            icon={nextStep.icon}
                                            variant={
                                                item.status === "in_progress" ? "primary" : "secondary"
                                            }
                                            size="sm"
                                            loading={busyId === item._id}
                                            onPress={() =>
                                                handleUpdateStatus(item._id, nextStep.status)
                                            }
                                            style={styles.actionBtn}
                                        />
                                        <Button
                                            label="More"
                                            icon="chevron-forward"
                                            iconAfter
                                            variant="ghost"
                                            size="sm"
                                            onPress={() => router.push(`/complaint/${item._id}`)}
                                        />
                                    </View>
                                ) : null
                            }
                        />
                    );
                }}
                ListEmptyComponent={
                    query ? (
                        <EmptyState
                            icon="search-outline"
                            title="No matches"
                            message={`Nothing matches “${query}”.`}
                            style={styles.empty}
                        />
                    ) : (
                        <EmptyState
                            icon="checkmark-done-circle-outline"
                            title="Nothing here"
                            message="No complaints match this filter."
                            color={Colors.success}
                            style={styles.empty}
                        />
                    )
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
    header: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 12,
    },
    search: {
        marginBottom: 12,
    },
    hint: {
        fontSize: 11.5,
        color: Colors.textTertiary,
        marginTop: 12,
        lineHeight: 16,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 28,
    },
    actionBar: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: Colors.surfaceMuted,
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    actionBtn: {
        flex: 1,
    },
    empty: {
        marginTop: 40,
    },
});
