import React from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/lib/types";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { Button, Screen, SectionTitle } from "@/components/ui";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

/**
 * How each role introduces itself on its own profile page. Kept next to the
 * screen rather than in the theme file because the wording is copy, not a token.
 */
const ROLE_META: Record<UserRole, { label: string; blurb: string; icon: IoniconName }> = {
    staff: {
        label: "Staff member",
        blurb: "Reports campus damage and follows repairs",
        icon: "person",
    },
    manager: {
        label: "Estate manager",
        blurb: "Oversees complaints, costs and staff access",
        icon: "briefcase",
    },
    director: {
        label: "Director",
        blurb: "Approves the estimated budget for each complaint",
        icon: "ribbon",
    },
    admin: {
        label: "Administrator",
        blurb: "Campus executive and financial controller",
        icon: "shield-checkmark",
    },
};

const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Formatted by hand rather than via `toLocaleDateString`, because Intl data is
 * not guaranteed on every Hermes build and a silently wrong date is worse than
 * a plain one.
 */
function formatDate(iso?: string): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Mahesh Giri" -> "MG"; falls back to a single letter for one-word names. */
function initialsOf(name?: string): string {
    const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

type PillTone = "success" | "warning" | "error";

const PILL_TONES: Record<PillTone, { fg: string; bg: string; border: string }> = {
    success: { fg: Colors.successDark, bg: Colors.successLight, border: Colors.successBorder },
    warning: { fg: Colors.warningDark, bg: Colors.warningLight, border: Colors.warningBorder },
    error: { fg: Colors.errorDark, bg: Colors.errorLight, border: Colors.errorBorder },
};

interface DetailRowProps {
    icon: IoniconName;
    label: string;
    /** Rendered as plain text, or as a tinted pill when `tone` is set. */
    value: string;
    tone?: PillTone;
    first?: boolean;
}

const DetailRow: React.FC<DetailRowProps> = ({ icon, label, value, tone, first }) => {
    const pill = tone ? PILL_TONES[tone] : null;

    return (
        <View style={[styles.row, !first && styles.rowDivided]}>
            <View style={styles.rowIcon}>
                <Ionicons name={icon} size={15} color={Colors.primary} />
            </View>

            <Text style={styles.rowLabel}>{label}</Text>

            {pill ? (
                <View
                    style={[
                        styles.rowPill,
                        { backgroundColor: pill.bg, borderColor: pill.border },
                    ]}
                >
                    <Text style={[styles.rowPillText, { color: pill.fg }]}>{value}</Text>
                </View>
            ) : (
                <Text style={styles.rowValue} numberOfLines={2}>
                    {value}
                </Text>
            )}
        </View>
    );
};

/**
 * The one screen that owns account information and signing out. Every role
 * mounts this same component from its own tab group, so the details, the
 * verification state and the log-out button stay identical across portals —
 * which is why the dashboards no longer carry a log-out affordance of their own.
 */
export default function ProfileScreen() {
    const { user, logout } = useAuth();

    const role = user?.role ?? "staff";
    const meta = ROLE_META[role];
    const memberSince = formatDate(user?.createdAt);
    const appVersion = Constants.expoConfig?.version ?? "1.0.0";

    const confirmLogout = () => {
        Alert.alert("Log out", "You will need to sign in again to use the app.", [
            { text: "Cancel", style: "cancel" },
            { text: "Log out", style: "destructive", onPress: () => void logout() },
        ]);
    };

    return (
        <Screen scroll>
            {/* Identity */}
            <View style={styles.hero}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initialsOf(user?.name)}</Text>
                </View>

                <Text style={styles.heroName} numberOfLines={1}>
                    {user?.name ?? "Your account"}
                </Text>
                <Text style={styles.heroEmail} numberOfLines={1}>
                    {user?.email ?? "—"}
                </Text>

                <View style={styles.heroBadge}>
                    <Ionicons name={meta.icon} size={13} color="#FFFFFF" />
                    <Text style={styles.heroBadgeText}>{meta.label}</Text>
                </View>

                <Text style={styles.heroBlurb}>{meta.blurb}</Text>
            </View>

            {/* Contact details */}
            <SectionTitle title="Account details" />
            <View style={styles.card}>
                <DetailRow first icon="mail-outline" label="Email" value={user?.email ?? "—"} />
                <DetailRow icon="call-outline" label="Phone" value={user?.phone || "Not added"} />
                <DetailRow
                    icon="school-outline"
                    label="Department"
                    value={user?.department || "Not added"}
                />
                <DetailRow icon="ribbon-outline" label="Role" value={meta.label} />
            </View>

            {/* Account state */}
            <SectionTitle title="Account status" />
            <View style={styles.card}>
                <DetailRow
                    first
                    icon="shield-checkmark-outline"
                    label="Email verification"
                    value={user?.isEmailVerified ? "Verified" : "Not verified"}
                    tone={user?.isEmailVerified ? "success" : "warning"}
                />
                <DetailRow
                    icon="checkmark-circle-outline"
                    label="Account approval"
                    value={
                        user?.isApproved
                            ? "Approved"
                            : user?.approvalStatus === "rejected"
                              ? "Rejected"
                              : "Awaiting approval"
                    }
                    tone={
                        user?.isApproved
                            ? "success"
                            : user?.approvalStatus === "rejected"
                              ? "error"
                              : "warning"
                    }
                />
                {memberSince ? (
                    <DetailRow
                        icon="calendar-outline"
                        label="Member since"
                        value={memberSince}
                    />
                ) : null}
            </View>

            {/* App info */}
            <SectionTitle title="About" />
            <View style={styles.card}>
                <DetailRow
                    first
                    icon="business-outline"
                    label="App"
                    value="MGM Maintenance"
                />
                <DetailRow icon="pricetag-outline" label="Version" value={appVersion} />
            </View>

            <Button
                label="Log out"
                icon="log-out-outline"
                variant="danger"
                size="lg"
                fullWidth
                onPress={confirmLogout}
                style={styles.logout}
            />

            <Text style={styles.footnote}>
                Contact your estate manager to correct any detail shown above.
            </Text>
        </Screen>
    );
}

