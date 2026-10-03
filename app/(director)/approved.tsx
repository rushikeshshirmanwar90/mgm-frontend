import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { apiRequest } from "@/lib/api";
import { Complaint, ComplaintsResponse } from "@/lib/types";
import { searchComplaints } from "@/lib/complaint-search";
import { ComplaintCard } from "@/components/ComplaintCard";
import { Colors } from "@/constants/theme";
import {
    ChipGroup,
    Credit,
    EmptyState,
    SearchBar,
    TAB_BAR_CLEARANCE,
    useHideTabBarOnScroll,
} from "@/components/ui";

const FILTERS = [
    { key: "all", label: "All" },
    { key: "active", label: "Being worked on" },
    { key: "resolved", label: "Resolved" },
] as const;

/**
 * Everything that has been approved, newest approval first, so the Director
 * can follow what happened after they signed off — including what it actually
 * cost against the estimate once it's resolved.
 */
export default function DirectorApprovedScreen() {
    const router = useRouter();
    const { onScroll, scrollEventThrottle } = useHideTabBarOnScroll();

    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [filter, setFilter] = useState<string>("all");
    const [query, setQuery] = useState("");
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        setRefreshing(true);
        try {
            const data = await apiRequest<ComplaintsResponse>("/complaints");
            const approved = (data.complaints || [])
                .filter((c) => !!c.approvedAt)
                .sort((a, b) => (b.approvedAt ?? "").localeCompare(a.approvedAt ?? ""));
            setComplaints(approved);
        } catch (e) {
            console.error("Director approved list error", e);
        } finally {
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const visible = useMemo(() => {
        const byStatus = complaints.filter((c) =>
            filter === "all"
                ? true
                : filter === "resolved"
                  ? c.status === "resolved"
                  : c.status !== "resolved"
        );
        return searchComplaints(byStatus, query);
    }, [complaints, filter, query]);

    const ids = visible.map((c) => c._id).join(",");

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <SearchBar
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search by issue, place or reporter"
                    style={styles.search}
                />
                <ChipGroup options={[...FILTERS]} value={filter} onChange={setFilter} />
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
                        onRefresh={load}
                        tintColor={Colors.primary}
                        colors={[Colors.primary]}
                    />
                }
                renderItem={({ item }) => (
                    <ComplaintCard
                        complaint={item}
                        showEstimate
                        showCost
                        onPress={() => router.push(`/complaint/${item._id}?ids=${ids}`)}
                    />
                )}
                ListEmptyComponent={
                    refreshing ? null : (
                        <EmptyState
                            icon="file-tray-outline"
                            title={query ? "No matches" : "Nothing approved yet"}
                            message={
                                query
                                    ? `Nothing matches “${query}”.`
                                    : "Complaints you approve will be listed here."
                            }
                            style={styles.empty}
                        />
                    )
                }
                ListFooterComponent={<Credit />}
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
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: TAB_BAR_CLEARANCE,
    },
    empty: {
        marginTop: 40,
    },
});
