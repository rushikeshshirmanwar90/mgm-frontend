import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Colors, Radius } from "@/constants/theme";
import type { ComplaintStatus as Status } from "@/lib/types";

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
}

interface StatusTimelineProps {
    status: Status;
    createdAt: string;
    resolvedAt?: string;
    updatedAt?: string;
    rejectionReason?: string;
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
 * how far along their issue is. This lays the lifecycle out explicitly.
 */
export const StatusTimeline: React.FC<StatusTimelineProps> = ({
    status,
    createdAt,
    resolvedAt,
    updatedAt,
    rejectionReason,
    style,
}) => {
    const steps = buildSteps(status, createdAt, resolvedAt, updatedAt);

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

                            {step.key === "rejected" && rejectionReason ? (
                                <View style={styles.reasonBox}>
                                    <Text style={styles.reasonLabel}>Reason given</Text>
                                    <Text style={styles.reasonText}>{rejectionReason}</Text>
                                </View>
                            ) : null}
                        </View>
                    </View>
                );
            })}
        </View>
    );
};

function buildSteps(
    status: Status,
    createdAt: string,
    resolvedAt?: string,
    updatedAt?: string
): Step[] {
    const reported: Step = {
        key: "reported",
        label: "Reported",
        detail: "You submitted this issue to the Estate Manager.",
        icon: "create-outline",
        state: "done",
        date: formatDate(createdAt),
        color: Colors.primary,
    };

    // Rejection is a terminal branch, not a stage on the repair path — showing
    // it as a third "step" would imply the work was done.
    if (status === "rejected") {
        return [
            reported,
            {
                key: "rejected",
                label: "Closed without repair",
                detail: "The team reviewed this and decided no repair work was needed.",
                icon: "close",
                state: "current",
                date: formatDate(updatedAt),
                color: Colors.error,
            },
        ];
    }

    const started = status === "in_progress" || status === "resolved";
    const done = status === "resolved";
    const held = status === "on_hold";

    return [
        reported,
        {
            key: "in_progress",
            label: held ? "On hold" : "Work in progress",
            detail: started
                ? "The maintenance team has picked this up and started the repair."
                : held
                  ? "The Estate Manager has reviewed this and parked it for now. It will be picked up when resources free up."
                  : "Waiting for the Estate Manager to review and assign the repair.",
            icon: started ? "construct" : held ? "pause" : "time-outline",
            // A hold is a decision the reporter should see as the current
            // state, not as "still waiting", so it gets the Now pill too.
            state: done ? "done" : started || held ? "current" : "upcoming",
            date: (started || held) && !done ? formatDate(updatedAt) : undefined,
            color: started ? Colors.primary : held ? Colors.textSecondary : Colors.warning,
        },
        {
            key: "resolved",
            label: "Resolved",
            detail: done
                ? "The repair is complete. You were notified by email and in the app."
                : "You'll get a notification here as soon as the repair is finished.",
            icon: "checkmark",
            state: done ? "done" : "upcoming",
            date: done ? formatDate(resolvedAt) : undefined,
            color: Colors.success,
        },
    ];
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
    reasonText: {
        fontSize: 12.5,
        color: Colors.errorDark,
        lineHeight: 18,
        marginTop: 4,
    },
});
