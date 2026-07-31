import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
} from "react-native";
import { apiRequest } from "@/lib/api";
import {
    Building,
    BuildingsResponse,
    Complaint,
    ComplaintsResponse,
} from "@/lib/types";

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

/** Resolves a possibly-populated reference to its display label. */
function buildingLabel(complaint: Complaint): string | null {
    const b = complaint.buildingId;
    if (b && typeof b === "object") return b.name;
    return null;
}

function buildingKey(complaint: Complaint): string | null {
    const b = complaint.buildingId;
    if (b && typeof b === "object") return b._id;
    if (typeof b === "string") return b;
    return null;
}

interface Bucket {
    label: string;
    labor: number;
    material: number;
    other: number;
    total: number;
    count: number;
}

export default function AdminReportsScreen() {
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [months, setMonths] = useState(6);

    const load = useCallback(async () => {
        setRefreshing(true);
        try {
            const [complaintData, buildingData] = await Promise.all([
                apiRequest<ComplaintsResponse>("/complaints"),
                apiRequest<BuildingsResponse>("/buildings"),
            ]);
            setComplaints(complaintData.complaints || []);
            setBuildings(buildingData.buildings || []);
        } catch (e) {
            console.error("Reports load error", e);
        } finally {
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const totals = useMemo(() => {
        let labor = 0;
        let material = 0;
        let other = 0;
        let costed = 0;

        for (const c of complaints) {
            if (!c.costDetails) continue;
            costed += 1;
            labor += c.costDetails.laborCost || 0;
            material += c.costDetails.materialCost || 0;
            other += c.costDetails.otherCost || 0;
        }

        const total = labor + material + other;
        return {
            labor,
            material,
            other,
            total,
            costed,
            // Only complaints that actually carry a breakdown belong in the
            // average, otherwise uncosted tickets drag it toward zero.
            average: costed > 0 ? total / costed : 0,
        };
    }, [complaints]);

    const statusCounts = useMemo(() => {
        const counts = { pending: 0, in_progress: 0, resolved: 0, rejected: 0 };
        for (const c of complaints) {
            if (c.status in counts) counts[c.status as keyof typeof counts] += 1;
        }
        return counts;
    }, [complaints]);

    const byBuilding = useMemo<Bucket[]>(() => {
        const map = new Map<string, Bucket>();

        // Seed every known building so a building with no spend still appears
        // (a zero row is information, not an omission).
        for (const b of buildings) {
            map.set(b._id, {
                label: b.name,
                labor: 0,
                material: 0,
                other: 0,
                total: 0,
                count: 0,
            });
        }

        for (const c of complaints) {
            const key = buildingKey(c) ?? "unknown";
            if (!map.has(key)) {
                map.set(key, {
                    label: buildingLabel(c) ?? "Unassigned",
                    labor: 0,
                    material: 0,
                    other: 0,
                    total: 0,
                    count: 0,
                });
            }
            const bucket = map.get(key)!;
            bucket.count += 1;
            if (c.costDetails) {
                bucket.labor += c.costDetails.laborCost || 0;
                bucket.material += c.costDetails.materialCost || 0;
                bucket.other += c.costDetails.otherCost || 0;
                bucket.total =
                    bucket.labor + bucket.material + bucket.other;
            }
        }

        return [...map.values()].sort((a, b) => b.total - a.total);
    }, [complaints, buildings]);

    const monthlyTrend = useMemo<Bucket[]>(() => {
        const now = new Date();
        const buckets: Bucket[] = [];
        const index = new Map<string, Bucket>();

        // Build the window newest-last so the chart reads left-to-right.
        for (let i = months - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            const bucket: Bucket = {
                label: d.toLocaleString("en-IN", { month: "short", year: "2-digit" }),
                labor: 0,
                material: 0,
                other: 0,
                total: 0,
                count: 0,
            };
            buckets.push(bucket);
            index.set(key, bucket);
        }

        for (const c of complaints) {
            const created = new Date(c.createdAt);
            const bucket = index.get(`${created.getFullYear()}-${created.getMonth()}`);
            if (!bucket) continue;
            bucket.count += 1;
            if (c.costDetails) {
                bucket.labor += c.costDetails.laborCost || 0;
                bucket.material += c.costDetails.materialCost || 0;
                bucket.other += c.costDetails.otherCost || 0;
                bucket.total = bucket.labor + bucket.material + bucket.other;
            }
        }

        return buckets;
    }, [complaints, months]);

    const trendPeak = Math.max(...monthlyTrend.map((m) => m.total), 1);

    const share = (part: number) =>
        totals.total > 0 ? Math.round((part / totals.total) * 100) : 0;

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        >
            <Text style={styles.title}>Maintenance Cost Reports 📊</Text>
            <Text style={styles.subtitle}>
                {complaints.length} complaint{complaints.length === 1 ? "" : "s"} on record ·{" "}
                {totals.costed} with a recorded cost breakdown
            </Text>

            {/* Grand total */}
            <View style={styles.heroCard}>
                <Text style={styles.heroLabel}>Total Maintenance Expenditure</Text>
                <Text style={styles.heroValue}>{inr(totals.total)}</Text>
                <Text style={styles.heroMeta}>
                    Average {inr(totals.average)} per costed repair
                </Text>
            </View>

            {/* Cost composition */}
            <Text style={styles.sectionTitle}>Cost Composition</Text>
            <View style={styles.card}>
                {(
                    [
                        { label: "Labor", value: totals.labor, color: "#2563eb" },
                        { label: "Material", value: totals.material, color: "#16a34a" },
                        { label: "Other", value: totals.other, color: "#d97706" },
                    ] as const
                ).map((row) => (
                    <View key={row.label} style={styles.compositionRow}>
                        <View style={styles.compositionHeader}>
                            <Text style={styles.compositionLabel}>{row.label}</Text>
                            <Text style={styles.compositionValue}>
                                {inr(row.value)}{" "}
                                <Text style={styles.compositionPct}>({share(row.value)}%)</Text>
                            </Text>
                        </View>
                        <View style={styles.barTrack}>
                            <View
                                style={[
                                    styles.barFill,
                                    { width: `${share(row.value)}%`, backgroundColor: row.color },
                                ]}
                            />
                        </View>
                    </View>
                ))}
            </View>

            {/* Status split */}
            <Text style={styles.sectionTitle}>Complaint Status</Text>
            <View style={styles.statusGrid}>
                {(
                    [
                        { label: "Pending", value: statusCounts.pending, bg: "#fef3c7", fg: "#b45309" },
                        {
                            label: "In Progress",
                            value: statusCounts.in_progress,
                            bg: "#dbeafe",
                            fg: "#1d4ed8",
                        },
                        { label: "Resolved", value: statusCounts.resolved, bg: "#dcfce7", fg: "#166534" },
                        { label: "Rejected", value: statusCounts.rejected, bg: "#fee2e2", fg: "#b91c1c" },
                    ] as const
                ).map((s) => (
                    <View key={s.label} style={[styles.statusBox, { backgroundColor: s.bg }]}>
                        <Text style={[styles.statusNum, { color: s.fg }]}>{s.value}</Text>
                        <Text style={styles.statusLabel}>{s.label}</Text>
                    </View>
                ))}
            </View>

            {/* Building breakdown */}
            <Text style={styles.sectionTitle}>Spend by Building</Text>
            <View style={styles.card}>
                {byBuilding.length === 0 ? (
                    <Text style={styles.emptyHint}>No buildings configured yet.</Text>
                ) : (
                    byBuilding.map((b, i) => (
                        <View
                            key={`${b.label}-${i}`}
                            style={[styles.buildingRow, i === byBuilding.length - 1 && styles.lastRow]}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={styles.buildingName}>{b.label}</Text>
                                <Text style={styles.buildingMeta}>
                                    {b.count} complaint{b.count === 1 ? "" : "s"} · labor{" "}
                                    {inr(b.labor)} · material {inr(b.material)} · other {inr(b.other)}
                                </Text>
                            </View>
                            <Text style={styles.buildingTotal}>{inr(b.total)}</Text>
                        </View>
                    ))
                )}
            </View>

            {/* Monthly trend */}
            <View style={styles.trendHeader}>
                <Text style={styles.sectionTitle}>Monthly Trend</Text>
                <View style={styles.rangeRow}>
                    {[3, 6, 12].map((m) => (
                        <TouchableOpacity
                            key={m}
                            style={[styles.rangeChip, months === m && styles.activeRangeChip]}
                            onPress={() => setMonths(m)}
                        >
                            <Text
                                style={[
                                    styles.rangeText,
                                    months === m && styles.activeRangeText,
                                ]}
                            >
                                {m}m
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={[styles.card, { marginBottom: 40 }]}>
                <View style={styles.chartRow}>
                    {monthlyTrend.map((m, i) => (
                        <View key={`${m.label}-${i}`} style={styles.chartCol}>
                            <Text style={styles.chartValue}>
                                {m.total > 0 ? inr(m.total).replace("₹", "") : "—"}
                            </Text>
                            <View style={styles.chartBarTrack}>
                                <View
                                    style={[
                                        styles.chartBar,
                                        { height: `${(m.total / trendPeak) * 100}%` },
                                    ]}
                                />
                            </View>
                            <Text style={styles.chartLabel}>{m.label}</Text>
                            <Text style={styles.chartCount}>{m.count}</Text>
                        </View>
                    ))}
                </View>
                <Text style={styles.chartLegend}>
                    Bar height = cost recorded that month · bottom number = complaints raised
                </Text>
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
    title: {
        fontSize: 20,
        fontWeight: "800",
        color: "#0f172a",
    },
    subtitle: {
        fontSize: 13,
        color: "#64748b",
        marginTop: 2,
        marginBottom: 16,
    },
    heroCard: {
        backgroundColor: "#831843",
        borderRadius: 18,
        padding: 20,
        marginBottom: 20,
    },
    heroLabel: {
        fontSize: 13,
        color: "#fbcfe8",
        fontWeight: "600",
    },
    heroValue: {
        fontSize: 34,
        fontWeight: "800",
        color: "#ffffff",
        marginVertical: 4,
    },
    heroMeta: {
        fontSize: 12,
        color: "#fbcfe8",
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1e293b",
        marginBottom: 10,
    },
    card: {
        backgroundColor: "#ffffff",
        borderRadius: 14,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    compositionRow: {
        marginBottom: 14,
    },
    compositionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    compositionLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: "#475569",
    },
    compositionValue: {
        fontSize: 13,
        fontWeight: "800",
        color: "#0f172a",
    },
    compositionPct: {
        fontSize: 11,
        fontWeight: "600",
        color: "#94a3b8",
    },
    barTrack: {
        height: 8,
        backgroundColor: "#f1f5f9",
        borderRadius: 4,
        overflow: "hidden",
    },
    barFill: {
        height: "100%",
        borderRadius: 4,
    },
    statusGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        marginBottom: 20,
    },
    statusBox: {
        width: "48%",
        borderRadius: 12,
        padding: 14,
        alignItems: "center",
    },
    statusNum: {
        fontSize: 22,
        fontWeight: "800",
    },
    statusLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: "#374151",
        marginTop: 2,
    },
    buildingRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
    },
    lastRow: {
        borderBottomWidth: 0,
    },
    buildingName: {
        fontSize: 14,
        fontWeight: "700",
        color: "#0f172a",
    },
    buildingMeta: {
        fontSize: 11,
        color: "#64748b",
        marginTop: 2,
    },
    buildingTotal: {
        fontSize: 15,
        fontWeight: "800",
        color: "#be185d",
        marginLeft: 10,
    },
    emptyHint: {
        fontSize: 13,
        color: "#94a3b8",
        fontStyle: "italic",
    },
    trendHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    rangeRow: {
        flexDirection: "row",
        gap: 6,
        marginBottom: 10,
    },
    rangeChip: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 14,
        backgroundColor: "#ffffff",
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    activeRangeChip: {
        backgroundColor: "#be185d",
        borderColor: "#9d174d",
    },
    rangeText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#475569",
    },
    activeRangeText: {
        color: "#ffffff",
    },
    chartRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
        height: 170,
    },
    chartCol: {
        flex: 1,
        alignItems: "center",
    },
    chartValue: {
        fontSize: 9,
        color: "#64748b",
        marginBottom: 4,
    },
    chartBarTrack: {
        flex: 1,
        width: 18,
        backgroundColor: "#f1f5f9",
        borderRadius: 4,
        justifyContent: "flex-end",
        overflow: "hidden",
    },
    chartBar: {
        width: "100%",
        backgroundColor: "#be185d",
        borderRadius: 4,
        minHeight: 2,
    },
    chartLabel: {
        fontSize: 10,
        fontWeight: "600",
        color: "#475569",
        marginTop: 6,
    },
    chartCount: {
        fontSize: 10,
        color: "#94a3b8",
    },
    chartLegend: {
        fontSize: 11,
        color: "#94a3b8",
        textAlign: "center",
        marginTop: 12,
    },
});
