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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { apiRequest } from "@/lib/api";
import { Complaint, ComplaintResponse } from "@/lib/types";
import { HOLDABLE, WorkflowAction, costLines, runAction } from "@/lib/workflow";
import { useAuth } from "@/context/AuthContext";
import { EstimateModal } from "@/components/EstimateModal";
import { ExpenditureModal } from "@/components/ExpenditureModal";
import { EstimateSummary } from "@/components/EstimateSummary";
import { ReasonSheet } from "@/components/ReasonSheet";
import { ComplaintTicket, TICKET_PAGE_BG } from "@/components/ComplaintTicket";
import { Colors, Radius, Shadow, inr } from "@/constants/theme";
import {
    Banner,
    Button,
    EmptyState,
    IconChip,
    Screen,
    SectionTitle,
    StatusTimeline,
} from "@/components/ui";

interface ComplaintDetailContentProps {
    id: string;
}

/**
 * One complaint's full detail — ticket, status, estimate, expenditure, and the
 * actions each role can take on it — as a self-contained page. Pulled out of
 * the route file so the route can host several of these side by side in a
 * horizontal pager (swipe to the next complaint without leaving the screen).
 */
export function ComplaintDetailContent({ id }: ComplaintDetailContentProps) {
    const { user } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [complaint, setComplaint] = useState<Complaint | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [estimateOpen, setEstimateOpen] = useState(false);
    const [expenditureOpen, setExpenditureOpen] = useState(false);
    const [holdOpen, setHoldOpen] = useState(false);
    const [returnOpen, setReturnOpen] = useState(false);

    const role = user?.role;
    const canManage = role === "manager" || role === "admin";
    const isDirector = role === "director";

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

    /** Runs a workflow step; resolves true when it went through. */
    const act = async (action: WorkflowAction, extra?: Record<string, unknown>) => {
        if (!complaint) return false;
        setBusy(true);
        try {
            setComplaint(await runAction(complaint._id, action, extra));
            setHoldOpen(false);
            setReturnOpen(false);
            return true;
        } catch (e) {
            Alert.alert("Error", e instanceof Error ? e.message : "Could not update the complaint.");
            return false;
        } finally {
            setBusy(false);
        }
    };

    const confirmApprove = () => {
        if (!complaint) return;
        Alert.alert(
            "Approve this complaint?",
            `The estimated budget of ${inr(complaint.estimatedBudget ?? 0)} will be approved and the Estate Manager can start work.`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Approve", onPress: () => act("approve") },
            ]
        );
    };

    const confirmWorkDone = () => {
        Alert.alert(
            "Mark the work as done?",
            "You'll then enter the expenditure breakdown to resolve the complaint.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Work done",
                    onPress: async () => {
                        if (await act("work_done")) setExpenditureOpen(true);
                    },
                },
            ]
        );
    };

    if (loading && !complaint) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (error || !complaint) {
        return (
            <Screen style={styles.page}>
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

    const status = complaint.status;
    const cost = complaint.costDetails;
    const photos = complaint.photos ?? [];
    const lines = cost ? costLines(cost) : [];
    const estimate = complaint.estimatedBudget ?? 0;

    return (
        <>
            <Screen
                scroll
                style={styles.page}
                refreshing={loading}
                onRefresh={load}
                contentStyle={{ padding: 16, paddingTop: 20, paddingBottom: 32 + insets.bottom }}
            >
                {/* Headline — the "what, where, when, who" ticket stub */}
                <ComplaintTicket
                    complaint={complaint}
                    buildingName={buildingName}
                    buildingCode={buildingCode}
                    floorName={floorName}
                    roomNumber={room?.roomNumber}
                    roomName={room?.name}
                    reporterName={reporter?.name}
                    reporterSub={
                        [reporter?.department, reporter?.email].filter(Boolean).join(" · ") ||
                        undefined
                    }
                    assigneeName={assignee?.name}
                    photoCount={photos.length}
                    onPressPhotos={() => setLightboxIndex(0)}
                />

                {/* Status & progress — always shown, no tap needed */}
                <SectionTitle title="Status & progress" />
                <View style={styles.card}>
                    <StatusTimeline complaint={complaint} />
                </View>

                {/* Estimated budget — the server only sends it to roles that may see it */}
                {estimate > 0 && (
                    <>
                        <SectionTitle title="Estimated budget" />
                        <EstimateSummary complaint={complaint} style={styles.estimate} />
                    </>
                )}

                {/* Director's decision */}
                {isDirector && status === "awaiting_approval" && (
                    <>
                        <SectionTitle title="Your approval" />
                        <View style={styles.card}>
                            <Text style={styles.manageHint}>
                                Approve the estimated budget so the Estate Manager can start
                                work, or reject it with a reason so they can revise it.
                            </Text>
                            <View style={styles.manageActions}>
                                <Button
                                    label={`Approve ${inr(estimate)}`}
                                    icon="checkmark-circle-outline"
                                    variant="success"
                                    onPress={confirmApprove}
                                    disabled={busy}
                                    style={styles.manageBtn}
                                />
                                <Button
                                    label="Reject"
                                    icon="close-circle-outline"
                                    variant="danger"
                                    onPress={() => setReturnOpen(true)}
                                    disabled={busy}
                                    style={styles.manageBtn}
                                />
                            </View>
                        </View>
                    </>
                )}

                {/* Expenditure — what the finished repair actually cost */}
                {cost && cost.totalCost > 0 && (
                    <>
                        <SectionTitle title="Expenditure" />
                        <View style={styles.card}>
                            <View style={styles.costTotalRow}>
                                <IconChip name="cash-outline" color={Colors.money} size={34} />
                                <View style={styles.costTotalText}>
                                    <Text style={styles.costTotalLabel}>Total spent</Text>
                                    <Text style={styles.costTotalValue}>
                                        {inr(cost.totalCost)}
                                    </Text>
                                </View>
                                {estimate > 0 && (
                                    <Text
                                        style={[
                                            styles.costVsEstimate,
                                            cost.totalCost > estimate && styles.overBudget,
                                        ]}
                                    >
                                        {cost.totalCost > estimate
                                            ? `${inr(cost.totalCost - estimate)} over estimate`
                                            : `${inr(estimate - cost.totalCost)} under estimate`}
                                    </Text>
                                )}
                            </View>

                            {lines.map((line) => (
                                <View key={line.label} style={styles.costLine}>
                                    <Text style={styles.costLineLabel}>{line.label}</Text>
                                    <Text style={styles.costLineValue}>{inr(line.amount)}</Text>
                                </View>
                            ))}

                            {cost.miscDescription ? (
                                <Text style={styles.miscNote}>
                                    Miscellaneous: {cost.miscDescription}
                                </Text>
                            ) : null}

                            {cost.notes ? (
                                <View style={styles.costNotes}>
                                    <Text style={styles.costNotesLabel}>Notes</Text>
                                    <Text style={styles.costNotesText}>{cost.notes}</Text>
                                </View>
                            ) : null}
                        </View>
                    </>
                )}

                {/* Estate Manager / admin controls. Each stage offers only the
                    steps that make sense from it. */}
                {canManage && (
                    <>
                        <SectionTitle title="Manage this complaint" />
                        <View style={styles.card}>
                            <ManageNotice complaint={complaint} />

                            <View style={styles.manageActions}>
                                {status === "pending" && (
                                    <Button
                                        label={
                                            complaint.returnReason
                                                ? "Revise estimate"
                                                : "Add estimate & category"
                                        }
                                        icon="calculator-outline"
                                        onPress={() => setEstimateOpen(true)}
                                        disabled={busy}
                                        style={styles.manageBtn}
                                    />
                                )}

                                {status === "awaiting_approval" && (
                                    <Button
                                        label="Edit estimate"
                                        icon="create-outline"
                                        variant="secondary"
                                        onPress={() => setEstimateOpen(true)}
                                        disabled={busy}
                                        style={styles.manageBtn}
                                    />
                                )}

                                {status === "approved" && (
                                    <Button
                                        label="Start work"
                                        icon="construct-outline"
                                        onPress={() => act("start")}
                                        disabled={busy}
                                        style={styles.manageBtn}
                                    />
                                )}

                                {status === "in_progress" && (
                                    <Button
                                        label="Mark work done"
                                        icon="checkmark-done-outline"
                                        onPress={confirmWorkDone}
                                        disabled={busy}
                                        style={styles.manageBtn}
                                    />
                                )}

                                {status === "work_done" && (
                                    <Button
                                        label="Enter expenditure & resolve"
                                        icon="receipt-outline"
                                        variant="success"
                                        onPress={() => setExpenditureOpen(true)}
                                        disabled={busy}
                                        style={styles.manageBtn}
                                    />
                                )}

                                {status === "on_hold" && (
                                    <Button
                                        label="Resume"
                                        icon="play-outline"
                                        onPress={() => act("resume")}
                                        disabled={busy}
                                        style={styles.manageBtn}
                                    />
                                )}

                                {status === "resolved" && (
                                    <Button
                                        label="Edit expenditure"
                                        icon="receipt-outline"
                                        variant="secondary"
                                        onPress={() => setExpenditureOpen(true)}
                                        disabled={busy}
                                        style={styles.manageBtn}
                                    />
                                )}

                                {HOLDABLE.includes(status) && (
                                    <Button
                                        label="Hold complaint"
                                        icon="pause-circle-outline"
                                        variant="secondary"
                                        onPress={() => setHoldOpen(true)}
                                        disabled={busy}
                                        style={styles.manageBtn}
                                    />
                                )}

                                {(status === "resolved" || status === "rejected") && (
                                    <Button
                                        label="Reopen"
                                        icon="refresh-outline"
                                        variant="ghost"
                                        onPress={() => act("reopen")}
                                        disabled={busy}
                                        style={styles.manageBtn}
                                    />
                                )}
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

            <ReasonSheet
                visible={holdOpen}
                title="Hold complaint"
                subtitle="The reporter sees this reason, so be specific about why the work is paused. You can resume it at any time."
                placeholder="e.g. Waiting for the replacement fan motor to be delivered."
                confirmLabel="Put on hold"
                confirmIcon="pause"
                busy={busy}
                onClose={() => setHoldOpen(false)}
                onSubmit={(reason) => act("hold", { reason })}
            />

            <ReasonSheet
                visible={returnOpen}
                title="Reject estimate"
                subtitle="The complaint goes back to the Estate Manager with your reason, so they can revise the estimate and resubmit it."
                placeholder="e.g. Budget is too high — get a second quotation for the motor."
                confirmLabel="Reject"
                confirmIcon="close"
                confirmVariant="danger"
                busy={busy}
                onClose={() => setReturnOpen(false)}
                onSubmit={(reason) => act("return", { reason })}
            />

            <EstimateModal
                visible={estimateOpen}
                complaint={complaint}
                onClose={() => setEstimateOpen(false)}
                onSuccess={setComplaint}
            />

            <ExpenditureModal
                visible={expenditureOpen}
                complaint={complaint}
                onClose={() => setExpenditureOpen(false)}
                onSuccess={setComplaint}
            />
        </>
    );
}

/** The one-line explanation at the top of the manage card, per stage. */
function ManageNotice({ complaint }: { complaint: Complaint }) {
    switch (complaint.status) {
        case "pending":
            return complaint.returnReason ? (
                <Banner
                    tone="warning"
                    title="The Director rejected the estimate"
                    message={complaint.returnReason}
                    style={styles.flushBanner}
                />
            ) : (
                <Text style={styles.manageHint}>
                    Add a category and an estimated budget. It goes to the Director for
                    approval before work can start.
                </Text>
            );
        case "awaiting_approval":
            return (
                <Banner
                    tone="info"
                    title="Waiting for the Director"
                    message="You can start work as soon as the estimate is approved."
                    style={styles.flushBanner}
                />
            );
        case "approved":
            return (
                <Text style={styles.manageHint}>
                    The Director approved the estimate. Start work when the team picks it up —
                    the reporter is notified.
                </Text>
            );
        case "in_progress":
            return (
                <Text style={styles.manageHint}>
                    Mark the work done once the repair is finished. You&apos;ll then enter what it
                    cost.
                </Text>
            );
        case "work_done":
            return (
                <Banner
                    tone="warning"
                    title="Expenditure needed"
                    message="Enter the cost breakdown and submit it to resolve this complaint. Everyone involved is notified."
                    style={styles.flushBanner}
                />
            );
        case "on_hold":
            return (
                <Banner
                    tone="info"
                    title="This complaint is on hold"
                    message={complaint.holdReason || "Resume it when it can go ahead."}
                    style={styles.flushBanner}
                />
            );
        case "resolved":
            return (
                <Banner
                    tone="success"
                    title="This complaint is resolved"
                    message="Correct the expenditure if needed, or reopen it if the issue turns out to be unfinished."
                    style={styles.flushBanner}
                />
            );
        default:
            return (
                <Banner
                    tone="info"
                    title="This complaint is closed"
                    message="Reopen it if the issue turns out to be unfinished."
                    style={styles.flushBanner}
                />
            );
    }
}

const SCREEN_WIDTH = Dimensions.get("window").width;

const styles = StyleSheet.create({
    page: {
        backgroundColor: TICKET_PAGE_BG,
    },
    centered: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: TICKET_PAGE_BG,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.xl,
        padding: 16,
        marginHorizontal: 10,
        marginBottom: 22,
        borderWidth: 1,
        borderColor: Colors.borderCard,
        ...Shadow.sm,
    },
    estimate: {
        marginHorizontal: 10,
        marginBottom: 22,
        ...Shadow.sm,
    },
    costTotalRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingBottom: 14,
        marginBottom: 6,
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
    costVsEstimate: {
        fontSize: 11,
        fontWeight: "700",
        color: Colors.successDark,
        textAlign: "right",
        maxWidth: 110,
    },
    overBudget: {
        color: Colors.errorDark,
    },
    costLine: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    costLineLabel: {
        fontSize: 13,
        color: Colors.textBody,
        fontWeight: "600",
    },
    costLineValue: {
        fontSize: 13,
        color: Colors.textPrimary,
        fontWeight: "800",
    },
    miscNote: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 10,
        lineHeight: 17,
    },
    costNotes: {
        backgroundColor: Colors.borderLight,
        borderRadius: Radius.md,
        padding: 12,
        marginTop: 14,
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
});
