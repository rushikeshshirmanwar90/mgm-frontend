import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Complaint } from "@/lib/types";
import { Colors, Radius, StatusColors } from "@/constants/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

/**
 * The gray page this ticket is meant to sit on. Exported so the screen that
 * hosts it can paint the same color behind it — the perforation notches are
 * this exact color, so the "bite cut out of the card" illusion only reads as
 * a cutout when the page behind the card actually is this shade (it's all
 * but invisible against `Colors.background`, which is nearly white).
 */
export const TICKET_PAGE_BG = "#E5E7EB";

const LOCATION_ICONS: Record<string, IoniconName> = {
    classroom: "school-outline",
    washroom: "water-outline",
    lab: "flask-outline",
    office: "briefcase-outline",
    library: "library-outline",
    other: "cube-outline",
};

interface ComplaintTicketProps {
    complaint: Complaint;
    buildingName: string;
    buildingCode?: string | null;
    floorName: string;
    roomNumber?: string;
    roomName?: string;
    reporterName?: string;
    reporterSub?: string;
    assigneeName?: string;
    photoCount: number;
    onPressPhotos?: () => void;
    progressVisible?: boolean;
    onPressProgress?: () => void;
}

/**
 * A ticket/boarding-pass styled summary: a full-width photo banner up top
 * (so the title and facts below always get the full card width to lay out
 * in, rather than being squeezed beside a thumbnail), a perforated seam that
 * scrolls down to the status & progress section below (rather than growing
 * the card itself), what was reported, and a boarding-pass-style facts row
 * (building / floor / room).
 */
