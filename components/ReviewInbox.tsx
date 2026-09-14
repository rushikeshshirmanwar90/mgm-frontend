import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiRequest } from "@/lib/api";
import {
    AppNotification,
    ComplaintResponse,
    ComplaintStatus,
    NotificationComplaint,
    NotificationsResponse,
} from "@/lib/types";
import { Colors, PriorityColors, Radius, Shadow } from "@/constants/theme";
import { StatusBadge } from "@/components/StatusBadge";
import { Button, ChipGroup, EmptyState, IconChip, TextField } from "@/components/ui";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

/** Icon + tint per notification kind, so the type reads at a glance. */
const NOTIF_STYLES: Record<string, { icon: IoniconName; color: string }> = {
    new_complaint: { icon: "megaphone-outline", color: Colors.warning },
    complaint_update: { icon: "sync-outline", color: Colors.primary },
    complaint_resolved: { icon: "checkmark-done-outline", color: Colors.success },
    registration_approved: { icon: "shield-checkmark-outline", color: Colors.success },
    registration_rejected: { icon: "close-circle-outline", color: Colors.error },
};

const FILTERS = [
    { key: "todo", label: "Needs decision" },
    { key: "all", label: "All updates" },
] as const;

type Filter = (typeof FILTERS)[number]["key"];

/** The populated complaint, or null when the API sent a bare id / nothing. */
function linkedComplaint(n: AppNotification): NotificationComplaint | null {
    return n.complaintId && typeof n.complaintId === "object" ? n.complaintId : null;
}

/** A decision is still open while the complaint hasn't been started or closed. */
function awaitingDecision(status: ComplaintStatus | undefined) {
    return status === "pending" || status === "on_hold";
}

/**
 * Notification feed for managers and admins. Every new complaint arrives here
 * as a card that can be approved, held or rejected in place — the decision is
 * the whole job for most alerts, so it shouldn't need a trip to the detail
 * screen first. The card keeps showing the resulting status afterwards, so
 * the feed doubles as a record of what was decided.
 */
