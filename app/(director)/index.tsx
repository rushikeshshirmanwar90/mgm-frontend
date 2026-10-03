import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { apiRequest } from "@/lib/api";
import { Complaint, ComplaintsResponse } from "@/lib/types";
import { runAction } from "@/lib/workflow";
import { ComplaintCard } from "@/components/ComplaintCard";
import { ReasonSheet } from "@/components/ReasonSheet";
import { Colors, inr } from "@/constants/theme";
import {
    Button,
    Credit,
    EmptyState,
    TAB_BAR_CLEARANCE,
    useHideTabBarOnScroll,
} from "@/components/ui";

/**
 * The Director's queue: every complaint whose estimated budget is waiting on
 * them. Each card leads with the budget and can be approved or rejected
 * straight from the list; tapping it opens the full complaint.
 */
export default function DirectorApprovalsScreen() {
    const router = useRouter();
    const { onScroll, scrollEventThrottle } = useHideTabBarOnScroll();

    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [rejecting, setRejecting] = useState<Complaint | null>(null);

    const load = useCallback(async () => {
        setRefreshing(true);
        try {
            const data = await apiRequest<ComplaintsResponse>(
                "/complaints?status=awaiting_approval"
            );
            setComplaints(data.complaints || []);
        } catch (e) {
            console.error("Director approvals error", e);
        } finally {
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const totalAwaiting = useMemo(
        () => complaints.reduce((sum, c) => sum + (c.estimatedBudget ?? 0), 0),
        [complaints]
    );

    /** Runs the decision and drops the complaint from the queue. */
    const decide = async (complaint: Complaint, action: "approve" | "return", reason?: string) => {
        setBusyId(complaint._id);
        try {
            await runAction(complaint._id, action, reason ? { reason } : {});
            setComplaints((prev) => prev.filter((c) => c._id !== complaint._id));
            setRejecting(null);
        } catch (e) {
            Alert.alert("Error", e instanceof Error ? e.message : "Could not update the complaint.");
        } finally {
            setBusyId(null);
        }
    };

    const confirmApprove = (complaint: Complaint) => {
        Alert.alert(
            "Approve this complaint?",
            `"${complaint.title}" — estimated budget ${inr(complaint.estimatedBudget ?? 0)}.`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Approve", onPress: () => decide(complaint, "approve") },
            ]
        );
    };

    const ids = complaints.map((c) => c._id).join(",");

    return (
        <View style={styles.container}>
            <FlatList
                data={complaints}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={scrollEventThrottle}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={load}
                        tintColor={Colors.primary}
                        colors={[Colors.primary]}
                    />
                }
                ListHeaderComponent={
                    complaints.length > 0 ? (
                        <View style={styles.summary}>
                            <Text style={styles.summaryCount}>
                                {complaints.length} complaint{complaints.length === 1 ? "" : "s"}{" "}
                                waiting for you
                            </Text>
                            <Text style={styles.summaryTotal}>
                                {inr(totalAwaiting)} in estimated budgets
                            </Text>
                        </View>
                    ) : null
                }
                renderItem={({ item }) => (
                    <ComplaintCard
                        complaint={item}
                        showEstimate
                        onPress={() => router.push(`/complaint/${item._id}?ids=${ids}`)}
                        footer={
                            <View style={styles.actionBar}>
                                <Button
                                    label="Reject"
                                    icon="close"
                                    variant="ghost"
                                    size="sm"
                                    disabled={busyId === item._id}
                                    onPress={() => setRejecting(item)}
                                    style={styles.actionBtn}
                                />
                                <Button
                                    label="Approve"
                                    icon="checkmark"
                                    variant="success"
                                    size="sm"
                                    loading={busyId === item._id}
                                    onPress={() => confirmApprove(item)}
                                    style={styles.actionBtn}
                                />
                            </View>
                        }
                    />
                )}
                ListEmptyComponent={
                    refreshing ? null : (
                        <EmptyState
                            icon="checkmark-done-circle-outline"
                            title="Nothing waiting for approval"
                            message="Complaints appear here once the Estate Manager adds an estimated budget."
                            style={styles.empty}
                        />
                    )
                }
                ListFooterComponent={<Credit />}
            />

            <ReasonSheet
                visible={!!rejecting}
                title="Reject estimate"
                subtitle="The complaint goes back to the Estate Manager with your reason, so they can revise the estimate and resubmit it."
                placeholder="e.g. Budget is too high — get a second quotation for the motor."
                confirmLabel="Reject"
                confirmIcon="close"
                confirmVariant="danger"
                busy={!!rejecting && busyId === rejecting._id}
                onClose={() => setRejecting(null)}
                onSubmit={(reason) => rejecting && decide(rejecting, "return", reason)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    listContent: {
        padding: 16,
        paddingBottom: TAB_BAR_CLEARANCE,
    },
    summary: {
        marginBottom: 14,
    },
    summaryCount: {
        fontSize: 15,
        fontWeight: "800",
        color: Colors.textPrimary,
        letterSpacing: -0.2,
    },
    summaryTotal: {
        fontSize: 12.5,
        color: Colors.textSecondary,
        marginTop: 2,
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
