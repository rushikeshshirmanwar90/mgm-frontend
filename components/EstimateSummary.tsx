import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Complaint } from "@/lib/types";
import { categoryLabel } from "@/lib/workflow";
import { Colors, Radius, inr } from "@/constants/theme";

const nameOf = (ref: Complaint["approvedBy"]) =>
    typeof ref === "object" && ref ? ref.name : null;

function shortDate(value?: string) {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * The estimated budget panel: the amount front and centre, the category, the
 * manager's notes, and where the approval stands. Only rendered for roles the
 * server sends money fields to (managers, directors, admins).
 */
export const EstimateSummary: React.FC<{
    complaint: Complaint;
    style?: StyleProp<ViewStyle>;
}> = ({ complaint, style }) => {
    if (!complaint.estimatedBudget) return null;

    const category = categoryLabel(complaint);
    const approver = nameOf(complaint.approvedBy);
    const approvedOn = shortDate(complaint.approvedAt);
    const estimator = nameOf(complaint.estimatedBy);

    let approval: { icon: React.ComponentProps<typeof Ionicons>["name"]; text: string; color: string };
    if (complaint.approvedAt) {
        approval = {
            icon: "checkmark-circle",
            text: `Approved${approver ? ` by ${approver}` : ""}${approvedOn ? ` · ${approvedOn}` : ""}`,
            color: "#0F766E",
        };
    } else if (complaint.status === "awaiting_approval") {
        approval = { icon: "hourglass-outline", text: "Waiting for the Director's approval", color: "#1D4ED8" };
    } else if (complaint.returnReason) {
        approval = { icon: "arrow-undo", text: "Sent back by the Director", color: Colors.warningDark };
    } else {
        approval = { icon: "ellipse-outline", text: "Not yet sent for approval", color: Colors.textSecondary };
    }

    return (
        <View style={[styles.card, style]}>
            <View style={styles.topRow}>
                <View style={styles.amountBlock}>
                    <Text style={styles.label}>Estimated budget</Text>
                    <Text style={styles.amount}>{inr(complaint.estimatedBudget)}</Text>
                </View>
                {category && (
                    <View style={styles.categoryPill}>
                        <Text style={styles.categoryText}>{category}</Text>
                    </View>
                )}
            </View>

            {complaint.estimateNotes ? (
                <Text style={styles.notes}>{complaint.estimateNotes}</Text>
            ) : null}

            <View style={styles.footer}>
                <Ionicons name={approval.icon} size={14} color={approval.color} />
                <Text style={[styles.footerText, { color: approval.color }]} numberOfLines={1}>
                    {approval.text}
                </Text>
                {estimator && <Text style={styles.byline}>Estimate by {estimator}</Text>}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.xl,
        borderWidth: 1,
        borderColor: Colors.primaryBorder,
        padding: 16,
    },
    topRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 10,
    },
    amountBlock: {
        flex: 1,
    },
    label: {
        fontSize: 10,
        fontWeight: "700",
        color: Colors.textTertiary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    amount: {
        fontSize: 26,
        fontWeight: "800",
        color: Colors.primaryDark,
        letterSpacing: -0.8,
        marginTop: 2,
    },
    categoryPill: {
        backgroundColor: Colors.primaryLight,
        borderRadius: Radius.full,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    categoryText: {
        fontSize: 11,
        fontWeight: "800",
        color: Colors.primaryDark,
    },
    notes: {
        fontSize: 12.5,
        color: Colors.textBody,
        lineHeight: 18,
        marginTop: 10,
    },
    footer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
    },
    footerText: {
        flex: 1,
        fontSize: 11.5,
        fontWeight: "700",
    },
    byline: {
        fontSize: 11,
        color: Colors.textTertiary,
    },
});