export function ReviewInbox() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<Filter>("todo");
    const [busyId, setBusyId] = useState<string | null>(null);

    // Reject needs a reason, so it goes through a sheet rather than one tap.
    const [rejectTarget, setRejectTarget] = useState<NotificationComplaint | null>(null);
    const [rejectReason, setRejectReason] = useState("");

    const fetchAll = useCallback(async () => {
        const data = await apiRequest<NotificationsResponse>("/notifications");
        return data.notifications || [];
    }, []);

    // State is only touched in the promise continuation — a synchronous
    // setState in the effect body is rejected by react-hooks/set-state-in-effect.
    useEffect(() => {
        fetchAll()
            .then(setNotifications)
            .catch((e) => console.error("Fetch notifications error", e));
    }, [fetchAll]);

    const load = async () => {
        setRefreshing(true);
        try {
            setNotifications(await fetchAll());
        } catch (e) {
            console.error("Fetch notifications error", e);
        } finally {
            setRefreshing(false);
        }
    };

    const markRead = async (id: string) => {
        setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
        try {
            await apiRequest(`/notifications/${id}`, { method: "PUT" });
        } catch (e) {
            console.error("Mark read error", e);
        }
    };

    const markAllRead = async () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        try {
            await apiRequest("/notifications/read-all", { method: "PUT" });
        } catch (e) {
            console.error("Mark read all error", e);
        }
    };

    /**
     * Applies a decision and patches every notification that points at the
     * same complaint, since a reviewer can have several alerts for one issue.
     */
    const decide = async (complaint: NotificationComplaint, status: ComplaintStatus, reason?: string) => {
        setBusyId(complaint._id);
        try {
            const res = await apiRequest<ComplaintResponse>(`/complaints/${complaint._id}`, {
                method: "PUT",
                body: JSON.stringify(reason ? { status, rejectionReason: reason } : { status }),
            });
            const next = res.complaint.status;
            setNotifications((prev) =>
                prev.map((n) => {
                    const linked = linkedComplaint(n);
                    if (!linked || linked._id !== complaint._id) return n;
                    return { ...n, isRead: true, complaintId: { ...linked, status: next } };
                })
            );
            setRejectTarget(null);
            setRejectReason("");
        } catch (e) {
            Alert.alert("Error", e instanceof Error ? e.message : "Could not update the complaint");
        } finally {
            setBusyId(null);
        }
    };

    const handleReject = () => {
        if (!rejectTarget) return;
        // The backend refuses a rejection without a reason, so enforce it here
        // too rather than letting the user hit a server error.
        if (!rejectReason.trim()) {
            Alert.alert("Reason required", "Please explain why no repair is needed.");
            return;
        }
        decide(rejectTarget, "rejected", rejectReason.trim());
    };

    const openComplaint = (n: AppNotification) => {
        if (!n.isRead) markRead(n._id);
        const id = typeof n.complaintId === "object" ? n.complaintId?._id : n.complaintId;
        if (id) router.push(`/complaint/${id}`);
    };

    const todo = useMemo(
        () =>
            notifications.filter(
                (n) => n.type === "new_complaint" && awaitingDecision(linkedComplaint(n)?.status)
            ),
        [notifications]
    );
    const visible = filter === "todo" ? todo : notifications;
    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <ChipGroup
                    fill
                    options={FILTERS.map((f) => ({
                        key: f.key,
                        label: f.key === "todo" && todo.length > 0 ? `${f.label} · ${todo.length}` : f.label,
                    }))}
                    value={filter}
                    onChange={(k) => setFilter(k as Filter)}
                />
                {unreadCount > 0 && (
                    <View style={styles.unreadRow}>
                        <Text style={styles.unreadLabel}>{unreadCount} unread</Text>
                        <TouchableOpacity
                            style={styles.readAllBtn}
                            onPress={markAllRead}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="checkmark-done" size={14} color={Colors.primaryDark} />
                            <Text style={styles.readAllText}>Mark all read</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <FlatList
                data={visible}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={load}
                        tintColor={Colors.primary}
                        colors={[Colors.primary]}
                    />
                }
                renderItem={({ item }) => {
                    const tone = NOTIF_STYLES[item.type] ?? {
                        icon: "notifications-outline" as IoniconName,
                        color: Colors.primary,
                    };
                    const complaint = linkedComplaint(item);
                    const canDecide = item.type === "new_complaint" && !!complaint;
                    const open = awaitingDecision(complaint?.status);
                    const busy = !!complaint && busyId === complaint._id;

                    return (
                        <View style={[styles.card, !item.isRead && styles.cardUnread]}>
                            <TouchableOpacity
                                style={styles.cardBody}
                                onPress={() => openComplaint(item)}
                                activeOpacity={0.85}
                            >
                                <IconChip name={tone.icon} color={tone.color} size={38} />
                                <View style={styles.textCol}>
                                    <Text style={styles.title} numberOfLines={2}>
                                        {item.title}
                                    </Text>
                                    <Text style={styles.message} numberOfLines={3}>
                                        {item.message}
                                    </Text>
                                    <View style={styles.metaRow}>
                                        <Text style={styles.date}>
                                            {new Date(item.createdAt).toLocaleString("en-IN", {
                                                day: "numeric",
                                                month: "short",
                                                hour: "numeric",
                                                minute: "2-digit",
                                            })}
                                        </Text>
                                        {complaint && (
                                            <>
                                                <View
                                                    style={[
                                                        styles.priorityPill,
                                                        { backgroundColor: PriorityColors[complaint.priority].bg },
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.priorityText,
                                                            { color: PriorityColors[complaint.priority].fg },
                                                        ]}
                                                    >
                                                        {complaint.priority}
                                                    </Text>
                                                </View>
                                                <StatusBadge status={complaint.status} size="sm" />
                                            </>
                                        )}
                                    </View>
                                </View>
                                {!item.isRead && <View style={styles.unreadDot} />}
                            </TouchableOpacity>

                            {canDecide && complaint && (
                                <View style={styles.actionBar}>
                                    {open ? (
                                        <>
                                            <Button
                                                label="Approve"
                                                icon="checkmark-circle-outline"
                                                size="sm"
                                                loading={busy}
                                                disabled={!!busyId && !busy}
                                                onPress={() => decide(complaint, "in_progress")}
                                                style={styles.actionBtn}
                                            />
                                            {complaint.status !== "on_hold" && (
                                                <Button
                                                    label="Hold"
                                                    icon="pause-circle-outline"
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={!!busyId}
                                                    onPress={() => decide(complaint, "on_hold")}
                                                    style={styles.actionBtn}
                                                />
                                            )}
                                            <Button
                                                label="Reject"
                                                icon="close-circle-outline"
                                                variant="danger"
                                                size="sm"
                                                disabled={!!busyId}
                                                onPress={() => {
                                                    setRejectReason("");
                                                    setRejectTarget(complaint);
                                                }}
                                                style={styles.actionBtn}
                                            />
                                        </>
                                    ) : (
                                        <View style={styles.decidedRow}>
                                            <Ionicons
                                                name={
                                                    complaint.status === "rejected"
                                                        ? "close-circle"
                                                        : "checkmark-circle"
                                                }
                                                size={15}
                                                color={
                                                    complaint.status === "rejected"
                                                        ? Colors.errorDark
                                                        : Colors.successDark
                                                }
                                            />
                                            <Text style={styles.decidedText}>
                                                {complaint.status === "rejected"
                                                    ? "Rejected — closed without repair"
                                                    : complaint.status === "resolved"
                                                      ? "Approved and resolved"
                                                      : "Approved — work in progress"}
                                            </Text>
                                            <TouchableOpacity
                                                onPress={() => openComplaint(item)}
                                                hitSlop={8}
                                            >
                                                <Text style={styles.decidedLink}>View</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    );
                }}
                ListEmptyComponent={
                    filter === "todo" ? (
                        <EmptyState
                            icon="checkmark-done-circle-outline"
                            title="Nothing waiting on you"
                            message="New complaints appear here the moment staff report them, ready to approve, hold or reject."
                            color={Colors.success}
                            style={styles.empty}
                        />
                    ) : (
                        <EmptyState
                            icon="notifications-outline"
                            title="No notifications yet"
                            message="You'll be alerted here whenever a complaint is raised or changes hands."
                            style={styles.empty}
                        />
                    )
                }
            />

            {/* Reject sheet — mirrors the one on the complaint detail screen. */}
            <Modal
                visible={rejectTarget !== null}
                transparent
                animationType="slide"
                onRequestClose={() => setRejectTarget(null)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    style={styles.sheetOverlay}
                >
                    <View style={[styles.sheet, { paddingBottom: 26 + insets.bottom }]}>
                        <View style={styles.grabber} />
                        <Text style={styles.sheetTitle}>Reject complaint</Text>
                        <Text style={styles.sheetSubtitle}>
                            {rejectTarget ? `“${rejectTarget.title}” — ` : ""}
                            the reporter sees this reason, so be specific; it is the only
                            explanation they get.
                        </Text>

                        <TextField
                            label="Reason"
                            icon="chatbubble-ellipses-outline"
                            multiline
                            value={rejectReason}
                            onChangeText={setRejectReason}
                            placeholder="e.g. Inspected today — this is a housekeeping matter, not a repair."
                        />

                        <View style={styles.sheetActions}>
                            <Button
                                label="Cancel"
                                variant="ghost"
                                size="lg"
                                onPress={() => setRejectTarget(null)}
                                style={styles.sheetBtn}
                            />
                            <Button
                                label="Reject"
                                icon="close-circle-outline"
                                variant="danger"
                                size="lg"
                                loading={!!rejectTarget && busyId === rejectTarget._id}
                                onPress={handleReject}
                                style={styles.sheetBtn}
                            />
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 6,
        gap: 10,
    },
    unreadRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    unreadLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: Colors.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    readAllBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: Radius.full,
        backgroundColor: Colors.primaryLight,
        borderWidth: 1,
        borderColor: Colors.primaryBorder,
    },
    readAllText: {
        fontSize: 11.5,
        fontWeight: "700",
        color: Colors.primaryDark,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 6,
        paddingBottom: 28,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.xl,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: Colors.borderCard,
        overflow: "hidden",
        ...Shadow.sm,
    },
    cardUnread: {
        borderColor: Colors.primaryBorder,
        backgroundColor: "#FBFDFF",
    },
    cardBody: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
    },
    textCol: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: "800",
        color: Colors.textPrimary,
        letterSpacing: -0.2,
    },
    message: {
        fontSize: 12.5,
        color: Colors.textSecondary,
        lineHeight: 18,
        marginTop: 2,
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 8,
    },
    date: {
        fontSize: 10.5,
        color: Colors.textTertiary,
        fontWeight: "600",
    },
    priorityPill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: Radius.full,
    },
    priorityText: {
        fontSize: 10,
        fontWeight: "700",
        textTransform: "capitalize",
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.primary,
    },
    actionBar: {
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
        backgroundColor: Colors.surfaceMuted,
    },
    actionBtn: {
        flex: 1,
    },
    decidedRow: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    decidedText: {
        flex: 1,
        fontSize: 12,
        fontWeight: "600",
        color: Colors.textSecondary,
    },
    decidedLink: {
        fontSize: 12,
        fontWeight: "700",
        color: Colors.primary,
    },
    empty: {
        marginTop: 60,
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
