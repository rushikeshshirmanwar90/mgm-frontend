import React, { useCallback, useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { apiRequest } from "@/lib/api";
import { Complaint, ComplaintsResponse } from "@/lib/types";
import { searchComplaints } from "@/lib/complaint-search";
import { ComplaintCard } from "@/components/ComplaintCard";
import { Colors } from "@/constants/theme";
import { ChipGroup, EmptyState, SearchBar } from "@/components/ui";

const STATUS_FILTERS = [
    { key: "all", label: "All" },
    { key: "pending", label: "Waiting" },
    { key: "on_hold", label: "On hold" },
    { key: "in_progress", label: "Being fixed" },
    { key: "resolved", label: "Done" },
] as const;

export default function MyComplaintsScreen() {
    const router = useRouter();

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

    const filterLabel =
        STATUS_FILTERS.find((f) => f.key === statusFilter)?.label ?? statusFilter;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <SearchBar
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search by issue, building or room"
                    style={styles.search}
                />
                <ChipGroup
                    options={[...STATUS_FILTERS]}
                    value={statusFilter}
                    onChange={setStatusFilter}
                />
                {visible.length > 0 && (
                    <Text style={styles.count}>
                        Showing {visible.length} complaint{visible.length === 1 ? "" : "s"}
                    </Text>
                )}
            </View>

            <FlatList
                data={visible}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                    <ComplaintCard
                        complaint={item}
                        showCost
                        onPress={() => router.push(`/complaint/${item._id}`)}
                    />
                )}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={loadComplaints}
                        tintColor={Colors.primary}
                        colors={[Colors.primary]}
                    />
                }
                ListEmptyComponent={
                    query ? (
                        <EmptyState
                            icon="search-outline"
                            title="No matches"
                            message={`Nothing matches “${query}”. Try a building name or room number.`}
                            style={styles.empty}
                        />
                    ) : (
                        <EmptyState
                            icon="document-text-outline"
                            title={
                                statusFilter === "all"
                                    ? "No complaints yet"
                                    : `Nothing is "${filterLabel}"`
                            }
                            message={
                                statusFilter === "all"
                                    ? "Anything you report will appear here so you can follow its progress."
                                    : "Try another filter to see your other complaints."
                            }
                            style={styles.empty}
                        />
                    )
                }
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
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
    count: {
        fontSize: 11,
        fontWeight: "600",
        color: Colors.textTertiary,
        marginTop: 12,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 28,
    },
    empty: {
        marginTop: 40,
    },
});
