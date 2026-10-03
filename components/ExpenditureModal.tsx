import React, { useEffect, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiRequest } from "@/lib/api";
import { Complaint, CostResponse } from "@/lib/types";
import { COST_ITEMS } from "@/lib/workflow";
import { Colors, Radius, Shadow, inr } from "@/constants/theme";
import { Button, IconChip, TextField } from "./ui";

interface ExpenditureModalProps {
    visible: boolean;
    complaint: Complaint;
    onClose: () => void;
    onSuccess: (updated: Complaint) => void;
}

type Amounts = Record<string, string>;

function seed(complaint: Complaint): Amounts {
    const amounts: Amounts = {};
    for (const item of complaint.costDetails?.items ?? []) {
        amounts[item.key] = String(item.amount);
    }
    return amounts;
}

/**
 * Where the money actually went, line by line, once the work is done.
 * Submitting it resolves the complaint and notifies the reporter, the Estate
 * Managers and the Directors. On an already-resolved complaint the same form
 * corrects the figures without re-announcing anything.
 */
export const ExpenditureModal: React.FC<ExpenditureModalProps> = ({
    visible,
    complaint,
    onClose,
    onSuccess,
}) => {
    const insets = useSafeAreaInsets();
    const [amounts, setAmounts] = useState<Amounts>({});
    const [miscDescription, setMiscDescription] = useState("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);

    const resolving = complaint.status === "work_done";

    useEffect(() => {
        if (!visible) return;
        setAmounts(seed(complaint));
        setMiscDescription(complaint.costDetails?.miscDescription ?? "");
        setNotes(complaint.costDetails?.notes ?? "");
    }, [visible, complaint]);

    const parsed = COST_ITEMS.map((item) => ({
        ...item,
        value: parseFloat(amounts[item.key] ?? "") || 0,
    }));
    const total = parsed.reduce((sum, item) => sum + item.value, 0);
    const negative = parsed.some((item) => item.value < 0);
    const misc = parsed.find((item) => item.key === "miscellaneous")?.value ?? 0;
    const estimate = complaint.estimatedBudget ?? 0;

    const submit = async () => {
        if (negative) {
            Alert.alert("Invalid amount", "Amounts cannot be negative.");
            return;
        }
        if (total <= 0) {
            Alert.alert("Nothing entered", "Enter at least one expenditure amount.");
            return;
        }
        if (misc > 0 && !miscDescription.trim()) {
            Alert.alert(
                "Describe miscellaneous",
                "Say what the miscellaneous amount was spent on."
            );
            return;
        }

        setLoading(true);
        try {
            const items: Record<string, number> = {};
            for (const item of parsed) if (item.value > 0) items[item.key] = item.value;

            const data = await apiRequest<CostResponse>(`/complaints/${complaint._id}/cost`, {
                method: "POST",
                body: JSON.stringify({
                    items,
                    miscDescription: miscDescription.trim(),
                    notes: notes.trim(),
                }),
            });

            onSuccess(data.complaint);
            onClose();
            Alert.alert(
                resolving ? "Complaint resolved" : "Expenditure updated",
                resolving
                    ? "The reporter, the Estate Managers and the Directors have been notified."
                    : "The cost breakdown has been updated."
            );
        } catch (e) {
            Alert.alert("Error", e instanceof Error ? e.message : "Could not save the expenditure.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={styles.overlay}
            >
                <View style={[styles.sheet, { paddingBottom: 22 + insets.bottom }]}>
                    <View style={styles.grabber} />

                    <View style={styles.header}>
                        <IconChip name="receipt-outline" color={Colors.money} size={38} />
                        <View style={styles.headerText}>
                            <Text style={styles.title}>Expenditure</Text>
                            <Text style={styles.subtitle}>
                                Enter what was spent on each head. Leave the rest blank.
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} hitSlop={10} disabled={loading}>
                            <Ionicons name="close" size={22} color={Colors.textTertiary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.body}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Two per row; Miscellaneous gets its own full row below */}
                        <View style={styles.grid}>
                            {COST_ITEMS.filter((i) => i.key !== "miscellaneous").map((item) => (
                                <View key={item.key} style={styles.gridCell}>
                                    <TextField
                                        label={item.label}
                                        icon={item.icon}
                                        keyboardType="numeric"
                                        value={amounts[item.key] ?? ""}
                                        onChangeText={(v) =>
                                            setAmounts((prev) => ({ ...prev, [item.key]: v }))
                                        }
                                        placeholder="0"
                                    />
                                </View>
                            ))}
                        </View>

                        <View style={styles.miscBox}>
                            <TextField
                                label="Miscellaneous"
                                icon="receipt-outline"
                                keyboardType="numeric"
                                value={amounts.miscellaneous ?? ""}
                                onChangeText={(v) =>
                                    setAmounts((prev) => ({ ...prev, miscellaneous: v }))
                                }
                                placeholder="0"
                            />
                            {misc > 0 && (
                                <TextField
                                    label="What was it for?"
                                    icon="create-outline"
                                    value={miscDescription}
                                    onChangeText={setMiscDescription}
                                    placeholder="e.g. Transport, scaffolding hire"
                                    containerStyle={styles.miscDesc}
                                />
                            )}
                        </View>

                        <TextField
                            label="Notes"
                            hint="optional"
                            icon="document-text-outline"
                            multiline
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="e.g. Replaced 2 switches and 1 LED tube light"
                        />

                        <View style={styles.totalBox}>
                            <View>
                                <Text style={styles.totalLabel}>Total expenditure</Text>
                                {estimate > 0 && (
                                    <Text
                                        style={[
                                            styles.totalHint,
                                            total > estimate && styles.overBudget,
                                        ]}
                                    >
                                        {total > estimate
                                            ? `${inr(total - estimate)} over the ${inr(estimate)} estimate`
                                            : `Estimate was ${inr(estimate)}`}
                                    </Text>
                                )}
                            </View>
                            <Text style={styles.totalValue}>{inr(total)}</Text>
                        </View>
                    </ScrollView>

                    <View style={styles.actions}>
                        <Button
                            label="Cancel"
                            variant="ghost"
                            size="lg"
                            onPress={onClose}
                            disabled={loading}
                            style={styles.actionBtn}
                        />
                        <Button
                            label={resolving ? "Submit" : "Save"}
                            icon="checkmark"
                            variant="success"
                            size="lg"
                            onPress={submit}
                            loading={loading}
                            disabled={negative || total <= 0}
                            style={styles.actionBtn}
                        />
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(15,23,42,0.55)",
        justifyContent: "flex-end",
    },
    sheet: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingTop: 10,
        maxHeight: "94%",
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
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    headerText: {
        flex: 1,
    },
    title: {
        fontSize: 17,
        fontWeight: "800",
        color: Colors.textPrimary,
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
        lineHeight: 16,
    },
    body: {
        paddingHorizontal: 20,
        paddingTop: 18,
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        columnGap: 10,
    },
    gridCell: {
        width: "48%",
        flexGrow: 1,
    },
    miscBox: {
        backgroundColor: Colors.surfaceMuted,
        borderWidth: 1,
        borderColor: Colors.borderCard,
        borderRadius: Radius.lg,
        padding: 12,
        paddingBottom: 0,
        marginBottom: 14,
    },
    miscDesc: {
        marginTop: -2,
    },
    totalBox: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: Colors.successLight,
        borderWidth: 1,
        borderColor: Colors.successBorder,
        borderRadius: Radius.lg,
        padding: 16,
        marginBottom: 12,
    },
    totalLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: Colors.successDark,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    totalHint: {
        fontSize: 11,
        color: Colors.successDark,
        marginTop: 2,
    },
    overBudget: {
        color: Colors.errorDark,
        fontWeight: "700",
    },
    totalValue: {
        fontSize: 22,
        fontWeight: "800",
        color: Colors.successDark,
        letterSpacing: -0.6,
    },
    actions: {
        flexDirection: "row",
        gap: 10,
        paddingHorizontal: 20,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
    },
    actionBtn: {
        flex: 1,
    },
});
