import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Complaint } from "@/lib/types";
import { categoryLabel, costLines } from "@/lib/workflow";
import { Colors, PriorityColors, Radius, Shadow, StatusColors, inr } from "@/constants/theme";
import { StatusBadge } from "./StatusBadge";
import { IconChip } from "./ui/IconChip";

interface ComplaintCardProps {
    complaint: Complaint;
    onPress?: () => void;
    showCost?: boolean;
    /** Show the estimated budget prominently (the Director's view). */
    showEstimate?: boolean;
    /** Manager/admin control bar docked to the bottom of the card. */
    footer?: React.ReactNode;
}

const LOCATION_ICONS: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
    classroom: "school-outline",
    washroom: "water-outline",
    lab: "flask-outline",
    office: "briefcase-outline",
    library: "library-outline",
    corridor: "walk-outline",
    other: "ellipsis-horizontal-circle-outline",
};

export const ComplaintCard: React.FC<ComplaintCardProps> = ({
    complaint,
    onPress,
    showCost = false,
    showEstimate = false,
    footer,
}) => {
    const buildingName =
        typeof complaint.buildingId === "object" ? complaint.buildingId.name : "Building";
    const floorName = typeof complaint.floorId === "object" ? complaint.floorId.name : "Floor";
    const roomInfo =
        typeof complaint.roomId === "object" && complaint.roomId
            ? complaint.roomId.roomNumber
            : null;
    const raisedByName =
        typeof complaint.raisedBy === "object" ? complaint.raisedBy.name : "Staff";

    const costDetails = complaint.costDetails;
    const hasCost = showCost && !!costDetails && costDetails.totalCost > 0;
    const estimate = complaint.estimatedBudget ?? 0;
    const category = categoryLabel(complaint);

    const accent = StatusColors[complaint.status]?.dot ?? Colors.primary;
    const priority = PriorityColors[complaint.priority] ?? PriorityColors.low;
    const locationIcon = LOCATION_ICONS[complaint.locationType] ?? "location-outline";

    const Wrapper: React.ComponentType<any> = onPress ? TouchableOpacity : View;

    return (
        <View style={styles.shadowWrap}>
            <View style={styles.card}>
                <View style={[styles.accentBar, { backgroundColor: accent }]} />

                <Wrapper
                    style={styles.inner}
                    onPress={onPress}
                    activeOpacity={onPress ? 0.85 : undefined}
                >
                    {/* Status + date */}
                    <View style={styles.topRow}>
                        <StatusBadge status={complaint.status} />
                        <Text style={styles.date}>
                            {new Date(complaint.createdAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                            })}
                        </Text>
                    </View>

                    <Text style={styles.title} numberOfLines={2}>
                        {complaint.title}
                    </Text>
                    {category && <Text style={styles.category}>{category}</Text>}
                    <Text style={styles.description} numberOfLines={2}>
                        {complaint.description}
                    </Text>

                    {/* Location row */}
                    <View style={styles.row}>
                        <IconChip name={locationIcon} color={Colors.primary} size={32} />
                        <View style={styles.rowText}>
                            <Text style={styles.rowPrimary} numberOfLines={1}>
                                {buildingName} › {floorName}
                                {roomInfo ? ` › ${roomInfo}` : ""}
                            </Text>
                            <Text style={styles.rowSecondary} numberOfLines={1}>
                                {roomInfo ? complaint.locationType : `${complaint.locationType} · general area`}
                            </Text>
                        </View>
                    </View>

                    {/* Reporter row */}
                    <View style={styles.row}>
                        <IconChip name="person-outline" color={Colors.primary} size={32} />
                        <View style={styles.rowText}>
                            <Text style={styles.rowPrimary} numberOfLines={1}>
                                {raisedByName}
                            </Text>
                            <Text style={styles.rowSecondary}>Reported by</Text>
                        </View>
                    </View>

                    {/* Evidence photos */}
                    {complaint.photos && complaint.photos.length > 0 && (
                        <View style={styles.photoRow}>
                            {complaint.photos.slice(0, 3).map((photoUrl, idx) => (
                                <Image
                                    key={idx}
                                    source={{ uri: photoUrl }}
                                    style={styles.thumbnail}
                                />
                            ))}
                            {complaint.photos.length > 3 && (
                                <View style={[styles.thumbnail, styles.morePhotos]}>
                                    <Text style={styles.moreText}>
                                        +{complaint.photos.length - 3}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Estimated budget — what the Director approves against */}
                    {showEstimate && estimate > 0 && (
                        <View style={styles.estimatePanel}>
                            <View style={styles.estimateText}>
                                <Text style={styles.estimateLabel}>Estimated budget</Text>
                                {complaint.estimateNotes ? (
                                    <Text style={styles.estimateNotes} numberOfLines={2}>
                                        {complaint.estimateNotes}
                                    </Text>
                                ) : null}
                            </View>
                            <Text style={styles.estimateValue}>{inr(estimate)}</Text>
                        </View>
                    )}

                    {/* Cost breakdown */}
                    {hasCost && (
                        <View style={styles.costPanel}>
                            <View style={styles.costLabelRow}>
                                <IconChip
                                    name="cash-outline"
                                    color={Colors.money}
                                    size={20}
                                />
                                <Text style={styles.costLabel}>Expenditure</Text>
                                <Text style={styles.costTotal}>{inr(costDetails!.totalCost)}</Text>
                            </View>

                            <View style={styles.costGrid}>
                                {costLines(costDetails!).map((line) => (
                                    <View key={line.label} style={styles.costCell}>
                                        <Text style={styles.costCellLabel} numberOfLines={1}>
                                            {line.label}
                                        </Text>
                                        <Text style={styles.costCellValue}>{inr(line.amount)}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Footer: priority */}
                    <View style={styles.footer}>
                        <View style={[styles.priorityPill, { backgroundColor: priority.bg }]}>
                            <Ionicons name="flag" size={10} color={priority.fg} />
                            <Text style={[styles.priorityText, { color: priority.fg }]}>
                                {complaint.priority} priority
                            </Text>
                        </View>

                        {onPress && (
                            <View style={styles.viewLink}>
                                <Text style={styles.viewLinkText}>Details</Text>
                                <Ionicons
                                    name="arrow-forward"
                                    size={13}
                                    color={Colors.primary}
                                />
                            </View>
                        )}
                    </View>
                </Wrapper>

                {footer}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    shadowWrap: {
        borderRadius: Radius.xxl,
        backgroundColor: Colors.surface,
        marginBottom: 14,
        ...Shadow.card,
    },
    card: {
        borderRadius: Radius.xxl,
        overflow: "hidden",
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.borderCard,
    },
    accentBar: {
        height: 4,
        width: "100%",
    },
    inner: {
        padding: 16,
    },
    topRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    date: {
        fontSize: 11,
        fontWeight: "600",
        color: Colors.textTertiary,
    },
    title: {
        fontSize: 16,
        fontWeight: "800",
        color: Colors.textPrimary,
        letterSpacing: -0.3,
        marginBottom: 3,
    },
    category: {
        fontSize: 11,
        fontWeight: "800",
        color: Colors.primary,
        textTransform: "uppercase",
        letterSpacing: 0.4,
        marginBottom: 4,
    },
    estimatePanel: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: Colors.primaryLight,
        borderWidth: 1,
        borderColor: Colors.primaryBorder,
        borderRadius: Radius.lg,
        padding: 14,
        marginBottom: 12,
    },
    estimateText: {
        flex: 1,
    },
    estimateLabel: {
        fontSize: 10.5,
        fontWeight: "700",
        color: Colors.primaryDark,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    estimateNotes: {
        fontSize: 12,
        color: Colors.textBody,
        marginTop: 3,
        lineHeight: 16,
    },
    estimateValue: {
        fontSize: 22,
        fontWeight: "800",
        color: Colors.primaryDark,
        letterSpacing: -0.6,
    },
    description: {
        fontSize: 13,
        color: Colors.textSecondary,
        lineHeight: 18,
        marginBottom: 14,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 12,
    },
    rowText: {
        flex: 1,
    },
    rowPrimary: {
        fontSize: 13.5,
        fontWeight: "700",
        color: Colors.textPrimary,
        letterSpacing: -0.2,
    },
    rowSecondary: {
        fontSize: 11.5,
        color: Colors.textTertiary,
        fontWeight: "500",
        marginTop: 1,
        textTransform: "capitalize",
    },
    photoRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 12,
    },
    thumbnail: {
        width: 58,
        height: 58,
        borderRadius: Radius.md,
        backgroundColor: Colors.borderLight,
    },
    morePhotos: {
        alignItems: "center",
        justifyContent: "center",
    },
    moreText: {
        fontSize: 13,
        fontWeight: "800",
        color: Colors.textSecondary,
    },
    costPanel: {
        backgroundColor: Colors.successLight,
        borderWidth: 1,
        borderColor: Colors.successBorder,
        borderRadius: Radius.lg,
        padding: 12,
        marginBottom: 12,
    },
    costLabelRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        marginBottom: 10,
    },
    costLabel: {
        flex: 1,
        fontSize: 10.5,
        fontWeight: "700",
        color: Colors.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    costTotal: {
        fontSize: 15,
        fontWeight: "800",
        color: Colors.successDark,
        letterSpacing: -0.3,
    },
    costGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        rowGap: 8,
    },
    costCell: {
        width: "33.33%",
        paddingRight: 6,
    },
    costCellLabel: {
        fontSize: 10,
        fontWeight: "600",
        color: Colors.textTertiary,
        textTransform: "uppercase",
        letterSpacing: 0.3,
    },
    costCellValue: {
        fontSize: 12.5,
        fontWeight: "700",
        color: Colors.textBody,
        marginTop: 1,
    },
    footer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
        paddingTop: 12,
    },
    priorityPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: Radius.full,
    },
    priorityText: {
        fontSize: 10,
        fontWeight: "800",
        textTransform: "uppercase",
        letterSpacing: 0.3,
    },
    viewLink: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    viewLinkText: {
        fontSize: 12,
        fontWeight: "700",
        color: Colors.primary,
    },
});
