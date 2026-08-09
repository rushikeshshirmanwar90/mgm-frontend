import React, { useState } from "react";
import { Alert, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { Colors, Radius } from "@/constants/theme";
import { Button, Card } from "@/components/ui";

interface ApprovalStatusNoticeProps {
    /**
     * `full` is the standalone card that replaces a screen's content;
     * `compact` drops the step list for use above a working screen.
     */
    variant?: "full" | "compact";
    style?: StyleProp<ViewStyle>;
}

const STEPS = [
    { icon: "mail-open-outline", label: "Email verified", done: true },
    { icon: "hourglass-outline", label: "Awaiting Estate Manager review", done: false },
    { icon: "key-outline", label: "Full access unlocked", done: false },
] as const;

/**
 * Explains to a signed-in staff member why the app is read-only.
 *
 * Staff can sign in before their registration is approved, so this is the thing
 * that tells them what state they're in — without it they'd land on an empty
 * dashboard with a missing Report tab and no explanation. "Check status" re-reads
 * the account so an approval that landed a minute ago takes effect immediately,
 * rather than waiting for the next cold start.
 */
export const ApprovalStatusNotice: React.FC<ApprovalStatusNoticeProps> = ({
    variant = "full",
    style,
}) => {
    const { user, refreshUser } = useAuth();
    const [checking, setChecking] = useState(false);

    const handleCheck = async () => {
        setChecking(true);
        try {
            const fresh = await refreshUser();
            // A null result means the session ended (rejected or expired) and
            // the root layout is already redirecting to login — say nothing.
            if (!fresh) return;

            if (fresh.isApproved) {
                Alert.alert(
                    "You're approved 🎉",
                    "Your registration has been approved. You can now report maintenance issues."
                );
            } else {
                Alert.alert(
                    "Still pending",
                    "The Estate Manager hasn't reviewed your registration yet. You'll get an email as soon as they do."
                );
            }
        } finally {
            setChecking(false);
        }
    };

    return (
        <Card accent accentColor={Colors.warning} style={style}>
            <View style={styles.header}>
                <View style={styles.iconWrap}>
                    <Ionicons name="hourglass-outline" size={22} color={Colors.warningDark} />
                </View>
                <View style={styles.headerText}>
                    <Text style={styles.title}>Waiting for approval</Text>
                    <Text style={styles.subtitle}>
                        Your account is active, but the Estate Manager still has to approve
                        your registration before you can report issues.
                    </Text>
                </View>
            </View>

            {variant === "full" && (
                <View style={styles.steps}>
                    {STEPS.map((step) => (
                        <View key={step.label} style={styles.step}>
                            <Ionicons
                                name={step.done ? "checkmark-circle" : step.icon}
                                size={17}
                                color={step.done ? Colors.success : Colors.textTertiary}
                            />
                            <Text
                                style={[
                                    styles.stepLabel,
                                    step.done && styles.stepLabelDone,
                                ]}
                            >
                                {step.label}
                            </Text>
                        </View>
                    ))}
                </View>
            )}

            {user?.email ? (
                <Text style={styles.footnote}>
                    We&apos;ll email <Text style={styles.footnoteStrong}>{user.email}</Text> the
                    moment your registration is reviewed.
                </Text>
            ) : null}

            <Button
                label="Check status"
                icon="refresh"
                variant="secondary"
                fullWidth
                loading={checking}
                onPress={handleCheck}
                style={styles.action}
            />
        </Card>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        gap: 12,
    },
    iconWrap: {
        width: 42,
        height: 42,
        borderRadius: Radius.md,
        backgroundColor: Colors.warningLight,
        borderWidth: 1,
        borderColor: Colors.warningBorder,
        alignItems: "center",
        justifyContent: "center",
    },
    headerText: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: "800",
        color: Colors.textPrimary,
        letterSpacing: -0.2,
    },
    subtitle: {
        fontSize: 12.5,
        color: Colors.textSecondary,
        marginTop: 4,
        lineHeight: 18,
    },
    steps: {
        marginTop: 16,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
        gap: 10,
    },
    step: {
        flexDirection: "row",
        alignItems: "center",
        gap: 9,
    },
    stepLabel: {
        fontSize: 12.5,
        color: Colors.textSecondary,
        fontWeight: "600",
    },
    stepLabelDone: {
        color: Colors.successDark,
    },
    footnote: {
        fontSize: 11.5,
        color: Colors.textTertiary,
        lineHeight: 17,
        marginTop: 14,
    },
    footnoteStrong: {
        fontWeight: "700",
        color: Colors.textSecondary,
    },
    action: {
        marginTop: 14,
    },
});
