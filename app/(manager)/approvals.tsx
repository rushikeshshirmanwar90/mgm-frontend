import React, { useCallback, useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Alert,
    ActivityIndicator,
} from "react-native";
import { apiRequest } from "@/lib/api";
import { User, UsersResponse } from "@/lib/types";

export default function StaffApprovalsScreen() {
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
            <Text style={styles.title}>Staff Registrations Pending Approval 👥</Text>
            <Text style={styles.subtitle}>
                Review registered staff accounts. Once approved, staff members can log in and submit campus maintenance complaints.
            </Text>

            {error && (
                <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            <FlatList
                data={pendingUsers}
                keyExtractor={(item) => item._id || item.id}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={loadPendingUsers} />
                }
                renderItem={({ item }) => {
                    const userId = item._id || item.id;
                    const isProcessing = processingId === userId;

                    return (
                        <View style={styles.userCard}>
                            <View style={styles.userInfoRow}>
                                <View style={styles.avatarBg}>
                                    <Text style={styles.avatarText}>
                                        {item.name.charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.userName}>{item.name}</Text>
                                    <Text style={styles.userEmail}>{item.email}</Text>
                                    {item.department && (
                                        <Text style={styles.userDept}>Dept: {item.department}</Text>
                                    )}
                                </View>
                                {/* Reflect the real flag — this badge used to be
                                    hardcoded, so it claimed "verified" for every
                                    row regardless of the account's actual state. */}
                                <View
                                    style={[
                                        styles.verifiedBadge,
                                        !item.isEmailVerified && styles.unverifiedBadge,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.verifiedText,
                                            !item.isEmailVerified && styles.unverifiedText,
                                        ]}
                                    >
                                        {item.isEmailVerified ? "Email Verified ✓" : "Unverified"}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.actionRow}>
                                {isProcessing ? (
                                    <ActivityIndicator color="#2563eb" />
                                ) : (
                                    <>
                                        <TouchableOpacity
                                            style={[styles.btn, styles.rejectBtn]}
                                            onPress={() => handleApprove(userId, "reject")}
                                        >
                                            <Text style={styles.rejectText}>Reject</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.btn, styles.approveBtn]}
                                            onPress={() => handleApprove(userId, "approve")}
                                        >
                                            <Text style={styles.approveText}>Approve Account ✓</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                        </View>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyIcon}>🎉</Text>
                        <Text style={styles.emptyText}>No pending registrations</Text>
                        <Text style={styles.emptySub}>All staff registrations have been reviewed.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8fafc",
        padding: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: "800",
        color: "#0f172a",
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 13,
        color: "#64748b",
        marginBottom: 16,
    },
    userCard: {
        backgroundColor: "#ffffff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    userInfoRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 14,
    },
    avatarBg: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#2563eb",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    avatarText: {
        color: "#ffffff",
        fontSize: 18,
        fontWeight: "800",
    },
    userName: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0f172a",
    },
    userEmail: {
        fontSize: 13,
        color: "#64748b",
    },
    userDept: {
        fontSize: 12,
        color: "#2563eb",
        fontWeight: "600",
        marginTop: 2,
    },
    verifiedBadge: {
        backgroundColor: "#dcfce7",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    verifiedText: {
        color: "#166534",
        fontSize: 11,
        fontWeight: "700",
    },
    unverifiedBadge: {
        backgroundColor: "#fef3c7",
    },
    unverifiedText: {
        color: "#b45309",
    },
    errorBox: {
        backgroundColor: "#fee2e2",
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
    },
    errorText: {
        color: "#b91c1c",
        fontSize: 13,
        fontWeight: "600",
    },
    actionRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 10,
    },
    btn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
    },
    rejectBtn: {
        backgroundColor: "#fee2e2",
    },
    rejectText: {
        color: "#dc2626",
        fontWeight: "700",
        fontSize: 13,
    },
    approveBtn: {
        backgroundColor: "#16a34a",
    },
    approveText: {
        color: "#ffffff",
        fontWeight: "700",
        fontSize: 13,
    },
    emptyBox: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 80,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#334155",
    },
    emptySub: {
        fontSize: 13,
        color: "#64748b",
        marginTop: 4,
    },
});
