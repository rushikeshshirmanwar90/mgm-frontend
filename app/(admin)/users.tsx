import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Modal,
    Alert,
    RefreshControl,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiRequest } from "@/lib/api";
import { User, UserResponse, UsersResponse, UserRole } from "@/lib/types";
import { Colors, Radius, Shadow } from "@/constants/theme";
import {
    Banner,
    Button,
    ChipGroup,
    EmptyState,
    TAB_BAR_CLEARANCE,
    TextField,
    useHideTabBarOnScroll,
} from "@/components/ui";

type FilterKey = "all" | "staff" | "manager" | "admin" | "pending" | "rejected";
type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const FILTERS: { key: FilterKey; label: string; query: string }[] = [
    { key: "all", label: "All", query: "" },
    { key: "staff", label: "Staff", query: "?role=staff" },
    { key: "manager", label: "Managers", query: "?role=manager" },
    { key: "admin", label: "Admins", query: "?role=admin" },
    { key: "pending", label: "Pending", query: "?status=pending" },
    { key: "rejected", label: "Rejected", query: "?status=rejected" },
];

const ROLE_STYLES: Record<UserRole, { bg: string; fg: string; icon: IoniconName }> = {
    admin: { bg: Colors.primaryLight, fg: Colors.primaryDark, icon: "shield-checkmark" },
    manager: { bg: Colors.warningLight, fg: Colors.warningDark, icon: "briefcase" },
    staff: { bg: Colors.successLight, fg: Colors.successDark, icon: "person" },
};