const styles = StyleSheet.create({
    hero: {
        alignItems: "center",
        backgroundColor: Colors.primaryDark,
        borderRadius: Radius.xxl,
        paddingVertical: 26,
        paddingHorizontal: 20,
        marginBottom: 22,
        ...Shadow.lg,
    },
    avatar: {
        width: 76,
        height: 76,
        borderRadius: Radius.full,
        backgroundColor: "rgba(255,255,255,0.16)",
        borderWidth: 2,
        borderColor: "rgba(255,255,255,0.28)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
    },
    avatarText: {
        fontSize: 27,
        fontWeight: "800",
        color: "#FFFFFF",
        letterSpacing: 0.5,
    },
    heroName: {
        fontSize: 21,
        fontWeight: "800",
        color: "#FFFFFF",
        letterSpacing: -0.4,
        maxWidth: "100%",
    },
    heroEmail: {
        fontSize: 12.5,
        color: "#C5DDF4",
        marginTop: 3,
        maxWidth: "100%",
    },
    heroBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "rgba(255,255,255,0.16)",
        borderRadius: Radius.full,
        paddingVertical: 6,
        paddingHorizontal: 12,
        marginTop: 14,
    },
    heroBadgeText: {
        fontSize: 11.5,
        fontWeight: "700",
        color: "#FFFFFF",
        letterSpacing: 0.2,
    },
    heroBlurb: {
        fontSize: 11.5,
        color: "#A9CDF0",
        textAlign: "center",
        marginTop: 10,
        lineHeight: 16,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.xl,
        borderWidth: 1,
        borderColor: Colors.borderCard,
        paddingHorizontal: 16,
        marginBottom: 22,
        ...Shadow.sm,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 14,
    },
    rowDivided: {
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
    },
    rowIcon: {
        width: 30,
        height: 30,
        borderRadius: Radius.sm,
        backgroundColor: Colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
    },
    rowLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: Colors.textSecondary,
    },
    rowValue: {
        flex: 1,
        textAlign: "right",
        fontSize: 13,
        fontWeight: "700",
        color: Colors.textPrimary,
    },
    rowPill: {
        marginLeft: "auto",
        borderRadius: Radius.full,
        borderWidth: 1,
        paddingVertical: 4,
        paddingHorizontal: 10,
    },
    rowPillText: {
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 0.2,
    },
    logout: {
        marginTop: 2,
    },
    footnote: {
        fontSize: 11.5,
        color: Colors.textTertiary,
        textAlign: "center",
        lineHeight: 16,
        marginTop: 14,
    },
});
