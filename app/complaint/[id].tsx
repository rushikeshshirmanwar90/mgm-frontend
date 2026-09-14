import React, { useCallback, useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    ActivityIndicator,
    TouchableOpacity,
    Modal,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiRequest } from "@/lib/api";
import { Complaint, ComplaintResponse } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { CostModal } from "@/components/CostModal";
import { StatusBadge } from "@/components/StatusBadge";
import { Colors, PriorityColors, Radius, Shadow, inr } from "@/constants/theme";
import {
    Banner,
    Button,
    EmptyState,
    IconChip,
    Screen,
    SectionTitle,
    StatusTimeline,
    TextField,
} from "@/components/ui";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const PRIORITY_EXPLAINER: Record<string, string> = {
    low: "Cosmetic or non-urgent — fixed as capacity allows.",
    medium: "Normal maintenance priority.",
    high: "Disrupts teaching or daily use — handled ahead of routine work.",
    critical: "Safety risk or major outage — needs immediate attention.",
};

export default function ComplaintDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const router = useRouter();
    // This screen is a stack route with no tab bar beneath it, so nothing else
    // reserves space above the system navigation area.
    const insets = useSafeAreaInsets();

    const [complaint, setComplaint] = useState<Complaint | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [costModalOpen, setCostModalOpen] = useState(false);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState("");

    const canManage = user?.role === "manager" || user?.role === "admin";

    const load = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const data = await apiRequest<ComplaintResponse>(`/complaints/${id}`);
            setComplaint(data.complaint);
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not load this complaint.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        load();
    }, [load]);

    const updateStatus = async (status: string, reason?: string) => {
        if (!complaint) return;
        setBusy(true);
        try {
            const res = await apiRequest<ComplaintResponse>(`/complaints/${complaint._id}`, {
                method: "PUT",
                body: JSON.stringify(
                    reason ? { status, rejectionReason: reason } : { status }
                ),
            });
            setComplaint(res.complaint);
            setRejectOpen(false);
            setRejectReason("");
        } catch (e) {
            Alert.alert("Error", e instanceof Error ? e.message : "Could not update status");
        } finally {
            setBusy(false);
        }
    };

    const handleReject = () => {
        // The backend rejects the request without a reason, so enforce it here
        // too rather than letting the user hit a server error.
        if (!rejectReason.trim()) {
            Alert.alert("Reason required", "Please explain why no repair is needed.");
            return;
        }
        updateStatus("rejected", rejectReason.trim());
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (error || !complaint) {
        return (
            <Screen>
                <EmptyState
                    icon="alert-circle-outline"
                    title="Complaint unavailable"
                    message={error ?? "This complaint could not be found."}
                    color={Colors.error}
                    action={<Button label="Go back" icon="arrow-back" onPress={() => router.back()} />}
                />
            </Screen>
        );
    }

    const buildingName =
        typeof complaint.buildingId === "object" ? complaint.buildingId.name : "Building";
    const buildingCode =
        typeof complaint.buildingId === "object" ? complaint.buildingId.code : null;
    const floorName = typeof complaint.floorId === "object" ? complaint.floorId.name : "Floor";
    const room =
        typeof complaint.roomId === "object" && complaint.roomId ? complaint.roomId : null;
    const reporter = typeof complaint.raisedBy === "object" ? complaint.raisedBy : null;
    const assignee =
        typeof complaint.assignedTo === "object" && complaint.assignedTo
            ? complaint.assignedTo
            : null;

    const priority = PriorityColors[complaint.priority] ?? PriorityColors.low;
    const cost = complaint.costDetails;
    const photos = complaint.photos ?? [];
    const isClosed = complaint.status === "resolved" || complaint.status === "rejected";

    return (
        <>
            <Screen
                scroll
                refreshing={loading}
                onRefresh={load}
                contentStyle={{ padding: 16, paddingBottom: 32 + insets.bottom }}
            >
                {/* Headline */}
                <View style={styles.headline}>
                    <View style={styles.headlineTop}>
                        <StatusBadge status={complaint.status} />
                        <View style={[styles.priorityPill, { backgroundColor: priority.bg }]}>
                            <Ionicons name="flag" size={10} color={priority.fg} />
                            <Text style={[styles.priorityText, { color: priority.fg }]}>
                                {complaint.priority}
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.title}>{complaint.title}</Text>
                    <Text style={styles.priorityHint}>
                        {PRIORITY_EXPLAINER[complaint.priority] ?? ""}
                    </Text>
                </View>

                {/* Progress — the "where is this up to?" answer */}
                <SectionTitle title="Progress" />
                <View style={styles.card}>
                    <StatusTimeline
                        status={complaint.status}
                        createdAt={complaint.createdAt}
                        resolvedAt={complaint.resolvedAt}
                        updatedAt={complaint.updatedAt}
                        rejectionReason={complaint.rejectionReason}
                    />
                </View>

                {/* What was reported */}
                <SectionTitle title="What was reported" />
                <View style={styles.card}>
                    <Text style={styles.description}>{complaint.description}</Text>
                </View>

                {/* Photos */}
                {photos.length > 0 && (
                    <>
                        <SectionTitle
                            title={`Photos · ${photos.length}`}
                            action={<Text style={styles.hintText}>Tap to enlarge</Text>}
                        />
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.photoRow}
                        >
                            {photos.map((uri, i) => (
                                <TouchableOpacity
                                    key={i}
                                    activeOpacity={0.85}
                                    onPress={() => setLightboxIndex(i)}
                                >
                                    <Image source={{ uri }} style={styles.photo} />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </>
                )}

                {/* Where + who */}
                <SectionTitle title="Details" />
                <View style={styles.card}>
                    <DetailRow
                        icon="location-outline"
                        label="Location"
                        value={`${buildingName}${buildingCode ? ` (${buildingCode})` : ""}`}
                        sub={`${floorName}${room ? ` · ${room.roomNumber}` : ""}${
                            room?.name ? ` — ${room.name}` : ""
                        }`}
                    />
                    <DetailRow
                        icon="cube-outline"
                        label="Area type"
                        value={complaint.locationType}
                        capitalize
                    />
                    {reporter && (
                        <DetailRow
                            icon="person-outline"
                            label="Reported by"
                            value={reporter.name}
                            sub={
                                [reporter.department, reporter.email]
                                    .filter(Boolean)
                                    .join(" · ") || undefined
                            }
                        />
                    )}
                    {assignee && (
                        <DetailRow
                            icon="construct-outline"
                            label="Handled by"
                            value={assignee.name}
                        />
                    )}
                    <DetailRow
                        icon="calendar-outline"
                        label="Reference"
                        value={`#${complaint._id.slice(-6).toUpperCase()}`}
                        sub="Quote this when following up in person"
                        last
                    />
                </View>

                {/* Cost — the server omits this entirely for staff */}
                {cost && cost.totalCost > 0 && (
                    <>
                        <SectionTitle title="Repair cost" />
                        <View style={styles.card}>
                            <View style={styles.costTotalRow}>
                                <IconChip name="cash-outline" color={Colors.money} size={34} />
                                <View style={styles.costTotalText}>
                                    <Text style={styles.costTotalLabel}>Total spent</Text>
                                    <Text style={styles.costTotalValue}>{inr(cost.totalCost)}</Text>
                                </View>
                            </View>

                            <View style={styles.costGrid}>
                                {(
                                    [
                                        ["Labor", cost.laborCost],
                                        ["Material", cost.materialCost],
                                        ["Other", cost.otherCost],
                                    ] as const
                                ).map(([label, value]) => (
                                    <View key={label} style={styles.costCell}>
                                        <Text style={styles.costCellLabel}>{label}</Text>
                                        <Text style={styles.costCellValue}>{inr(value || 0)}</Text>
                                    </View>
                                ))}
                            </View>

                            {cost.notes ? (
                                <View style={styles.costNotes}>
                                    <Text style={styles.costNotesLabel}>Notes</Text>
                                    <Text style={styles.costNotesText}>{cost.notes}</Text>
                                </View>
                            ) : null}
                        </View>
                    </>
                )}

                {/* Manager / admin controls */}
                {canManage && (
                    <>
                        <SectionTitle title="Manage this complaint" />
                        <View style={styles.card}>
                            {isClosed ? (
                                <Banner
                                    tone={complaint.status === "resolved" ? "success" : "info"}
                                    title={
                                        complaint.status === "resolved"
                                            ? "This complaint is resolved"
                                            : "This complaint is closed"
                                    }
                                    message="Reopen it if the issue turns out to be unfinished."
                                    style={styles.flushBanner}
                                />
                            ) : (
                                <Text style={styles.manageHint}>
                                    The reporter is notified by email and in-app whenever you
                                    change the status.
                                </Text>
                            )}

                            <View style={styles.manageActions}>
                                {(complaint.status === "pending" ||
                                    complaint.status === "on_hold") && (
                                    <Button
                                        label="Start work"
                                        icon="construct-outline"
                                        variant="secondary"
                                        onPress={() => updateStatus("in_progress")}
                                        disabled={busy}
                                        style={styles.manageBtn}
                                    />
                                )}

                                {complaint.status === "pending" && (
                                    <Button
                                        label="Put on hold"
                                        icon="pause-circle-outline"
                                        variant="ghost"
                                        onPress={() => updateStatus("on_hold")}
                                        disabled={busy}
                                        style={styles.manageBtn}
                                    />
                                )}

                                {!isClosed && (
                                    <Button
                                        label="Mark resolved"
                                        icon="checkmark-circle-outline"
                                        onPress={() => updateStatus("resolved")}
                                        disabled={busy}
                                        style={styles.manageBtn}
                                    />
                                )}

                                {!isClosed && (
                                    <Button
                                        label="Close without repair"
                                        icon="close-circle-outline"
                                        variant="danger"
                                        onPress={() => setRejectOpen(true)}
                                        disabled={busy}
                                        style={styles.manageBtn}
                                    />
                                )}

                                {isClosed && (
                                    <Button
                                        label="Reopen"
                                        icon="refresh-outline"
                                        variant="secondary"
                                        onPress={() => updateStatus("in_progress")}
                                        disabled={busy}
                                        style={styles.manageBtn}
                                    />
                                )}

                                <Button
                                    label={cost?.totalCost ? "Edit cost" : "Record cost"}
                                    icon="cash-outline"
                                    variant="success"
                                    onPress={() => setCostModalOpen(true)}
                                    disabled={busy}
                                    style={styles.manageBtn}
                                />
                            </View>
                        </View>
                    </>
                )}
            </Screen>

            {/* Fullscreen photo viewer */}
            <Modal
                visible={lightboxIndex !== null}
                transparent
                animationType="fade"
                onRequestClose={() => setLightboxIndex(null)}
            >
                <View style={styles.lightbox}>
                    <TouchableOpacity
                        style={styles.lightboxClose}
                        onPress={() => setLightboxIndex(null)}
                        hitSlop={12}
                    >
                        <Ionicons name="close" size={26} color="#FFFFFF" />
                    </TouchableOpacity>

                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        contentOffset={{ x: (lightboxIndex ?? 0) * SCREEN_WIDTH, y: 0 }}
                    >
                        {photos.map((uri, i) => (
                            <View key={i} style={styles.lightboxPage}>
                                <Image
                                    source={{ uri }}
                                    style={styles.lightboxImage}
                                    resizeMode="contain"
                                />
                            </View>
                        ))}
                    </ScrollView>

                    <Text style={styles.lightboxCaption}>
                        {photos.length > 1 ? `Swipe to see all ${photos.length} photos` : ""}
                    </Text>
                </View>
            </Modal>

            {/* Close-without-repair sheet */}
            <Modal
                visible={rejectOpen}
                transparent
                animationType="slide"
                onRequestClose={() => setRejectOpen(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    style={styles.sheetOverlay}
                >
                    <View style={[styles.sheet, { paddingBottom: 26 + insets.bottom }]}>
                        <View style={styles.grabber} />
                        <Text style={styles.sheetTitle}>Close without repair</Text>
                        <Text style={styles.sheetSubtitle}>
                            The reporter sees this reason, so be specific — it is the only
                            explanation they get.
                        </Text>

                        <TextField
                            label="Reason"
                            icon="chatbubble-ellipses-outline"
                            multiline
                            value={rejectReason}
                            onChangeText={setRejectReason}
                            placeholder="e.g. Inspected on 3 Aug — the fan was loose, not broken, and has been tightened."
                        />

                        <View style={styles.sheetActions}>
                            <Button
                                label="Cancel"
                                variant="ghost"
                                size="lg"
                                onPress={() => setRejectOpen(false)}
                                style={styles.sheetBtn}
                            />
                            <Button
                                label="Close complaint"
                                icon="checkmark"
                                variant="danger"
                                size="lg"
                                loading={busy}
                                onPress={handleReject}
                                style={styles.sheetBtn}
                            />
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <CostModal
                visible={costModalOpen}
                complaintId={complaint._id}
                initialLaborCost={cost?.laborCost || 0}
                initialMaterialCost={cost?.materialCost || 0}
                initialOtherCost={cost?.otherCost || 0}
                initialNotes={cost?.notes || ""}
                onClose={() => setCostModalOpen(false)}
                onSuccess={(updated) => setComplaint(updated)}
            />
        </>
    );
}

const SCREEN_WIDTH = Dimensions.get("window").width;

/** Labelled fact row with a leading icon chip. */
const DetailRow: React.FC<{
    icon: IoniconName;
    label: string;
    value: string;
    sub?: string;
    capitalize?: boolean;
    last?: boolean;
}> = ({ icon, label, value, sub, capitalize, last }) => (
    <View style={[styles.detailRow, last && styles.detailRowLast]}>
        <IconChip name={icon} color={Colors.primary} size={32} />
        <View style={styles.detailText}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={[styles.detailValue, capitalize && styles.capitalize]}>{value}</Text>
            {sub ? <Text style={styles.detailSub}>{sub}</Text> : null}
        </View>
    </View>
);

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: Colors.background,
    },
    headline: {
        marginBottom: 22,
    },
    headlineTop: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
    },
    priorityPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: Radius.full,
    },
    priorityText: {
        fontSize: 10,
        fontWeight: "800",
        textTransform: "uppercase",
        letterSpacing: 0.3,
    },
    title: {
        fontSize: 23,
        fontWeight: "800",
        color: Colors.textPrimary,
        letterSpacing: -0.6,
        lineHeight: 29,
    },
    priorityHint: {
        fontSize: 12.5,
        color: Colors.textSecondary,
        marginTop: 6,
        lineHeight: 18,
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
    description: {
        fontSize: 14,
        color: Colors.textBody,
        lineHeight: 21,
    },
    hintText: {
        fontSize: 11,
        color: Colors.textTertiary,
        fontWeight: "600",
    },
    photoRow: {
        gap: 10,
        paddingBottom: 22,
    },
    photo: {
        width: 150,
        height: 150,
        borderRadius: Radius.lg,
        backgroundColor: Colors.borderLight,
    },
    detailRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        paddingBottom: 16,
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    detailRowLast: {
        paddingBottom: 0,
        marginBottom: 0,
        borderBottomWidth: 0,
    },
    detailText: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 10,
        fontWeight: "700",
        color: Colors.textTertiary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: "700",
        color: Colors.textPrimary,
        marginTop: 2,
        letterSpacing: -0.2,
    },
    capitalize: {
        textTransform: "capitalize",
    },
    detailSub: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
        lineHeight: 17,
    },
    costTotalRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingBottom: 16,
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    costTotalText: {
        flex: 1,
    },
    costTotalLabel: {
        fontSize: 10,
        fontWeight: "700",
        color: Colors.textTertiary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    costTotalValue: {
        fontSize: 22,
        fontWeight: "800",
        color: Colors.textPrimary,
        letterSpacing: -0.6,
        marginTop: 2,
    },
    costGrid: {
        flexDirection: "row",
        gap: 10,
    },
    costCell: {
        flex: 1,
    },
    costCellLabel: {
        fontSize: 10,
        fontWeight: "600",
        color: Colors.textTertiary,
        textTransform: "uppercase",
        letterSpacing: 0.3,
    },
    costCellValue: {
        fontSize: 13.5,
        fontWeight: "700",
        color: Colors.textBody,
        marginTop: 2,
    },
    costNotes: {
        backgroundColor: Colors.borderLight,
        borderRadius: Radius.md,
        padding: 12,
        marginTop: 16,
    },
    costNotesLabel: {
        fontSize: 10,
        fontWeight: "700",
        color: Colors.textTertiary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    costNotesText: {
        fontSize: 12.5,
        color: Colors.textBody,
        lineHeight: 18,
        marginTop: 4,
    },
    manageHint: {
        fontSize: 12.5,
        color: Colors.textSecondary,
        lineHeight: 18,
        marginBottom: 16,
    },
    flushBanner: {
        marginBottom: 16,
    },
    manageActions: {
        gap: 8,
    },
    manageBtn: {
        alignSelf: "stretch",
    },
    lightbox: {
        flex: 1,
        backgroundColor: "rgba(8,12,20,0.97)",
        justifyContent: "center",
    },
    lightboxClose: {
        position: "absolute",
        top: 52,
        right: 22,
        zIndex: 2,
    },
    lightboxPage: {
        width: SCREEN_WIDTH,
        alignItems: "center",
        justifyContent: "center",
    },
    lightboxImage: {
        width: SCREEN_WIDTH,
        height: SCREEN_WIDTH * 1.2,
    },
    lightboxCaption: {
        position: "absolute",
        bottom: 48,
        alignSelf: "center",
        fontSize: 12,
        color: "rgba(255,255,255,0.65)",
        fontWeight: "600",
    },
    sheetOverlay: {
        flex: 1,
        backgroundColor: "rgba(15,23,42,0.55)",
        justifyContent: "flex-end",
    },
    sheet: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingTop: 10,
        paddingHorizontal: 20,
        paddingBottom: 26,
        ...Shadow.lg,
    },
    grabber: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.border,
        alignSelf: "center",
        marginBottom: 18,
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: Colors.textPrimary,
        letterSpacing: -0.3,
    },
    sheetSubtitle: {
        fontSize: 12.5,
        color: Colors.textSecondary,
        marginTop: 4,
        marginBottom: 20,
        lineHeight: 18,
    },
    sheetActions: {
        flexDirection: "row",
        gap: 10,
        marginTop: 4,
    },
    sheetBtn: {
        flex: 1,
    },
});
