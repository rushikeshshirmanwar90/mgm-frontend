import React, { useCallback, useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { apiRequest } from "@/lib/api";
import { Complaint, ComplaintsResponse } from "@/lib/types";
import { searchComplaints } from "@/lib/complaint-search";
import { ComplaintCard } from "@/components/ComplaintCard";
import { Colors, Radius, inr } from "@/constants/theme";
import {
    ChipGroup,
    EmptyState,
    SearchBar,
    TAB_BAR_CLEARANCE,
    useHideTabBarOnScroll,
} from "@/components/ui";

const STATUS_FILTERS = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "in_progress", label: "In progress" },
    { key: "resolved", label: "Resolved" },
] as const;

export default function AdminComplaintsScreen() {
    const router = useRouter();
    const { onScroll, scrollEventThrottle } = useHideTabBarOnScroll();

    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [query, setQuery] = useState("");
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

    const visible = useMemo(
        () => searchComplaints(complaints, query),
        [complaints, query]
    );

    // Summarises whatever is actually on screen, so the number always matches
    // the list underneath it — including when a search narrows the view.
    const summary = useMemo(() => {
        const costed = visible.filter((c) => (c.costDetails?.totalCost || 0) > 0);
        const total = costed.reduce((sum, c) => sum + (c.costDetails?.totalCost || 0), 0);
        return { total, costed: costed.length };
    }, [visible]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.summaryCard}>
                    <View>
                        <Text style={styles.summaryLabel}>Cost in view</Text>
                        <Text style={styles.summaryMeta}>
                            {visible.length} complaint{visible.length === 1 ? "" : "s"} ·{" "}
                            {summary.costed} with a recorded cost
                        </Text>
                    </View>
                    <Text style={styles.summaryValue}>{inr(summary.total)}</Text>
                </View>

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
            </View>

            <FlatList
                data={visible}
                keyExtractor={(item) => item._id}
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
                renderItem={({ item }) => (
                    <ComplaintCard
                        complaint={item}
                        showCost
                        onPress={() =>
                            router.push(
                                `/complaint/${item._id}?ids=${visible.map((c) => c._id).join(",")}`
                            )
                        }
                    />
                )}
                ListEmptyComponent={
                    <EmptyState
                        icon={query ? "search-outline" : "document-text-outline"}
                        title={query ? "No matches" : "No complaints found"}
                        message={
                            query
                                ? `Nothing matches “${query}”.`
                                : "Nothing matches this filter yet."
                        }
                        style={styles.empty}
                    />
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
        paddingTop: 16,
        paddingBottom: 12,
    },
    summaryCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        backgroundColor: Colors.primaryLight,
        borderWidth: 1,
        borderColor: Colors.primaryBorder,
        borderRadius: Radius.lg,
        padding: 14,
        marginBottom: 14,
    },
    search: {
        marginBottom: 12,
    },
    summaryLabel: {
        fontSize: 10.5,
        fontWeight: "700",
        color: Colors.primaryDark,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    summaryMeta: {
        fontSize: 11.5,
        color: Colors.primary,
        marginTop: 3,
    },
    summaryValue: {
        fontSize: 20,
        fontWeight: "800",
        color: Colors.primaryDark,
        letterSpacing: -0.6,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: TAB_BAR_CLEARANCE,
    },
    empty: {
        marginTop: 40,
    },
});
