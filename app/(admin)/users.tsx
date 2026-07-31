import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    Modal,
    Alert,
    RefreshControl,
    ActivityIndicator,
} from "react-native";
import { apiRequest } from "@/lib/api";
import { User, UserResponse, UsersResponse, UserRole } from "@/lib/types";

type FilterKey = "all" | "staff" | "manager" | "admin" | "pending" | "rejected";

const FILTERS: { key: FilterKey; label: string; query: string }[] = [
    { key: "all", label: "All", query: "" },
    { key: "staff", label: "Staff", query: "?role=staff" },
    { key: "manager", label: "Managers", query: "?role=manager" },
    { key: "admin", label: "Admins", query: "?role=admin" },
    { key: "pending", label: "Pending", query: "?status=pending" },
    { key: "rejected", label: "Rejected", query: "?status=rejected" },
];

const ROLE_STYLES: Record<UserRole, { bg: string; fg: string; icon: string }> = {
    admin: { bg: "#fce7f3", fg: "#be185d", icon: "👑" },
    manager: { bg: "#fef3c7", fg: "#b45309", icon: "👔" },
    staff: { bg: "#dbeafe", fg: "#1d4ed8", icon: "👤" },
};

export default function AdminUsersScreen() {
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
            <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>User Management 👥</Text>
                    <Text style={styles.subtitle}>
                        {counts.total} account{counts.total === 1 ? "" : "s"}
                        {counts.pending > 0 ? ` · ${counts.pending} awaiting review` : ""}
                    </Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={() => setModalOpen(true)}>
                    <Text style={styles.addBtnText}>+ New</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                horizontal
                data={FILTERS}
                keyExtractor={(f) => f.key}
                showsHorizontalScrollIndicator={false}
                style={styles.filterRow}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[styles.filterChip, filter === item.key && styles.activeFilterChip]}
                        onPress={() => setFilter(item.key)}
                    >
                        <Text
                            style={[
                                styles.filterText,
                                filter === item.key && styles.activeFilterText,
                            ]}
                        >
                            {item.label}
                        </Text>
                    </TouchableOpacity>
                )}
            />

            {busy && <ActivityIndicator color="#be185d" style={{ marginVertical: 8 }} />}

            <FlatList
                data={users}
                keyExtractor={(item) => item._id || item.id}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={loadUsers} />
                }
                contentContainerStyle={{ paddingBottom: 24 }}
                renderItem={({ item }) => {
                    const roleStyle = ROLE_STYLES[item.role];
                    const isPending = item.approvalStatus === "pending";
                    const isRejected = item.approvalStatus === "rejected";

                    return (
                        <View style={styles.card}>
                            <View style={styles.cardTop}>
                                <View style={[styles.avatar, { backgroundColor: roleStyle.bg }]}>
                                    <Text style={styles.avatarText}>{roleStyle.icon}</Text>
                                </View>

                                <View style={{ flex: 1 }}>
                                    <Text style={styles.userName}>{item.name}</Text>
                                    <Text style={styles.userEmail}>{item.email}</Text>
                                    {item.department ? (
                                        <Text style={styles.userDept}>{item.department}</Text>
                                    ) : null}
                                </View>

                                <View style={[styles.roleBadge, { backgroundColor: roleStyle.bg }]}>
                                    <Text style={[styles.roleText, { color: roleStyle.fg }]}>
                                        {item.role}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.badgeRow}>
                                <View
                                    style={[
                                        styles.stateBadge,
                                        item.isEmailVerified ? styles.okBadge : styles.warnBadge,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.stateText,
                                            item.isEmailVerified ? styles.okText : styles.warnText,
                                        ]}
                                    >
                                        {item.isEmailVerified ? "Email verified" : "Email unverified"}
                                    </Text>
                                </View>

                                <View
                                    style={[
                                        styles.stateBadge,
                                        item.isApproved
                                            ? styles.okBadge
                                            : isRejected
                                              ? styles.badBadge
                                              : styles.warnBadge,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.stateText,
                                            item.isApproved
                                                ? styles.okText
                                                : isRejected
                                                  ? styles.badText
                                                  : styles.warnText,
                                        ]}
                                    >
                                        {item.isApproved
                                            ? "Approved"
                                            : isRejected
                                              ? "Rejected"
                                              : "Pending approval"}
                                    </Text>
                                </View>
                            </View>

                            {/* Only staff accounts are reviewable here; the backend
                                rejects attempts to review manager/admin accounts
                                unless you are an admin. */}
                            {(isPending || isRejected) && item.role === "staff" && (
                                <View style={styles.actionRow}>
                                    {isPending && (
                                        <TouchableOpacity
                                            style={[styles.btn, styles.rejectBtn]}
                                            onPress={() => handleReview(item, "reject")}
                                        >
                                            <Text style={styles.rejectText}>Reject</Text>
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity
                                        style={[styles.btn, styles.approveBtn]}
                                        onPress={() => handleReview(item, "approve")}
                                    >
                                        <Text style={styles.approveText}>
                                            {isRejected ? "Reinstate ✓" : "Approve ✓"}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyIcon}>🗂️</Text>
                        <Text style={styles.emptyText}>No accounts in this view</Text>
                    </View>
                }
            />

            {/* Create user modal */}
            <Modal visible={modalOpen} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Create Account</Text>
                        <Text style={styles.modalHint}>
                            Accounts created here skip email verification and manager approval.
                        </Text>

                        <Text style={styles.label}>Role</Text>
                        <View style={styles.roleSelectRow}>
                            {(["staff", "manager", "admin"] as const).map((r) => (
                                <TouchableOpacity
                                    key={r}
                                    style={[styles.roleSelChip, role === r && styles.activeRoleSelChip]}
                                    onPress={() => setRole(r)}
                                >
                                    <Text
                                        style={[
                                            styles.roleSelText,
                                            role === r && styles.activeRoleSelText,
                                        ]}
                                    >
                                        {ROLE_STYLES[r].icon} {r}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Full Name</Text>
                        <TextInput style={styles.input} value={name} onChangeText={setName} />

                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <Text style={styles.label}>Temporary Password (min 6 chars)</Text>
                        <TextInput
                            style={styles.input}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />

                        <Text style={styles.label}>Department</Text>
                        <TextInput
                            style={styles.input}
                            value={department}
                            onChangeText={setDepartment}
                            placeholder="e.g. Civil Engineering"
                        />

                        <View style={styles.btnRow}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => {
                                    setModalOpen(false);
                                    resetForm();
                                }}
                            >
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.saveBtn}
                                onPress={handleCreateUser}
                                disabled={busy}
                            >
                                <Text style={styles.saveText}>Create Account</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8fafc",
        padding: 16,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: "800",
        color: "#0f172a",
    },
    subtitle: {
        fontSize: 13,
        color: "#64748b",
        marginTop: 2,
    },
    addBtn: {
        backgroundColor: "#be185d",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
    },
    addBtnText: {
        color: "#ffffff",
        fontSize: 13,
        fontWeight: "700",
    },
    filterRow: {
        marginBottom: 12,
        flexGrow: 0,
    },
    filterChip: {
        backgroundColor: "#ffffff",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    activeFilterChip: {
        backgroundColor: "#be185d",
        borderColor: "#9d174d",
    },
    filterText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#475569",
    },
    activeFilterText: {
        color: "#ffffff",
    },
    card: {
        backgroundColor: "#ffffff",
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    cardTop: {
        flexDirection: "row",
        alignItems: "center",
    },
    avatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    avatarText: {
        fontSize: 20,
    },
    userName: {
        fontSize: 15,
        fontWeight: "700",
        color: "#0f172a",
    },
    userEmail: {
        fontSize: 12,
        color: "#64748b",
    },
    userDept: {
        fontSize: 11,
        color: "#2563eb",
        fontWeight: "600",
        marginTop: 2,
    },
    roleBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    roleText: {
        fontSize: 11,
        fontWeight: "800",
        textTransform: "uppercase",
    },
    badgeRow: {
        flexDirection: "row",
        gap: 8,
        marginTop: 12,
    },
    stateBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    stateText: {
        fontSize: 10,
        fontWeight: "700",
    },
    okBadge: { backgroundColor: "#dcfce7" },
    okText: { color: "#166534" },
    warnBadge: { backgroundColor: "#fef3c7" },
    warnText: { color: "#b45309" },
    badBadge: { backgroundColor: "#fee2e2" },
    badText: { color: "#b91c1c" },
    actionRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 10,
        marginTop: 12,
    },
    btn: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 8,
    },
    rejectBtn: { backgroundColor: "#fee2e2" },
    rejectText: { color: "#dc2626", fontWeight: "700", fontSize: 12 },
    approveBtn: { backgroundColor: "#16a34a" },
    approveText: { color: "#ffffff", fontWeight: "700", fontSize: 12 },
    emptyBox: {
        alignItems: "center",
        paddingVertical: 60,
    },
    emptyIcon: {
        fontSize: 40,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 15,
        fontWeight: "700",
        color: "#334155",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        padding: 20,
    },
    modalContent: {
        backgroundColor: "#ffffff",
        borderRadius: 16,
        padding: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#0f172a",
    },
    modalHint: {
        fontSize: 12,
        color: "#64748b",
        marginTop: 4,
        marginBottom: 6,
    },
    label: {
        fontSize: 13,
        fontWeight: "600",
        color: "#475569",
        marginBottom: 4,
        marginTop: 8,
    },
    input: {
        backgroundColor: "#f1f5f9",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        borderWidth: 1,
        borderColor: "#cbd5e1",
    },
    roleSelectRow: {
        flexDirection: "row",
        gap: 6,
    },
    roleSelChip: {
        flex: 1,
        backgroundColor: "#f1f5f9",
        paddingVertical: 8,
        borderRadius: 6,
        alignItems: "center",
    },
    activeRoleSelChip: {
        backgroundColor: "#be185d",
    },
    roleSelText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#475569",
    },
    activeRoleSelText: {
        color: "#ffffff",
    },
    btnRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 10,
        marginTop: 18,
    },
    cancelBtn: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 8,
        backgroundColor: "#f1f5f9",
    },
    cancelText: {
        color: "#475569",
        fontWeight: "600",
    },
    saveBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: "#be185d",
    },
    saveText: {
        color: "#ffffff",
        fontWeight: "700",
    },
});
