import React, { useCallback, useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert } from "react-native";
import { useRouter } from "expo-router";
import { apiRequest } from "@/lib/api";
import { Complaint, ComplaintsResponse } from "@/lib/types";
import { WorkflowAction, runAction } from "@/lib/workflow";
import { searchComplaints } from "@/lib/complaint-search";
import { ComplaintCard } from "@/components/ComplaintCard";
import { Colors } from "@/constants/theme";
import {
    Button,
    ChipGroup,
    Credit,
    EmptyState,
    SearchBar,
    TAB_BAR_CLEARANCE,
    useHideTabBarOnScroll,
} from "@/components/ui";

const STATUS_FILTERS = [
    { key: "all", label: "All" },
    { key: "pending", label: "Needs estimate" },
    { key: "awaiting_approval", label: "Awaiting director" },
    { key: "approved", label: "Approved" },
    { key: "in_progress", label: "In progress" },
    { key: "work_done", label: "Work done" },
    { key: "on_hold", label: "On hold" },
    { key: "resolved", label: "Resolved" },
] as const;

type IconName = React.ComponentProps<typeof Button>["icon"];

/**
 * The single next step for a complaint, shown as one button on its card.
 * Steps that need a form (estimate, expenditure) open the complaint instead.
 */
function nextStepFor(
    status: Complaint["status"]
): { label: string; icon: IconName; action?: WorkflowAction; primary?: boolean } | null {
    switch (status) {
        case "pending":
            return { label: "Add estimate", icon: "calculator-outline", primary: true };
        case "approved":
            return { label: "Start work", icon: "construct-outline", action: "start", primary: true };
        case "in_progress":
            return { label: "Mark work done", icon: "checkmark-done-outline", action: "work_done" };
        case "work_done":
            return { label: "Enter expenditure", icon: "receipt-outline", primary: true };
        case "on_hold":
            return { label: "Resume", icon: "play-outline", action: "resume" };
        default:
            return null;
    }
}

export default function ManagerComplaintsScreen() {
    const router = useRouter();
    const { onScroll, scrollEventThrottle } = useHideTabBarOnScroll();

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

    const handleAction = async (complaintId: string, action: WorkflowAction) => {
        setBusyId(complaintId);
        try {
            const updated = await runAction(complaintId, action);
            setComplaints((prev) => prev.map((c) => (c._id === complaintId ? updated : c)));
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
                    Tap any complaint to add its estimate, see photos or record what it cost.
                </Text>
            </View>

            <FlatList
                data={visible}
                keyExtractor={(item) => item._id}
                ListFooterComponent={<Credit />}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onScroll={onScroll}
                scrollEventThrottle={scrollEventThrottle}
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
                    const nextStep = nextStepFor(item.status);
                    const complaintIds = visible.map((c) => c._id).join(",");
                    const open = () =>
                        router.push(`/complaint/${item._id}?ids=${complaintIds}`);

                    return (
                        <ComplaintCard
                            complaint={item}
                            showCost
                            onPress={() =>
                                router.push(`/complaint/${item._id}?ids=${complaintIds}`)
                            }
                            footer={
                                nextStep ? (
                                    <View style={styles.actionBar}>
                                        <Button
                                            label={nextStep.label}
                                            icon={nextStep.icon}
                                            variant={nextStep.primary ? "primary" : "secondary"}
                                            size="sm"
                                            loading={busyId === item._id}
                                            onPress={() =>
                                                nextStep.action
                                                    ? handleAction(item._id, nextStep.action)
                                                    : open()
                                            }
                                            style={styles.actionBtn}
                                        />
                                        <Button
                                            label="More"
                                            icon="chevron-forward"
                                            iconAfter
                                            variant="ghost"
                                            size="sm"
                                            onPress={() =>
                                                router.push(
                                                    `/complaint/${item._id}?ids=${complaintIds}`
                                                )
                                            }
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
        paddingBottom: TAB_BAR_CLEARANCE,
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
