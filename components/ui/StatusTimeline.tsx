import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Colors, Radius } from "@/constants/theme";
import { Complaint, ComplaintStatus } from "@/lib/types";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

interface Step {
    key: string;
    label: string;
    /** Plain-language explanation of what this stage actually means. */
    detail: string;
    icon: IoniconName;
    state: "done" | "current" | "upcoming";
    date?: string;
    color: string;
    /** A note shown in a box under the step (hold reason, closing reason). */
    note?: { label: string; text: string; tone: "neutral" | "error" };
}

interface StatusTimelineProps {
    complaint: Complaint;
    style?: StyleProp<ViewStyle>;
}

function formatDate(value?: string): string | undefined {
    if (!value) return undefined;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return undefined;
    return d.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

/**
 * Explains where a complaint stands and what the stages mean.
 *
 * Status was previously communicated only by a coloured pill reading "pending"
 * or "in_progress", which tells a reporter nothing about what happens next or
 * how far along their issue is. This lays the lifecycle out explicitly:
 * raised, approved, in progress, work done, resolved.
 */
export const StatusTimeline: React.FC<StatusTimelineProps> = ({ complaint, style }) => {
    const steps = buildSteps(complaint);

    return (
        <View style={style}>
            {steps.map((step, i) => {
                const isLast = i === steps.length - 1;
                const muted = step.state === "upcoming";

                return (
                    <View key={step.key} style={styles.row}>
                        {/* Rail: marker plus the connector down to the next step */}
                        <View style={styles.rail}>
                            <View
                                style={[
                                    styles.marker,
                                    muted
                                        ? styles.markerUpcoming
                                        : { backgroundColor: step.color },
                                    step.state === "current" && styles.markerCurrent,
                                    step.state === "current" && { borderColor: step.color },
                                ]}
                            >
                                <Ionicons
                                    name={step.icon}
                                    size={13}
                                    color={muted ? Colors.textTertiary : "#FFFFFF"}
                                />
                            </View>
                            {!isLast && (
                                <View
                                    style={[
                                        styles.connector,
                                        steps[i + 1].state === "upcoming" && styles.connectorMuted,
                                    ]}
                                />
                            )}
                        </View>

                        <View style={[styles.content, isLast && styles.contentLast]}>
                            <View style={styles.labelRow}>
                                <Text style={[styles.label, muted && styles.labelMuted]}>
                                    {step.label}
                                </Text>
                                {step.state === "current" && (
                                    <View
                                        style={[
                                            styles.nowPill,
                                            { backgroundColor: `${step.color}1A` },
                                        ]}
                                    >
                                        <Text style={[styles.nowText, { color: step.color }]}>
                                            Now
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <Text style={[styles.detail, muted && styles.detailMuted]}>
                                {step.detail}
                            </Text>

                            {step.date && <Text style={styles.date}>{step.date}</Text>}

                            {step.note ? (
                                <View
                                    style={[
                                        styles.reasonBox,
                                        step.note.tone === "neutral" && styles.holdBox,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.reasonLabel,
                                            step.note.tone === "neutral" && styles.holdText,
                                        ]}
                                    >
                                        {step.note.label}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.reasonText,
                                            step.note.tone === "neutral" && styles.holdText,
                                        ]}
                                    >
                                        {step.note.text}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                    </View>
                );
            })}
        </View>
    );
};

/** Position of each stage on the main path, for deciding done / current / upcoming. */
const ORDER: Partial<Record<ComplaintStatus, number>> = {
    pending: 1,
    awaiting_approval: 1,
    approved: 2,
    in_progress: 3,
    work_done: 4,
    resolved: 5,
};

function buildSteps(c: Complaint): Step[] {
    const reported: Step = {
        key: "reported",
        label: "Complaint raised",
        detail: "Submitted to the Estate Manager.",
        icon: "create-outline",
        state: "done",
        date: formatDate(c.createdAt),
        color: Colors.primary,
    };

    // Closing without repair is a legacy terminal branch, not a stage on the
    // repair path — showing it as a later "step" would imply work was done.
    if (c.status === "rejected") {
        return [
            reported,
            {
                key: "rejected",
                label: "Closed without repair",
                detail: "The team reviewed this and decided no repair work was needed.",
                icon: "close",
                state: "current",
                date: formatDate(c.updatedAt),
                color: Colors.error,
                note: c.rejectionReason
                    ? { label: "Reason given", text: c.rejectionReason, tone: "error" }
                    : undefined,
            },
        ];
    }

    // A held complaint is laid out as the stage it paused in, with the hold
    // itself as the current step.
    const onHold = c.status === "on_hold";
    const effective: ComplaintStatus = onHold ? (c.heldFrom ?? "pending") : c.status;
    const at = ORDER[effective] ?? 1;
    const stateOf = (pos: number): Step["state"] =>
        effective === "resolved" || pos < at ? "done" : pos === at && !onHold ? "current" : "upcoming";

    const approval: Step = {
        key: "approval",
        label: "Approved",
        detail:
            at > 1
                ? "The estimate was approved by the Director."
                : effective === "awaiting_approval"
                  ? "The estimate has been sent to the Director for approval."
                  : "The Estate Manager is reviewing this and preparing an estimate for approval.",
        icon: at > 1 ? "checkmark-done" : "hourglass-outline",
        // Done only once the Director has signed off; until then it's the
        // stage being waited on (unless the whole complaint is paused).
        state: at > 1 ? "done" : onHold ? "upcoming" : "current",
        date: at > 1 ? formatDate(c.approvedAt) : undefined,
        color: at > 1 ? "#14B8A6" : Colors.warning,
    };

    const steps: Step[] = [
        reported,
        approval,
        {
            key: "in_progress",
            label: "In progress",
            detail:
                at >= 3
                    ? "The maintenance team picked this up and started the repair."
                    : "Work starts once the estimate is approved.",
            icon: "construct",
            state: stateOf(3),
            color: Colors.primary,
        },
        {
            key: "work_done",
            label: "Work done",
            detail:
                at >= 4
                    ? "The repair work is finished."
                    : "The Estate Manager marks the work done when the repair is finished.",
            icon: "hammer",
            state: stateOf(4),
            date: at >= 4 ? formatDate(c.workDoneAt) : undefined,
            color: Colors.money,
        },
        {
            key: "resolved",
            label: "Resolved",
            detail:
                effective === "resolved"
                    ? "The complaint is closed out. Everyone involved was notified."
                    : "You'll get a notification here as soon as it's resolved.",
            icon: "checkmark",
            state: effective === "resolved" ? "done" : "upcoming",
            date: effective === "resolved" ? formatDate(c.resolvedAt) : undefined,
            color: Colors.success,
        },
    ];

    if (onHold) {
        const holdStep: Step = {
            key: "on_hold",
            label: "On hold",
            detail: "The Estate Manager has paused this complaint for now.",
            icon: "pause",
            state: "current",
            date: formatDate(c.updatedAt),
            color: Colors.textSecondary,
            note: c.holdReason
                ? { label: "Reason for hold", text: c.holdReason, tone: "neutral" }
                : undefined,
        };
        const firstUpcoming = steps.findIndex((s) => s.state === "upcoming");
        steps.splice(firstUpcoming === -1 ? steps.length : firstUpcoming, 0, holdStep);
    }

    return steps;
}

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        gap: 12,
    },
    rail: {
        alignItems: "center",
        width: 26,
    },
    marker: {
        width: 26,
        height: 26,
        borderRadius: Radius.full,
        alignItems: "center",
        justifyContent: "center",
    },
    markerUpcoming: {
        backgroundColor: Colors.borderLight,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    markerCurrent: {
        borderWidth: 3,
    },
    connector: {
        flex: 1,
        width: 2,
        backgroundColor: Colors.primaryBorder,
        marginVertical: 3,
        borderRadius: 1,
    },
    connectorMuted: {
        backgroundColor: Colors.border,
    },
    content: {
        flex: 1,
        paddingBottom: 22,
    },
    contentLast: {
        paddingBottom: 0,
    },
    labelRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 3,
    },
    label: {
        fontSize: 14,
        fontWeight: "800",
        color: Colors.textPrimary,
        letterSpacing: -0.2,
    },
    labelMuted: {
        color: Colors.textTertiary,
    },
    nowPill: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: Radius.full,
    },
    nowText: {
        fontSize: 9.5,
        fontWeight: "800",
        textTransform: "uppercase",
        letterSpacing: 0.4,
    },
    detail: {
        fontSize: 12.5,
        color: Colors.textSecondary,
        lineHeight: 18,
        marginTop: 3,
    },
    detailMuted: {
        color: Colors.textTertiary,
    },
    date: {
        fontSize: 11,
        fontWeight: "600",
        color: Colors.textTertiary,
        marginTop: 5,
    },
    reasonBox: {
        backgroundColor: Colors.errorLight,
        borderWidth: 1,
        borderColor: Colors.errorBorder,
        borderRadius: Radius.md,
        padding: 12,
        marginTop: 10,
    },
    reasonLabel: {
        fontSize: 10,
        fontWeight: "700",
        color: Colors.errorDark,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    holdBox: {
        backgroundColor: Colors.borderLight,
        borderColor: Colors.border,
    },
    holdText: {
        color: Colors.textBody,
    },
    reasonText: {
        fontSize: 12.5,
        color: Colors.errorDark,
        lineHeight: 18,
        marginTop: 4,
    },
});
