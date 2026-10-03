import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiRequest } from "@/lib/api";
import {
    Building,
    BuildingsResponse,
    Complaint,
    ComplaintsResponse,
} from "@/lib/types";
import { Colors, Radius, Shadow, inr } from "@/constants/theme";
import {
    ChipGroup,
    Credit,
    ProgressBar,
    Screen,
    SectionTitle,
    StatCard,
} from "@/components/ui";

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

const RANGE_OPTIONS = [
    { key: "3", label: "3 months" },
    { key: "6", label: "6 months" },
    { key: "12", label: "12 months" },
];

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
        // The finer workflow stages fold into four tiles: not started yet
        // (including waiting on the Director), being worked on, resolved, held.
        const counts = { pending: 0, on_hold: 0, in_progress: 0, resolved: 0 };
        for (const c of complaints) {
            if (c.status === "pending" || c.status === "awaiting_approval" || c.status === "approved") {
                counts.pending += 1;
            } else if (c.status === "in_progress" || c.status === "work_done") {
                counts.in_progress += 1;
            } else if (c.status === "resolved") {
                counts.resolved += 1;
            } else if (c.status === "on_hold") {
                counts.on_hold += 1;
            }
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
                bucket.total = bucket.labor + bucket.material + bucket.other;
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
                label: d.toLocaleString("en-IN", { month: "short" }),
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
    const buildingPeak = Math.max(...byBuilding.map((b) => b.total), 1);

    const share = (part: number) => (totals.total > 0 ? (part / totals.total) * 100 : 0);

    const composition = [
        { label: "Labor", value: totals.labor, color: Colors.primary },
        { label: "Material", value: totals.material, color: Colors.success },
        { label: "Other", value: totals.other, color: Colors.warning },
    ];

    return (
        <Screen scroll refreshing={refreshing} onRefresh={load}>
            {/* Hero */}
            <View style={styles.heroCard}>
                <View style={styles.heroTop}>
                    <View style={styles.heroIcon}>
                        <Ionicons name="analytics-outline" size={18} color="#FFFFFF" />
                    </View>
                    <Text style={styles.heroLabel}>Total maintenance expenditure</Text>
                </View>
                <Text style={styles.heroValue}>{inr(totals.total)}</Text>
                <Text style={styles.heroMeta}>
                    {complaints.length} complaint{complaints.length === 1 ? "" : "s"} on record ·{" "}
                    {totals.costed} costed · {inr(totals.average)} average
                </Text>
            </View>

            {/* Composition */}
            <SectionTitle title="Cost composition" />
            <View style={styles.card}>
                {composition.map((row, i) => (
                    <View
                        key={row.label}
                        style={[
                            styles.compositionRow,
                            i === composition.length - 1 && styles.lastRow,
                        ]}
                    >
                        <View style={styles.compositionHeader}>
                            <View style={styles.legendWrap}>
                                <View style={[styles.legendDot, { backgroundColor: row.color }]} />
                                <Text style={styles.compositionLabel}>{row.label}</Text>
                            </View>
                            <Text style={styles.compositionValue}>
                                {inr(row.value)}{" "}
                                <Text style={styles.compositionPct}>
                                    ({Math.round(share(row.value))}%)
                                </Text>
                            </Text>
                        </View>
                        <ProgressBar percent={share(row.value)} color={row.color} />
                    </View>
                ))}
            </View>

            {/* Status */}
            <SectionTitle title="Complaint status" />
            <View style={styles.statusGrid}>
                <StatCard
                    icon="time-outline"
                    color={Colors.warning}
                    value={statusCounts.pending}
                    label="Not started"
                    style={styles.statusCard}
                />
                <StatCard
                    icon="construct-outline"
                    color={Colors.primary}
                    value={statusCounts.in_progress}
                    label="In progress"
                    style={styles.statusCard}
                />
                <StatCard
                    icon="checkmark-done-outline"
                    color={Colors.success}
                    value={statusCounts.resolved}
                    label="Resolved"
                    style={styles.statusCard}
                />
                <StatCard
                    icon="pause-circle-outline"
                    color={Colors.textSecondary}
                    value={statusCounts.on_hold}
                    label="On hold"
                    style={styles.statusCard}
                />
            </View>

            {/* Spend by building */}
            <SectionTitle title="Spend by building" />
            <View style={styles.card}>
                {byBuilding.length === 0 ? (
                    <Text style={styles.emptyHint}>No buildings configured yet.</Text>
                ) : (
                    byBuilding.map((b, i) => (
                        <View
                            key={`${b.label}-${i}`}
                            style={[
                                styles.buildingRow,
                                i === byBuilding.length - 1 && styles.lastRow,
                            ]}
                        >
                            <View style={styles.buildingHeader}>
                                <View style={styles.buildingNameWrap}>
                                    <Ionicons
                                        name="business-outline"
                                        size={14}
                                        color={Colors.primary}
                                    />
                                    <Text style={styles.buildingName} numberOfLines={1}>
                                        {b.label}
                                    </Text>
                                </View>
                                <Text style={styles.buildingTotal}>{inr(b.total)}</Text>
                            </View>

                            <ProgressBar
                                percent={(b.total / buildingPeak) * 100}
                                color={Colors.primary}
                                height={6}
                            />

                            <Text style={styles.buildingMeta}>
                                {b.count} complaint{b.count === 1 ? "" : "s"} · labor {inr(b.labor)}{" "}
                                · material {inr(b.material)} · other {inr(b.other)}
                            </Text>
                        </View>
                    ))
                )}
            </View>

            {/* Monthly trend */}
            <SectionTitle title="Monthly trend" />
            <View style={styles.rangeRow}>
                <ChipGroup
                    options={RANGE_OPTIONS}
                    value={String(months)}
                    onChange={(k) => setMonths(Number(k))}
                    fill
                />
            </View>

            <View style={styles.card}>
                <View style={styles.chartRow}>
                    {monthlyTrend.map((m, i) => (
                        <View key={`${m.label}-${i}`} style={styles.chartCol}>
                            <Text style={styles.chartValue} numberOfLines={1}>
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

            <Credit />
        </Screen>
    );
}

const styles = StyleSheet.create({
    heroCard: {
        backgroundColor: Colors.primaryDark,
        borderRadius: Radius.xxl,
        padding: 20,
        marginBottom: 22,
        ...Shadow.lg,
    },
    heroTop: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    heroIcon: {
        width: 34,
        height: 34,
        borderRadius: Radius.md,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center",
        justifyContent: "center",
    },
    heroLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: "#C5DDF4",
        textTransform: "uppercase",
        letterSpacing: 0.6,
        flexShrink: 1,
    },
    heroValue: {
        fontSize: 34,
        fontWeight: "800",
        color: "#FFFFFF",
        letterSpacing: -1.2,
        marginTop: 12,
    },
    heroMeta: {
        fontSize: 12,
        color: "#C5DDF4",
        marginTop: 4,
        lineHeight: 17,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.xl,
        padding: 16,
        marginBottom: 22,
        borderWidth: 1,
        borderColor: Colors.borderCard,
        ...Shadow.sm,
    },
    compositionRow: {
        marginBottom: 16,
    },
    lastRow: {
        marginBottom: 0,
    },
    compositionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    legendWrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    compositionLabel: {
        fontSize: 12.5,
        fontWeight: "700",
        color: Colors.textBody,
    },
    compositionValue: {
        fontSize: 13,
        fontWeight: "800",
        color: Colors.textPrimary,
    },
    compositionPct: {
        fontSize: 11,
        fontWeight: "600",
        color: Colors.textTertiary,
    },
    statusGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        marginBottom: 22,
    },
    statusCard: {
        width: "47.5%",
        flexGrow: 1,
    },
    buildingRow: {
        marginBottom: 18,
    },
    buildingHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        marginBottom: 8,
    },
    buildingNameWrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        flexShrink: 1,
    },
    buildingName: {
        fontSize: 13.5,
        fontWeight: "700",
        color: Colors.textPrimary,
        letterSpacing: -0.2,
        flexShrink: 1,
    },
    buildingTotal: {
        fontSize: 14,
        fontWeight: "800",
        color: Colors.primaryDark,
        letterSpacing: -0.3,
    },
    buildingMeta: {
        fontSize: 10.5,
        color: Colors.textTertiary,
        marginTop: 7,
        lineHeight: 15,
    },
    emptyHint: {
        fontSize: 12.5,
        color: Colors.textTertiary,
        fontStyle: "italic",
    },
    rangeRow: {
        marginBottom: 14,
    },
    chartRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        height: 170,
        gap: 4,
    },
    chartCol: {
        flex: 1,
        alignItems: "center",
        height: "100%",
    },
    chartValue: {
        fontSize: 8.5,
        color: Colors.textTertiary,
        fontWeight: "600",
        marginBottom: 4,
    },
    chartBarTrack: {
        flex: 1,
        width: 20,
        backgroundColor: Colors.borderLight,
        borderRadius: Radius.sm,
        justifyContent: "flex-end",
        overflow: "hidden",
    },
    chartBar: {
        width: "100%",
        backgroundColor: Colors.primary,
        borderRadius: Radius.sm,
        minHeight: 3,
    },
    chartLabel: {
        fontSize: 10,
        fontWeight: "700",
        color: Colors.textSecondary,
        marginTop: 7,
    },
    chartCount: {
        fontSize: 9.5,
        color: Colors.textTertiary,
        fontWeight: "600",
    },
    chartLegend: {
        fontSize: 10.5,
        color: Colors.textTertiary,
        textAlign: "center",
        marginTop: 14,
        lineHeight: 15,
    },
});