export const ComplaintTicket: React.FC<ComplaintTicketProps> = ({
    complaint,
    buildingName,
    buildingCode,
    floorName,
    roomNumber,
    roomName,
    reporterName,
    reporterSub,
    assigneeName,
    photoCount,
    onPressPhotos,
    progressVisible,
    onPressProgress,
}) => {
    const locationIcon = LOCATION_ICONS[complaint.locationType] ?? "location-outline";
    const thumbnail = complaint.photos?.[0];
    const status = StatusColors[complaint.status];

    const created = new Date(complaint.createdAt);
    const dateLabel = created.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
    });
    const timeLabel = created.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
    });

    const locationLabel =
        complaint.locationType.charAt(0).toUpperCase() + complaint.locationType.slice(1);
    const reference = complaint._id.slice(-6).toUpperCase();

    return (
        <View style={styles.wrap}>
            <View style={styles.card}>
                {/* Banner: full-width photo, tap to browse all of them */}
                <TouchableOpacity
                    activeOpacity={thumbnail ? 0.9 : 1}
                    onPress={thumbnail ? onPressPhotos : undefined}
                    style={styles.bannerWrap}
                >
                    {thumbnail ? (
                        <Image source={{ uri: thumbnail }} style={styles.banner} />
                    ) : (
                        <View style={[styles.banner, styles.bannerPlaceholder]}>
                            <Ionicons name={locationIcon} size={34} color={Colors.primary} />
                        </View>
                    )}
                    {photoCount > 0 && (
                        <View style={styles.bannerPill}>
                            <Ionicons name="images" size={11} color="#FFFFFF" />
                            <Text style={styles.bannerPillText}>
                                {photoCount > 1 ? `${photoCount} photos` : "1 photo"}
                            </Text>
                        </View>
                    )}
                    {status && (
                        <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                            <View style={[styles.statusDot, { backgroundColor: status.dot }]} />
                            <Text style={[styles.statusPillText, { color: status.fg }]}>
                                {status.label}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Title + meta — full card width, nothing squeezed beside it */}
                <View style={styles.headBlock}>
                    <Text style={styles.title}>{complaint.title}</Text>
                    <Text style={styles.metaLine}>
                        {locationLabel} · {complaint.priority} priority · {dateLabel} at{" "}
                        {timeLabel}
                    </Text>
                </View>

                {/* Perforated seam — toggles the Status & progress card below */}
                <View style={styles.seam}>
                    <View style={styles.notch} />
                    <View style={styles.dashLine} />
                    <View style={[styles.notch, styles.notchRight]} />
                </View>
                <TouchableOpacity
                    style={styles.seamBarWrap}
                    onPress={onPressProgress}
                    activeOpacity={0.75}
                >
                    <View style={styles.seamBar}>
                        <Text style={styles.seamBarText}>
                            {progressVisible
                                ? "Hide status & progress"
                                : "Tap to see status & progress"}
                        </Text>
                        <Ionicons
                            name={progressVisible ? "chevron-up" : "chevron-down"}
                            size={14}
                            color={Colors.primaryDark}
                        />
                    </View>
                </TouchableOpacity>

                {/* What was reported */}
                <View style={styles.reportedBlock}>
                    <Text style={styles.reportedLabel}>What was reported</Text>
                    <Text style={styles.reportedText}>{complaint.description}</Text>
                </View>

                {/* Boarding-pass style facts strip */}
                <View style={styles.factsRow}>
                    <View style={styles.factsCol}>
                        <Text style={styles.factsLabel}>Building</Text>
                        <Text style={styles.factsValue} numberOfLines={1}>
                            {buildingCode || buildingName}
                        </Text>
                    </View>
                    <View style={styles.factsDivider} />
                    <View style={styles.factsCol}>
                        <Text style={styles.factsLabel}>Floor</Text>
                        <Text style={styles.factsValue} numberOfLines={1}>
                            {floorName}
                        </Text>
                    </View>
                    <View style={styles.factsDivider} />
                    <View style={styles.factsCol}>
                        <Text style={styles.factsLabel}>Room</Text>
                        <Text style={styles.factsValue} numberOfLines={1}>
                            {roomNumber || roomName || "Whole floor"}
                        </Text>
                    </View>
                </View>
                <Text style={styles.factsRef}>REFERENCE #{reference}</Text>

                {/* Reporter / assignee strip */}
                {reporterName && (
                    <View style={styles.reporterStrip}>
                        <Text style={styles.reporterText} numberOfLines={1}>
                            Reported by {reporterName}
                            {reporterSub ? ` · ${reporterSub}` : ""}
                        </Text>
                    </View>
                )}
                {assigneeName && (
                    <View style={[styles.reporterStrip, styles.assigneeStrip]}>
                        <Text style={styles.reporterText} numberOfLines={1}>
                            Handled by {assigneeName}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
};

const NOTCH_SIZE = 18;

const styles = StyleSheet.create({
    wrap: {
        // Extra inset beyond the screen's own padding, so the card reads as
        // a centred ticket floating on the page rather than a full-width
        // panel flush with the screen edges.
        marginHorizontal: 10,
        marginBottom: 22,
    },
    card: {
        // Deliberately no shadow or border here: either one silhouettes the
        // card's true rectangular bounds, which shows right through the
        // notches below and gives away that they're not a real die-cut —
        // just the plain white-on-gray contrast has to do the work instead.
        backgroundColor: Colors.surface,
        borderRadius: Radius.xl,
        overflow: "hidden",
    },
    bannerWrap: {
        position: "relative",
    },
    banner: {
        width: "100%",
        height: 150,
        backgroundColor: Colors.borderLight,
    },
    bannerPlaceholder: {
        alignItems: "center",
        justifyContent: "center",
    },
    bannerPill: {
        position: "absolute",
        left: 12,
        bottom: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: "rgba(15,23,42,0.65)",
        borderRadius: Radius.full,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    bannerPillText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    statusPill: {
        position: "absolute",
        right: 12,
        top: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: Radius.full,
    },
    statusDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
    },
    statusPillText: {
        fontSize: 10,
        fontWeight: "800",
        textTransform: "uppercase",
        letterSpacing: 0.3,
    },
    headBlock: {
        padding: 16,
        paddingBottom: 4,
    },
    title: {
        fontSize: 17,
        fontWeight: "800",
        color: Colors.textPrimary,
        letterSpacing: -0.3,
        lineHeight: 22,
    },
    metaLine: {
        fontSize: 12.5,
        color: Colors.textSecondary,
        marginTop: 6,
        fontWeight: "600",
        lineHeight: 18,
        textTransform: "capitalize",
    },
    seam: {
        height: NOTCH_SIZE,
        justifyContent: "center",
        marginTop: 10,
    },
    notch: {
        position: "absolute",
        left: -NOTCH_SIZE / 2,
        top: 0,
        width: NOTCH_SIZE,
        height: NOTCH_SIZE,
        borderRadius: NOTCH_SIZE / 2,
        backgroundColor: TICKET_PAGE_BG,
    },
    notchRight: {
        left: undefined,
        right: -NOTCH_SIZE / 2,
    },
    dashLine: {
        marginHorizontal: NOTCH_SIZE,
        borderTopWidth: 1.5,
        borderStyle: "dashed",
        borderColor: Colors.border,
    },
    seamBarWrap: {
        paddingHorizontal: 16,
        marginTop: 14,
        marginBottom: 16,
    },
    seamBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 11,
        borderRadius: Radius.full,
        backgroundColor: Colors.primaryLight,
    },
    seamBarText: {
        fontSize: 12.5,
        fontWeight: "700",
        color: Colors.primaryDark,
    },
    reportedBlock: {
        paddingHorizontal: 16,
        marginBottom: 18,
    },
    reportedLabel: {
        fontSize: 10,
        fontWeight: "700",
        color: Colors.textTertiary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    reportedText: {
        fontSize: 13.5,
        color: Colors.textBody,
        lineHeight: 20,
    },
    factsRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        paddingHorizontal: 16,
        gap: 10,
    },
    factsCol: {
        flex: 1,
        minWidth: 0,
    },
    factsDivider: {
        width: 1,
        alignSelf: "stretch",
        backgroundColor: Colors.borderLight,
    },
    factsLabel: {
        fontSize: 9.5,
        fontWeight: "700",
        color: Colors.textTertiary,
        textTransform: "uppercase",
        letterSpacing: 0.4,
        marginBottom: 3,
    },
    factsValue: {
        fontSize: 13,
        fontWeight: "800",
        color: Colors.textPrimary,
    },
    factsRef: {
        fontSize: 10,
        fontWeight: "700",
        color: Colors.textTertiary,
        letterSpacing: 0.3,
        paddingHorizontal: 16,
        marginTop: 10,
        marginBottom: 16,
    },
    reporterStrip: {
        backgroundColor: Colors.borderLight,
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    reporterText: {
        fontSize: 11.5,
        color: Colors.textSecondary,
        fontWeight: "600",
    },
    assigneeStrip: {
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
});
