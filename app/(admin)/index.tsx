import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { apiRequest } from "@/lib/api";
import { BuildingsResponse, Complaint, ComplaintsResponse } from "@/lib/types";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { Screen, SectionTitle, StatCard } from "@/components/ui";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

/** Shortcuts to the sections the admin actually works in, in order of use. */
const SHORTCUTS: { icon: IoniconName; title: string; subtitle: string; href: Href }[] = [
    {
        icon: "pie-chart",
        title: "Spending reports",
        subtitle: "Labor, material and other repair costs",
        href: "/(admin)/reports",
    },
    {
        icon: "cash",
        title: "All complaints",
        subtitle: "Every issue on record with its cost",
        href: "/(admin)/complaints",
    },
    {
        icon: "business",
        title: "Buildings & rooms",
        subtitle: "Manage the campus structure",
        href: "/(admin)/buildings",
    },
    {
        icon: "people",
        title: "People",
        subtitle: "Staff, managers and access",
        href: "/(admin)/users",
    },
];

export default function AdminDashboard() {
    const router = useRouter();

    const [stats, setStats] = useState({
        totalComplaints: 0,
        pending: 0,
        in_progress: 0,
        resolved: 0,
        totalBuildings: 0,
    });
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadAdminData();
    }, []);

    const loadAdminData = async () => {
        setRefreshing(true);
        try {
            const data = await apiRequest<ComplaintsResponse>("/complaints");
            const complaints: Complaint[] = data.complaints || [];

            const pending = complaints.filter((c) => c.status === "pending").length;
            const in_progress = complaints.filter((c) => c.status === "in_progress").length;
            const resolved = complaints.filter((c) => c.status === "resolved").length;

            const bData = await apiRequest<BuildingsResponse>("/buildings");
            const totalBuildings = (bData.buildings || []).length;

            setStats({
                totalComplaints: complaints.length,
                pending,
                in_progress,
                resolved,
                totalBuildings,
            });
        } catch (e) {
            console.error("Admin dashboard error", e);
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <Screen scroll refreshing={refreshing} onRefresh={loadAdminData}>
            {/* Infrastructure. Spend now lives entirely in the Reports tab, so
                this screen stays a plain count of what is on campus. */}
            <SectionTitle title="Campus overview" />
            <View style={styles.statsGrid}>
                <StatCard
                    icon="document-text-outline"
                    color={Colors.primary}
                    value={stats.totalComplaints}
                    label="Total complaints"
                    style={styles.statCard}
                />
                <StatCard
                    icon="business-outline"
                    color={Colors.primary}
                    value={stats.totalBuildings}
                    label="Active buildings"
                    style={styles.statCard}
                />
                <StatCard
                    icon="time-outline"
                    color={Colors.warning}
                    value={stats.pending}
                    label="Pending issues"
                    style={styles.statCard}
                />
                <StatCard
                    icon="construct-outline"
                    color={Colors.textSecondary}
                    value={stats.in_progress}
                    label="In progress"
                    style={styles.statCard}
                />
                <StatCard
                    icon="checkmark-done-outline"
                    color={Colors.success}
                    value={stats.resolved}
                    label="Resolved"
                    style={styles.statCard}
                />
            </View>

            <SectionTitle title="Manage" style={styles.manageTitle} />
            <View style={styles.shortcutCard}>
                {SHORTCUTS.map((item, i) => (
                    <TouchableOpacity
                        key={item.title}
                        style={[styles.shortcutRow, i > 0 && styles.shortcutDivided]}
                        onPress={() => router.push(item.href)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.shortcutIcon}>
                            <Ionicons name={item.icon} size={17} color={Colors.primary} />
                        </View>
                        <View style={styles.shortcutText}>
                            <Text style={styles.shortcutTitle}>{item.title}</Text>
                            <Text style={styles.shortcutSubtitle} numberOfLines={1}>
                                {item.subtitle}
                            </Text>
                        </View>
                        <Ionicons
                            name="chevron-forward"
                            size={16}
                            color={Colors.textTertiary}
                        />
                    </TouchableOpacity>
                ))}
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    statCard: {
        width: "47.5%",
        flexGrow: 1,
    },
    manageTitle: {
        marginTop: 24,
    },
    shortcutCard: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.xl,
        borderWidth: 1,
        borderColor: Colors.borderCard,
        paddingHorizontal: 16,
        ...Shadow.sm,
    },
    shortcutRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 14,
    },
    shortcutDivided: {
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
    },
    shortcutIcon: {
        width: 34,
        height: 34,
        borderRadius: Radius.md,
        backgroundColor: Colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
    },
    shortcutText: {
        flex: 1,
    },
    shortcutTitle: {
        fontSize: 13.5,
        fontWeight: "700",
        color: Colors.textPrimary,
        letterSpacing: -0.2,
    },
    shortcutSubtitle: {
        fontSize: 11.5,
        color: Colors.textSecondary,
        marginTop: 2,
    },
});