export default function AdminUsersScreen() {
    // Keeps the sheet's action buttons clear of the system navigation area.
    const insets = useSafeAreaInsets();
    const { onScroll, scrollEventThrottle } = useHideTabBarOnScroll();
    const [users, setUsers] = useState<User[]>([]);
    const [filter, setFilter] = useState<FilterKey>("all");
    const [refreshing, setRefreshing] = useState(false);
    const [busy, setBusy] = useState(false);

    // Create-user modal.
    const [modalOpen, setModalOpen] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [department, setDepartment] = useState("");
    const [role, setRole] = useState<UserRole>("staff");

    const loadUsers = useCallback(async () => {
        setRefreshing(true);
        try {
            const query = FILTERS.find((f) => f.key === filter)?.query ?? "";
            const data = await apiRequest<UsersResponse>(`/users${query}`);
            setUsers(data.users || []);
        } catch (e) {
            Alert.alert("Error", e instanceof Error ? e.message : "Could not load users");
        } finally {
            setRefreshing(false);
        }
    }, [filter]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const counts = useMemo(
        () => ({
            total: users.length,
            pending: users.filter((u) => u.approvalStatus === "pending").length,
        }),
        [users]
    );

    const resetForm = () => {
        setName("");
        setEmail("");
        setPassword("");
        setDepartment("");
        setRole("staff");
    };

    const handleCreateUser = async () => {
        if (!name.trim() || !email.trim() || !password) {
            Alert.alert("Required", "Name, email, and password are all required.");
            return;
        }
        if (password.length < 6) {
            Alert.alert("Password Too Short", "Use at least 6 characters.");
            return;
        }

        setBusy(true);
        try {
            await apiRequest<UserResponse>("/users", {
                method: "POST",
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim(),
                    password,
                    department: department.trim(),
                    role,
                }),
            });

            setModalOpen(false);
            resetForm();
            await loadUsers();
            Alert.alert(
                "Account Created",
                `${role} account created and pre-approved — they can log in immediately.`
            );
        } catch (e) {
            Alert.alert("Error", e instanceof Error ? e.message : "Failed to create account");
        } finally {
            setBusy(false);
        }
    };

    const handleReview = async (user: User, action: "approve" | "reject") => {
        setBusy(true);
        try {
            await apiRequest(`/users/${user._id || user.id}/approve`, {
                method: "PUT",
                body: JSON.stringify({ action }),
            });
            await loadUsers();
        } catch (e) {
            Alert.alert("Error", e instanceof Error ? e.message : "Failed to update account");
        } finally {
            setBusy(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <View style={styles.headerText}>
                        <Text style={styles.headerCount}>
                            {counts.total} account{counts.total === 1 ? "" : "s"}
                        </Text>
                        <Text style={styles.headerMeta}>
                            {counts.pending > 0
                                ? `${counts.pending} awaiting review`
                                : "All reviewed"}
                        </Text>
                    </View>
                    <Button
                        label="New"
                        icon="add"
                        size="sm"
                        onPress={() => setModalOpen(true)}
                    />
                </View>

                <ChipGroup
                    options={FILTERS.map((f) => ({ key: f.key, label: f.label }))}
                    value={filter}
                    onChange={(k) => setFilter(k as FilterKey)}
                />
            </View>

            {busy && <ActivityIndicator color={Colors.primary} style={styles.busy} />}

            <FlatList
                data={users}
                keyExtractor={(item) => item._id || item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={scrollEventThrottle}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={loadUsers}
                        tintColor={Colors.primary}
                        colors={[Colors.primary]}
                    />
                }
                renderItem={({ item }) => {
                    const roleStyle = ROLE_STYLES[item.role];
                    const isPending = item.approvalStatus === "pending";
                    const isRejected = item.approvalStatus === "rejected";

                    return (
                        <View style={styles.card}>
                            <View style={styles.cardTop}>
                                <View
                                    style={[styles.avatar, { backgroundColor: roleStyle.bg }]}
                                >
                                    <Ionicons
                                        name={roleStyle.icon}
                                        size={19}
                                        color={roleStyle.fg}
                                    />
                                </View>

                                <View style={styles.identity}>
                                    <Text style={styles.userName} numberOfLines={1}>
                                        {item.name}
                                    </Text>
                                    <Text style={styles.userEmail} numberOfLines={1}>
                                        {item.email}
                                    </Text>
                                    {item.department ? (
                                        <Text style={styles.userDept} numberOfLines={1}>
                                            {item.department}
                                        </Text>
                                    ) : null}
                                </View>

                                <View
                                    style={[styles.roleBadge, { backgroundColor: roleStyle.bg }]}
                                >
                                    <Text style={[styles.roleText, { color: roleStyle.fg }]}>
                                        {item.role}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.badgeRow}>
                                <StateBadge
                                    ok={item.isEmailVerified}
                                    okLabel="Email verified"
                                    offLabel="Email unverified"
                                />
                                <StateBadge
                                    ok={item.isApproved}
                                    bad={isRejected}
                                    okLabel="Approved"
                                    offLabel={isRejected ? "Rejected" : "Pending approval"}
                                />
                            </View>

                            {/* Only staff accounts are reviewable here; the backend
                                rejects attempts to review manager/admin accounts
                                unless you are an admin. */}
                            {(isPending || isRejected) && item.role === "staff" && (
                                <View style={styles.actionRow}>
                                    {isPending && (
                                        <Button
                                            label="Reject"
                                            icon="close"
                                            variant="danger"
                                            size="sm"
                                            onPress={() => handleReview(item, "reject")}
                                            style={styles.actionBtn}
                                        />
                                    )}
                                    <Button
                                        label={isRejected ? "Reinstate" : "Approve"}
                                        icon="checkmark"
                                        size="sm"
                                        onPress={() => handleReview(item, "approve")}
                                        style={styles.actionBtn}
                                    />
                                </View>
                            )}
                        </View>
                    );
                }}
                ListEmptyComponent={
                    <EmptyState
                        icon="folder-open-outline"
                        title="No accounts in this view"
                        message="Try a different filter."
                        style={styles.empty}
                    />
                }
            />

            {/* Create user modal */}
            <Modal
                visible={modalOpen}
                transparent
                animationType="slide"
                onRequestClose={() => setModalOpen(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.sheet, { paddingBottom: 22 + insets.bottom }]}>
                        <View style={styles.grabber} />

                        <View style={styles.sheetHeader}>
                            <View style={styles.sheetHeaderText}>
                                <Text style={styles.sheetTitle}>Create account</Text>
                                <Text style={styles.sheetSubtitle}>
                                    Skips email verification and manager approval.
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => {
                                    setModalOpen(false);
                                    resetForm();
                                }}
                                hitSlop={10}
                            >
                                <Ionicons name="close" size={22} color={Colors.textTertiary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.sheetBody}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            <Text style={styles.fieldLabel}>Role</Text>
                            <View style={styles.roleRow}>
                                {(["staff", "manager", "admin"] as const).map((r) => {
                                    const active = role === r;
                                    const tone = ROLE_STYLES[r];
                                    return (
                                        <TouchableOpacity
                                            key={r}
                                            onPress={() => setRole(r)}
                                            activeOpacity={0.8}
                                            style={[
                                                styles.roleChip,
                                                active && {
                                                    backgroundColor: tone.bg,
                                                    borderColor: tone.fg,
                                                },
                                            ]}
                                        >
                                            <Ionicons
                                                name={tone.icon}
                                                size={15}
                                                color={active ? tone.fg : Colors.textTertiary}
                                            />
                                            <Text
                                                style={[
                                                    styles.roleChipText,
                                                    active && { color: tone.fg },
                                                ]}
                                            >
                                                {r}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <TextField
                                label="Full name"
                                icon="person-outline"
                                value={name}
                                onChangeText={setName}
                                placeholder="e.g. Prof. Sharma"
                            />
                            <TextField
                                label="Email"
                                icon="mail-outline"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                placeholder="name@mgm.edu"
                            />
                            <TextField
                                label="Temporary password"
                                hint="min 6 chars"
                                icon="lock-closed-outline"
                                value={password}
                                onChangeText={setPassword}
                                isPassword
                                autoCapitalize="none"
                            />
                            <TextField
                                label="Department"
                                hint="optional"
                                icon="school-outline"
                                value={department}
                                onChangeText={setDepartment}
                                placeholder="e.g. Civil Engineering"
                            />

                            <Banner
                                tone="info"
                                title="Pre-approved account"
                                message="This person can sign in immediately with the password you set."
                            />
                        </ScrollView>

                        <View style={styles.sheetActions}>
                            <Button
                                label="Cancel"
                                variant="ghost"
                                size="lg"
                                onPress={() => {
                                    setModalOpen(false);
                                    resetForm();
                                }}
                                style={styles.sheetActionBtn}
                            />
                            <Button
                                label="Create account"
                                icon="checkmark"
                                size="lg"
                                loading={busy}
                                onPress={handleCreateUser}
                                style={styles.sheetActionBtn}
                            />
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

/** Small pass/fail pill used for the verification and approval flags. */
const StateBadge: React.FC<{
    ok: boolean;
    bad?: boolean;
    okLabel: string;
    offLabel: string;
}> = ({ ok, bad = false, okLabel, offLabel }) => {
    const tone = ok
        ? { bg: Colors.successLight, fg: Colors.successDark, icon: "checkmark-circle" as IoniconName }
        : bad
          ? { bg: Colors.errorLight, fg: Colors.errorDark, icon: "close-circle" as IoniconName }
          : { bg: Colors.warningLight, fg: Colors.warningDark, icon: "time" as IoniconName };

    return (
        <View style={[styles.stateBadge, { backgroundColor: tone.bg }]}>
            <Ionicons name={tone.icon} size={11} color={tone.fg} />
            <Text style={[styles.stateText, { color: tone.fg }]}>{ok ? okLabel : offLabel}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 14,
    },
    headerText: {
        flex: 1,
    },
    headerCount: {
        fontSize: 17,
        fontWeight: "800",
        color: Colors.textPrimary,
        letterSpacing: -0.3,
    },
    headerMeta: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    busy: {
        marginVertical: 6,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: TAB_BAR_CLEARANCE,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.xl,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: Colors.borderCard,
        ...Shadow.sm,
    },
    cardTop: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    avatar: {
        width: 42,
        height: 42,
        borderRadius: Radius.md,
        alignItems: "center",
        justifyContent: "center",
    },
    identity: {
        flex: 1,
    },
    userName: {
        fontSize: 14.5,
        fontWeight: "800",
        color: Colors.textPrimary,
        letterSpacing: -0.2,
    },
    userEmail: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 1,
    },
    userDept: {
        fontSize: 11,
        color: Colors.primary,
        fontWeight: "600",
        marginTop: 2,
    },
    roleBadge: {
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: Radius.full,
    },
    roleText: {
        fontSize: 10,
        fontWeight: "800",
        textTransform: "uppercase",
        letterSpacing: 0.3,
    },
    badgeRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        marginTop: 12,
    },
    stateBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: Radius.full,
    },
    stateText: {
        fontSize: 10,
        fontWeight: "700",
    },
    actionRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 8,
        marginTop: 12,
    },
    actionBtn: {
        minWidth: 104,
    },
    empty: {
        marginTop: 40,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(15,23,42,0.55)",
        justifyContent: "flex-end",
    },
    sheet: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingTop: 10,
        paddingBottom: 22,
        maxHeight: "92%",
        ...Shadow.lg,
    },
    grabber: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.border,
        alignSelf: "center",
        marginBottom: 14,
    },
    sheetHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    sheetHeaderText: {
        flex: 1,
    },
    sheetTitle: {
        fontSize: 17,
        fontWeight: "800",
        color: Colors.textPrimary,
        letterSpacing: -0.3,
    },
    sheetSubtitle: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    sheetBody: {
        paddingHorizontal: 20,
        paddingTop: 18,
    },
    fieldLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: Colors.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    roleRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 18,
    },
    roleChip: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 10,
        borderRadius: Radius.md,
        backgroundColor: Colors.borderLight,
        borderWidth: 1,
        borderColor: "transparent",
    },
    roleChipText: {
        fontSize: 11.5,
        fontWeight: "700",
        color: Colors.textSecondary,
        textTransform: "capitalize",
    },
    sheetActions: {
        flexDirection: "row",
        gap: 10,
        paddingHorizontal: 20,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
    },
    sheetActionBtn: {
        flex: 1,
    },
});
