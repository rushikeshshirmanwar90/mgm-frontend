import React, { useCallback, useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    Alert,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiRequest } from "@/lib/api";
import { User, UsersResponse } from "@/lib/types";
import { Colors, Radius, Shadow } from "@/constants/theme";
import {
    Banner,
    Button,
    EmptyState,
    TAB_BAR_CLEARANCE,
    useHideTabBarOnScroll,
} from "@/components/ui";

export default function StaffApprovalsScreen() {
    const { onScroll, scrollEventThrottle } = useHideTabBarOnScroll();
    const [pendingUsers, setPendingUsers] = useState<User[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadPendingUsers = useCallback(async () => {
        setRefreshing(true);
        try {
            // The backend already restricts this to email-verified, not-yet-
            // reviewed accounts, so everything returned here is actionable.
            const data = await apiRequest<UsersResponse>("/users?status=pending");
            setPendingUsers((data.users as User[]) || []);
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not load registrations.");
        } finally {
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadPendingUsers();
    }, [loadPendingUsers]);

    const handleApprove = async (userId: string, action: "approve" | "reject") => {
        // Rejection is not silently reversible — the account moves to a
        // "rejected" state and drops out of this queue — so confirm first.
        if (action === "reject") {
            const confirmed = await confirmReject();
            if (!confirmed) return;
        }

        setProcessingId(userId);
        try {
            await apiRequest(`/users/${userId}/approve`, {
                method: "PUT",
                body: JSON.stringify({ action }),
            });

            Alert.alert(
                "Action Successful",
                action === "approve"
                    ? "Staff registration approved. A confirmation email and in-app notification have been sent."
                    : "Staff registration rejected. The applicant has been notified."
            );

            setPendingUsers((prev) => prev.filter((u) => (u._id || u.id) !== userId));
        } catch (error) {
            Alert.alert(
                "Error",
                error instanceof Error ? error.message : "Failed to process user action"
            );
        } finally {
            setProcessingId(null);
        }
    };

    const confirmReject = () =>
        new Promise<boolean>((resolve) => {
            Alert.alert(
                "Reject Registration?",
                "This applicant will not be able to log in, and they will be removed from this queue.",
                [
                    { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
                    { text: "Reject", style: "destructive", onPress: () => resolve(true) },
                ]
            );
        });

    return (
        <View style={styles.container}>
            <FlatList
                data={pendingUsers}
                keyExtractor={(item) => item._id || item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={scrollEventThrottle}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={loadPendingUsers}
                        tintColor={Colors.primary}
                        colors={[Colors.primary]}
                    />
                }
                ListHeaderComponent={
                    <View>
                        <Text style={styles.intro}>
                            Approved staff can log in and submit campus maintenance complaints.
                        </Text>
                        {error && <Banner tone="error" title="Could not load" message={error} />}
                    </View>
                }
                renderItem={({ item }) => {
                    const userId = item._id || item.id;
                    const isProcessing = processingId === userId;

                    return (
                        <View style={styles.card}>
                            <View style={styles.topRow}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>
                                        {item.name.charAt(0).toUpperCase()}
                                    </Text>
                                </View>

                                <View style={styles.identity}>
                                    <Text style={styles.userName} numberOfLines={1}>
                                        {item.name}
                                    </Text>
                                    <Text style={styles.userEmail} numberOfLines={1}>
                                        {item.email}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.metaRow}>
                                {/* Reflect the real flag — this badge used to be
                                    hardcoded, so it claimed "verified" for every
                                    row regardless of the account's actual state. */}
                                <View
                                    style={[
                                        styles.badge,
                                        item.isEmailVerified ? styles.badgeOk : styles.badgeWarn,
                                    ]}
                                >
                                    <Ionicons
                                        name={
                                            item.isEmailVerified
                                                ? "checkmark-circle"
                                                : "alert-circle"
                                        }
                                        size={11}
                                        color={
                                            item.isEmailVerified
                                                ? Colors.successDark
                                                : Colors.warningDark
                                        }
                                    />
                                    <Text
                                        style={[
                                            styles.badgeText,
                                            {
                                                color: item.isEmailVerified
                                                    ? Colors.successDark
                                                    : Colors.warningDark,
                                            },
                                        ]}
                                    >
                                        {item.isEmailVerified ? "Email verified" : "Unverified"}
                                    </Text>
                                </View>

                                {item.department ? (
                                    <View style={[styles.badge, styles.badgeNeutral]}>
                                        <Ionicons
                                            name="school-outline"
                                            size={11}
                                            color={Colors.primaryDark}
                                        />
                                        <Text
                                            style={[styles.badgeText, { color: Colors.primaryDark }]}
                                            numberOfLines={1}
                                        >
                                            {item.department}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>

                            <View style={styles.actionRow}>
                                {isProcessing ? (
                                    <ActivityIndicator
                                        color={Colors.primary}
                                        style={styles.actionSpinner}
                                    />
                                ) : (
                                    <>
                                        <Button
                                            label="Reject"
                                            icon="close"
                                            variant="danger"
                                            onPress={() => handleApprove(userId, "reject")}
                                            style={styles.actionBtn}
                                        />
                                        <Button
                                            label="Approve"
                                            icon="checkmark"
                                            onPress={() => handleApprove(userId, "approve")}
                                            style={styles.actionBtn}
                                        />
                                    </>
                                )}
                            </View>
                        </View>
                    );
                }}
                ListEmptyComponent={
                    <EmptyState
                        icon="checkmark-done-circle-outline"
                        title="No pending registrations"
                        message="All staff registrations have been reviewed."
                        color={Colors.success}
                        style={styles.empty}
                    />
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: TAB_BAR_CLEARANCE,
    },
    intro: {
        fontSize: 12.5,
        color: Colors.textSecondary,
        lineHeight: 18,
        marginBottom: 16,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.xl,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.borderCard,
        ...Shadow.md,
    },
    topRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: Radius.md,
        backgroundColor: Colors.primary,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        color: "#FFFFFF",
        fontSize: 18,
        fontWeight: "800",
    },
    identity: {
        flex: 1,
    },
    userName: {
        fontSize: 15,
        fontWeight: "800",
        color: Colors.textPrimary,
        letterSpacing: -0.2,
    },
    userEmail: {
        fontSize: 12.5,
        color: Colors.textSecondary,
        marginTop: 1,
    },
    metaRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        marginTop: 12,
    },
    badge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: Radius.full,
        maxWidth: "60%",
    },
    badgeOk: { backgroundColor: Colors.successLight },
    badgeWarn: { backgroundColor: Colors.warningLight },
    badgeNeutral: { backgroundColor: Colors.primaryLight },
    badgeText: {
        fontSize: 10.5,
        fontWeight: "700",
        flexShrink: 1,
    },
    actionRow: {
        flexDirection: "row",
        gap: 10,
        marginTop: 16,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
    },
    actionBtn: {
        flex: 1,
    },
    actionSpinner: {
        flex: 1,
        paddingVertical: 8,
    },
    empty: {
        marginTop: 40,
    },
});
